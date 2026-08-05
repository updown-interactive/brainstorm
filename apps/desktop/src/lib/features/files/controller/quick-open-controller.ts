import { get, writable } from 'svelte/store';
import { fileTreeState } from '../state';
import { editorState } from '../state/editor';
import { getVaultIndex, type VaultSummary } from '../data/vault-index';
import type { QuickOpenFile, QuickOpenFilter, QuickOpenState } from '../types';

export type { QuickOpenFile, QuickOpenFilter, QuickOpenState };

function getLoadedItems(rootPath: string | null): QuickOpenFile[] {
	if (!rootPath) return [];

	const items: QuickOpenFile[] = [];
	for (const node of get(fileTreeState).nodes.values()) {
		if (node.path === rootPath) continue;
		if (!node.isDir && !node.name.toLocaleLowerCase().endsWith('.md')) continue;

		const relativePath = node.path.startsWith(`${rootPath}/`)
			? node.path.slice(rootPath.length + 1)
			: node.name;

		items.push({
			name: node.name,
			path: node.path,
			label: node.isDir ? node.name : node.name.replace(/\.md$/i, ''),
			relativePath,
			isDir: node.isDir,
		});
	}
	return items;
}

function collectVaultItems(index: VaultSummary, rootPath: string): QuickOpenFile[] {
	const itemsMap = new Map<string, QuickOpenFile>();

	for (const file of index.files) {
		// Add the file itself
		itemsMap.set(file.path, {
			name: file.name,
			path: file.path,
			label: file.name.replace(/\.md$/i, ''),
			relativePath: file.relative_path,
			isDir: false,
		});

		// Extract parent folders from relative path
		const parts = file.relative_path.split('/').filter(Boolean);
		let currentRel = '';

		for (let i = 0; i < parts.length - 1; i++) {
			const folderName = parts[i];
			currentRel = currentRel ? `${currentRel}/${folderName}` : folderName;
			const currentAbs = `${rootPath}/${currentRel}`;

			if (!itemsMap.has(currentAbs)) {
				itemsMap.set(currentAbs, {
					name: folderName,
					path: currentAbs,
					label: folderName,
					relativePath: currentRel,
					isDir: true,
				});
			}
		}
	}

	return Array.from(itemsMap.values());
}

export function createQuickOpenController() {
	const state = writable<QuickOpenState>({
		show: false,
		query: '',
		filter: 'all',
		files: [],
		selectedIndex: 0,
		isLoading: false,
	});

	function close() {
		state.update((current) => ({ ...current, show: false, query: '', selectedIndex: 0 }));
	}

	async function refreshFiles() {
		const rootPath = get(fileTreeState).rootPath;
		if (!rootPath) return;

		const treeItems = getLoadedItems(rootPath);
		state.update((current) => ({
			...current,
			files: treeItems,
			isLoading: true,
		}));

		try {
			const index = await getVaultIndex(rootPath);
			const vaultItems = collectVaultItems(index, rootPath);

			// Merge treeItems and vaultItems (vaultItems override or supplement)
			const mergedMap = new Map<string, QuickOpenFile>();
			for (const item of treeItems) mergedMap.set(item.path, item);
			for (const item of vaultItems) mergedMap.set(item.path, item);

			state.update((current) => ({
				...current,
				files: Array.from(mergedMap.values()),
				isLoading: false,
			}));
		} catch (error) {
			console.error('Failed to list files and folders', error);
			state.update((current) => ({ ...current, isLoading: false }));
		}
	}

	return {
		state,

		async open() {
			state.update((current) => ({
				...current,
				show: true,
				query: '',
				selectedIndex: 0,
			}));
			await refreshFiles();
		},

		close,

		setQuery(query: string) {
			state.update((current) => ({ ...current, query, selectedIndex: 0 }));
		},

		setFilter(filter: QuickOpenFilter) {
			state.update((current) => ({ ...current, filter, selectedIndex: 0 }));
		},

		setSelectedIndex(selectedIndex: number) {
			state.update((current) => ({ ...current, selectedIndex }));
		},

		openFile(file: QuickOpenFile, pin = false) {
			fileTreeState.update((current) => ({ ...current, focusedPath: file.path }));
			if (!file.isDir) {
				editorState.openFile(file.path, file.name, pin);
			}
			close();
		},
	};
}

export const quickOpenController = createQuickOpenController();
