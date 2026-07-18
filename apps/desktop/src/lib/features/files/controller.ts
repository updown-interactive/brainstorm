import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { 
  fileTreeState, 
  contextMenuState, 
  inlineEditState, 
  type FileNode, 
  type FileEntry 
} from './state';
import { editorState } from './stores/editor';

class FileTreeController {
  private unlistenFsChange: UnlistenFn | null = null;
  private clickTimeout: ReturnType<typeof setTimeout> | null = null;

  public contextMenuState = contextMenuState;
  public inlineEditState = inlineEditState;
  public fileTreeState = fileTreeState;

  async init(projectPath: string) {
    if (get(fileTreeState).rootPath !== projectPath) {
      await this.initRoot(projectPath);
      await this.setupWatcher(projectPath);
    }
  }

  async initRoot(rootPath: string) {
    fileTreeState.set({
      nodes: new Map(),
      rootPath,
      expandedPaths: new Set(),
      gitStatus: new Map(),
      focusedPath: null,
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

    fileTreeState.update(s => {
      s.nodes.set(rootPath, rootNode);
      return s;
    });

    await this.loadChildren(rootPath);
    await this.refreshGitStatus(rootPath);
  }

  async refreshGitStatus(rootPath: string) {
    try {
      const statusMap = await invoke<Record<string, string>>('get_git_status', { path: rootPath });
      fileTreeState.update(s => {
        const newMap = new Map();
        for (const [key, val] of Object.entries(statusMap)) {
          newMap.set(key, val);
        }
        return { ...s, gitStatus: newMap };
      });
    } catch (err) {
      console.error('Failed to get git status', err);
    }
  }

  async loadChildren(path: string) {
    const state = get(fileTreeState);
    const node = state.nodes.get(path);
    if (!node || !node.isDir) return;

    try {
      const entries: FileEntry[] = await invoke('read_dir_entries', { path });
      
      fileTreeState.update(s => {
        const parent = s.nodes.get(path);
        if (!parent) return s;

        parent.children = [];
        
        for (const entry of entries) {
          parent.children.push(entry.path);
          
          if (!s.nodes.has(entry.path)) {
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
  }

  async toggleExpand(path: string) {
    const state = get(fileTreeState);
    const node = state.nodes.get(path);
    if (!node || !node.isDir) return;

    const willExpand = !node.isExpanded;
    
    fileTreeState.update(s => {
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
  }

  setFocusedPath(path: string | null) {
    fileTreeState.update(s => ({ ...s, focusedPath: path }));
  }

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
  }

  async setupWatcher(path: string) {
    try {
      if (this.unlistenFsChange) this.unlistenFsChange();
      
      this.unlistenFsChange = await listen('fs-change', async (event: any) => {
        const { kind, path: changedPath } = event.payload;
        const parentPath = changedPath.substring(0, changedPath.lastIndexOf('/'));
        
        const state = get(fileTreeState);
        if (kind === 'remove') {
          editorState.closePath(changedPath);
          fileTreeState.update(s => ({
            ...s,
            focusedPath: s.focusedPath === changedPath || s.focusedPath?.startsWith(`${changedPath}/`)
              ? null
              : s.focusedPath
          }));
        }

        const parentNode = state.nodes.get(parentPath);
        if (parentNode && (parentNode.isExpanded || parentPath === state.rootPath)) {
          await this.loadChildren(parentPath);
        }
        
        if (state.rootPath) {
          this.refreshGitStatus(state.rootPath);
        }
      });
    } catch (e) {
      console.error('Failed to start watcher', e);
    }
  }

  destroy() {
    if (this.unlistenFsChange) this.unlistenFsChange();
  }

  // Node interaction
  handleNodeClick(node: FileNode) {
    this.setFocusedPath(node.path);
    if (node.isDir) {
      this.toggleExpand(node.path);
    } else {
      if (this.clickTimeout) {
        clearTimeout(this.clickTimeout);
        this.clickTimeout = null;
        editorState.openFile(node.path, node.name, true);
      } else {
        editorState.openFile(node.path, node.name, false);
        this.clickTimeout = setTimeout(() => {
          this.clickTimeout = null;
        }, 300);
      }
    }
  }

  // Drag and Drop
  handleDragStart(node: FileNode, e: DragEvent) {
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', node.path);
      e.dataTransfer.effectAllowed = 'move';
    }
  }

  handleDragOver(node: FileNode, e: DragEvent): boolean {
    if (node.isDir) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      return true;
    }
    return false;
  }

  async handleDrop(node: FileNode, e: DragEvent) {
    if (!node.isDir) return;
    e.preventDefault();
    e.stopPropagation();
    
    const srcPath = e.dataTransfer?.getData('text/plain');
    if (srcPath && srcPath !== node.path && !node.path.startsWith(srcPath + '/')) {
      const filename = srcPath.split('/').pop();
      const destPath = `${node.path}/${filename}`;
      
      try {
        await invoke('move_path', { src: srcPath, dest: destPath });
        await this.loadChildren(node.path);
      } catch (err) {
        console.error('Move failed', err);
        alert(err);
      }
    }
  }

  // Context Menu
  handleContextMenu(e: MouseEvent, nodePath: string, isDir: boolean) {
    e.preventDefault();
    this.contextMenuState.set({
      show: true,
      x: e.clientX,
      y: e.clientY,
      nodePath,
      isDir
    });
  }

  closeContextMenu() {
    this.contextMenuState.update(s => ({ ...s, show: false }));
  }

  async handleContextAction(action: string) {
    const ctx = get(this.contextMenuState);
    this.closeContextMenu();
    
    if (action === 'new_file' || action === 'new_folder') {
      this.inlineEditState.set({
        show: true,
        isNew: true,
        type: action === 'new_file' ? 'file' : 'folder',
        parentPath: ctx.nodePath,
        path: '',
        initialValue: ''
      });
      const flatNodes = this.getFlatNodes();
      if (!flatNodes.find(n => n.path === ctx.nodePath)?.isExpanded) {
        await this.toggleExpand(ctx.nodePath);
      }
    } else if (action === 'rename') {
      const node = this.getFlatNodes().find(n => n.path === ctx.nodePath);
      const isFolder = node?.isDir ?? false;
      let initialValue = node?.name || '';
      if (!isFolder) {
        initialValue = initialValue.replace(/\.md$/, '');
      }

      this.inlineEditState.set({
        show: true,
        isNew: false,
        type: isFolder ? 'folder' : 'file',
        parentPath: '',
        path: ctx.nodePath,
        initialValue
      });
    } else if (action === 'delete') {
      if (confirm('Are you sure you want to delete this?')) {
        await invoke('delete_path', { path: ctx.nodePath, useTrash: true });
        editorState.closePath(ctx.nodePath);
        fileTreeState.update(s => ({
          ...s,
          focusedPath: s.focusedPath === ctx.nodePath || s.focusedPath?.startsWith(`${ctx.nodePath}/`)
            ? null
            : s.focusedPath
        }));
        const parentPath = ctx.nodePath.substring(0, ctx.nodePath.lastIndexOf('/'));
        await this.loadChildren(parentPath);
      }
    } else if (action === 'reveal') {
      await invoke('reveal_in_file_manager', { path: ctx.nodePath });
    }
  }

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

    this.contextMenuState.update(s => ({ ...s, nodePath: targetPath, isDir: targetIsDir }));
    this.handleContextAction('new_file');
  }

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

    this.contextMenuState.update(s => ({ ...s, nodePath: targetPath, isDir: targetIsDir }));
    this.handleContextAction('new_folder');
  }

  // Inline Edit
  async handleInlineCommit(value: string) {
    const editState = get(this.inlineEditState);
    value = value.trim();
    
    if (!value) {
      this.inlineEditState.update(s => ({ ...s, show: false }));
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
        } else {
          await invoke('create_folder', { path: newPath });
        }
        await this.loadChildren(editState.parentPath);
      } else {
        const newPath = editState.path.substring(0, editState.path.lastIndexOf('/')) + '/' + value;
        if (newPath !== editState.path) {
          await invoke('rename_path_with_link_update', { oldPath: editState.path, newPath });
          const parentPath = editState.path.substring(0, editState.path.lastIndexOf('/'));
          await this.loadChildren(parentPath);
        }
      }
    } catch (err) {
      console.error('Failed to commit inline edit', err);
      alert(err);
    }
    
    this.inlineEditState.update(s => ({ ...s, show: false }));
  }

  handleInlineCancel() {
    this.inlineEditState.update(s => ({ ...s, show: false }));
  }
}

export const fileTreeController = new FileTreeController();
