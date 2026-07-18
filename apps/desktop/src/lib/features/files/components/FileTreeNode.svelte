<script lang="ts">
  import type { FileNode } from '../state';
  import { fileTreeState } from '../state';
  import { editorState } from '../stores/editor';
  import { fileTreeController } from '../controller';
  import { 
    ChevronRight, ChevronDown, Folder, File, 
    FileJson, FileCode, FileText, Image, FileArchive, Settings
  } from 'lucide-svelte';

  export let node: FileNode;
  export let gitStatus: string | undefined = undefined;

  function getGitClass(status: string | undefined): string {
    if (!status) return '';
    if (status.includes('M')) return 'git-modified';
    if (status.includes('A') || status.includes('?')) return 'git-added';
    if (status.includes('D')) return 'git-deleted';
    return '';
  }

  let isDragOver = false;

  function getFileIcon(filename: string) {
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
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="tree-node" 
  class:active={$editorState.activeTabId === node.path}
  class:focused={$fileTreeState.focusedPath === node.path}
  class:drag-over={isDragOver}
  style="padding-left: {node.depth * 12 + 4}px"
  onclick={() => fileTreeController.handleNodeClick(node)}
  draggable="true"
  ondragstart={(e) => fileTreeController.handleDragStart(node, e)}
  ondragover={(e) => { isDragOver = fileTreeController.handleDragOver(node, e); }}
  ondragleave={() => { isDragOver = false; }}
  ondrop={(e) => { isDragOver = false; fileTreeController.handleDrop(node, e); }}
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
      <svelte:component this={getFileIcon(node.name)} size={14} color="var(--colors-textMuted)" />
    {/if}
  </div>
  
  <span class="node-name {getGitClass(gitStatus)}" class:is-dir={node.isDir}>
    {node.isDir ? node.name : node.name.replace(/\.md$/, '')}
  </span>
  
  {#if gitStatus}
    <span class="git-badge {getGitClass(gitStatus)}">
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
