<script lang="ts">
  import type { FileNode } from '../types';
  import { filesController } from '../controller';
  import { 
    ChevronRight, ChevronDown, Folder
  } from 'lucide-svelte';

  export let node: FileNode;
  export let gitStatus: string | undefined = undefined;
  export let isDragging = false;
  export let isDropTarget = false;
  export let isDropSection = false;

  let isNativeDragOver = false;
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="tree-node" 
  class:active={filesController.isActiveNode(node.path)}
  class:focused={filesController.isFocusedNode(node.path)}
  class:dragging={isDragging}
  class:drop-section={isDropSection}
  class:drag-over={isDropTarget || isNativeDragOver}
  data-file-tree-path={node.path}
  data-file-tree-dir={node.isDir ? 'true' : 'false'}
  style="padding-left: {node.depth * 12 + 4}px"
  onpointerdown={(event) => filesController.handleNodePointerDown(node, event)}
  onpointermove={(event) => filesController.handleNodePointerMove(node, event)}
  onpointerup={(event) => filesController.handleNodePointerUp(node, event)}
  onpointercancel={(event) => filesController.handleNodePointerCancel(event)}
  onclick={() => filesController.handleNodeClick(node)}
  draggable="false"
  ondragstart={(event) => filesController.handleDragStart(node, event)}
  ondragover={(event) => { isNativeDragOver = filesController.handleDragOver(node, event); }}
  ondragleave={() => { isNativeDragOver = false; }}
  ondrop={(event) => { isNativeDragOver = false; filesController.handleDrop(node, event); }}
>
  {#if node.depth > 0}
    <div class="tree-guides" style="width: {node.depth * 12}px"></div>
  {/if}

  <div class="node-icon-wrapper" style="visibility: {node.isDir ? 'visible' : 'hidden'};">
    {#if node.isExpanded}
      <ChevronDown size={14} color="var(--colors-textMuted)" />
    {:else}
      <ChevronRight size={14} color="var(--colors-textMuted)" />
    {/if}
  </div>
  
  <div class="file-icon-wrapper">
    {#if node.isDir}
      <Folder size={14} color="var(--colors-primary)" />
    {:else}
      <svelte:component this={filesController.fileIcon(node.name)} size={14} color="var(--colors-textMuted)" />
    {/if}
  </div>
  
  <span class="node-name {filesController.gitClass(gitStatus)}" class:is-dir={node.isDir}>
    {filesController.displayNodeName(node)}
  </span>
  
  {#if gitStatus}
    <span class="git-badge {filesController.gitClass(gitStatus)}">
      {gitStatus.charAt(gitStatus.length - 1)}
    </span>
  {/if}
</div>

<style>
  .tree-node {
    position: relative;
    display: flex;
    align-items: center;
    height: 24px;
    padding-right: 8px;
    cursor: pointer;
    white-space: nowrap;
    border-radius: 4px;
    margin: 0 4px;
  }

  .tree-guides {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 4px;
    pointer-events: none;
    background-image: repeating-linear-gradient(
      to right,
      transparent 0,
      transparent 11px,
      color-mix(in srgb, var(--colors-border) 72%, transparent) 11px,
      color-mix(in srgb, var(--colors-border) 72%, transparent) 12px
    );
  }

  .tree-guides::after {
    content: '';
    position: absolute;
    top: 50%;
    right: -6px;
    width: 7px;
    height: 1px;
    background-color: color-mix(in srgb, var(--colors-border) 72%, transparent);
  }
  
  .tree-node:hover {
    background-color: var(--colors-surfaceVariant);
  }

  .tree-node.dragging {
    cursor: grabbing;
    background-color: color-mix(in srgb, var(--colors-primary) 22%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--colors-primary) 72%, transparent);
    opacity: 0.74;
    transform: translateX(2px);
  }

  .tree-node.drop-section {
    background-color: color-mix(in srgb, var(--colors-primary) 9%, transparent);
  }

  .tree-node.drag-over {
    background-color: color-mix(in srgb, var(--colors-primary) 20%, transparent);
    outline: 1px solid color-mix(in srgb, var(--colors-primary) 68%, transparent);
    outline-offset: -1px;
  }
  
  .tree-node.active {
    background-color: color-mix(in srgb, var(--colors-primary) 12%, transparent);
    color: var(--colors-primary);
  }

  .tree-node.focused {
    outline: 1px solid var(--colors-primary);
    outline-offset: -1px;
  }
  
  .node-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-right: 2px;
  }
  
  .file-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-right: 6px;
  }
  
  .node-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .is-dir {
    font-weight: 500;
  }
  
  .git-modified {
    color: var(--colors-warning);
  }
  
  .git-added {
    color: var(--colors-success);
  }
  
  .git-deleted {
    color: var(--colors-error);
  }
  
  .git-badge {
    margin-left: auto;
    font-size: 10px;
    font-weight: 600;
    opacity: 0.8;
  }
</style>
