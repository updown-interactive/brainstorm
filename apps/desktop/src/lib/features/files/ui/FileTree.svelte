<script lang="ts">
  import { onDestroy } from 'svelte';
  import { shellState } from '../../shell/state/state';
  import { filesController } from '../controller';
  import { fileTreeController } from '../controller/file-tree-controller';
  import { contextMenuState, fileTreeState, inlineEditState } from '../state';
  import type { FileNode } from '../types';
  import FileTreeNode from './FileTreeNode.svelte';
  import ContextMenu from './ContextMenu.svelte';
  import InlineInput from './InlineInput.svelte';

  export let directorySelection = false;
  export let onDirectorySelect: ((path: string) => void) | undefined = undefined;
  export let manageLifecycle = true;
  export let rootPath = '';

  $: {
    const projectPath = rootPath || $shellState.currentProject?.path;
    filesController.initFileTree(projectPath);
  }

  onDestroy(() => {
    if (manageLifecycle) filesController.destroyFileTree();
  });

  $: flatNodes = $fileTreeState && fileTreeController.getFlatNodes();
  $: dropTargetPath = $fileTreeState.dropTargetPath;

  function isInDropSection(path: string): boolean {
    return Boolean(dropTargetPath && (path === dropTargetPath || path.startsWith(`${dropTargetPath}/`)));
  }

  const handleNodeClick = (node: FileNode): void => {
    if (!directorySelection) {
      filesController.handleNodeClick(node);
      return;
    }
    if (!node.isDir) return;
    void fileTreeController.toggleExpand(node.path);
    fileTreeController.setFocusedPath(node.path);
    onDirectorySelect?.(node.path);
  };
</script>

<div class="file-tree-container" class:is-dragging={$fileTreeState.isDragging}>
  {#if $fileTreeState.rootPath}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="file-list"
      data-file-tree-root-path={$fileTreeState.rootPath}
      oncontextmenu={filesController.handleRootContextMenu}
    >
      {#each flatNodes as node (node.path)}
        {#if $inlineEditState.show && !$inlineEditState.isNew && $inlineEditState.path === node.path}
          <InlineInput
            initialValue={$inlineEditState.initialValue}
            depth={node.depth}
          />
        {:else}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div oncontextmenu={(event: MouseEvent) => filesController.handleNodeContextMenu(event, node)}>
              <FileTreeNode
                {node}
                onNodeClick={handleNodeClick}
              gitStatus={$fileTreeState.gitStatus.get(node.path)}
              isDragging={$fileTreeState.draggedPath === node.path}
              isDropTarget={$fileTreeState.dropTargetPath === node.path}
              isDropSection={isInDropSection(node.path)}
            />
          </div>
        {/if}
        
        {#if $inlineEditState.show && $inlineEditState.isNew && $inlineEditState.parentPath === node.path}
          <InlineInput
            initialValue=""
            depth={node.depth + 1}
          />
        {/if}
      {/each}
      

      {#if flatNodes.length === 0 && (!$inlineEditState.show || $inlineEditState.parentPath !== $fileTreeState.rootPath)}
        <div class="empty-state">No files found.</div>
      {/if}
    </div>
  {:else}
    <div class="empty-state">No project selected.</div>
  {/if}
  
  {#if $contextMenuState.show}
    <ContextMenu
      x={$contextMenuState.x}
      y={$contextMenuState.y}
      isDir={$contextMenuState.isDir}
      isRoot={$contextMenuState.nodePath === $fileTreeState.rootPath}
    />
  {/if}

  {#if $fileTreeState.isDragging}
    <div
      class="drag-preview"
      style="left: {$fileTreeState.dragClientX}px; top: {$fileTreeState.dragClientY}px"
    >
      {$fileTreeState.dragPreviewName}
    </div>
  {/if}
</div>

<style>
  .file-tree-container {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    background-color: var(--colors-surface);
    color: var(--colors-text);
    font-size: 13px;
    user-select: none;
  }

  .file-tree-container.is-dragging,
  .file-tree-container.is-dragging * {
    cursor: grabbing;
  }
  
  .file-list {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    padding-bottom: 24px;
  }
  
  .empty-state {
    padding: 16px;
    color: var(--colors-textMuted);
    text-align: center;
  }

  .drag-preview {
    position: fixed;
    z-index: 1200;
    max-width: min(260px, calc(100vw - 32px));
    height: 28px;
    box-sizing: border-box;
    transform: translate(12px, 12px);
    display: flex;
    align-items: center;
    border: 1px solid color-mix(in srgb, var(--colors-primary) 72%, transparent);
    border-radius: 6px;
    background-color: color-mix(in srgb, var(--colors-surface) 92%, var(--colors-primary));
    box-shadow: 0 10px 28px color-mix(in srgb, #000 32%, transparent);
    color: var(--colors-text);
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    padding: 0 10px;
    pointer-events: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
