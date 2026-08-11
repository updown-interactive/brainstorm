import { invoke } from '@tauri-apps/api/core';
import { get, writable } from 'svelte/store';
import {
	clampExplorerSidebarWidth,
	configurationFolderName,
	ensureExplorerConfigPath,
	explorerConfigFileName,
	legacyConfigFileName,
	maxExplorerSidebarWidth,
	minExplorerSidebarWidth,
	normalizeExplorerConfig,
	readExplorerConfig,
	writeExplorerConfig,
	type ExplorerConfig,
	type ExplorerPosition
} from '../../files/config/explorer-config';
import { fileTreeState, type FileEntry } from '../../files/state';
import {
	ensurePropertyConfigPath,
	normalizeTagColor,
	normalizeTagName,
	readPropertyConfig,
	saveSharedTags,
	type SharedTag
} from '../../markdown/data/tag-registry';
import { todayString } from '../../markdown/engine/frontmatter';
import { shellState } from '../../shell/state/state';
import { ensureGraphConfigPath, normalizeGraphConfig, readGraphConfig, writeGraphConfig } from '../../graph/config/graph-config';
import { graphConfigFileName, legacyGraphStateFileName } from '../../graph/config/constants';
import type { DisplayRangeKey, ForceRangeKey, GraphConfig } from '../../graph/types';
import { agentRepository, type AgentPackage } from '../../agents';
import {
	defaultEditorConfig,
	editorConfigFileName,
	ensureEditorConfigPath,
	normalizeEditorConfig,
	readEditorConfig,
	writeEditorConfig,
	type EditorConfig,
	type PropertiesDisplayMode
} from '../../markdown/config/editor-config';

export interface ConfigurationFile {
	name: string;
	path: string;
	kind: 'configuration' | 'agent';
}

export interface ConfigurationSection {
	name: string;
	path: string;
	files: ConfigurationFile[];
}

export interface TagFormState {
	name: string;
	color: string;
	description: string;
}

export interface AgentToolGroup {
	name: string;
	tools: string[];
}

export interface AgentView {
	id: string;
	name: string;
	version: string;
	role: string;
	description: string;
	priority: string;
	canDelegate: boolean;
	delegates: string[];
	memoryType: string;
	skills: string[];
	memoryItems: string[];
	toolGroups: AgentToolGroup[];
	systemPrompt: string;
}

export interface ConfigurationState {
	files: ConfigurationFile[];
	sections: ConfigurationSection[];
	selectedPath: string;
	selectedName: string;
	selectedKind: ConfigurationFile['kind'];
	rawContent: string;
	parseError: string;
	showJson: boolean;
	isLoading: boolean;
	showTagForm: boolean;
	editingTagName: string | null;
	tagForm: TagFormState;
	jsonEditorError: string;
	propertyConfig: { tags?: SharedTag[] } | null;
	explorerConfig: ExplorerConfig;
	graphConfig: GraphConfig;
	editorConfig: EditorConfig;
	tags: SharedTag[];
	selectedAgent: AgentView | null;
	selectedAgentPackage: AgentPackage | null;
}

const propertyConfigFileName = 'property-config.json';
const legacyPropertiesSchemaFileName = 'properties-schema.json';
const explorerStateFileName = 'explorer-state.json';
const agentsFolderName = 'agents';
const agentManifestFileName = 'agent.yaml';
const agentSkillFileName = 'SKILL.md';
const agentMemoryFileName = 'MEMORY.md';
const agentToolsFileName = 'TOOLS.md';

class ConfigurationController {
	private readonly state = writable<ConfigurationState>(this.createInitialState());
	private jsonSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	private onConfigChange: () => void = () => {};

	readonly subscribe = this.state.subscribe;
	readonly minExplorerSidebarWidth = minExplorerSidebarWidth;
	readonly maxExplorerSidebarWidth = maxExplorerSidebarWidth;
	readonly propertyConfigFileName = propertyConfigFileName;
	readonly explorerConfigFileName = explorerConfigFileName;
	readonly graphConfigFileName = graphConfigFileName;
	readonly editorConfigFileName = editorConfigFileName;
	readonly graphDisplaySettings: Array<{
		key: DisplayRangeKey;
		label: string;
		description: string;
		min: number;
		max: number;
		step: number;
	}> = [
		{
			key: 'textFadeThreshold',
			label: 'Text Fade Threshold',
			description: 'Controls when labels fade as the graph zooms.',
			min: 0.2,
			max: 1.2,
			step: 0.05
		},
		{
			key: 'nodeSize',
			label: 'Node Size',
			description: 'Scales node radius throughout the graph.',
			min: 0.6,
			max: 2.2,
			step: 0.05
		},
		{
			key: 'linkThickness',
			label: 'Link Thickness',
			description: 'Sets the rendered width of graph links.',
			min: 0.4,
			max: 3,
			step: 0.05
		}
	];
	readonly graphForceSettings: Array<{
		key: ForceRangeKey;
		label: string;
		description: string;
	}> = [
		{
			key: 'center',
			label: 'Center Force',
			description: 'Pulls nodes toward the center of the canvas.'
		},
		{
			key: 'repel',
			label: 'Repel Force',
			description: 'Pushes nodes away from each other.'
		},
		{
			key: 'link',
			label: 'Link Force',
			description: 'Controls how strongly connected nodes pull together.'
		},
		{
			key: 'linkDistance',
			label: 'Link Distance',
			description: 'Adjusts preferred spacing between linked nodes.'
		}
	];

	mount(onConfigChange: () => void): void {
		this.onConfigChange = onConfigChange;
		void this.loadFiles();
	}

	destroy(): void {
		this.flushJsonSave();
		this.onConfigChange = () => {};
	}

	loadFiles = async (): Promise<void> => {
		this.patchState({ isLoading: true, parseError: '' });

		const rootPath = this.projectRootPath();
		const explorerConfigPath = await ensureExplorerConfigPath(rootPath);
		const schemaPath = await ensurePropertyConfigPath(rootPath);
		const graphConfigPath = await ensureGraphConfigPath(rootPath);
		const editorConfigPath = await ensureEditorConfigPath(rootPath);
		const brainstormFolderPath = this.brainstormPath();
		const configurationFolderPath = this.configurationPath();
		if (!brainstormFolderPath || !configurationFolderPath || !schemaPath || !explorerConfigPath || !graphConfigPath || !editorConfigPath) {
			this.patchState({ isLoading: false });
			return;
		}

		try {
			await this.migrateLegacyConfigurationFiles(brainstormFolderPath);
			const entries = await invoke<FileEntry[]>('read_dir_entries', { path: configurationFolderPath });
			let sections = await this.buildConfigurationSections(configurationFolderPath, entries);
			let files = this.flattenSections(sections);

			files = this.ensureFile(files, explorerConfigFileName, explorerConfigPath);
			files = this.ensureFile(files, propertyConfigFileName, schemaPath);
			files = this.ensureFile(files, graphConfigFileName, graphConfigPath);
			files = this.ensureFile(files, editorConfigFileName, editorConfigPath);
			sections = this.buildSectionsFromFiles(configurationFolderPath, files, sections);
			sections = this.compactSections([
				...sections,
				await this.buildAgentSection(brainstormFolderPath)
			]);
			files = this.flattenSections(sections);
			if (files.length === 0) files = [{ name: explorerConfigFileName, path: explorerConfigPath, kind: 'configuration' }];

			const currentSelectedPath = this.snapshot().selectedPath;
			const nextSelection = files.find((file) => file.path === currentSelectedPath)
				?? files.find((file) => file.name === explorerConfigFileName)
				?? files.find((file) => file.name === propertyConfigFileName)
				?? files[0];

			this.patchState({ files, sections });
			await this.selectFile(nextSelection);
		} catch (error) {
			this.patchState({
				parseError: error instanceof Error ? error.message : 'Failed to load .brainstorm files.'
			});
		} finally {
			this.patchState({ isLoading: false });
		}
	};

	selectFile = async (file: ConfigurationFile): Promise<void> => {
		this.flushJsonSave();
		this.patchState({
			selectedPath: file.path,
			selectedName: file.name,
			selectedKind: file.kind,
			parseError: '',
			jsonEditorError: '',
			selectedAgent: null,
			selectedAgentPackage: null,
			showJson: file.kind === 'configuration' ? this.snapshot().showJson : false
		});

		const rootPath = this.projectRootPath();
		try {
			if (file.kind === 'agent') {
				const agentPkg = await agentRepository.loadAgentPackage(file.path);
				const rawContent = await this.readAgentContent(file.path);
				this.patchState({ selectedAgentPackage: agentPkg });
				this.patchContent(rawContent);
			} else {
				const rawContent = file.name === explorerConfigFileName
					? `${JSON.stringify(await readExplorerConfig(rootPath), null, 2)}\n`
					: file.name === propertyConfigFileName
						? `${JSON.stringify(await readPropertyConfig(rootPath), null, 2)}\n`
						: file.name === graphConfigFileName
							? `${JSON.stringify(await readGraphConfig(rootPath), null, 2)}\n`
							: file.name === editorConfigFileName
								? `${JSON.stringify(await readEditorConfig(rootPath), null, 2)}\n`
								: await invoke<string>('read_file', { path: file.path });
				this.patchContent(rawContent);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : `Failed to read ${file.name}.`;
			this.patchContent('');
			this.patchState({ parseError: message, jsonEditorError: message });
		}
	};

	toggleJson = (): void => {
		if (this.snapshot().selectedKind !== 'configuration') return;
		this.patchState({ showJson: !this.snapshot().showJson, parseError: '', jsonEditorError: '' });
	};

	startCreateTag = (): void => {
		this.patchState({
			showTagForm: true,
			editingTagName: null,
			tagForm: this.createEmptyTagForm()
		});
	};

	startEditTag = (tag: SharedTag): void => {
		this.patchState({
			showTagForm: true,
			editingTagName: tag.name,
			tagForm: {
				name: tag.name,
				color: normalizeTagColor(tag.color),
				description: tag.description || ''
			}
		});
	};

	cancelTagEdit = (): void => {
		this.patchState({
			showTagForm: false,
			editingTagName: null,
			tagForm: this.createEmptyTagForm()
		});
	};

	updateTagForm(patch: Partial<TagFormState>): void {
		const tagForm = { ...this.snapshot().tagForm, ...patch };
		if (patch.color) tagForm.color = normalizeTagColor(patch.color);
		this.patchState({ tagForm });
	}

	saveTag = async (): Promise<void> => {
		const state = this.snapshot();
		const name = normalizeTagName(state.tagForm.name);
		if (!name) {
			this.patchState({ parseError: 'Tag name is required.' });
			return;
		}

		const normalizedEditingName = state.editingTagName?.toLocaleLowerCase();
		const duplicate = state.tags.some((tag) => (
			tag.name.toLocaleLowerCase() === name.toLocaleLowerCase()
			&& tag.name.toLocaleLowerCase() !== normalizedEditingName
		));
		if (duplicate) {
			this.patchState({ parseError: `${name} already exists.` });
			return;
		}

		const existing = state.tags.find((tag) => tag.name.toLocaleLowerCase() === normalizedEditingName);
		const nextTag: SharedTag = {
			name,
			color: normalizeTagColor(state.tagForm.color),
			description: state.tagForm.description.trim(),
			created: existing?.created || todayString()
		};

		const nextTags = state.editingTagName
			? state.tags.map((tag) => tag.name === state.editingTagName ? nextTag : tag)
			: [...state.tags, nextTag];

		await saveSharedTags(nextTags, this.projectRootPath());
		await this.selectFile({ name: propertyConfigFileName, path: state.selectedPath, kind: 'configuration' });
		this.cancelTagEdit();
		this.patchState({ parseError: '' });
	};

	saveExplorerPosition = async (position: ExplorerPosition): Promise<void> => {
		const nextConfig = await writeExplorerConfig({ ...this.snapshot().explorerConfig, position }, this.projectRootPath());
		this.patchContent(`${JSON.stringify(nextConfig, null, 2)}\n`);
		this.patchState({ parseError: '' });
		this.onConfigChange();
	};

	saveExplorerSidebarWidth = async (width: number): Promise<void> => {
		const nextConfig = await writeExplorerConfig({
			...this.snapshot().explorerConfig,
			sidebarWidth: clampExplorerSidebarWidth(width)
		}, this.projectRootPath());
		this.patchContent(`${JSON.stringify(nextConfig, null, 2)}\n`);
		this.patchState({ parseError: '' });
		this.onConfigChange();
	};

	saveExplorerShowBrainstormFolder = async (showBrainstormFolder: boolean): Promise<void> => {
		const nextConfig = await writeExplorerConfig({
			...this.snapshot().explorerConfig,
			showBrainstormFolder
		}, this.projectRootPath());
		this.patchContent(`${JSON.stringify(nextConfig, null, 2)}\n`);
		this.patchState({ parseError: '' });
		this.onConfigChange();
	};

	saveGraphDisplayConfig = async (display: Partial<GraphConfig['display']>): Promise<void> => {
		const graphConfig = this.snapshot().graphConfig;
		await this.saveGraphConfig({ ...graphConfig, display: { ...graphConfig.display, ...display } });
	};

	saveGraphForceConfig = async (forces: Partial<GraphConfig['forces']>): Promise<void> => {
		const graphConfig = this.snapshot().graphConfig;
		await this.saveGraphConfig({ ...graphConfig, forces: { ...graphConfig.forces, ...forces } });
	};

	saveGraphPanelConfig = async (panel: Partial<GraphConfig['panel']>): Promise<void> => {
		const graphConfig = this.snapshot().graphConfig;
		await this.saveGraphConfig({ ...graphConfig, panel: { ...graphConfig.panel, ...panel } });
	};

	handleJsonChange = (content: string): void => {
		if (this.snapshot().selectedKind !== 'configuration') return;
		this.patchState({ rawContent: content, parseError: '' });
		this.recomputeDerived(content);

		const validationError = this.validateJson(content);
		if (validationError) {
			this.patchState({ jsonEditorError: validationError });
			this.clearJsonSaveTimeout();
			return;
		}

		this.patchState({ jsonEditorError: '' });
		this.clearJsonSaveTimeout();
		this.jsonSaveTimeout = setTimeout(() => {
			this.jsonSaveTimeout = null;
			void this.saveRawJsonContent();
		}, 400);
	};

	private async migrateLegacyConfigurationFiles(folderPath: string): Promise<void> {
		const explorerStatePath = `${folderPath}/${explorerStateFileName}`;
		const legacyGraphStatePath = `${folderPath}/${legacyGraphStateFileName}`;
		const graphConfigPath = `${folderPath}/${graphConfigFileName}`;

		try {
			const legacyGraphStateExists = await invoke<boolean>('path_exists', { path: legacyGraphStatePath });
			if (legacyGraphStateExists) {
				const graphConfigExists = await invoke<boolean>('path_exists', { path: graphConfigPath });
				if (graphConfigExists) {
					await invoke('delete_path', { path: legacyGraphStatePath, useTrash: false });
				} else {
					await invoke('rename_path', { oldPath: legacyGraphStatePath, newPath: graphConfigPath });
				}
			}

			const explorerStateExists = await invoke<boolean>('path_exists', { path: explorerStatePath });
			if (explorerStateExists) {
				await invoke('delete_path', { path: explorerStatePath, useTrash: false });
			}
		} catch (error) {
			console.error('Failed to migrate .brainstorm files', error);
		}
	}

	private async saveRawJsonContent(): Promise<void> {
		const state = this.snapshot();
		if (!state.selectedPath || state.selectedKind !== 'configuration') return;

		try {
			await invoke('write_file', { path: state.selectedPath, content: state.rawContent });
			this.patchState({ jsonEditorError: '' });
			if (state.selectedName === explorerConfigFileName || state.selectedName === graphConfigFileName) this.onConfigChange();
		} catch (error) {
			this.patchState({
				jsonEditorError: error instanceof Error ? error.message : `Failed to save ${state.selectedName}.`
			});
		}
	}

	private flushJsonSave(): void {
		if (!this.jsonSaveTimeout) return;
		this.clearJsonSaveTimeout();
		void this.saveRawJsonContent();
	}

	private clearJsonSaveTimeout(): void {
		if (!this.jsonSaveTimeout) return;
		clearTimeout(this.jsonSaveTimeout);
		this.jsonSaveTimeout = null;
	}

	private patchContent(rawContent: string): void {
		this.patchState({ rawContent });
		this.recomputeDerived(rawContent);
	}

	private recomputeDerived(rawContent: string): void {
		const state = this.snapshot();
		const propertyConfig = this.parsePropertyConfig(rawContent, state.selectedName, state.showJson);
		const explorerConfig = this.parseExplorerConfig(rawContent, state.selectedName, state.showJson);
		const graphConfig = this.parseGraphConfig(rawContent, state.selectedName, state.showJson);
		const editorConfig = this.parseEditorConfig(rawContent, state.selectedName, state.showJson);
		const selectedAgent = state.selectedKind === 'agent'
			? this.parseAgentView(rawContent)
			: null;
		this.patchState({
			propertyConfig,
			explorerConfig,
			graphConfig,
			editorConfig,
			tags: this.normalizeTags(propertyConfig?.tags),
			selectedAgent
		});
	}

	private parsePropertyConfig(content: string, selectedName: string, showJson: boolean): { tags?: SharedTag[] } | null {
		if (selectedName !== propertyConfigFileName) return null;
		try {
			const parsed = JSON.parse(content || '{}');
			return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
				? parsed as { tags?: SharedTag[] }
				: null;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Invalid JSON.';
			this.patchState(showJson ? { jsonEditorError: message } : { parseError: message });
			return null;
		}
	}

	private parseExplorerConfig(content: string, selectedName: string, showJson: boolean): ExplorerConfig {
		if (selectedName !== explorerConfigFileName) return normalizeExplorerConfig({});
		try {
			return normalizeExplorerConfig(JSON.parse(content || '{}'));
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Invalid JSON.';
			this.patchState(showJson ? { jsonEditorError: message } : { parseError: message });
			return normalizeExplorerConfig({});
		}
	}

	private parseGraphConfig(content: string, selectedName: string, showJson: boolean): GraphConfig {
		if (selectedName !== graphConfigFileName) return normalizeGraphConfig({});
		try {
			return normalizeGraphConfig(JSON.parse(content || '{}'));
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Invalid JSON.';
			this.patchState(showJson ? { jsonEditorError: message } : { parseError: message });
			return normalizeGraphConfig({});
		}
	}

	private parseEditorConfig(content: string, selectedName: string, showJson: boolean): EditorConfig {
		if (selectedName !== editorConfigFileName) return normalizeEditorConfig({});
		try {
			return normalizeEditorConfig(JSON.parse(content || '{}'));
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Invalid JSON.';
			this.patchState(showJson ? { jsonEditorError: message } : { parseError: message });
			return normalizeEditorConfig({});
		}
	}

	saveEditorPropertiesDisplayMode = async (mode: PropertiesDisplayMode): Promise<void> => {
		const rootPath = this.projectRootPath();
		const nextConfig = await writeEditorConfig({ propertiesDisplayMode: mode }, rootPath);
		this.patchContent(`${JSON.stringify(nextConfig, null, 2)}\n`);
		this.patchState({ parseError: '' });
		this.onConfigChange();
	};

	private async saveGraphConfig(config: GraphConfig): Promise<void> {
		const nextConfig = await writeGraphConfig(this.projectRootPath(), config);
		this.patchContent(`${JSON.stringify(nextConfig, null, 2)}\n`);
		this.patchState({ parseError: '' });
		this.onConfigChange();
	}

	private normalizeTags(value: unknown): SharedTag[] {
		if (!Array.isArray(value)) return [];
		return value
			.filter((tag): tag is SharedTag => tag && typeof tag === 'object' && 'name' in tag)
			.map((tag) => ({
				name: `${tag.name ?? ''}`,
				color: normalizeTagColor(tag.color),
				description: `${tag.description ?? ''}`,
				created: `${tag.created ?? ''}`
			}));
	}

	private validateJson(content: string): string {
		try {
			JSON.parse(content || '{}');
			return '';
		} catch (error) {
			return error instanceof Error ? error.message : 'Invalid JSON.';
		}
	}

	private ensureFile(files: ConfigurationFile[], name: string, path: string): ConfigurationFile[] {
		if (files.some((file) => file.name === name)) return files;
		const nextFile: ConfigurationFile = { name, path, kind: 'configuration' };
		return [...files, nextFile].sort((left, right) => left.name.localeCompare(right.name));
	}

	private async buildConfigurationSections(configurationFolderPath: string, entries: FileEntry[]): Promise<ConfigurationSection[]> {
		const rootFiles = this.entryFiles(entries);
		const folderEntries = entries
			.filter((entry) => entry.is_dir)
			.sort((left, right) => left.name.localeCompare(right.name));

		const folderSections = await Promise.all(folderEntries.map(async (entry) => {
			const childEntries = await invoke<FileEntry[]>('read_dir_entries', { path: entry.path });
			return {
				name: this.sectionName(entry.name),
				path: entry.path,
				files: this.entryFiles(childEntries)
			};
		}));

		return this.compactSections([
			{
				name: 'Configuration',
				path: configurationFolderPath,
				files: rootFiles
			},
			...folderSections
		]);
	}

	private buildSectionsFromFiles(
		configurationFolderPath: string,
		files: ConfigurationFile[],
		currentSections: ConfigurationSection[]
	): ConfigurationSection[] {
		const sectionByPath = new Map(currentSections.map((section) => [section.path, { ...section, files: [...section.files] }]));
		const rootSection = sectionByPath.get(configurationFolderPath) ?? {
			name: 'Configuration',
			path: configurationFolderPath,
			files: []
		};
		const knownPaths = new Set(currentSections.flatMap((section) => section.files.map((file) => file.path)));
		const rootFileNames = new Set(rootSection.files.map((file) => file.name));

		for (const file of files) {
			if (knownPaths.has(file.path) || rootFileNames.has(file.name)) continue;
			rootSection.files.push(file);
			rootFileNames.add(file.name);
		}

		sectionByPath.set(configurationFolderPath, {
			...rootSection,
			files: rootSection.files.sort((left, right) => left.name.localeCompare(right.name))
		});

		return this.compactSections([...sectionByPath.values()]);
	}

	private flattenSections(sections: ConfigurationSection[]): ConfigurationFile[] {
		return sections
			.flatMap((section) => section.files)
			.sort((left, right) => left.name.localeCompare(right.name));
	}

	private entryFiles(entries: FileEntry[]): ConfigurationFile[] {
		return entries
			.filter((entry) =>
				!entry.is_dir
				&& entry.name !== legacyConfigFileName
				&& entry.name !== explorerStateFileName
				&& entry.name !== legacyPropertiesSchemaFileName
				&& entry.name !== legacyGraphStateFileName
			)
			.map((entry) => ({ name: entry.name, path: entry.path, kind: 'configuration' as const }))
			.sort((left, right) => left.name.localeCompare(right.name));
	}

	private async buildAgentSection(brainstormFolderPath: string): Promise<ConfigurationSection> {
		const agentsFolderPath = `${brainstormFolderPath}/${agentsFolderName}`;
		try {
			const folderExists = await invoke<boolean>('path_exists', { path: agentsFolderPath });
			if (!folderExists) return { name: 'Agents', path: agentsFolderPath, files: [] };

			const entries = await invoke<FileEntry[]>('read_dir_entries', { path: agentsFolderPath });
			const files = entries
				.filter((entry) => entry.is_dir)
				.map((entry) => ({ name: this.sectionName(entry.name), path: entry.path, kind: 'agent' as const }))
				.sort((left, right) => left.name.localeCompare(right.name));

			return { name: 'Agents', path: agentsFolderPath, files };
		} catch {
			return { name: 'Agents', path: agentsFolderPath, files: [] };
		}
	}

	private async readAgentContent(agentPath: string): Promise<string> {
		const [manifest, skills, memory, tools] = await Promise.all([
			this.readOptionalFile(`${agentPath}/${agentManifestFileName}`),
			this.readOptionalFile(`${agentPath}/${agentSkillFileName}`),
			this.readOptionalFile(`${agentPath}/${agentMemoryFileName}`),
			this.readOptionalFile(`${agentPath}/${agentToolsFileName}`)
		]);

		return [
			`--- ${agentManifestFileName} ---`,
			manifest,
			`--- ${agentSkillFileName} ---`,
			skills,
			`--- ${agentMemoryFileName} ---`,
			memory,
			`--- ${agentToolsFileName} ---`,
			tools
		].join('\n');
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

	private parseAgentView(content: string): AgentView {
		const manifest = this.extractAgentSection(content, agentManifestFileName);
		const skills = this.extractAgentSection(content, agentSkillFileName);
		const memory = this.extractAgentSection(content, agentMemoryFileName);
		const tools = this.extractAgentSection(content, agentToolsFileName);

		return {
			id: this.yamlScalar(manifest, 'id'),
			name: this.yamlScalar(manifest, 'name'),
			version: this.yamlScalar(manifest, 'version'),
			role: this.yamlScalar(manifest, 'role'),
			description: this.yamlBlock(manifest, 'description'),
			priority: this.yamlScalar(manifest, 'priority'),
			canDelegate: this.yamlScalar(manifest, 'can_delegate') === 'true',
			delegates: this.yamlList(manifest, 'delegates'),
			memoryType: this.yamlNestedScalar(manifest, 'memory', 'type'),
			skills: this.markdownListItems(skills),
			memoryItems: this.markdownListItems(memory),
			toolGroups: this.markdownToolGroups(tools),
			systemPrompt: this.yamlBlock(manifest, 'system_prompt')
		};
	}

	private extractAgentSection(content: string, fileName: string): string {
		const marker = `--- ${fileName} ---`;
		const start = content.indexOf(marker);
		if (start === -1) return '';

		const bodyStart = start + marker.length;
		const nextMarker = content.indexOf('\n--- ', bodyStart);
		return content.slice(bodyStart, nextMarker === -1 ? undefined : nextMarker).trim();
	}

	private yamlScalar(content: string, key: string): string {
		const line = content.split('\n').find((item) => item.trimStart().startsWith(`${key}:`));
		if (!line) return '';
		return line.slice(line.indexOf(':') + 1).trim().replace(/^["']|["']$/g, '');
	}

	private yamlNestedScalar(content: string, parentKey: string, childKey: string): string {
		const lines = content.split('\n');
		const parentIndex = lines.findIndex((line) => line.trim() === `${parentKey}:`);
		if (parentIndex === -1) return '';

		for (const line of lines.slice(parentIndex + 1)) {
			if (line.trim() === '') continue;
			if (!line.startsWith(' ')) break;
			const trimmed = line.trim();
			if (trimmed.startsWith(`${childKey}:`)) {
				return trimmed.slice(trimmed.indexOf(':') + 1).trim().replace(/^["']|["']$/g, '');
			}
		}

		return '';
	}

	private yamlList(content: string, key: string): string[] {
		const lines = content.split('\n');
		const keyIndex = lines.findIndex((line) => line.trim() === `${key}:`);
		if (keyIndex === -1) return [];

		const items: string[] = [];
		for (const line of lines.slice(keyIndex + 1)) {
			if (line.trim() === '') continue;
			if (!line.startsWith(' ')) break;
			const trimmed = line.trim();
			if (trimmed.startsWith('- ')) items.push(trimmed.slice(2).trim());
		}

		return items;
	}

	private yamlBlock(content: string, key: string): string {
		const lines = content.split('\n');
		const keyIndex = lines.findIndex((line) => line.trimStart().startsWith(`${key}:`));
		if (keyIndex === -1 || (!lines[keyIndex].includes('|') && !lines[keyIndex].includes('>'))) return this.yamlScalar(content, key);

		const blockLines: string[] = [];
		for (const line of lines.slice(keyIndex + 1)) {
			if (line.trim() === '') {
				blockLines.push('');
				continue;
			}
			if (!line.startsWith(' ')) break;
			blockLines.push(line.trim());
		}

		return blockLines.join('\n').trim();
	}

	private markdownListItems(content: string): string[] {
		return content
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.startsWith('- '))
			.map((line) => line.slice(2).trim())
			.filter(Boolean);
	}

	private markdownToolGroups(content: string): AgentToolGroup[] {
		const groups: AgentToolGroup[] = [];
		let currentGroup: AgentToolGroup | null = null;

		for (const line of content.split('\n')) {
			const trimmed = line.trim();
			if (trimmed.startsWith('## ')) {
				currentGroup = { name: trimmed.slice(3).trim(), tools: [] };
				groups.push(currentGroup);
				continue;
			}
			if (trimmed.startsWith('- ')) {
				if (!currentGroup) {
					currentGroup = { name: 'Tools', tools: [] };
					groups.push(currentGroup);
				}
				currentGroup.tools.push(trimmed.slice(2).trim());
			}
		}

		return groups;
	}

	private compactSections(sections: ConfigurationSection[]): ConfigurationSection[] {
		return sections
			.filter((section) => section.files.length > 0)
			.sort((left, right) => left.name.localeCompare(right.name));
	}

	private sectionName(name: string): string {
		return name
			.replace(/[-_]+/g, ' ')
			.replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
	}

	private projectRootPath(): string | null {
		return get(fileTreeState).rootPath ?? get(shellState).currentProject?.path ?? null;
	}

	private brainstormPath(): string | null {
		const rootPath = this.projectRootPath();
		return rootPath ? `${rootPath}/.brainstorm` : null;
	}

	private configurationPath(): string | null {
		const rootPath = this.projectRootPath();
		return rootPath ? `${rootPath}/.brainstorm/${configurationFolderName}` : null;
	}

	private createEmptyTagForm(): TagFormState {
		return {
			name: '',
			color: this.getDefaultTagColor(),
			description: ''
		};
	}

	private getDefaultTagColor(): string {
		if (typeof document === 'undefined') return '#007ACC';
		const primary = getComputedStyle(document.documentElement).getPropertyValue('--colors-primary').trim();
		return normalizeTagColor(primary || '#007ACC');
	}

	private createInitialState(): ConfigurationState {
		const explorerConfig = normalizeExplorerConfig({});
		const graphConfig = normalizeGraphConfig({});
		const editorConfig = normalizeEditorConfig({});
		return {
			files: [],
			sections: [],
			selectedPath: '',
			selectedName: '',
			selectedKind: 'configuration',
			rawContent: '',
			parseError: '',
			showJson: false,
			isLoading: false,
			showTagForm: false,
			editingTagName: null,
			tagForm: {
				name: '',
				color: '#007ACC',
				description: ''
			},
			jsonEditorError: '',
			propertyConfig: null,
			explorerConfig,
			graphConfig,
			editorConfig,
			tags: [],
			selectedAgent: null,
			selectedAgentPackage: null
		};
	}

	private patchState(patch: Partial<ConfigurationState>): void {
		this.state.update((state) => ({ ...state, ...patch }));
	}

	private snapshot(): ConfigurationState {
		let value!: ConfigurationState;
		const unsubscribe = this.state.subscribe((state) => {
			value = state;
		});
		unsubscribe();
		return value;
	}
}

export const configurationController = new ConfigurationController();
