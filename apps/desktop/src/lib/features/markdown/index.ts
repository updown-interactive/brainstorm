import MarkdownEditor from './ui/MarkdownEditor.svelte';

// Types
export type { FileEntry, MarkdownFileSuggestion, MarkdownState } from './types';

// Config
export * from './config/constants';

// State
export { markdownStore } from './state/markdown-state';

// Engine
export * from './engine/frontmatter';
export { isMarkdownPath } from './engine/frontmatter';
export * from './engine/live-preview';
export * from './engine/properties-extension';
export * from './data/tag-registry';
export * from './engine/theme';
export * from './engine/advanced-extensions';

// Controller
export { createMarkdownController, MarkdownController } from './controller';

// Components
export { default as MarkdownEditor } from './ui/MarkdownEditor.svelte';
export { default as MarkdownToolbar } from './ui/MarkdownToolbar.svelte';
export { default as MarkdownContextMenu } from './ui/MarkdownContextMenu.svelte';
export default MarkdownEditor;
