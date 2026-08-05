export interface FileNode {
	name: string;
	path: string;
	isDir: boolean;
	isSymlink: boolean;
	isExpanded: boolean;
	isLoaded: boolean;
	children: string[];
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
	expandedPaths: Set<string>;
	gitStatus: Map<string, string>;
	focusedPath: string | null;
	draggedPath: string | null;
	dropTargetPath: string | null;
	isDragging: boolean;
	dragPreviewName: string;
	dragClientX: number;
	dragClientY: number;
}

export interface ContextMenuState {
	show: boolean;
	x: number;
	y: number;
	nodePath: string;
	isDir: boolean;
}

export interface InlineEditState {
	show: boolean;
	path: string;
	isNew: boolean;
	type: 'file' | 'folder';
	parentPath: string;
	initialValue: string;
}

export type QuickOpenFilter = 'all' | 'files' | 'folders';

export interface QuickOpenFile {
	name: string;
	path: string;
	label: string;
	relativePath: string;
	isDir?: boolean;
}

export interface QuickOpenState {
	show: boolean;
	query: string;
	filter: QuickOpenFilter;
	files: QuickOpenFile[];
	selectedIndex: number;
	isLoading: boolean;
}

export interface ExplorerConfig {
	position: 'left' | 'right';
	sidebarWidth: number;
}

export type ExplorerPosition = 'left' | 'right';

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

export interface SharedTag {
	name: string;
	color: string;
	description: string;
	created: string;
}

export interface FileTreeController {
	init(projectPath: string): Promise<void>;
	initRoot(rootPath: string): Promise<void>;
	scheduleWorkspaceSave(rootPathOverride?: string): void;
	flushWorkspaceState(rootPathOverride?: string): Promise<void>;
	refreshGitStatus(rootPath: string): Promise<void>;
	loadChildren(path: string): Promise<void>;
	toggleExpand(path: string): Promise<void>;
	setFocusedPath(path: string | null): void;
	getFlatNodes(): FileNode[];
	setupWatcher(path: string): Promise<void>;
	destroy(): void;
	handleNodeClick(node: FileNode): void;
	handleNodePointerDown(node: FileNode, e: PointerEvent): void;
	handleNodePointerMove(node: FileNode, e: PointerEvent): void;
	handleNodePointerUp(node: FileNode, e: PointerEvent): void;
	handleNodePointerCancel(e: PointerEvent): void;
	handleDragStart(node: FileNode, e: DragEvent): void;
	handleDragOver(node: FileNode, e: DragEvent): boolean;
	handleDrop(node: FileNode, e: DragEvent): Promise<void>;
	handleContextMenu(e: MouseEvent, nodePath: string, isDir: boolean): void;
	closeContextMenu(): void;
	handleContextAction(action: string): Promise<void>;
	triggerNewFile(): void;
	triggerNewFolder(): void;
	handleInlineCommit(value: string): Promise<void>;
	handleInlineCancel(): void;
	contextMenuState: typeof import('../state').contextMenuState;
	inlineEditState: typeof import('../state').inlineEditState;
	fileTreeState: typeof import('../state').fileTreeState;
}
