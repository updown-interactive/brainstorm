import type { AgentDocumentKind, AgentGeneratedKind, AgentManifest } from '../types';

export const agentManifestFileName = 'agent.yaml';

export const agentDocumentFileNames: Record<AgentDocumentKind, string> = {
	system: 'SYSTEM.md',
	role: 'ROLE.md',
	memory: 'MEMORY.md',
	skills: 'SKILLS.md',
	tools: 'TOOLS.md',
	rules: 'RULES.md',
	workflow: 'WORKFLOW.md',
	communication: 'COMMUNICATION.md',
	prompts: 'PROMPTS.md',
	knowledge: 'KNOWLEDGE.md'
};

export const agentGeneratedFileNames: Record<AgentGeneratedKind, string> = {
	status: 'STATUS.md',
	tasks: 'TASKS.md',
	history: 'HISTORY.md'
};

export const agentAssetFileNames = [
	'avatar.png',
	'idle.png',
	'thinking.png',
	'working.png',
	'offline.png',
	'banner.png'
] as const;

export const defaultAgentColors = [
	'#FF9B08',
	'#4CAF50',
	'#2979FF',
	'#E91E63',
	'#9C27B0',
	'#00BCD4',
	'#FF5722',
	'#607D8B'
];

export const defaultAgentIcons = [
	'brain',
	'book',
	'calendar',
	'terminal',
	'database',
	'code',
	'sparkles',
	'bot'
];

export function createDefaultAgentManifest(id: string, name: string): AgentManifest {
	return {
		id,
		name,
		display_name: name.charAt(0).toUpperCase() + name.slice(1),
		version: '1.0.0',
		description: `Specialized agent ${name}`,
		type: 'automation',
		role: 'Specialist Agent',
		color: '#2979FF',
		avatar: 'assets/avatar.png',
		banner: 'assets/banner.png',
		icon: 'bot',
		enabled: true,
		priority: 50,
		can_delegate: false,
		parallel_execution: true,
		max_concurrent_tasks: 5,
		default_status: 'idle',
		delegates: [],
		memory: {
			type: 'shared',
			persistence: 'session',
			writable: true,
			searchable: true
		},
		communication: {
			protocol: 'internal',
			accepts_tasks: true,
			broadcasts_events: true
		},
		permissions: ['read_workspace'],
		documents: {
			system: 'SYSTEM.md',
			role: 'ROLE.md',
			workflow: 'WORKFLOW.md',
			rules: 'RULES.md',
			communication: 'COMMUNICATION.md',
			memory: 'MEMORY.md',
			prompts: 'PROMPTS.md',
			skills: 'SKILLS.md',
			tools: 'TOOLS.md',
			knowledge: 'KNOWLEDGE.md'
		}
	};
}
