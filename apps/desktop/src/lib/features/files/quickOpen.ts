import { get, writable } from 'svelte/store';
import { fileTreeState, type FileEntry } from './state';
import { editorState } from './stores/editor';
import { getVaultIndex } from './vault-index';

export interface QuickOpenFile {
  name: string;
  path: string;
  label: string;
  relativePath: string;
}

interface QuickOpenState {
  show: boolean;
  query: string;
  files: QuickOpenFile[];
  selectedIndex: number;
  isLoading: boolean;
}

function markdownEntryToQuickOpenFile(entry: FileEntry, rootPath: string): QuickOpenFile {
  const relativePath = entry.path.startsWith(`${rootPath}/`)
    ? entry.path.slice(rootPath.length + 1)
    : entry.name;

  return {
    name: entry.name,
    path: entry.path,
    label: entry.name.replace(/\.md$/i, ''),
    relativePath
  };
}

function getLoadedMarkdownFiles(rootPath: string | null): QuickOpenFile[] {
  if (!rootPath) return [];

  return [...get(fileTreeState).nodes.values()]
    .filter((node) => !node.isDir && node.name.toLocaleLowerCase().endsWith('.md'))
    .map((node) => markdownEntryToQuickOpenFile({
      name: node.name,
      path: node.path,
      is_dir: false,
      is_symlink: node.isSymlink
    }, rootPath));
}

function createQuickOpenController() {
  const state = writable<QuickOpenState>({
    show: false,
    query: '',
    files: [],
    selectedIndex: 0,
    isLoading: false
  });

  function close() {
    state.update((current) => ({ ...current, show: false, query: '', selectedIndex: 0 }));
  }

  async function refreshFiles() {
    const rootPath = get(fileTreeState).rootPath;
    if (!rootPath) return;

    state.update((current) => ({
      ...current,
      files: getLoadedMarkdownFiles(rootPath),
      isLoading: true
    }));

    try {
      const index = await getVaultIndex(rootPath);
      const entries: FileEntry[] = index.files.map((file) => ({
        name: file.name,
        path: file.path,
        is_dir: false,
        is_symlink: false
      }));
      state.update((current) => ({
        ...current,
        files: entries.map((entry) => markdownEntryToQuickOpenFile(entry, rootPath)),
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to list markdown files', error);
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
        selectedIndex: 0
      }));
      await refreshFiles();
    },

    close,

    setQuery(query: string) {
      state.update((current) => ({ ...current, query, selectedIndex: 0 }));
    },

    setSelectedIndex(selectedIndex: number) {
      state.update((current) => ({ ...current, selectedIndex }));
    },

    openFile(file: QuickOpenFile, pin = false) {
      fileTreeState.update((current) => ({ ...current, focusedPath: file.path }));
      editorState.openFile(file.path, file.name, pin);
      close();
    }
  };
}

export const quickOpenController = createQuickOpenController();
