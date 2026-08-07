export type AgentType =
	| 'orchestrator'
	| 'knowledge'
	| 'planning'
	| 'memory'
	| 'coding'
	| 'research'
	| 'design'
	| 'automation';

export type AgentMemoryType = 'shared' | 'private' | 'hybrid';
export type AgentMemoryPersistence = 'session' | 'persistent' | 'transient';

export type AgentStatusType = 'idle' | 'working' | 'thinking' | 'offline';

export interface AgentMemoryConfig {
	type: AgentMemoryType;
	persistence: AgentMemoryPersistence;
	writable: boolean;
	searchable: boolean;
}

export interface AgentCommunicationConfig {
	protocol: string;
	accepts_tasks: boolean;
	broadcasts_events: boolean;
}

export interface AgentVisualIdentity {
	color: string;
	avatar: string;
	banner?: string;
	icon: string;
}

export interface AgentRuntimeConfig {
	enabled: boolean;
	priority: number;
	can_delegate: boolean;
	parallel_execution: boolean;
	max_concurrent_tasks: number;
	default_status: AgentStatusType;
}

export interface AgentDocumentReferences {
	system: string;
	role: string;
	workflow: string;
	rules: string;
	communication: string;
	memory: string;
	prompts: string;
	skills: string;
	tools: string;
	knowledge: string;
}

export interface AgentManifest {
	id: string;
	name: string;
	display_name: string;
	version: string;
	description: string;
	type: AgentType;
	role: string;
	color: string;
	avatar: string;
	banner?: string;
	icon: string;
	enabled: boolean;
	priority: number;
	can_delegate: boolean;
	parallel_execution: boolean;
	max_concurrent_tasks: number;
	default_status: AgentStatusType;
	delegates: string[];
	memory: AgentMemoryConfig;
	communication: AgentCommunicationConfig;
	permissions: string[];
	documents: AgentDocumentReferences;
}

export type AgentDocumentKind =
	| 'system'
	| 'role'
	| 'memory'
	| 'skills'
	| 'tools'
	| 'rules'
	| 'workflow'
	| 'communication'
	| 'prompts'
	| 'knowledge';

export type AgentGeneratedKind = 'status' | 'tasks' | 'history';

export interface AgentDocuments {
	system: string;
	role: string;
	memory: string;
	skills: string;
	tools: string;
	rules: string;
	workflow: string;
	communication: string;
	prompts: string;
	knowledge: string;
}

export interface AgentGeneratedFiles {
	status: string;
	tasks: string;
	history: string;
}

export interface AgentAssets {
	avatarPath?: string;
	idlePath?: string;
	thinkingPath?: string;
	workingPath?: string;
	offlinePath?: string;
	bannerPath?: string;
}

export interface AgentPackage {
	id: string;
	packagePath: string;
	manifest: AgentManifest;
	documents: AgentDocuments;
	generated: AgentGeneratedFiles;
	assets: AgentAssets;
	isValid: boolean;
	validationErrors: string[];
}
