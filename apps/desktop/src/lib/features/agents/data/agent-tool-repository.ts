import { invoke } from '@tauri-apps/api/core';

export interface AgentToolSchema {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
	permissions: string[];
}

export interface AgentToolCall {
	name: string;
	arguments?: Record<string, unknown>;
}

export class AgentToolRepository {
	async list(projectPath: string, agentId: string): Promise<AgentToolSchema[]> {
		return invoke<AgentToolSchema[]>('tool_list_for_agent', {
			projectPath,
			agentId
		});
	}

	async execute<T>(
		projectPath: string,
		agentId: string,
		call: AgentToolCall
	): Promise<T> {
		return invoke<T>('tool_execute', {
			projectPath,
			agentId,
			call: {
				name: call.name,
				arguments: call.arguments ?? {}
			}
		});
	}
}
