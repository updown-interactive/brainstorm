import { writable } from 'svelte/store';

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  isSymlink: boolean;
  
  // Frontend-only state
  isExpanded: boolean;
  isLoaded: boolean;
  children: string[]; // Paths of children, to look up in the Map
  depth: number;
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_symlink: boolean;
}

export interface FileTreeState {
  nodes: Map<string, FileNode>;
  rootPath: string | null;
  expandedPaths: Set<string>; // Session-only expand/collapse tracking
  gitStatus: Map<string, string>; // Maps absolute path -> git status code
  focusedPath: string | null;
}

export const fileTreeState = writable<FileTreeState>({
  nodes: new Map(),
  rootPath: null,
  expandedPaths: new Set(),
  gitStatus: new Map(),
  focusedPath: null,
});

export interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  nodePath: string;
  isDir: boolean;
}

export const contextMenuState = writable<ContextMenuState>({ 
  show: false, 
  x: 0, 
  y: 0, 
  nodePath: '', 
  isDir: false 
});

export interface InlineEditState {
  show: boolean;
  path: string;
  isNew: boolean;
  type: 'file' | 'folder';
  parentPath: string;
  initialValue: string;
}

export const inlineEditState = writable<InlineEditState>({ 
  show: false, 
  path: '', 
  isNew: false, 
  type: 'file', 
  parentPath: '', 
  initialValue: '' 
});
