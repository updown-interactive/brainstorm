import { get } from 'svelte/store';
import { projectStore } from '../../../core/stores/projectStore';
import { conversationService } from '../data/conversation-service';
import { chatState } from '../state';
import { filesController } from '$lib/features/files/controller';
import { shellController } from '$lib/features/shell/controller/controller';
import type { ChatProgress, ChatStreamEvent } from '../types';

class ChatController {
	async loadForProject(projectId: string): Promise<void> {
		chatState.update((state) => ({ ...state, isLoadingHistory: true, error: '' }));
		try {
			const history = await conversationService.list(projectId);
			const preferredConversationId = projectStore.getCurrentProject()?.last_conversation_id;
			const activeConversationId = preferredConversationId && history.conversations.some((conversation) => conversation.id === preferredConversationId)
				? preferredConversationId
				: get(chatState).activeConversationId && history.conversations.some((conversation) => conversation.id === get(chatState).activeConversationId)
					? get(chatState).activeConversationId
				: history.conversations[0]?.id ?? null;
			chatState.update((state) => ({ ...state, conversations: history.conversations, activeConversationId, isLoadingHistory: false }));
			if (activeConversationId) await this.select(projectId, activeConversationId);
		} catch (error) {
			chatState.update((state) => ({ ...state, isLoadingHistory: false, error: error instanceof Error ? error.message : 'Failed to load conversation history.' }));
		}
	}

	async select(projectId: string, conversationId: string): Promise<void> {
		chatState.update((state) => ({ ...state, isLoadingMessages: true, activeConversationId: conversationId, activeProgress: null, runStatus: state.activeConversationId === conversationId ? state.runStatus : null }));
		try {
			const [, messages] = await conversationService.get({ projectId, conversationId });
			await conversationService.setActive({ projectId, conversationId });
			const restoredRun = [...messages].reverse().find((message) => message.metadata?.workingHistory)?.metadata?.workingHistory ?? null;
			const restoredFiles = messages.reduce<Record<string, import('../types').ChatFile[]>>((files, message) => {
				const createdFiles = message.metadata?.createdFiles;
				if (createdFiles?.length) files[message.id] = createdFiles;
				return files;
			}, {});
			chatState.update((state) => ({ ...state, messages, isLoadingMessages: false, runStatus: restoredRun, createdFilesByMessage: restoredFiles }));
		} catch (error) {
			chatState.update((state) => ({ ...state, isLoadingMessages: false, error: error instanceof Error ? error.message : 'Failed to load conversation.' }));
		}
	}

	async create(projectId: string): Promise<void> {
		const conversation = await conversationService.create(projectId);
		chatState.update((state) => ({ ...state, conversations: [{ id: conversation.id, title: conversation.title, model: conversation.model, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt, lastMessageAt: null, messageCount: 0 }, ...state.conversations], activeConversationId: conversation.id, messages: [], activeProgress: null, runStatus: null, createdFilesByMessage: {} }));
	}

	async send(projectId: string, content: string, providerConfigId?: string, model?: string): Promise<void> {
		this.startRun();
		chatState.update((state) => ({ ...state, error: '' }));
		chatState.update((state) => ({
			...state,
			messages: [...state.messages, {
				id: `local-user-${Date.now()}`,
				conversationId: state.activeConversationId ?? '',
				role: 'user',
				content,
				status: 'completed',
				provider: providerConfigId ?? null,
				model: model ?? null,
				createdAt: Date.now(),
				updatedAt: null
			}]
		}));
		try {
			const response = await conversationService.sendMessage({ projectId, conversationId: get(chatState).activeConversationId ?? undefined, content, providerConfigId, model });
			chatState.update((state) => ({ ...state, activeConversationId: response.conversationId }));
			await this.loadForProject(projectId);
		} catch (error) {
			console.error('[chat] send failed', error);
			chatState.update((state) => ({ ...state, activeProgress: null, runStatus: state.runStatus ? { ...state.runStatus, completedAt: Date.now(), durationMs: Date.now() - state.runStatus.startedAt } : null, error: error instanceof Error ? error.message : 'Unable to generate a response.' }));
		}
	}

	startRun(): void {
		const startedAt = Date.now();
		const thinking: ChatProgress = { phase: 'thinking', toolName: null };
		chatState.update((state) => ({ ...state, activeProgress: thinking, runStatus: { startedAt, durationMs: 0, completedAt: null, steps: [thinking] } }));
	}

	applyProgress(progress: ChatProgress, conversationId: string): void {
		chatState.update((state) => {
			const runStatus = state.runStatus ?? { startedAt: Date.now(), durationMs: 0, completedAt: null, steps: [] };
			const previousStep = runStatus.steps.at(-1);
			const isDuplicate = previousStep?.phase === progress.phase && previousStep.toolName === progress.toolName;
			return { ...state, activeConversationId: conversationId, activeProgress: progress, runStatus: { ...runStatus, durationMs: Date.now() - runStatus.startedAt, steps: isDuplicate ? runStatus.steps : [...runStatus.steps, progress] } };
		});
	}

	applyStreamEvent(event: ChatStreamEvent): void {
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
			const runStatus = state.runStatus && event.done ? { ...state.runStatus, completedAt: Date.now(), durationMs: Date.now() - state.runStatus.startedAt } : state.runStatus;
			const createdFilesByMessage = event.createdFiles?.length && event.message
				? { ...state.createdFilesByMessage, [event.message.id]: event.createdFiles }
				: state.createdFilesByMessage;
			return { ...state, activeConversationId: event.conversationId, messages, activeProgress: event.done ? null : state.activeProgress, runStatus, createdFilesByMessage };
		});
	}

	openCreatedFile(path: string, name: string): void {
		filesController.openFile(path, name);
		shellController.switchTab('files');
	}

	async remove(projectId: string, conversationId: string): Promise<void> {
		await conversationService.remove({ projectId, conversationId });
		await this.loadForProject(projectId);
	}
}

export const chatController = new ChatController();
