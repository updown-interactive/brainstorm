export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled';
export type ChatMode = 'normal' | 'plan' | 'research';

export type PlanOption = {
	id: string;
	title: string;
	description: string;
	prompt: string;
};

export type PlanSelectionMode = 'single' | 'multiple';

export type PlanResponse = {
	options: PlanOption[];
	selectionMode: PlanSelectionMode;
};

export const CHAT_MODES: readonly ChatMode[] = ['normal', 'plan', 'research'];

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
	metadata?: { knowledge?: KnowledgeContext };
};

export type ConversationHistory = { conversations: ConversationSummary[]; total: number };

export type ChatStreamEvent = {
	conversationId: string;
	messageId: string;
	delta: string;
	done: boolean;
	message: ConversationMessage | null;
	knowledge: KnowledgeContext | null;
};

export type KnowledgeContext = {
	query: string;
	results: Array<{ filePath: string; title: string; chunk: string; relevanceScore: number }>;
	sources: string[];
	confidence: number;
	retrievedAt: number;
};
