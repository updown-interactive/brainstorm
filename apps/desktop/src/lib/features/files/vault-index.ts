import { invoke } from '@tauri-apps/api/core';

export interface IndexedLink {
  target: string;
  link_type: 'wiki' | 'embed' | 'markdown' | 'frontmatter' | string;
}

export interface IndexedFile {
  name: string;
  path: string;
  relative_path: string;
  modified_ms: number;
  frontmatter: Record<string, unknown>;
  links: IndexedLink[];
  tags: string[];
  aliases: string[];
}

export interface VaultSummary {
  root: string;
  files: IndexedFile[];
}

let activeBuild: Promise<VaultSummary> | null = null;

export async function buildVaultIndex(rootPath: string) {
  activeBuild = invoke<VaultSummary>('build_vault_index', { path: rootPath }).finally(() => {
    activeBuild = null;
  });
  return activeBuild;
}

export async function getVaultIndex(rootPath?: string | null) {
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

export async function updateVaultIndexEntry(path: string, kind?: string) {
  await invoke('update_index_entry', { path, kind });
}
