<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let x = 0;
  export let y = 0;
  export let isDir = false;
  export let isRoot = false;
  
  const dispatch = createEventDispatcher();
  
  function handleAction(action: string) {
    dispatch('action', { action });
  }
</script>

<div 
  class="context-menu" 
  style="top: {y}px; left: {x}px;"
  onmouseleave={() => dispatch('close')}
>
  {#if isDir}
    <button onclick={() => handleAction('new_file')}>New File</button>
    <button onclick={() => handleAction('new_folder')}>New Folder</button>
    <div class="divider"></div>
  {/if}
  
  {#if !isRoot}
    <button onclick={() => handleAction('rename')}>Rename (F2)</button>
    <button onclick={() => handleAction('delete')}>Delete</button>
    <div class="divider"></div>
  {/if}
  
  <button onclick={() => handleAction('reveal')}>Reveal in OS</button>
</div>

<style>
  .context-menu {
    position: fixed;
    z-index: 1000;
    background-color: var(--colors-surface);
    border: 1px solid var(--colors-border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    min-width: 160px;
    padding: 4px;
    display: flex;
    flex-direction: column;
  }
  
  button {
    background: none;
    border: none;
    color: var(--colors-text);
    text-align: left;
    padding: 6px 12px;
    font-size: 13px;
    cursor: pointer;
    border-radius: 4px;
  }
  
  button:hover {
    background-color: var(--colors-primary);
    color: #fff;
  }
  
  .divider {
    height: 1px;
    background-color: var(--colors-border);
    margin: 4px 0;
  }
</style>
