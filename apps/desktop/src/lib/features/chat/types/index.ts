export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled';

export type Conversation = {
	id: string;
	projectId: string;
	title: string;
	agentId: string | null;
	providerConfigId: string | null;
	model: string | null;
	createdAt: number;
	updatedAt: number;
	lastMessageAt: number | null;
	archived: boolean;
};

export type ConversationSummary = {
	id: string;
	title: string;
	agentId: string | null;
	model: string | null;
	createdAt: number;
	updatedAt: number;
	lastMessageAt: number | null;
	messageCount: number;
};

export type ConversationMessage = {
	id: string;
	conversationId: string;
	role: MessageRole;
	content: string;
	status: MessageStatus;
	provider: string | null;
	model: string | null;
	createdAt: number;
	updatedAt: number | null;
};

export type ConversationHistory = { conversations: ConversationSummary[]; total: number };

export type ChatStreamEvent = {
	conversationId: string;
	messageId: string;
	delta: string;
	done: boolean;
	message: ConversationMessage | null;
};
