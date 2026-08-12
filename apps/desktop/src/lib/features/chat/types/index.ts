export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled';

export type Conversation = {
	id: string;
	projectId: string;
	title: string;
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
	metadata?: { workingHistory?: ChatRun; createdFiles?: ChatFile[] } | null;
};

export type ConversationHistory = { conversations: ConversationSummary[]; total: number };

export type ChatStreamEvent = {
	conversationId: string;
	messageId: string;
	delta: string;
	done: boolean;
	message: ConversationMessage | null;
	progress: ChatProgress | null;
	createdFiles: ChatFile[] | null;
};

export type ChatFile = { path: string; name: string };

export type ChatProgress = {
	phase: 'thinking' | 'calling_tool' | 'tool_completed';
	toolName: string | null;
};

export type ChatRun = {
	startedAt: number;
	durationMs: number;
	completedAt: number | null;
	steps: ChatProgress[];
};
