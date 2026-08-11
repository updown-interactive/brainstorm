import { invoke } from '@tauri-apps/api/core';
import { get } from 'svelte/store';
import { brainstormFolderName, explorerStateFileName, stateFolderName } from '../config/constants';
import { fileTreeState } from '../state';

export interface PersistedTab {
	id: string;
	path: string;
	name: string;
	isPinned: boolean;
	isModified: boolean;
}

export interface PersistedPane {
	id: string;
	activeTabId: string | null;
	tabs: PersistedTab[];
}

export interface PersistedWorkspaceState {
	version: number;
	fileTree: {
		expandedPaths: string[];
		focusedPath: string | null;
	};
	editor: {
		activePaneId: string;
		panes: PersistedPane[];
	};
}

export const defaultWorkspaceState: PersistedWorkspaceState = {
	version: 1,
	fileTree: {
		expandedPaths: [],
		focusedPath: null
	},
	editor: {
		activePaneId: 'pane-1',
		panes: [
			{
				id: 'pane-1',
				activeTabId: null,
				tabs: []
			}
		]
	}
};

export async function ensureWorkspaceStatePath(rootPathOverride?: string | null): Promise<string | null> {
	const rootPath = rootPathOverride ?? get(fileTreeState).rootPath;
	if (!rootPath) return null;

	const folderPath = `${rootPath}/${brainstormFolderName}/${stateFolderName}`;
	const statePath = `${folderPath}/${explorerStateFileName}`;

	try {
		const folderExists = await invoke<boolean>('path_exists', { path: folderPath });
		if (!folderExists) {
			await invoke('create_folder', { path: folderPath });
		}
	} catch (error) {
		console.error('Failed to ensure workspace state folder', error);
		return null;
	}

	return statePath;
}

export async function readWorkspaceState(rootPathOverride?: string | null): Promise<PersistedWorkspaceState | null> {
	const statePath = await ensureWorkspaceStatePath(rootPathOverride);
	if (!statePath) return null;

	try {
		const exists = await invoke<boolean>('path_exists', { path: statePath });
		if (!exists) return null;

		const content = await invoke<string>('read_file', { path: statePath });
		if (!content || !content.trim()) return null;

		const parsed = JSON.parse(content);
		return normalizeWorkspaceState(parsed);
	} catch (error) {
		console.error('Failed to read workspace state', error);
		return null;
	}
}

export async function writeWorkspaceState(
	state: PersistedWorkspaceState,
	rootPathOverride?: string | null
): Promise<void> {
	const statePath = await ensureWorkspaceStatePath(rootPathOverride);
	if (!statePath) return;

	try {
		const normalized = normalizeWorkspaceState(state);
		await invoke('write_file', {
			path: statePath,
			content: `${JSON.stringify(normalized, null, 2)}\n`
		});
	} catch (error) {
		console.error('Failed to write workspace state', error);
	}
}

export function normalizeWorkspaceState(value: unknown): PersistedWorkspaceState {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return defaultWorkspaceState;
	}

	const raw = value as Record<string, unknown>;

	const rawFileTree = raw.fileTree && typeof raw.fileTree === 'object' && !Array.isArray(raw.fileTree)
		? (raw.fileTree as Record<string, unknown>)
		: {};

	const expandedPaths = Array.isArray(rawFileTree.expandedPaths)
		? rawFileTree.expandedPaths.map((p) => `${p}`).filter(Boolean)
		: [];

	const focusedPath = typeof rawFileTree.focusedPath === 'string' && rawFileTree.focusedPath.trim()
		? rawFileTree.focusedPath.trim()
		: null;

	const rawEditor = raw.editor && typeof raw.editor === 'object' && !Array.isArray(raw.editor)
		? (raw.editor as Record<string, unknown>)
		: {};

	const activePaneId = typeof rawEditor.activePaneId === 'string' && rawEditor.activePaneId.trim()
		? rawEditor.activePaneId.trim()
		: 'pane-1';

	const rawPanes = Array.isArray(rawEditor.panes) ? rawEditor.panes : [];
	const panes: PersistedPane[] = rawPanes.map((rawPane, index) => {
		if (!rawPane || typeof rawPane !== 'object' || Array.isArray(rawPane)) {
			return { id: `pane-${index + 1}`, activeTabId: null, tabs: [] };
		}
		const p = rawPane as Record<string, unknown>;
		const paneId = typeof p.id === 'string' && p.id.trim() ? p.id.trim() : `pane-${index + 1}`;
		const rawTabs = Array.isArray(p.tabs) ? p.tabs : [];

		const tabs: PersistedTab[] = rawTabs
			.filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object' && !Array.isArray(t)))
			.map((t) => ({
				id: `${t.id || t.path || ''}`,
				path: `${t.path || ''}`,
				name: `${t.name || ''}`,
				isPinned: Boolean(t.isPinned),
				isModified: Boolean(t.isModified)
			}))
			.filter((t) => t.path.length > 0 && t.name.length > 0);

		const activeTabId = typeof p.activeTabId === 'string' && tabs.some((t) => t.id === p.activeTabId)
			? p.activeTabId
			: tabs.at(-1)?.id ?? null;

		return {
			id: paneId,
			activeTabId,
			tabs
		};
	});

	if (panes.length === 0) {
		panes.push({ id: 'pane-1', activeTabId: null, tabs: [] });
	}

	const validActivePaneId = panes.some((p) => p.id === activePaneId) ? activePaneId : panes[0].id;

	return {
		version: 1,
		fileTree: {
			expandedPaths,
			focusedPath
		},
		editor: {
			activePaneId: validActivePaneId,
			panes
		}
	};
}
