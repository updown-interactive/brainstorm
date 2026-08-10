import { invoke } from '@tauri-apps/api/core';
import type { FileEntry } from '../../files/state';
import {
	agentDocumentFileNames,
	agentGeneratedFileNames,
	agentManifestFileName,
	createDefaultAgentManifest
} from '../config';
import type {
	AgentCommunicationConfig,
	AgentDocumentKind,
	AgentDocuments,
	AgentGeneratedFiles,
	AgentManifest,
	AgentMemoryConfig,
	AgentPackage,
	AgentStatusType,
	AgentType
} from '../types';

export class AgentRepository {
	async getAgentsRootPath(projectRootPath: string): Promise<string> {
		return `${projectRootPath}/.brainstorm/agents`;
	}

	async discoverAgentPackagePaths(projectRootPath: string): Promise<string[]> {
		const agentsRoot = await this.getAgentsRootPath(projectRootPath);
		try {
			const exists = await invoke<boolean>('path_exists', { path: agentsRoot });
			if (!exists) return [];

			const entries = await invoke<FileEntry[]>('read_dir_entries', { path: agentsRoot });
			return entries
				.filter((entry) => entry.is_dir)
				.map((entry) => entry.path)
				.sort((left, right) => left.localeCompare(right));
		} catch (error) {
			console.error('Failed to discover agent packages:', error);
			return [];
		}
	}

	async loadAgentPackage(packagePath: string): Promise<AgentPackage> {
		const folderName = packagePath.split('/').pop() || 'unknown-agent';
		const manifestPath = `${packagePath}/${agentManifestFileName}`;
		const validationErrors: string[] = [];

		let manifest: AgentManifest = createDefaultAgentManifest(folderName, folderName);

		try {
			const manifestExists = await invoke<boolean>('path_exists', { path: manifestPath });
			if (manifestExists) {
				const manifestRaw = await invoke<string>('read_file', { path: manifestPath });
				manifest = this.parseAgentManifest(manifestRaw, folderName);
			} else {
				validationErrors.push(`Missing ${agentManifestFileName} manifest.`);
			}
		} catch (error) {
			validationErrors.push(`Failed to read ${agentManifestFileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		const documents: AgentDocuments = {
			system: await this.readOptionalFile(`${packagePath}/${manifest.documents?.system || agentDocumentFileNames.system}`),
			role: await this.readOptionalFile(`${packagePath}/${manifest.documents?.role || agentDocumentFileNames.role}`),
			memory: await this.readOptionalFile(`${packagePath}/${manifest.documents?.memory || agentDocumentFileNames.memory}`),
			skills: await this.readOptionalFile(`${packagePath}/${manifest.documents?.skills || agentDocumentFileNames.skills}`),
			tools: await this.readOptionalFile(`${packagePath}/${manifest.documents?.tools || agentDocumentFileNames.tools}`),
			rules: await this.readOptionalFile(`${packagePath}/${manifest.documents?.rules || agentDocumentFileNames.rules}`),
			workflow: await this.readOptionalFile(`${packagePath}/${manifest.documents?.workflow || agentDocumentFileNames.workflow}`),
			communication: await this.readOptionalFile(`${packagePath}/${manifest.documents?.communication || agentDocumentFileNames.communication}`),
			prompts: await this.readOptionalFile(`${packagePath}/${manifest.documents?.prompts || agentDocumentFileNames.prompts}`),
			knowledge: await this.readOptionalFile(`${packagePath}/${manifest.documents?.knowledge || agentDocumentFileNames.knowledge}`)
		};

		const generated: AgentGeneratedFiles = {
			status: await this.readOptionalFile(`${packagePath}/${agentGeneratedFileNames.status}`),
			tasks: await this.readOptionalFile(`${packagePath}/${agentGeneratedFileNames.tasks}`),
			history: await this.readOptionalFile(`${packagePath}/${agentGeneratedFileNames.history}`)
		};

		const assetsPath = `${packagePath}/assets`;
		const hasAssetsDir = await this.pathExists(assetsPath);
		const avatarPath = `${assetsPath}/avatar.png`;
		const bannerPath = `${assetsPath}/banner.png`;

		const assets = {
			avatarPath: (await this.pathExists(avatarPath)) ? avatarPath : undefined,
			bannerPath: (await this.pathExists(bannerPath)) ? bannerPath : undefined
		};

		if (!hasAssetsDir) {
			validationErrors.push('Missing assets directory.');
		}

		return {
			id: manifest.id || folderName,
			packagePath,
			manifest,
			documents,
			generated,
			assets,
			isValid: validationErrors.length === 0,
			validationErrors
		};
	}

	async saveDocument(packagePath: string, docKind: AgentDocumentKind, content: string): Promise<void> {
		const fileName = agentDocumentFileNames[docKind];
		const filePath = `${packagePath}/${fileName}`;
		await invoke('write_file', { path: filePath, content });
	}

	async saveManifest(packagePath: string, manifest: AgentManifest): Promise<void> {
		const filePath = `${packagePath}/${agentManifestFileName}`;
		const content = this.serializeAgentManifest(manifest);
		await invoke('write_file', { path: filePath, content });
	}

	async saveGeneratedState(packagePath: string, stateKind: keyof AgentGeneratedFiles, content: string): Promise<void> {
		const fileName = agentGeneratedFileNames[stateKind];
		const filePath = `${packagePath}/${fileName}`;
		await invoke('write_file', { path: filePath, content });
	}

	async createAgentPackage(projectRootPath: string, agentId: string, name: string): Promise<AgentPackage> {
		const agentsRoot = await this.getAgentsRootPath(projectRootPath);
		const packagePath = `${agentsRoot}/${agentId}`;

		await invoke('create_dir', { path: packagePath });
		await invoke('create_dir', { path: `${packagePath}/assets` });

		const manifest = createDefaultAgentManifest(agentId, name);
		await this.saveManifest(packagePath, manifest);

		for (const [kind, fileName] of Object.entries(agentDocumentFileNames)) {
			const docTitle = kind.toUpperCase();
			const initialContent = `# ${docTitle}\n\nDocumentation for ${name} (${docTitle}).\n`;
			await invoke('write_file', { path: `${packagePath}/${fileName}`, content: initialContent });
		}

		await invoke('write_file', { path: `${packagePath}/${agentGeneratedFileNames.status}`, content: `# STATUS\n\n- Status: idle\n- Active Tasks: 0\n` });
		await invoke('write_file', { path: `${packagePath}/${agentGeneratedFileNames.tasks}`, content: `# TASKS\n\nNo active tasks.\n` });
		await invoke('write_file', { path: `${packagePath}/${agentGeneratedFileNames.history}`, content: `# HISTORY\n\n- [Created] Agent package ${name} initialized.\n` });

		return this.loadAgentPackage(packagePath);
	}

	private async readOptionalFile(path: string): Promise<string> {
		try {
			const exists = await invoke<boolean>('path_exists', { path });
			if (!exists) return '';
			return await invoke<string>('read_file', { path });
		} catch {
			return '';
		}
	}

	private async pathExists(path: string): Promise<boolean> {
		try {
			return await invoke<boolean>('path_exists', { path });
		} catch {
			return false;
		}
	}

	private parseAgentManifest(yamlContent: string, fallbackId: string): AgentManifest {
		const defaults = createDefaultAgentManifest(fallbackId, fallbackId);

		const id = this.getYamlScalar(yamlContent, 'id') || defaults.id;
		const name = this.getYamlScalar(yamlContent, 'name') || defaults.name;
		const displayName = this.getYamlScalar(yamlContent, 'display_name') || defaults.display_name;
		const version = this.getYamlScalar(yamlContent, 'version') || defaults.version;
		const description = this.getYamlBlockOrScalar(yamlContent, 'description') || defaults.description;
		const type = (this.getYamlScalar(yamlContent, 'type') as AgentType) || defaults.type;
		const role = this.getYamlScalar(yamlContent, 'role') || defaults.role;

		const color = this.getYamlScalar(yamlContent, 'color') || defaults.color;
		const avatar = this.getYamlScalar(yamlContent, 'avatar') || defaults.avatar;
		const banner = this.getYamlScalar(yamlContent, 'banner') || undefined;
		const icon = this.getYamlScalar(yamlContent, 'icon') || defaults.icon;

		const enabled = this.getYamlBoolean(yamlContent, 'enabled', defaults.enabled);
		const priority = this.getYamlNumber(yamlContent, 'priority', defaults.priority);
		const canDelegate = this.getYamlBoolean(yamlContent, 'can_delegate', defaults.can_delegate);
		const parallelExecution = this.getYamlBoolean(yamlContent, 'parallel_execution', defaults.parallel_execution);
		const maxConcurrentTasks = this.getYamlNumber(yamlContent, 'max_concurrent_tasks', defaults.max_concurrent_tasks);
		const defaultStatus = (this.getYamlScalar(yamlContent, 'default_status') as AgentStatusType) || defaults.default_status;

		const delegates = this.getYamlList(yamlContent, 'delegates');
		const permissions = this.getYamlList(yamlContent, 'permissions');
		const aliases = this.getYamlList(yamlContent, 'aliases');
		const capabilities = this.getYamlList(yamlContent, 'capabilities');
		const allowedTools = this.getYamlList(yamlContent, 'allowed_tools');

		const memory: AgentMemoryConfig = {
			type: (this.getYamlNestedScalar(yamlContent, 'memory', 'type') as AgentMemoryConfig['type']) || defaults.memory.type,
			persistence: (this.getYamlNestedScalar(yamlContent, 'memory', 'persistence') as AgentMemoryConfig['persistence']) || defaults.memory.persistence,
			writable: this.getYamlNestedBoolean(yamlContent, 'memory', 'writable', defaults.memory.writable),
			searchable: this.getYamlNestedBoolean(yamlContent, 'memory', 'searchable', defaults.memory.searchable)
		};

		const communication: AgentCommunicationConfig = {
			protocol: this.getYamlNestedScalar(yamlContent, 'communication', 'protocol') || defaults.communication.protocol,
			accepts_tasks: this.getYamlNestedBoolean(yamlContent, 'communication', 'accepts_tasks', defaults.communication.accepts_tasks),
			broadcasts_events: this.getYamlNestedBoolean(yamlContent, 'communication', 'broadcasts_events', defaults.communication.broadcasts_events)
		};

		const documents = {
			system: this.getYamlNestedScalar(yamlContent, 'documents', 'system') || agentDocumentFileNames.system,
			role: this.getYamlNestedScalar(yamlContent, 'documents', 'role') || agentDocumentFileNames.role,
			workflow: this.getYamlNestedScalar(yamlContent, 'documents', 'workflow') || agentDocumentFileNames.workflow,
			rules: this.getYamlNestedScalar(yamlContent, 'documents', 'rules') || agentDocumentFileNames.rules,
			communication: this.getYamlNestedScalar(yamlContent, 'documents', 'communication') || agentDocumentFileNames.communication,
			memory: this.getYamlNestedScalar(yamlContent, 'documents', 'memory') || agentDocumentFileNames.memory,
			prompts: this.getYamlNestedScalar(yamlContent, 'documents', 'prompts') || agentDocumentFileNames.prompts,
			skills: this.getYamlNestedScalar(yamlContent, 'documents', 'skills') || agentDocumentFileNames.skills,
			tools: this.getYamlNestedScalar(yamlContent, 'documents', 'tools') || agentDocumentFileNames.tools,
			knowledge: this.getYamlNestedScalar(yamlContent, 'documents', 'knowledge') || agentDocumentFileNames.knowledge
		};

		return {
			id,
			name,
			display_name: displayName,
			version,
			description,
			type,
			role,
			color,
			avatar,
			banner,
			icon,
			enabled,
			priority,
			can_delegate: canDelegate,
			parallel_execution: parallelExecution,
			max_concurrent_tasks: maxConcurrentTasks,
			default_status: defaultStatus,
			delegates,
			memory,
			communication,
			permissions,
			documents,
			aliases: aliases.length > 0 ? aliases : undefined,
			capabilities: capabilities.length > 0 ? capabilities : undefined,
			allowed_tools: allowedTools.length > 0 ? allowedTools : undefined
		};
	}

	private serializeAgentManifest(m: AgentManifest): string {
		const lines: string[] = [
			`id: ${m.id}`,
			`name: ${m.name}`,
			`display_name: ${m.display_name}`,
			`version: ${m.version}`,
			`description: ${m.description}`,
			'',
			`type: ${m.type}`,
			`role: ${m.role}`,
			'',
			m.aliases && m.aliases.length > 0 ? 'aliases:' : '',
			...(m.aliases && m.aliases.length > 0 ? m.aliases.map((a) => `  - ${a}`) : []),
			m.capabilities && m.capabilities.length > 0 ? 'capabilities:' : '',
			...(m.capabilities && m.capabilities.length > 0 ? m.capabilities.map((c) => `  - ${c}`) : []),
			m.allowed_tools && m.allowed_tools.length > 0 ? 'allowed_tools:' : '',
			...(m.allowed_tools && m.allowed_tools.length > 0 ? m.allowed_tools.map((t) => `  - ${t}`) : []),
			'',
			`color: "${m.color}"`,
			`avatar: ${m.avatar}`,
			m.banner ? `banner: ${m.banner}` : '',
			`icon: ${m.icon}`,
			'',
			`enabled: ${m.enabled}`,
			`priority: ${m.priority}`,
			`can_delegate: ${m.can_delegate}`,
			`parallel_execution: ${m.parallel_execution}`,
			`max_concurrent_tasks: ${m.max_concurrent_tasks}`,
			`default_status: ${m.default_status}`,
			'',
			'delegates:',
			...(m.delegates.length > 0 ? m.delegates.map((d) => `  - ${d}`) : ['  # none']),
			'',
			'memory:',
			`  type: ${m.memory.type}`,
			`  persistence: ${m.memory.persistence}`,
			`  writable: ${m.memory.writable}`,
			`  searchable: ${m.memory.searchable}`,
			'',
			'communication:',
			`  protocol: ${m.communication.protocol}`,
			`  accepts_tasks: ${m.communication.accepts_tasks}`,
			`  broadcasts_events: ${m.communication.broadcasts_events}`,
			'',
			'permissions:',
			...(m.permissions.length > 0 ? m.permissions.map((p) => `  - ${p}`) : ['  # none']),
			'',
			'documents:',
			`  system: ${m.documents.system}`,
			`  role: ${m.documents.role}`,
			`  workflow: ${m.documents.workflow}`,
			`  rules: ${m.documents.rules}`,
			`  communication: ${m.documents.communication}`,
			`  memory: ${m.documents.memory}`,
			`  prompts: ${m.documents.prompts}`,
			`  skills: ${m.documents.skills}`,
			`  tools: ${m.documents.tools}`,
			`  knowledge: ${m.documents.knowledge}`
		];

		return lines.filter((line, index) => line !== '' || lines[index - 1] !== '').join('\n') + '\n';
	}

	private getYamlScalar(content: string, key: string): string {
		const line = content.split('\n').find((item) => item.trimStart().startsWith(`${key}:`));
		if (!line) return '';
		return line.slice(line.indexOf(':') + 1).trim().replace(/^["']|["']$/g, '');
	}

	private getYamlBlockOrScalar(content: string, key: string): string {
		const lines = content.split('\n');
		const keyIndex = lines.findIndex((line) => line.trimStart().startsWith(`${key}:`));
		if (keyIndex === -1) return '';

		const line = lines[keyIndex];
		if (!line.includes('|') && !line.includes('>')) {
			return this.getYamlScalar(content, key);
		}

		const blockLines: string[] = [];
		for (const l of lines.slice(keyIndex + 1)) {
			if (l.trim() === '') {
				blockLines.push('');
				continue;
			}
			if (!l.startsWith(' ')) break;
			blockLines.push(l.trim());
		}

		return blockLines.join('\n').trim();
	}

	private getYamlBoolean(content: string, key: string, defaultValue: boolean): boolean {
		const val = this.getYamlScalar(content, key);
		if (val === 'true') return true;
		if (val === 'false') return false;
		return defaultValue;
	}

	private getYamlNumber(content: string, key: string, defaultValue: number): number {
		const val = this.getYamlScalar(content, key);
		const parsed = Number(val);
		return isNaN(parsed) ? defaultValue : parsed;
	}

	private getYamlList(content: string, key: string): string[] {
		const lines = content.split('\n');
		const keyIndex = lines.findIndex((line) => line.trim() === `${key}:`);
		if (keyIndex === -1) return [];

		const items: string[] = [];
		for (const line of lines.slice(keyIndex + 1)) {
			if (line.trim() === '' || line.trim().startsWith('#')) continue;
			if (!line.startsWith(' ')) break;
			const trimmed = line.trim();
			if (trimmed.startsWith('- ')) {
				items.push(trimmed.slice(2).trim());
			}
		}

		return items;
	}

	private getYamlNestedScalar(content: string, parentKey: string, childKey: string): string {
		const lines = content.split('\n');
		const parentIndex = lines.findIndex((line) => line.trim() === `${parentKey}:`);
		if (parentIndex === -1) return '';

		for (const line of lines.slice(parentIndex + 1)) {
			if (line.trim() === '' || line.trim().startsWith('#')) continue;
			if (!line.startsWith(' ')) break;
			const trimmed = line.trim();
			if (trimmed.startsWith(`${childKey}:`)) {
				return trimmed.slice(trimmed.indexOf(':') + 1).trim().replace(/^["']|["']$/g, '');
			}
		}

		return '';
	}

	private getYamlNestedBoolean(content: string, parentKey: string, childKey: string, defaultValue: boolean): boolean {
		const val = this.getYamlNestedScalar(content, parentKey, childKey);
		if (val === 'true') return true;
		if (val === 'false') return false;
		return defaultValue;
	}
}

export const agentRepository = new AgentRepository();
