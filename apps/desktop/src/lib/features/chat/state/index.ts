import { writable } from 'svelte/store';
import type { ChatFile, ChatProgress, ChatRun, ConversationMessage, ConversationSummary } from '../types';

export type ChatState = {
	conversations: ConversationSummary[];
	activeConversationId: string | null;
	messages: ConversationMessage[];
	isLoadingHistory: boolean;
	isLoadingMessages: boolean;
	error: string;
	activeProgress: ChatProgress | null;
	runStatus: ChatRun | null;
	createdFilesByMessage: Record<string, ChatFile[]>;
};

export const chatState = writable<ChatState>({ conversations: [], activeConversationId: null, messages: [], isLoadingHistory: false, isLoadingMessages: false, error: '', activeProgress: null, runStatus: null, createdFilesByMessage: {} });
