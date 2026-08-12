import { tick } from 'svelte';
import { get, writable } from 'svelte/store';
import { Columns2, File, FileArchive, FileCode, FileJson, FileText, FolderPlus, Image, Search, Settings, Zap } from 'lucide-svelte';
import { getCustomFileIcon, resolveIconComponent } from '../config/icon-registry';
import { ConfigurationPanel } from '../../configuration';
import MarkdownEditor from '../../markdown';
import YamlFileEditor from '../../configuration/ui/YamlFileEditor.svelte';
import { editorState, type EditorPane, type EditorState } from '../state/editor';
import {
	contextMenuState,
	fileTreeState,
	inlineEditState,
	type ContextMenuState,
	type FileNode,
	type FileTreeState,
	type InlineEditState
} from '../state';
import {
	clampExplorerSidebarWidth,
	ensureExplorerConfigPath,
	readExplorerConfig,
	writeExplorerConfig,
	type ExplorerPosition
} from '../config/explorer-config';
import { fileTreeController } from './file-tree-controller';
import { quickOpenController, type QuickOpenFile, type QuickOpenFilter } from './quick-open-controller';
import type { QuickOpenState } from '../types';

export interface FilesViewState {
	showExplorerMenu: boolean;
	showBrainstormSettings: boolean;
	sidebarWidth: number;
	isResizingSidebar: boolean;
	explorerPosition: ExplorerPosition;
	editorState: EditorState;
	fileTreeState: FileTreeState;
	contextMenuState: ContextMenuState;
	inlineEditState: InlineEditState;
	quickOpenState: QuickOpenState;
}

const sidebarWidthStorageKey = 'brainstorm.explorer.sidebarWidth';

class FilesController {
	private readonly state = writable<FilesViewState>({
		showExplorerMenu: false,
		showBrainstormSettings: false,
		sidebarWidth: 260,
		isResizingSidebar: false,
		explorerPosition: 'left',
		editorState: get(editorState),
		fileTreeState: get(fileTreeState),
		contextMenuState: get(contextMenuState),
		inlineEditState: get(inlineEditState),
		quickOpenState: get(quickOpenController.state)
	});

	readonly subscribe = this.state.subscribe;
	readonly fileTreeState = fileTreeState;
	readonly editorState = editorState;
	readonly quickOpenState = quickOpenController.state;
	readonly settingsComponent = ConfigurationPanel;
	readonly editorComponent = MarkdownEditor;

	editorComponentForPath(path: string) {
		return /\.(yaml|yml)$/i.test(path) ? YamlFileEditor : MarkdownEditor;
	}
	readonly splitIcon = Columns2;
	readonly newFolderIcon = FolderPlus;
	readonly searchIcon = Search;
	readonly settingsIcon = Settings;

	private explorerMenuWrap: HTMLDivElement | null = null;
	private unsubscribeEditorState: (() => void) | null = null;
	private unsubscribeFileTreeState: (() => void) | null = null;
	private unsubscribeContextMenuState: (() => void) | null = null;
	private unsubscribeInlineEditState: (() => void) | null = null;
	private unsubscribeQuickOpenState: (() => void) | null = null;

	mount(): void {
		const savedWidth = Number(localStorage.getItem(sidebarWidthStorageKey));
		if (Number.isFinite(savedWidth) && savedWidth > 0) {
			this.patchState({ sidebarWidth: clampExplorerSidebarWidth(savedWidth) });
		}
		void this.loadExplorerConfig();
		this.unsubscribeEditorState = editorState.subscribe((nextEditorState) => {
			this.patchState({ editorState: nextEditorState });
			fileTreeController.scheduleWorkspaceSave();
		});
		this.unsubscribeFileTreeState = fileTreeState.subscribe((nextFileTreeState) => {
			this.patchState({ fileTreeState: nextFileTreeState });
		});
		this.unsubscribeContextMenuState = contextMenuState.subscribe((nextContextMenuState) => {
			this.patchState({ contextMenuState: nextContextMenuState });
		});
		this.unsubscribeInlineEditState = inlineEditState.subscribe((nextInlineEditState) => {
			this.patchState({ inlineEditState: nextInlineEditState });
		});
		this.unsubscribeQuickOpenState = quickOpenController.state.subscribe((nextQuickOpenState) => {
			this.patchState({ quickOpenState: nextQuickOpenState });
		});
		document.addEventListener('pointerdown', this.handleDocumentPointerDown, true);
		document.addEventListener('pointermove', this.handleDocumentPointerMove, true);
		document.addEventListener('pointerup', this.stopSidebarResize, true);
		document.addEventListener('keydown', this.handleQuickOpenDocumentKeydown, true);
	}

	destroy(): void {
		void fileTreeController.flushWorkspaceState();
		document.removeEventListener('pointerdown', this.handleDocumentPointerDown, true);
		document.removeEventListener('pointermove', this.handleDocumentPointerMove, true);
		document.removeEventListener('pointerup', this.stopSidebarResize, true);
		document.removeEventListener('keydown', this.handleQuickOpenDocumentKeydown, true);
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
		this.unsubscribeEditorState?.();
		this.unsubscribeEditorState = null;
		this.unsubscribeFileTreeState?.();
		this.unsubscribeFileTreeState = null;
		this.unsubscribeContextMenuState?.();
		this.unsubscribeContextMenuState = null;
		this.unsubscribeInlineEditState?.();
		this.unsubscribeInlineEditState = null;
		this.unsubscribeQuickOpenState?.();
		this.unsubscribeQuickOpenState = null;
		fileTreeController.destroy();
	}

	setExplorerMenuWrap(element: HTMLDivElement): void {
		this.explorerMenuWrap = element;
	}

	toggleExplorerMenu = (): void => {
		const state = this.snapshot();
		this.patchState({ showExplorerMenu: !state.showExplorerMenu });
	};

	triggerNewFile = (): void => {
		fileTreeController.triggerNewFile();
	};

	triggerNewFolder = (): void => {
		fileTreeController.triggerNewFolder();
	};

	openQuickOpen = (): void => {
		void quickOpenController.open();
	};

	splitActivePane = (): void => {
		this.patchState({ showExplorerMenu: false });
		editorState.splitPane();
	};

	openBrainstormSettings = async (): Promise<void> => {
		this.patchState({ showExplorerMenu: false });
		const rootPath = get(fileTreeState).rootPath;
		if (!rootPath) return;

		const configPath = await ensureExplorerConfigPath();
		if (configPath) {
			await fileTreeController.loadChildren(rootPath);
		}
		this.patchState({ showBrainstormSettings: true });
	};

	closeBrainstormSettings = (): void => {
		this.patchState({ showBrainstormSettings: false });
		void this.loadExplorerConfig();
	};

	loadExplorerConfig = async (): Promise<void> => {
		const config = await readExplorerConfig();
		this.patchState({
			explorerPosition: config.position,
			sidebarWidth: clampExplorerSidebarWidth(config.sidebarWidth)
		});
		const rootPath = get(fileTreeState).rootPath;
		if (rootPath) {
			await fileTreeController.loadChildren(rootPath);
		}
	};

	startSidebarResize = (event: PointerEvent): void => {
		event.preventDefault();
		this.patchState({ isResizingSidebar: true });
		this.updateSidebarWidth(event.clientX);
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	};

	setActivePane = (paneId: string): void => {
		editorState.setActivePane(paneId);
	};

	selectTab = (path: string, paneId: string, event?: Event): void => {
		event?.stopPropagation();
		editorState.setActivePane(paneId);
		editorState.setActiveTab(path, paneId);
	};

	openFile = (path: string, name: string): void => {
		editorState.openFile(path, name);
	};

	closeTab = (path: string, paneId: string, event?: Event): void => {
		event?.stopPropagation();
		editorState.closeFile(path, paneId);
	};

	splitPane = (paneId: string, event?: Event): void => {
		event?.stopPropagation();
		editorState.splitPane(paneId);
	};

	closePane = (paneId: string, event?: Event): void => {
		event?.stopPropagation();
		editorState.closePane(paneId);
	};

	hasOpenEditor(state = get(editorState)): boolean {
		return state.panes.length > 1 || state.panes.some((pane) => pane.activeTabId);
	}

	paneTitle(pane: EditorPane): string {
		return pane.tabs.find((tab) => tab.id === pane.activeTabId)?.name.replace(/\.md$/i, '') ?? 'Empty Pane';
	}

	initFileTree(projectPath?: string): void {
		if (projectPath) void fileTreeController.init(projectPath);
	}

	destroyFileTree(): void {
		fileTreeController.destroy();
	}

	getFlatNodes(): FileNode[] {
		return fileTreeController.getFlatNodes();
	}

	handleRootContextMenu = (event: MouseEvent): void => {
		const rootPath = get(fileTreeState).rootPath;
		if (rootPath) fileTreeController.handleContextMenu(event, rootPath, true);
	};

	handleNodeContextMenu = (event: MouseEvent, node: FileNode): void => {
		event.stopPropagation();
		fileTreeController.handleContextMenu(event, node.path, node.isDir);
	};

	handleContextAction = (action: string): void => {
		void fileTreeController.handleContextAction(action);
	};

	closeContextMenu = (): void => {
		fileTreeController.closeContextMenu();
	};

	handleInlineCommit = (value: string): void => {
		void fileTreeController.handleInlineCommit(value);
	};

	handleInlineCancel = (): void => {
		fileTreeController.handleInlineCancel();
	};

	handleNodeClick = (node: FileNode): void => {
		fileTreeController.handleNodeClick(node);
	};

	handleNodePointerDown = (node: FileNode, event: PointerEvent): void => {
		fileTreeController.handleNodePointerDown(node, event);
	};

	handleNodePointerMove = (node: FileNode, event: PointerEvent): void => {
		fileTreeController.handleNodePointerMove(node, event);
	};

	handleNodePointerUp = (node: FileNode, event: PointerEvent): void => {
		void fileTreeController.handleNodePointerUp(node, event);
	};

	handleNodePointerCancel = (event: PointerEvent): void => {
		fileTreeController.handleNodePointerCancel(event);
	};

	handleDragStart = (node: FileNode, event: DragEvent): void => {
		fileTreeController.handleDragStart(node, event);
	};

	handleDragOver = (node: FileNode, event: DragEvent): boolean => fileTreeController.handleDragOver(node, event);

	handleDrop = (node: FileNode, event: DragEvent): void => {
		void fileTreeController.handleDrop(node, event);
	};

	isActiveNode(path: string): boolean {
		return get(editorState).activeTabId === path;
	}

	isFocusedNode(path: string): boolean {
		return get(fileTreeState).focusedPath === path;
	}

	gitClass(status: string | undefined): string {
		if (!status) return '';
		if (status.includes('M')) return 'git-modified';
		if (status.includes('A') || status.includes('?')) return 'git-added';
		if (status.includes('D')) return 'git-deleted';
		return '';
	}

	displayNodeName(node: FileNode): string {
		return node.isDir ? node.name : node.name.replace(/\.md$/, '');
	}

	fileIcon(filename: string, path?: string) {
		if (path) {
			const custom = getCustomFileIcon(path);
			if (custom) return resolveIconComponent(custom);
		}
		const ext = filename.split('.').pop()?.toLowerCase();
		switch (ext) {
			case 'js':
			case 'ts':
			case 'jsx':
			case 'tsx':
			case 'svelte':
			case 'vue':
			case 'html':
			case 'css':
				return FileCode;
			case 'json':
				return FileJson;
			case 'md':
				return Zap;
			case 'txt':
				return FileText;
			case 'png':
			case 'jpg':
			case 'jpeg':
			case 'gif':
			case 'svg':
				return Image;
			case 'zip':
			case 'tar':
			case 'gz':
				return FileArchive;
			case 'toml':
			case 'yml':
			case 'yaml':
			case 'conf':
				return Settings;
			default:
				return File;
		}
	}

	getFileAccentColor(filename: string): string {
		const ext = filename.split('.').pop()?.toLowerCase();
		switch (ext) {
			case 'js':
			case 'ts':
			case 'jsx':
			case 'tsx':
			case 'svelte':
			case 'vue':
			case 'html':
			case 'css':
				return '#64D2FF';
			case 'json':
			case 'toml':
			case 'yml':
			case 'yaml':
			case 'conf':
				return '#FFD60A';
			case 'md':
			case 'txt':
				return 'var(--colors-primary)';
			case 'png':
			case 'jpg':
			case 'jpeg':
			case 'gif':
			case 'svg':
				return '#FF9F0A';
			case 'zip':
			case 'tar':
			case 'gz':
				return '#BF5AF2';
			default:
				return 'var(--colors-primary)';
		}
	}

	filterQuickOpenFiles(
		files: QuickOpenFile[],
		query: string,
		filter: QuickOpenFilter = 'all'
	): QuickOpenFile[] {
		let candidateFiles = files;
		if (filter === 'files') {
			candidateFiles = files.filter((f) => !f.isDir);
		} else if (filter === 'folders') {
			candidateFiles = files.filter((f) => Boolean(f.isDir));
		}

		const normalizedQuery = query.trim().toLocaleLowerCase();
		if (!normalizedQuery) return candidateFiles;

		const parts = normalizedQuery.split(/\s+/).filter(Boolean);
		return candidateFiles
			.map((file) => {
				const haystack = `${file.label} ${file.relativePath}`.toLocaleLowerCase();
				const matches = parts.every((part) => haystack.includes(part));
				if (!matches) return null;

				const firstIndex = Math.min(
					...parts.map((part) => {
						const index = haystack.indexOf(part);
						return index === -1 ? Number.MAX_SAFE_INTEGER : index;
					})
				);
				return { file, score: firstIndex + file.relativePath.length / 1000 };
			})
			.filter((match): match is { file: QuickOpenFile; score: number } => Boolean(match))
			.sort(
				(left, right) =>
					left.score - right.score || left.file.relativePath.localeCompare(right.file.relativePath)
			)
			.map((match) => match.file);
	}

	setQuickOpenQuery = (query: string): void => {
		quickOpenController.setQuery(query);
	};

	setQuickOpenFilter = (filter: QuickOpenFilter): void => {
		quickOpenController.setFilter(filter);
	};

	closeQuickOpen = (): void => {
		quickOpenController.close();
	};

	setQuickOpenSelectedIndex = (index: number): void => {
		quickOpenController.setSelectedIndex(index);
	};

	openQuickOpenFile = (file: QuickOpenFile): void => {
		quickOpenController.openFile(file);
		if (file.isDir) {
			void fileTreeController.toggleExpand(file.path);
		}
	};

	syncQuickOpenSelectedIndex(filteredFiles: QuickOpenFile[], selectedIndex: number): void {
		if (selectedIndex >= filteredFiles.length && filteredFiles.length > 0) {
			quickOpenController.setSelectedIndex(filteredFiles.length - 1);
		}
	}

	focusQuickOpenInput(input: HTMLInputElement | undefined): void {
		void tick().then(() => input?.focus());
	}

	handleQuickOpenBackdropPointerDown = (event: PointerEvent): void => {
		if (event.target === event.currentTarget) quickOpenController.close();
	};

	private handleDocumentPointerDown = (event: PointerEvent): void => {
		const state = this.snapshot();
		const target = event.target;
		if (!state.showExplorerMenu) return;
		if (target instanceof Node && this.explorerMenuWrap?.contains(target)) return;
		this.patchState({ showExplorerMenu: false });
	};

	private handleDocumentPointerMove = (event: PointerEvent): void => {
		if (!this.snapshot().isResizingSidebar) return;
		this.updateSidebarWidth(event.clientX);
	};

	private stopSidebarResize = (): void => {
		const state = this.snapshot();
		if (!state.isResizingSidebar) return;
		this.patchState({ isResizingSidebar: false });
		localStorage.setItem(sidebarWidthStorageKey, `${state.sidebarWidth}`);
		void writeExplorerConfig({ sidebarWidth: state.sidebarWidth });
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	};

	private updateSidebarWidth(clientX: number): void {
		const state = this.snapshot();
		const nextWidth = state.explorerPosition === 'right' ? window.innerWidth - clientX : clientX;
		this.patchState({ sidebarWidth: clampExplorerSidebarWidth(nextWidth) });
	}

	private handleQuickOpenDocumentKeydown = (event: KeyboardEvent): void => {
		if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'o') {
			event.preventDefault();
			void quickOpenController.open();
			return;
		}

		const state = get(quickOpenController.state);
		if (!state.show) return;

		const filteredFiles = this.filterQuickOpenFiles(state.files, state.query);
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			quickOpenController.close();
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			const nextIndex = Math.min(state.selectedIndex + 1, filteredFiles.length - 1);
			quickOpenController.setSelectedIndex(Math.max(nextIndex, 0));
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			quickOpenController.setSelectedIndex(Math.max(state.selectedIndex - 1, 0));
			return;
		}

		if (event.key === 'Enter') {
			const selected = filteredFiles[state.selectedIndex];
			if (!selected) return;
			event.preventDefault();
			quickOpenController.openFile(selected);
		}
	};

	private patchState(patch: Partial<FilesViewState>): void {
		this.state.update((state) => ({ ...state, ...patch }));
	}

	private snapshot(): FilesViewState {
		let value!: FilesViewState;
		const unsubscribe = this.state.subscribe((state) => {
			value = state;
		});
		unsubscribe();
		return value;
	}
}

export const filesController = new FilesController();
