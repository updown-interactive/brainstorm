import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import {
	fileTreeState,
	contextMenuState,
	inlineEditState,
	type FileNode,
	type FileEntry,
	type FileTreeState,
	type ContextMenuState,
	type InlineEditState,
} from '../state';
import { editorState } from '../state/editor';
import { readWorkspaceState, writeWorkspaceState } from '../data/workspace-state';
import { readExplorerConfig } from '../config/explorer-config';
import {
	defaultFrontmatter,
	ensureMarkdownFrontmatter,
	isMarkdownPath,
	nameFromPath,
	updateFrontmatterProperty
} from '../../markdown/engine/frontmatter';
import type { FileTreeController } from '../types';

export function createFileTreeController(): FileTreeController {
	let unlistenFsChange: UnlistenFn | null = null;
	let clickTimeout: ReturnType<typeof setTimeout> | null = null;
	let saveWorkspaceTimeout: ReturnType<typeof setTimeout> | null = null;
	let isRestoringWorkspace = false;
	let pendingDrag:
		| {
				path: string;
				pointerId: number;
				startX: number;
				startY: number;
		  }
		| null = null;
	let suppressNextClick = false;
	const dragStartThreshold = 4;

	function scheduleSaveWorkspace(rootPathOverride?: string) {
		if (isRestoringWorkspace) return;
		const rootPath = rootPathOverride ?? get(fileTreeState).rootPath;
		if (!rootPath) return;

		if (saveWorkspaceTimeout) clearTimeout(saveWorkspaceTimeout);
		saveWorkspaceTimeout = setTimeout(() => {
			saveWorkspaceTimeout = null;
			void flushPersistWorkspace(rootPath);
		}, 500);
	}

	async function flushPersistWorkspace(rootPathOverride?: string) {
		if (saveWorkspaceTimeout) {
			clearTimeout(saveWorkspaceTimeout);
			saveWorkspaceTimeout = null;
		}

		const rootPath = rootPathOverride ?? get(fileTreeState).rootPath;
		if (!rootPath) return;

		const treeState = get(fileTreeState);
		const edState = get(editorState);
		const expandedPaths = [...treeState.expandedPaths].filter((p) => p !== rootPath && p.startsWith(`${rootPath}/`));

		await writeWorkspaceState(
			{
				version: 1,
				fileTree: {
					expandedPaths,
					focusedPath: treeState.focusedPath
				},
				editor: {
					activePaneId: edState.activePaneId,
					panes: edState.panes.map((pane) => ({
						id: pane.id,
						activeTabId: pane.activeTabId,
						tabs: pane.tabs.map((tab) => ({
							id: tab.id,
							path: tab.path,
							name: tab.name,
							isPinned: tab.isPinned,
							isModified: tab.isModified
						}))
					}))
				}
			},
			rootPath
		);
	}

	function parentPathFor(path: string): string {
		return path.substring(0, path.lastIndexOf('/'));
	}

	function fileNameFor(path: string): string {
		return path.split('/').pop() ?? '';
	}

	function isValidDropTarget(srcPath: string | null, targetPath: string | null): targetPath is string {
		if (!srcPath || !targetPath || srcPath === targetPath) return false;
		if (parentPathFor(srcPath) === targetPath) return false;
		return !targetPath.startsWith(`${srcPath}/`);
	}

	function resetDragState(): void {
		pendingDrag = null;
		fileTreeState.update((state) => ({
			...state,
			draggedPath: null,
			dropTargetPath: null,
			isDragging: false,
			dragPreviewName: '',
			dragClientX: 0,
			dragClientY: 0,
		}));
	}

	function dropTargetPathFromPoint(clientX: number, clientY: number): string | null {
		const target = document.elementFromPoint(clientX, clientY);
		if (!(target instanceof HTMLElement)) return null;

		const row = target.closest<HTMLElement>('[data-file-tree-path]');
		const rowPath = row?.dataset.fileTreePath;
		if (rowPath) {
			return row.dataset.fileTreeDir === 'true' ? rowPath : parentPathFor(rowPath);
		}

		const root = target.closest<HTMLElement>('[data-file-tree-root-path]');
		return root?.dataset.fileTreeRootPath ?? null;
	}

	return {
		contextMenuState,
		inlineEditState,
		fileTreeState,

		scheduleWorkspaceSave(rootPathOverride?: string) {
			scheduleSaveWorkspace(rootPathOverride);
		},

		async flushWorkspaceState(rootPathOverride?: string) {
			await flushPersistWorkspace(rootPathOverride);
		},

		async init(projectPath: string) {
			if (get(fileTreeState).rootPath !== projectPath) {
				await this.initRoot(projectPath);
				await this.setupWatcher(projectPath);
			}
		},

		async initRoot(rootPath: string) {
			isRestoringWorkspace = true;
			const savedState = await readWorkspaceState(rootPath);
			const savedExpanded = new Set(savedState?.fileTree.expandedPaths ?? []);

			fileTreeState.set({
				nodes: new Map(),
				rootPath,
				expandedPaths: savedExpanded,
				gitStatus: new Map(),
				focusedPath: savedState?.fileTree.focusedPath ?? null,
				draggedPath: null,
				dropTargetPath: null,
				isDragging: false,
				dragPreviewName: '',
				dragClientX: 0,
				dragClientY: 0,
			});

			const rootNode: FileNode = {
				name: rootPath.split('/').pop() || rootPath,
				path: rootPath,
				isDir: true,
				isSymlink: false,
				isExpanded: true,
				isLoaded: false,
				children: [],
				depth: 0,
			};

			fileTreeState.update((s) => {
				s.nodes.set(rootPath, rootNode);
				return s;
			});

			await this.loadChildren(rootPath);

			if (savedExpanded.size > 0) {
				const sortedExpanded = [...savedExpanded].sort((a, b) => a.length - b.length);
				for (const expPath of sortedExpanded) {
					await this.loadChildren(expPath);
					fileTreeState.update((s) => {
						const node = s.nodes.get(expPath);
						if (node) {
							node.isExpanded = true;
						}
						return s;
					});
				}
			}

			if (savedState?.editor && savedState.editor.panes.length > 0) {
				const validatedPanes = await Promise.all(
					savedState.editor.panes.map(async (pane) => {
						const validTabs = (
							await Promise.all(
								pane.tabs.map(async (tab) => {
									try {
										const exists = await invoke<boolean>('path_exists', { path: tab.path });
										return exists ? tab : null;
									} catch {
										return null;
									}
								})
							)
						).filter((t): t is typeof pane.tabs[0] => t !== null);

						const validActiveTabId = validTabs.some((t) => t.id === pane.activeTabId)
							? pane.activeTabId
							: validTabs.at(-1)?.id ?? null;

						return {
							id: pane.id,
							activeTabId: validActiveTabId,
							tabs: validTabs
						};
					})
				);

				const validActivePaneId = validatedPanes.some((p) => p.id === savedState.editor.activePaneId)
					? savedState.editor.activePaneId
					: validatedPanes[0].id;

				editorState.restoreState({
					activePaneId: validActivePaneId,
					panes: validatedPanes
				});
			} else {
				editorState.reset();
			}

			await this.refreshGitStatus(rootPath);
			isRestoringWorkspace = false;
		},

		async refreshGitStatus(rootPath: string) {
			try {
				const statusMap = await invoke<Record<string, string>>('get_git_status', { path: rootPath });
				fileTreeState.update((s) => {
					const newMap = new Map();
					for (const [key, val] of Object.entries(statusMap)) {
						newMap.set(key, val);
					}
					return { ...s, gitStatus: newMap };
				});
			} catch (err) {
				console.error('Failed to get git status', err);
			}
		},

		async loadChildren(path: string) {
			const state = get(fileTreeState);
			const node = state.nodes.get(path);
			if (!node || !node.isDir) return;

			try {
				const explorerConfig = await readExplorerConfig(state.rootPath);
				const entries: FileEntry[] = await invoke('read_dir_entries', {
					path,
					showBrainstorm: explorerConfig.showBrainstormFolder
				});

				fileTreeState.update((s) => {
					const parent = s.nodes.get(path);
					if (!parent) return s;

					const entryPaths = new Set(entries.map((e) => e.path));

					// Prune child nodes no longer present on disk
					for (const oldChildPath of parent.children) {
						if (!entryPaths.has(oldChildPath)) {
							s.nodes.delete(oldChildPath);
						}
					}

					parent.children = [];

					for (const entry of entries) {
						parent.children.push(entry.path);

						const existing = s.nodes.get(entry.path);
						if (!existing) {
							s.nodes.set(entry.path, {
								name: entry.name,
								path: entry.path,
								isDir: entry.is_dir,
								isSymlink: entry.is_symlink,
								isExpanded: s.expandedPaths.has(entry.path),
								isLoaded: false,
								children: [],
								depth: parent.depth + 1,
							});
						} else {
							existing.name = entry.name;
							existing.isDir = entry.is_dir;
							existing.isSymlink = entry.is_symlink;
						}
					}

					parent.isLoaded = true;
					return s;
				});

				const updatedState = get(fileTreeState);
				const parentNode = updatedState.nodes.get(path);
				if (parentNode) {
					for (const childPath of parentNode.children) {
						const childNode = updatedState.nodes.get(childPath);
						if (childNode?.isDir && childNode.isExpanded) {
							await this.loadChildren(childPath);
						}
					}
				}
			} catch (err) {
				console.error('Failed to load dir entries for', path, err);
			}
		},

		async toggleExpand(path: string) {
			const state = get(fileTreeState);
			const node = state.nodes.get(path);
			if (!node || !node.isDir) return;

			const willExpand = !node.isExpanded;

			fileTreeState.update((s) => {
				const n = s.nodes.get(path);
				if (n) {
					n.isExpanded = willExpand;
					if (willExpand) {
						s.expandedPaths.add(path);
					} else {
						s.expandedPaths.delete(path);
					}
				}
				return s;
			});

			if (willExpand && !node.isLoaded) {
				await this.loadChildren(path);
			}

			scheduleSaveWorkspace();
		},

		setFocusedPath(path: string | null) {
			fileTreeState.update((s) => ({ ...s, focusedPath: path }));
			scheduleSaveWorkspace();
		},

		getFlatNodes(): FileNode[] {
			const state = get(fileTreeState);
			if (!state.rootPath) return [];

			const flat: FileNode[] = [];
			const rootNode = state.nodes.get(state.rootPath);

			if (!rootNode) return flat;

			flat.push(rootNode);

			const traverse = (childrenPaths: string[]) => {
				for (const childPath of childrenPaths) {
					const childNode = state.nodes.get(childPath);
					if (childNode) {
						flat.push(childNode);
						if (childNode.isDir && childNode.isExpanded) {
							traverse(childNode.children);
						}
					}
				}
			};

			if (rootNode.isExpanded) {
				traverse(rootNode.children);
			}
			return flat;
		},

		async setupWatcher(path: string) {
			try {
				if (unlistenFsChange) unlistenFsChange();

				try {
					await invoke('start_project_watcher', { path });
				} catch (e) {
					console.error('Failed to start project watcher in backend:', e);
				}

				unlistenFsChange = await listen('fs-change', async (event: any) => {
					const { kind, path: changedPath } = event.payload ?? {};
					if (!changedPath) return;

					const parentPath = parentPathFor(changedPath);
					const state = get(fileTreeState);

					if (kind === 'remove') {
						editorState.closePath(changedPath);
						fileTreeState.update((s) => ({
							...s,
							focusedPath:
								s.focusedPath === changedPath || s.focusedPath?.startsWith(`${changedPath}/`)
									? null
									: s.focusedPath,
						}));
					}

					const parentNode = state.nodes.get(parentPath);
					if (parentNode && (parentNode.isExpanded || parentPath === state.rootPath || parentNode.isLoaded)) {
						await this.loadChildren(parentPath);
					}

					if (state.rootPath && (parentPath === state.rootPath || changedPath === state.rootPath)) {
						await this.loadChildren(state.rootPath);
					}

					const changedNode = state.nodes.get(changedPath);
					if (changedNode?.isDir && changedNode.isExpanded) {
						await this.loadChildren(changedPath);
					}

					if (state.rootPath) {
						await this.refreshGitStatus(state.rootPath);
					}
				});
			} catch (err) {
				console.error('Failed to setup file watcher listener', err);
			}
		},

		destroy() {
			if (unlistenFsChange) unlistenFsChange();
			resetDragState();
		},

		handleNodeClick(node: FileNode) {
			if (suppressNextClick) {
				suppressNextClick = false;
				return;
			}

			this.setFocusedPath(node.path);
			if (node.isDir) {
				this.toggleExpand(node.path);
			} else {
				editorState.openFile(node.path, node.name);
			}
		},

		handleNodePointerDown(node: FileNode, e: PointerEvent) {
			if (e.button !== 0) return;
			pendingDrag = {
				path: node.path,
				pointerId: e.pointerId,
				startX: e.clientX,
				startY: e.clientY,
			};

			const target = e.currentTarget;
			if (target instanceof HTMLElement) {
				target.setPointerCapture(e.pointerId);
			}
		},

		handleNodePointerMove(_node: FileNode, e: PointerEvent) {
			if (!pendingDrag || pendingDrag.pointerId !== e.pointerId) return;

			const state = get(fileTreeState);
			const deltaX = e.clientX - pendingDrag.startX;
			const deltaY = e.clientY - pendingDrag.startY;
			const hasStartedDragging = Math.hypot(deltaX, deltaY) >= dragStartThreshold;
			if (!state.isDragging && !hasStartedDragging) return;

			e.preventDefault();
			suppressNextClick = true;

			if (!state.isDragging) {
				const draggedNode = state.nodes.get(pendingDrag.path);
				fileTreeState.update((nextState) => ({
					...nextState,
					draggedPath: pendingDrag?.path ?? null,
					isDragging: true,
					dragPreviewName: draggedNode?.name ?? fileNameFor(pendingDrag?.path ?? ''),
					dragClientX: e.clientX,
					dragClientY: e.clientY,
				}));
			}

			const targetPath = dropTargetPathFromPoint(e.clientX, e.clientY);
			const draggedPath = pendingDrag.path;
			fileTreeState.update((nextState) => ({
				...nextState,
				dropTargetPath: isValidDropTarget(draggedPath, targetPath) ? targetPath : null,
				dragClientX: e.clientX,
				dragClientY: e.clientY,
			}));
		},

		async handleNodePointerUp(_node: FileNode, e: PointerEvent) {
			if (!pendingDrag || pendingDrag.pointerId !== e.pointerId) return;

			const srcPath = pendingDrag.path;
			const wasDragging = get(fileTreeState).isDragging;
			const targetPath = wasDragging ? dropTargetPathFromPoint(e.clientX, e.clientY) : null;

			const target = e.currentTarget;
			if (target instanceof HTMLElement && target.hasPointerCapture(e.pointerId)) {
				target.releasePointerCapture(e.pointerId);
			}

			resetDragState();
			if (!wasDragging || !isValidDropTarget(srcPath, targetPath)) return;

			e.preventDefault();
			e.stopPropagation();
			suppressNextClick = true;

			const destPath = `${targetPath}/${fileNameFor(srcPath)}`;
			try {
				await invoke('move_path', { src: srcPath, dest: destPath });
				const sourceParentPath = parentPathFor(srcPath);
				await Promise.all([
					this.loadChildren(targetPath),
					sourceParentPath && sourceParentPath !== targetPath
						? this.loadChildren(sourceParentPath)
						: Promise.resolve(),
				]);
				const rootPath = get(fileTreeState).rootPath;
				if (rootPath) void this.refreshGitStatus(rootPath);
			} catch (err) {
				console.error('Move failed', err);
				alert(err);
			}
		},

		handleNodePointerCancel(e: PointerEvent) {
			const target = e.currentTarget;
			if (target instanceof HTMLElement && target.hasPointerCapture(e.pointerId)) {
				target.releasePointerCapture(e.pointerId);
			}
			resetDragState();
		},

		handleDragStart(node: FileNode, e: DragEvent) {
			if (e.dataTransfer) {
				e.dataTransfer.setData('text/plain', node.path);
				e.dataTransfer.effectAllowed = 'move';
			}
		},

		handleDragOver(node: FileNode, e: DragEvent): boolean {
			if (node.isDir) {
				e.preventDefault();
				if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
				return true;
			}
			return false;
		},

		async handleDrop(node: FileNode, e: DragEvent) {
			if (!node.isDir) return;
			e.preventDefault();
			e.stopPropagation();

			const srcPath = e.dataTransfer?.getData('text/plain');
			if (srcPath && isValidDropTarget(srcPath, node.path)) {
				const filename = fileNameFor(srcPath);
				const destPath = `${node.path}/${filename}`;

				try {
					await invoke('move_path', { src: srcPath, dest: destPath });
					const sourceParentPath = parentPathFor(srcPath);
					await Promise.all([
						this.loadChildren(node.path),
						sourceParentPath && sourceParentPath !== node.path
							? this.loadChildren(sourceParentPath)
							: Promise.resolve(),
					]);
					const rootPath = get(fileTreeState).rootPath;
					if (rootPath) void this.refreshGitStatus(rootPath);
				} catch (err) {
					console.error('Move failed', err);
					alert(err);
				}
			}
		},

		handleContextMenu(e: MouseEvent, nodePath: string, isDir: boolean) {
			e.preventDefault();
			contextMenuState.set({
				show: true,
				x: e.clientX,
				y: e.clientY,
				nodePath,
				isDir,
			});
		},

		closeContextMenu() {
			contextMenuState.update((s) => ({ ...s, show: false }));
		},

		async handleContextAction(action: string) {
			const ctx = get(contextMenuState);
			this.closeContextMenu();

			if (action === 'new_file' || action === 'new_folder') {
				inlineEditState.set({
					show: true,
					isNew: true,
					type: action === 'new_file' ? 'file' : 'folder',
					parentPath: ctx.nodePath,
					path: '',
					initialValue: '',
				});
				const flatNodes = this.getFlatNodes();
				if (!flatNodes.find((n) => n.path === ctx.nodePath)?.isExpanded) {
					await this.toggleExpand(ctx.nodePath);
				}
			} else if (action === 'rename') {
				const node = this.getFlatNodes().find((n) => n.path === ctx.nodePath);
				const isFolder = node?.isDir ?? false;
				let initialValue = node?.name || '';
				if (!isFolder) {
					initialValue = initialValue.replace(/\.md$/, '');
				}

				inlineEditState.set({
					show: true,
					isNew: false,
					type: isFolder ? 'folder' : 'file',
					parentPath: '',
					path: ctx.nodePath,
					initialValue,
				});
			} else if (action === 'delete') {
				if (confirm('Are you sure you want to delete this?')) {
					await invoke('delete_path', { path: ctx.nodePath, useTrash: true });
					editorState.closePath(ctx.nodePath);
					fileTreeState.update((s) => ({
						...s,
						focusedPath:
							s.focusedPath === ctx.nodePath || s.focusedPath?.startsWith(`${ctx.nodePath}/`)
								? null
								: s.focusedPath,
					}));
					const parentPath = ctx.nodePath.substring(0, ctx.nodePath.lastIndexOf('/'));
					await this.loadChildren(parentPath);
				}
			} else if (action === 'reveal') {
				await invoke('reveal_in_file_manager', { path: ctx.nodePath });
			}
		},

		triggerNewFile() {
			const state = get(fileTreeState);
			let targetPath = state.focusedPath || state.rootPath;
			if (!targetPath) return;

			let targetIsDir = true;
			const node = state.nodes.get(targetPath);
			if (node && !node.isDir) {
				targetPath = targetPath.substring(0, targetPath.lastIndexOf('/'));
				targetIsDir = true;
			}

			contextMenuState.update((s) => ({ ...s, nodePath: targetPath, isDir: targetIsDir }));
			this.handleContextAction('new_file');
		},

		triggerNewFolder() {
			const state = get(fileTreeState);
			let targetPath = state.focusedPath || state.rootPath;
			if (!targetPath) return;

			let targetIsDir = true;
			const node = state.nodes.get(targetPath);
			if (node && !node.isDir) {
				targetPath = targetPath.substring(0, targetPath.lastIndexOf('/'));
				targetIsDir = true;
			}

			contextMenuState.update((s) => ({ ...s, nodePath: targetPath, isDir: targetIsDir }));
			this.handleContextAction('new_folder');
		},

		async handleInlineCommit(value: string) {
			const editState = get(inlineEditState);
			value = value.trim();

			if (!value) {
				inlineEditState.update((s) => ({ ...s, show: false }));
				return;
			}

			if (editState.type === 'file' && !value.endsWith('.md')) {
				value += '.md';
			}

			try {
				if (editState.isNew) {
					const newPath = `${editState.parentPath}/${value}`;
					if (editState.type === 'file') {
						await invoke('create_file', { path: newPath });
						if (isMarkdownPath(newPath)) {
							const initialDoc = defaultFrontmatter(newPath);
							await invoke('write_file', { path: newPath, content: initialDoc });
						}
					} else {
						await invoke('create_folder', { path: newPath });
					}
					await this.loadChildren(editState.parentPath);
				} else {
					const newPath = editState.path.substring(0, editState.path.lastIndexOf('/')) + '/' + value;
					if (newPath !== editState.path) {
						await invoke('rename_path_with_link_update', { oldPath: editState.path, newPath });

						if (isMarkdownPath(newPath)) {
							try {
								const newName = nameFromPath(newPath);
								const content = await invoke<string>('read_file', { path: newPath });
								const updatedDoc = ensureMarkdownFrontmatter(content, newPath, false);
								const finalDoc = updateFrontmatterProperty(updatedDoc, 'name', newName);
								if (finalDoc !== content) {
									await invoke('write_file', { path: newPath, content: finalDoc });
								}
							} catch (e) {
								console.error('Failed to sync frontmatter name on file rename', e);
							}
						}

						editorState.updateFilePath(editState.path, newPath, value);

						const parentPath = editState.path.substring(0, editState.path.lastIndexOf('/'));
						await this.loadChildren(parentPath);
					}
				}
			} catch (err) {
				console.error('Failed to commit inline edit', err);
				alert(err);
			}

			inlineEditState.update((s) => ({ ...s, show: false }));
		},

		handleInlineCancel() {
			inlineEditState.update((s) => ({ ...s, show: false }));
		},
	};
}

export const fileTreeController = createFileTreeController();
