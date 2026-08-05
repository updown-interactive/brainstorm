import { invoke } from '@tauri-apps/api/core';
import type { VaultSummary, IndexedFile, IndexedLink } from '../types';

export type { VaultSummary, IndexedFile, IndexedLink };

let activeBuild: Promise<VaultSummary> | null = null;

export async function buildVaultIndex(rootPath: string): Promise<VaultSummary> {
	activeBuild = invoke<VaultSummary>('build_vault_index', { path: rootPath }).finally(() => {
		activeBuild = null;
	});
	return activeBuild;
}

export async function getVaultIndex(rootPath?: string | null): Promise<VaultSummary> {
	if (activeBuild) return activeBuild;

	try {
		const summary = await invoke<VaultSummary>('get_vault_index');
		if (!rootPath || summary.root === rootPath) return summary;
	} catch {
		// The first project load has no cached Rust index yet.
	}

	if (!rootPath) {
		return { root: '', files: [] };
	}

	return buildVaultIndex(rootPath);
}

export async function updateVaultIndexEntry(path: string, kind?: string): Promise<void> {
	await invoke('update_index_entry', { path, kind });
}