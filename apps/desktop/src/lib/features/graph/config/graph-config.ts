import { invoke } from '@tauri-apps/api/core';
import type { GraphConfig } from '../types';
import { 
	brainstormFolderName, 
	configurationFolderName,
	graphConfigFileName, 
	legacyGraphStateFileName, 
	defaultGraphConfig 
} from './constants';

export async function ensureGraphConfigPath(rootPath: string | null | undefined): Promise<string | null> {
	if (!rootPath) return null;

	const folderPath = `${rootPath}/${brainstormFolderName}/${configurationFolderName}`;
	const configPath = `${folderPath}/${graphConfigFileName}`;
	const previousConfigPath = `${rootPath}/${brainstormFolderName}/${graphConfigFileName}`;
	const legacyPath = `${rootPath}/${brainstormFolderName}/${legacyGraphStateFileName}`;

	try {
		const folderExists = await invoke<boolean>('path_exists', { path: folderPath });
		if (!folderExists) {
			await invoke('create_folder', { path: folderPath });
		}

		const configExists = await invoke<boolean>('path_exists', { path: configPath });
		const previousConfigExists = await invoke<boolean>('path_exists', { path: previousConfigPath });
		const legacyExists = await invoke<boolean>('path_exists', { path: legacyPath });
		if (!configExists && previousConfigExists) {
			await invoke('rename_path', { oldPath: previousConfigPath, newPath: configPath });
		}

		const migratedConfigExists = await invoke<boolean>('path_exists', { path: configPath });
		if (!migratedConfigExists && legacyExists) {
			await invoke('rename_path', { oldPath: legacyPath, newPath: configPath });
		}

		const nextConfigExists = await invoke<boolean>('path_exists', { path: configPath });
		if (!nextConfigExists) {
			await writeRawGraphConfig(configPath, defaultGraphConfig);
		}
	} catch (error) {
		console.error('Failed to ensure graph config', error);
		return null;
	}

	return configPath;
}

export async function readGraphConfig(rootPath: string | null | undefined): Promise<GraphConfig> {
	const configPath = await ensureGraphConfigPath(rootPath);
	if (!configPath) return defaultGraphConfig;

	try {
		const content = await invoke<string>('read_file', { path: configPath });
		return normalizeGraphConfig(JSON.parse(content || '{}'));
	} catch {
		await writeRawGraphConfig(configPath, defaultGraphConfig);
		return defaultGraphConfig;
	}
}

export async function writeGraphConfig(rootPath: string | null | undefined, config: GraphConfig): Promise<GraphConfig> {
	const configPath = await ensureGraphConfigPath(rootPath);
	const nextConfig = normalizeGraphConfig(config);
	if (!configPath) return nextConfig;

	await writeRawGraphConfig(configPath, nextConfig);
	return nextConfig;
}

export function normalizeGraphConfig(value: unknown): GraphConfig {
	const input = value && typeof value === 'object' && !Array.isArray(value)
		? value as Partial<GraphConfig>
		: {};
	const usesPercentForceModel = input.forceModelVersion === 2;

	return {
		forceModelVersion: 2,
		display: {
			arrows: booleanValue(input.display?.arrows, defaultGraphConfig.display.arrows),
			textFadeThreshold: clampNumber(input.display?.textFadeThreshold, 0.2, 1.2, defaultGraphConfig.display.textFadeThreshold),
			nodeSize: clampNumber(input.display?.nodeSize, 0.6, 2.2, defaultGraphConfig.display.nodeSize),
			linkThickness: clampNumber(input.display?.linkThickness, 0.4, 3, defaultGraphConfig.display.linkThickness)
		},
		forces: {
			center: normalizeForcePercent(input.forces?.center, defaultGraphConfig.forces.center, usesPercentForceModel, { legacyMin: 0, legacyMax: 2.5 }),
			repel: normalizeForcePercent(input.forces?.repel, defaultGraphConfig.forces.repel, usesPercentForceModel, { legacyMin: 0.2, legacyMax: 3 }),
			link: normalizeForcePercent(input.forces?.link, defaultGraphConfig.forces.link, usesPercentForceModel, { legacyMin: 0, legacyMax: 2.5 }),
			linkDistance: normalizeForcePercent(input.forces?.linkDistance, defaultGraphConfig.forces.linkDistance, usesPercentForceModel, { legacyMin: 0.4, legacyMax: 2.5 })
		},
		panel: {
			open: booleanValue(input.panel?.open, defaultGraphConfig.panel.open),
			displayOpen: booleanValue(input.panel?.displayOpen, defaultGraphConfig.panel.displayOpen),
			forcesOpen: booleanValue(input.panel?.forcesOpen, defaultGraphConfig.panel.forcesOpen)
		}
	};
}

function booleanValue(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
	const numberValue = Number(value);
	if (!Number.isFinite(numberValue)) return fallback;
	return Math.min(max, Math.max(min, numberValue));
}

function normalizeForcePercent(
	value: unknown,
	fallback: number,
	usesPercentForceModel: boolean,
	legacyRange: { legacyMin: number; legacyMax: number }
): number {
	const numberValue = Number(value);
	if (!Number.isFinite(numberValue)) return fallback;
	if (usesPercentForceModel || numberValue > 3) return clampNumber(numberValue, 0, 100, fallback);

	const legacySpan = legacyRange.legacyMax - legacyRange.legacyMin;
	if (legacySpan <= 0) return fallback;
	return clampNumber(((numberValue - legacyRange.legacyMin) / legacySpan) * 100, 0, 100, fallback);
}

function writeRawGraphConfig(path: string, config: GraphConfig): Promise<void> {
	return invoke('write_file', {
		path,
		content: `${JSON.stringify(config, null, 2)}\n`
	});
}
