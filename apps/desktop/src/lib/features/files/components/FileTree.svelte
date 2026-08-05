<script lang="ts">
  import { onDestroy } from 'svelte';
  import { shellState } from '../../shell/state';
  import { filesController } from '../controller';
  import FileTreeNode from './FileTreeNode.svelte';
  import ContextMenu from './ContextMenu.svelte';
  import InlineInput from './InlineInput.svelte';

  $: {
    const projectPath = $shellState.currentProject?.path;
    filesController.initFileTree(projectPath);
  }

  onDestroy(() => {
    filesController.destroyFileTree();
  });

  $: flatNodes = $filesController.fileTreeState && filesController.getFlatNodes();
  $: dropTargetPath = $filesController.fileTreeState.dropTargetPath;

  function isInDropSection(path: string): boolean {
    return Boolean(dropTargetPath && (path === dropTargetPath || path.startsWith(`${dropTargetPath}/`)));
  }
</script>

<div class="file-tree-container" class:is-dragging={$filesController.fileTreeState.isDragging}>
  {#if $filesController.fileTreeState.rootPath}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="file-list"
      data-file-tree-root-path={$filesController.fileTreeState.rootPath}
      oncontextmenu={filesController.handleRootContextMenu}
    >
      {#each flatNodes as node (node.path)}
        {#if $filesController.inlineEditState.show && !$filesController.inlineEditState.isNew && $filesController.inlineEditState.path === node.path}
          <InlineInput
            initialValue={$filesController.inlineEditState.initialValue}
            depth={node.depth}
          />
        {:else}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div oncontextmenu={(event: MouseEvent) => filesController.handleNodeContextMenu(event, node)}>
            <FileTreeNode
              {node}
              gitStatus={$filesController.fileTreeState.gitStatus.get(node.path)}
              isDragging={$filesController.fileTreeState.draggedPath === node.path}
              isDropTarget={$filesController.fileTreeState.dropTargetPath === node.path}
              isDropSection={isInDropSection(node.path)}
            />
          </div>
        {/if}
        
        {#if $filesController.inlineEditState.show && $filesController.inlineEditState.isNew && $filesController.inlineEditState.parentPath === node.path}
          <InlineInput
            initialValue=""
            depth={node.depth + 1}
          />
        {/if}
      {/each}
      

      {#if flatNodes.length === 0 && (!$filesController.inlineEditState.show || $filesController.inlineEditState.parentPath !== $filesController.fileTreeState.rootPath)}
        <div class="empty-state">No files found.</div>
      {/if}
    </div>
  {:else}
    <div class="empty-state">No project selected.</div>
  {/if}
  
  {#if $filesController.contextMenuState.show}
    <ContextMenu
      x={$filesController.contextMenuState.x}
      y={$filesController.contextMenuState.y}
      isDir={$filesController.contextMenuState.isDir}
      isRoot={$filesController.contextMenuState.nodePath === $filesController.fileTreeState.rootPath}
    />
  {/if}

  {#if $filesController.fileTreeState.isDragging}
    <div
      class="drag-preview"
      style="left: {$filesController.fileTreeState.dragClientX}px; top: {$filesController.fileTreeState.dragClientY}px"
    >
      {$filesController.fileTreeState.dragPreviewName}
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
