import { writable } from 'svelte/store';
import type { ConversationMessage, ConversationSummary } from '../types';

export type ChatState = {
	conversations: ConversationSummary[];
	activeConversationId: string | null;
	messages: ConversationMessage[];
	isLoadingHistory: boolean;
	isLoadingMessages: boolean;
	error: string;
};

export const chatState = writable<ChatState>({ conversations: [], activeConversationId: null, messages: [], isLoadingHistory: false, isLoadingMessages: false, error: '' });
