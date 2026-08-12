import { invoke } from '@tauri-apps/api/core';
import type { Conversation, ConversationHistory, ConversationMessage, ConversationSummary, MessageRole, MessageStatus } from '../types';

type ProjectRequest = { projectId: string; conversationId: string };

export const conversationService = {
	list: (projectId: string): Promise<ConversationHistory> => invoke('get_conversation_history', { request: { projectId, limit: 100, offset: 0, includeArchived: false } }),
	get: (request: ProjectRequest): Promise<[Conversation, ConversationMessage[]]> => invoke('get_conversation', { request }),
	create: (projectId: string): Promise<Conversation> => invoke('create_conversation', { request: { projectId } }),
	setActive: (request: ProjectRequest): Promise<void> => invoke('set_active_conversation', { request }),
	addMessage: (request: { projectId: string; conversationId: string; role: MessageRole; content: string; status?: MessageStatus; provider?: string; model?: string }): Promise<ConversationMessage> => invoke('add_conversation_message', { request }),
	rename: (request: ProjectRequest & { title: string }): Promise<Conversation> => invoke('rename_conversation', { request }),
	remove: (request: ProjectRequest): Promise<void> => invoke('delete_conversation', { request })
,
	sendMessage: (request: { projectId: string; conversationId?: string; content: string; providerConfigId?: string; model?: string }): Promise<{ conversationId: string; message: ConversationMessage }> => invoke('chat_send_message', { request })
};
