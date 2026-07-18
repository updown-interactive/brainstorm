<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fileTreeState } from '../state';
  import { shellState } from '../../shell/state';
  import { fileTreeController } from '../controller';
  import FileTreeNode from './FileTreeNode.svelte';
  import ContextMenu from './ContextMenu.svelte';
  import InlineInput from './InlineInput.svelte';

  // Initialize with current project path
  $: {
    const projectPath = $shellState.currentProject?.path;
    if (projectPath) {
      fileTreeController.init(projectPath);
    }
  }

  onDestroy(() => {
    fileTreeController.destroy();
  });

  $: flatNodes = $fileTreeState && fileTreeController.getFlatNodes();
  
  // Bind to controller states
  const { contextMenuState, inlineEditState } = fileTreeController;
  $: ctxMenu = $contextMenuState;
  $: editState = $inlineEditState;
</script>

<div class="file-tree-container">
  {#if $fileTreeState.rootPath}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="file-list" oncontextmenu={(e: MouseEvent) => fileTreeController.handleContextMenu(e, $fileTreeState.rootPath!, true)}>
      {#each flatNodes as node (node.path)}
        {#if editState.show && !editState.isNew && editState.path === node.path}
          <InlineInput 
            initialValue={editState.initialValue} 
            depth={node.depth} 
            on:commit={(e) => fileTreeController.handleInlineCommit(e.detail.value)} 
            on:cancel={() => fileTreeController.handleInlineCancel()} 
          />
        {:else}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div oncontextmenu={(e: MouseEvent) => { e.stopPropagation(); fileTreeController.handleContextMenu(e, node.path, node.isDir); }}>
            <FileTreeNode {node} gitStatus={$fileTreeState.gitStatus.get(node.path)} />
          </div>
        {/if}
        
        {#if editState.show && editState.isNew && editState.parentPath === node.path}
          <InlineInput 
            initialValue="" 
            depth={node.depth + 1} 
            on:commit={(e) => fileTreeController.handleInlineCommit(e.detail.value)} 
            on:cancel={() => fileTreeController.handleInlineCancel()} 
          />
        {/if}
      {/each}
      

      {#if flatNodes.length === 0 && (!editState.show || editState.parentPath !== $fileTreeState.rootPath)}
        <div class="empty-state">No files found.</div>
      {/if}
    </div>
  {:else}
    <div class="empty-state">No project selected.</div>
  {/if}
  
  {#if ctxMenu.show}
    <ContextMenu 
      x={ctxMenu.x} 
      y={ctxMenu.y} 
      isDir={ctxMenu.isDir} 
      isRoot={ctxMenu.nodePath === $fileTreeState.rootPath}
      on:action={(e) => fileTreeController.handleContextAction(e.detail.action)}
      on:close={() => fileTreeController.closeContextMenu()}
    />
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
</style>
