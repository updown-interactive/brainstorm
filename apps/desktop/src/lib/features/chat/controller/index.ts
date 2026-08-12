import { get } from 'svelte/store';
import { projectStore } from '../../../core/stores/projectStore';
import { conversationService } from '../data/conversation-service';
import { chatState } from '../state';
import type { ChatStreamEvent } from '../types';

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
		chatState.update((state) => ({ ...state, isLoadingMessages: true, activeConversationId: conversationId }));
		try {
			const [, messages] = await conversationService.get({ projectId, conversationId });
			await conversationService.setActive({ projectId, conversationId });
			chatState.update((state) => ({ ...state, messages, isLoadingMessages: false }));
		} catch (error) {
			chatState.update((state) => ({ ...state, isLoadingMessages: false, error: error instanceof Error ? error.message : 'Failed to load conversation.' }));
		}
	}

	async create(projectId: string): Promise<void> {
		const conversation = await conversationService.create(projectId);
		chatState.update((state) => ({ ...state, conversations: [{ id: conversation.id, title: conversation.title, model: conversation.model, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt, lastMessageAt: null, messageCount: 0 }, ...state.conversations], activeConversationId: conversation.id, messages: [] }));
	}

	async send(projectId: string, content: string, providerConfigId?: string, model?: string): Promise<void> {
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
			chatState.update((state) => ({ ...state, error: error instanceof Error ? error.message : 'Unable to generate a response.' }));
		}
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
			return { ...state, activeConversationId: event.conversationId, messages };
		});
	}

	async remove(projectId: string, conversationId: string): Promise<void> {
		await conversationService.remove({ projectId, conversationId });
		await this.loadForProject(projectId);
	}
}

export const chatController = new ChatController();
