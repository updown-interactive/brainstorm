import { invoke } from '@tauri-apps/api/core';
import { get } from 'svelte/store';
import { fileTreeState } from '../state';
import type { ExplorerConfig, ExplorerPosition } from '../types';

export type { ExplorerConfig, ExplorerPosition };

export const brainstormFolderName = '.brainstorm';
export const configurationFolderName = 'configuration';
export const explorerConfigFileName = 'explorer-config.json';
export const legacyConfigFileName = 'config.json';
export const minExplorerSidebarWidth = 180;
export const maxExplorerSidebarWidth = 520;

export const defaultExplorerConfig: ExplorerConfig = {
	position: 'left',
	sidebarWidth: 260,
};

export async function ensureExplorerConfigPath(rootPathOverride?: string | null): Promise<string | null> {
	const rootPath = rootPathOverride ?? get(fileTreeState).rootPath;
	if (!rootPath) return null;

	const folderPath = `${rootPath}/${brainstormFolderName}/${configurationFolderName}`;
	const configPath = `${folderPath}/${explorerConfigFileName}`;

	try {
		const folderExists = await invoke<boolean>('path_exists', { path: folderPath });
		if (!folderExists) {
			await invoke('create_folder', { path: folderPath });
		}

		const configExists = await invoke<boolean>('path_exists', { path: configPath });
		const previousConfigPath = `${rootPath}/${brainstormFolderName}/${explorerConfigFileName}`;
		const previousConfigExists = await invoke<boolean>('path_exists', { path: previousConfigPath });
		if (!configExists && previousConfigExists) {
			await invoke('rename_path', { oldPath: previousConfigPath, newPath: configPath });
		}

		const nextConfigExists = await invoke<boolean>('path_exists', { path: configPath });
		if (!nextConfigExists) {
			const migratedConfig = await readLegacyExplorerConfig(rootPath);
			await invoke('write_file', {
				path: configPath,
				content: `${JSON.stringify(migratedConfig, null, 2)}\n`,
			});
		}
	} catch (error) {
		console.error('Failed to ensure Explorer config', error);
		return null;
	}

	return configPath;
}

export async function readExplorerConfig(rootPathOverride?: string | null): Promise<ExplorerConfig> {
	const configPath = await ensureExplorerConfigPath(rootPathOverride);
	if (!configPath) return defaultExplorerConfig;

	try {
		const content = await invoke<string>('read_file', { path: configPath });
		return normalizeExplorerConfig(JSON.parse(content || '{}'));
	} catch {
		await invoke('write_file', {
			path: configPath,
			content: `${JSON.stringify(defaultExplorerConfig, null, 2)}\n`,
		});
		return defaultExplorerConfig;
	}
}

export async function writeExplorerConfig(config: Partial<ExplorerConfig>, rootPathOverride?: string | null): Promise<ExplorerConfig> {
	const configPath = await ensureExplorerConfigPath(rootPathOverride);
	if (!configPath) return defaultExplorerConfig;

	const currentConfig = await readExplorerConfig(rootPathOverride);
	const nextConfig = normalizeExplorerConfig({ ...currentConfig, ...config });
	await invoke('write_file', {
		path: configPath,
		content: `${JSON.stringify(nextConfig, null, 2)}\n`,
	});
	return nextConfig;
}

export function normalizeExplorerConfig(value: unknown): ExplorerConfig {
	const position = value && typeof value === 'object' && 'position' in value
		? (value as { position?: unknown }).position
		: defaultExplorerConfig.position;
	const sidebarWidth = value && typeof value === 'object' && 'sidebarWidth' in value
		? Number((value as { sidebarWidth?: unknown }).sidebarWidth)
		: defaultExplorerConfig.sidebarWidth;

	return {
		position: position === 'right' ? 'right' : 'left',
		sidebarWidth: clampExplorerSidebarWidth(sidebarWidth),
	};
}

export function clampExplorerSidebarWidth(width: number): number {
	if (!Number.isFinite(width)) return defaultExplorerConfig.sidebarWidth;
	return Math.min(maxExplorerSidebarWidth, Math.max(minExplorerSidebarWidth, Math.round(width)));
}

async function readLegacyExplorerConfig(rootPath: string): Promise<ExplorerConfig> {
	const legacyConfigPath = `${rootPath}/${brainstormFolderName}/${legacyConfigFileName}`;

	try {
		const legacyConfigExists = await invoke<boolean>('path_exists', { path: legacyConfigPath });
		if (!legacyConfigExists) return defaultExplorerConfig;

		const content = await invoke<string>('read_file', { path: legacyConfigPath });
		return normalizeExplorerConfig(JSON.parse(content || '{}'));
	} catch {
		return defaultExplorerConfig;
	}
}
