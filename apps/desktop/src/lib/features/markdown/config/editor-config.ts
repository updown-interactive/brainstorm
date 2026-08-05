import { invoke } from '@tauri-apps/api/core';
import { get } from 'svelte/store';
import { fileTreeState } from '../../files/state';

export type PropertiesDisplayMode = 'expanded' | 'collapsed' | 'hover';

export interface EditorConfig {
	propertiesDisplayMode: PropertiesDisplayMode;
}

export const brainstormFolderName = '.brainstorm';
export const configurationFolderName = 'configuration';
export const editorConfigFileName = 'editor-config.json';

export const defaultEditorConfig: EditorConfig = {
	propertiesDisplayMode: 'collapsed'
};

export async function ensureEditorConfigPath(rootPathOverride?: string | null): Promise<string | null> {
	const rootPath = rootPathOverride ?? get(fileTreeState).rootPath;
	if (!rootPath) return null;

	const folderPath = `${rootPath}/${brainstormFolderName}/${configurationFolderName}`;
	const configPath = `${folderPath}/${editorConfigFileName}`;

	try {
		const folderExists = await invoke<boolean>('path_exists', { path: folderPath });
		if (!folderExists) {
			await invoke('create_folder', { path: folderPath });
		}

		const configExists = await invoke<boolean>('path_exists', { path: configPath });
		if (!configExists) {
			await invoke('write_file', {
				path: configPath,
				content: `${JSON.stringify(defaultEditorConfig, null, 2)}\n`
			});
		}
	} catch (error) {
		console.error('Failed to ensure Editor config', error);
		return null;
	}

	return configPath;
}

let cachedEditorConfig: EditorConfig = defaultEditorConfig;

export function getCachedEditorConfig(): EditorConfig {
	return cachedEditorConfig;
}

export async function readEditorConfig(rootPathOverride?: string | null): Promise<EditorConfig> {
	const configPath = await ensureEditorConfigPath(rootPathOverride);
	if (!configPath) return defaultEditorConfig;

	try {
		const content = await invoke<string>('read_file', { path: configPath });
		cachedEditorConfig = normalizeEditorConfig(JSON.parse(content || '{}'));
		return cachedEditorConfig;
	} catch {
		await invoke('write_file', {
			path: configPath,
			content: `${JSON.stringify(defaultEditorConfig, null, 2)}\n`
		});
		cachedEditorConfig = defaultEditorConfig;
		return defaultEditorConfig;
	}
}

export async function writeEditorConfig(
	config: Partial<EditorConfig>,
	rootPathOverride?: string | null
): Promise<EditorConfig> {
	const configPath = await ensureEditorConfigPath(rootPathOverride);
	if (!configPath) return defaultEditorConfig;

	const currentConfig = await readEditorConfig(rootPathOverride);
	const nextConfig = normalizeEditorConfig({ ...currentConfig, ...config });
	await invoke('write_file', {
		path: configPath,
		content: `${JSON.stringify(nextConfig, null, 2)}\n`
	});
	cachedEditorConfig = nextConfig;
	return nextConfig;
}

export function normalizeEditorConfig(value: unknown): EditorConfig {
	const rawMode = value && typeof value === 'object' && 'propertiesDisplayMode' in value
		? `${(value as { propertiesDisplayMode?: unknown }).propertiesDisplayMode}`
		: defaultEditorConfig.propertiesDisplayMode;

	const validModes: PropertiesDisplayMode[] = ['expanded', 'collapsed', 'hover'];
	const propertiesDisplayMode = validModes.includes(rawMode as PropertiesDisplayMode)
		? (rawMode as PropertiesDisplayMode)
		: defaultEditorConfig.propertiesDisplayMode;

	return {
		propertiesDisplayMode
	};
}
