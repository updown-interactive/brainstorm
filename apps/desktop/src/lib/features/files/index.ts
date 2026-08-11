// Types
export * from './types';

// Config
export {
	brainstormFolderName,
	configurationFolderName,
	stateFolderName,
	explorerConfigFileName,
	legacyConfigFileName,
	propertyConfigFileName,
	legacyPropertiesSchemaFileName,
	explorerStateFileName,
	graphConfigFileName,
	legacyGraphStateFileName,
	sidebarWidthStorageKey
} from './config/constants';
export {
	ensureExplorerConfigPath,
	readExplorerConfig,
	writeExplorerConfig,
	normalizeExplorerConfig,
	clampExplorerSidebarWidth,
	minExplorerSidebarWidth,
	maxExplorerSidebarWidth,
	defaultExplorerConfig
} from './config/explorer-config';
export type { ExplorerConfig, ExplorerPosition } from './config/explorer-config';

// State
export { fileTreeState, contextMenuState, inlineEditState } from './state';
export type { FileNode, FileEntry, FileTreeState, ContextMenuState, InlineEditState } from './state';
export { editorState } from './state/editor';
export type { EditorTab, EditorPane, EditorState } from './state/editor';

// Controller
export { filesController } from './controller';
export { fileTreeController } from './controller/file-tree-controller';
export { quickOpenController } from './controller/quick-open-controller';
export type { QuickOpenFile, QuickOpenState } from './controller/quick-open-controller';

// Data
export { getVaultIndex, buildVaultIndex, updateVaultIndexEntry } from './data/vault-index';
export type { VaultSummary, IndexedFile, IndexedLink } from './data/vault-index';
export {
	ensureWorkspaceStatePath,
	readWorkspaceState,
	writeWorkspaceState,
	normalizeWorkspaceState
} from './data/workspace-state';
export type { PersistedWorkspaceState, PersistedPane, PersistedTab } from './data/workspace-state';

// UI
export { default as FilesView } from './ui/FilesView.svelte';
export { default as FileTree } from './ui/FileTree.svelte';
export { default as FileTreeNode } from './ui/FileTreeNode.svelte';
export { default as FileQuickOpen } from './ui/FileQuickOpen.svelte';
export { default as FileTabBar } from './ui/FileTabBar.svelte';
export { default as ContextMenu } from './ui/ContextMenu.svelte';
export { default as InlineInput } from './ui/InlineInput.svelte';
