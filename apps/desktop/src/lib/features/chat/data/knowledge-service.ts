import { invoke } from '@tauri-apps/api/core';

type ToolRequest = {
	operation: string;
	projectPath: string;
	path: string;
	content?: string;
	properties?: Record<string, unknown>;
};

export type KnowledgeDraft = {
	title: string;
	properties: Record<string, unknown>;
	content: string;
};

export const knowledgeService = {
	generate: async (request: { providerConfigId?: string; model?: string; title: string; response: string; projectPath: string }): Promise<KnowledgeDraft> => {
		return invoke<KnowledgeDraft>('chat_generate_knowledge', { request });
	},
	createFolder: async (projectPath: string, relativePath: string): Promise<void> => {
		await invoke('vault_execute', { request: { operation: 'vault.create_folder', projectPath, path: relativePath } });
	},

	createMarkdown: async (request: Omit<ToolRequest, 'operation'>): Promise<{ path: string }> => {
		try {
			return await invoke<{ path: string }>('markdown_execute', { request: { operation: 'markdown.create', ...request } });
		} catch (error) {
			console.error('[Chat knowledge] markdown.create failed', {
				projectPath: request.projectPath,
				path: request.path,
				hasProperties: Boolean(request.properties),
				hasContent: Boolean(request.content?.trim()),
				error
			});
			throw error;
		}
	},
	readMarkdown: async (projectPath: string, path: string): Promise<string> => {
		const result = await invoke<{ body?: string; content?: string }>('markdown_execute', {
			request: { operation: 'markdown.read', projectPath, path }
		});
		return result.content ?? result.body ?? '';
	},

	move: async (projectPath: string, source: string, destination: string): Promise<void> => {
		await invoke('vault_execute', { request: { operation: 'vault.move', projectPath, source, destination } });
	},

	delete: async (projectPath: string, path: string): Promise<void> => {
		await invoke('vault_execute', { request: { operation: 'vault.delete', projectPath, path } });
	}
};
