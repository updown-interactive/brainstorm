import { get } from 'svelte/store';
import { projectStore } from '../../../core/stores/projectStore';
import { conversationService } from '../data/conversation-service';
import { chatState } from '../state';
import { knowledgeService } from '../data/knowledge-service';
import type { ChatMode, ChatStreamEvent, ConversationMessage, PlanOption, PlanResponse, PlanSelectionMode } from '../types';
import { parseFrontmatter } from '../../markdown';
import YAML from 'yaml';

class ChatController {
	private sessionVersion = 0;

	private beginSession(conversationId: string | null, isLoadingMessages = false): number {
		this.sessionVersion += 1;
		chatState.update((state) => ({
			...state,
			activeConversationId: conversationId,
			messages: [],
			isLoadingMessages,
			error: ''
		}));
		return this.sessionVersion;
	}

	resetSession(): void {
		this.beginSession(null);
	}

	getPlanResponse(messages: ConversationMessage[]): PlanResponse | null {
		const latestMessage = messages.at(-1);
		if (!latestMessage || latestMessage.role !== 'assistant' || latestMessage.status !== 'completed') return null;
		const structured = latestMessage.content.match(/<!--\s*brainstorm-plan-data\s*([\s\S]*?)-->/i)?.[1];
		if (structured) {
			try {
				const parsed: unknown = JSON.parse(structured);
				const response = parsePlanResponse(parsed);
				if (response) return response;
			} catch {
				// Fall through to the legacy Markdown parser for backward compatibility.
			}
		}
		const lines = latestMessage.content.split(/\r?\n/);
		const optionsHeadingIndex = lines.findIndex((line) => /^#{0,6}\s*options\s*:?\s*$/i.test(line.trim()));
		const optionLines = optionsHeadingIndex === -1
			? lines
			: lines.slice(optionsHeadingIndex + 1, lines.findIndex((line, index) => index > optionsHeadingIndex && /^#{1,6}\s+/.test(line.trim())) === -1 ? lines.length : lines.findIndex((line, index) => index > optionsHeadingIndex && /^#{1,6}\s+/.test(line.trim())));
		const options = optionLines
			.map((line) => line.trim().match(/^(?:[-*]|\d+[.)]|[A-Z][.)])\s+(.+)$/)?.[1] ?? line.trim().match(/^Option\s+(?:\d+|[A-Z])\s*[:.)-]\s*(.+)$/i)?.[1])
			.filter((option): option is string => Boolean(option && option.length > 0))
			.map((option) => option.replace(/\*\*/g, '').trim())
			.map((option, index) => {
				const separator = option.indexOf(' — ');
				if (separator === -1) return { id: `legacy-option-${index + 1}`, title: option, description: '', prompt: option };
				const title = option.slice(0, separator).trim();
				const prompt = option.slice(separator + 3).trim();
				return { id: `legacy-option-${index + 1}`, title, description: prompt, prompt };
			})
			.filter((option, index, allOptions) => allOptions.findIndex((candidate) => candidate.title === option.title) === index)
			.slice(0, 6);
		return optionsHeadingIndex === -1 && !lines.some((line) => /^Option\s+(?:\d+|[A-Z])\s*[:.)-]/i.test(line.trim())) ? null : { options, selectionMode: 'single' };
	}

	getPlanOptions(messages: ConversationMessage[]): PlanOption[] {
		return this.getPlanResponse(messages)?.options ?? [];
	}

	createKnowledgeFolder(projectPath: string, relativePath: string): Promise<void> {
		return knowledgeService.createFolder(projectPath, relativePath);
	}

	async createKnowledgeDraft({ projectPath, title, response, conversationTitle, messageId, providerConfigId, model }: {
		projectPath: string;
		title: string;
		response: string;
		conversationTitle: string;
		messageId: string;
		providerConfigId?: string;
		model?: string;
	}): Promise<{ absolutePath: string; relativePath: string; title: string; content: string; properties: Record<string, unknown> }> {
		const safeTitle = title.replace(/[\\/:*?"<>|]/g, '').trim() || 'Brainstorm note';
		const draft = await knowledgeService.generate({ projectPath, title: safeTitle, response, providerConfigId, model });
		return {
			absolutePath: '',
			relativePath: '',
			title: draft.title,
			content: formatKnowledgeDocument(draft.properties, draft.content),
			properties: draft.properties
		};
	}

	async createKnowledgeResponse({ projectId, projectPath, title, response, messageId, providerConfigId, model }: {
		projectPath: string;
		projectId: string;
		title: string;
		response: string;
		messageId: string;
		providerConfigId?: string;
		model?: string;
	}): Promise<{ message: ConversationMessage; draft: { absolutePath: string; relativePath: string; content: string; properties: Record<string, unknown> }; title: string }> {
		const activeConversationId = get(chatState).activeConversationId ?? '';
		const userMessage = await conversationService.addMessage({ projectId, conversationId: activeConversationId, role: 'user', content: `Create notes @${title}`, status: 'completed', provider: providerConfigId, model });
		chatState.update((state) => ({ ...state, messages: [...state.messages, userMessage] }));
		const draft = await this.createKnowledgeDraft({
			projectPath,
			title,
			response,
			conversationTitle: title,
			messageId,
			providerConfigId,
			model
		});
		const generatedContent = draft.content.trimStart().startsWith('---')
			? draft.content
			: formatKnowledgeDocument(draft.properties, draft.content);
		const assistantMessage = await conversationService.addMessage({ projectId, conversationId: activeConversationId, role: 'assistant', content: generatedContent, status: 'completed', provider: providerConfigId, model });
		chatState.update((state) => ({ ...state, messages: [...state.messages, assistantMessage] }));
		return { message: assistantMessage, draft, title: draft.title };
	}

	async previewKnowledgeMessage(_projectPath: string, message: ConversationMessage): Promise<{ absolutePath: string; relativePath: string; content: string; properties: Record<string, unknown> }> {
		const parsed = parseFrontmatter(message.content);
		const legacy = parsed.range ? null : parseLegacyKnowledge(message.content);
		const properties = parsed.range && parsed.errors.length === 0 ? parsed.data : legacy?.properties;
		const body = parsed.range ? message.content.slice(parsed.range.bodyFrom).trim() : legacy?.body;
		if (!properties || !body) throw new Error('This response does not contain valid knowledge properties.');
		return { absolutePath: '', relativePath: '', content: formatKnowledgeDocument(properties, body), properties };
	}


	async finalizeKnowledgeNote(projectPath: string, sourcePath: string, folderPath: string, title: string, content: string): Promise<void> {
		const parsed = parseFrontmatter(content);
		if (!parsed.range || parsed.errors.length > 0) throw new Error('Knowledge note has invalid frontmatter.');
		const safeTitle = title.replace(/[\\/:*?"<>|]/g, '').trim() || 'Brainstorm note';
		const fileName = `${safeTitle}.md`;
		const destination = folderPath ? `${folderPath}/${fileName}` : fileName;
		await knowledgeService.createMarkdown({ projectPath, path: destination, properties: parsed.data, content: content.slice(parsed.range.bodyFrom).trim() });
	}

	deleteKnowledgeDraft(projectPath: string, path: string): Promise<void> {
		return knowledgeService.delete(projectPath, path);
	}

	async loadForProject(projectId: string, preferredConversationId?: string): Promise<void> {
		const loadVersion = this.sessionVersion;
		chatState.update((state) => ({ ...state, isLoadingHistory: true, error: '' }));
		try {
			const history = await conversationService.list(projectId);
			if (loadVersion !== this.sessionVersion) return;
			const storedConversationId = projectStore.getCurrentProject()?.last_conversation_id;
			const preferredId = preferredConversationId ?? storedConversationId;
			const activeConversationId = preferredId && history.conversations.some((conversation) => conversation.id === preferredId)
				? preferredId
				: get(chatState).activeConversationId && history.conversations.some((conversation) => conversation.id === get(chatState).activeConversationId)
					? get(chatState).activeConversationId
				: history.conversations[0]?.id ?? null;
			chatState.update((state) => ({ ...state, conversations: history.conversations, activeConversationId, isLoadingHistory: false }));
			if (activeConversationId && loadVersion === this.sessionVersion) await this.select(projectId, activeConversationId);
		} catch (error) {
			if (loadVersion !== this.sessionVersion) return;
			chatState.update((state) => ({ ...state, isLoadingHistory: false, error: error instanceof Error ? error.message : 'Failed to load conversation history.' }));
		}
	}

	async select(projectId: string, conversationId: string): Promise<void> {
		const selectionVersion = this.beginSession(conversationId, true);
		try {
			const [, messages] = await conversationService.get({ projectId, conversationId });
			if (selectionVersion !== this.sessionVersion || get(chatState).activeConversationId !== conversationId) return;
			await conversationService.setActive({ projectId, conversationId });
			if (selectionVersion !== this.sessionVersion || get(chatState).activeConversationId !== conversationId) return;
			chatState.update((state) => ({ ...state, messages, isLoadingMessages: false }));
		} catch (error) {
			if (selectionVersion !== this.sessionVersion) return;
			chatState.update((state) => ({ ...state, isLoadingMessages: false, error: error instanceof Error ? error.message : 'Failed to load conversation.' }));
		}
	}

	async create(projectId: string): Promise<void> {
		const creationVersion = this.beginSession(null);
		const conversation = await conversationService.create(projectId);
		if (creationVersion !== this.sessionVersion || get(chatState).activeConversationId !== null) return;
		chatState.update((state) => ({ ...state, conversations: [{ id: conversation.id, title: conversation.title, agentId: conversation.agentId, model: conversation.model, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt, lastMessageAt: null, messageCount: 0 }, ...state.conversations], activeConversationId: conversation.id, messages: [] }));
	}

	async send(projectId: string, content: string, mode: ChatMode, providerConfigId?: string, model?: string): Promise<void> {
		const sendVersion = this.sessionVersion;
		try {
			let conversationId = get(chatState).activeConversationId;
			if (!conversationId) {
				const conversation = await conversationService.create(projectId);
				if (sendVersion !== this.sessionVersion) return;
				conversationId = conversation.id;
				chatState.update((state) => ({
					...state,
					conversations: [{ id: conversation.id, title: conversation.title, agentId: conversation.agentId, model: conversation.model, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt, lastMessageAt: null, messageCount: 0 }, ...state.conversations],
					activeConversationId: conversation.id,
					messages: []
				}));
			}
			chatState.update((state) => ({ ...state, error: '' }));
			chatState.update((state) => ({
				...state,
				messages: [...state.messages, {
					id: `local-user-${Date.now()}`,
					conversationId: conversationId ?? '',
					role: 'user',
					content,
					status: 'completed',
					provider: providerConfigId ?? null,
					model: model ?? null,
					createdAt: Date.now(),
					updatedAt: null
				}]
			}));
			const response = await conversationService.sendMessage({ projectId, conversationId: conversationId ?? undefined, content, mode, providerConfigId, model });
			if (sendVersion !== this.sessionVersion || get(chatState).activeConversationId !== response.conversationId) return;
			await this.loadForProject(projectId, response.conversationId);
		} catch (error) {
			if (sendVersion !== this.sessionVersion) return;
			chatState.update((state) => ({ ...state, error: error instanceof Error ? error.message : 'Unable to generate a response.' }));
		}
	}

	applyStreamEvent(event: ChatStreamEvent): void {
		if (get(chatState).activeConversationId !== event.conversationId) return;
		chatState.update((state) => {
			const existingIndex = state.messages.findIndex((message) => message.id === event.messageId);
			const currentMessage = existingIndex === -1 ? null : state.messages[existingIndex];
			const streamedMessage = event.message ?? currentMessage ?? {
				id: event.messageId,
				conversationId: event.conversationId,
				role: 'assistant' as const,
				content: '',
				status: 'streaming' as const,
				provider: null,
				model: null,
				createdAt: Date.now(),
				updatedAt: null
			};
			const nextMessage = event.message ?? { ...streamedMessage, content: `${streamedMessage.content}${event.delta}`, status: 'streaming' as const };
			const messages = existingIndex === -1
				? [...state.messages, nextMessage]
				: state.messages.map((message, index) => index === existingIndex ? nextMessage : message);
			return { ...state, messages };
		});
	}

	async remove(projectId: string, conversationId: string): Promise<void> {
		await conversationService.remove({ projectId, conversationId });
		await this.loadForProject(projectId);
	}
}

function parsePlanResponse(value: unknown): PlanResponse | null {
	if (!isRecord(value) || value.type !== 'plan' || !Array.isArray(value.options)) return null;
	const options = value.options
		.map((option) => parsePlanOption(option))
		.filter((option): option is PlanOption => option !== null)
		.slice(0, 8);
	if (options.length === 0) return null;
	const selectionMode: PlanSelectionMode = value.selectionMode === 'multiple' ? 'multiple' : 'single';
	return { options, selectionMode };
}

function parsePlanOption(value: unknown): PlanOption | null {
	if (!isRecord(value)) return null;
	const title = typeof value.title === 'string' ? value.title.trim() : '';
	const description = typeof value.description === 'string' ? value.description.trim() : '';
	const prompt = typeof value.prompt === 'string' && value.prompt.trim() ? value.prompt.trim() : title;
	if (!title || !prompt) return null;
	const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim() : `plan-option-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
	return { id, title, description, prompt };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLegacyKnowledge(content: string): { properties: Record<string, unknown>; body: string } | null {
	const lines = content.trimStart().split(/\r?\n/);
	const bodyStart = lines.findIndex((line) => /^(?:#{1,6}\s|\*\*[^*]+\*\*)/.test(line.trim()));
	if (bodyStart <= 0) return null;
	const properties: Record<string, unknown> = {};
	for (const line of lines.slice(0, bodyStart)) {
		const match = line.match(/^([a-z][a-z0-9_]*):\s*(.*)$/i);
		if (!match) continue;
		const [, key, value] = match;
		if (key === 'tags') continue;
		if (value === 'true' || value === 'false') properties[key] = value === 'true';
		else properties[key] = value.replace(/^['"]|['"]$/g, '');
	}
	const tags = lines.slice(0, bodyStart).filter((line) => /^\s*['"]?#/.test(line.trim())).map((line) => line.trim().replace(/^['"]|['"]$/g, ''));
	if (tags.length > 0) properties.tags = tags;
	return Object.keys(properties).length > 0 ? { properties, body: lines.slice(bodyStart).join('\n').trim() } : null;
}

function formatKnowledgeDocument(properties: Record<string, unknown>, body: string): string {
	return `---\n${YAML.stringify(properties).trim()}\n---\n\n${body.trim()}\n`;
}

export const chatController = new ChatController();
