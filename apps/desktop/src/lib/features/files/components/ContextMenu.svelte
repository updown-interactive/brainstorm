<script lang="ts">
  import { filesController } from '../controller';
  import LiquidGlassPanel from '$lib/shared/ui/LiquidGlassPanel.svelte';
  
  export let x = 0;
  export let y = 0;
  export let isDir = false;
  export let isRoot = false;
</script>

<LiquidGlassPanel 
  class="context-menu" 
  role="menu"
  tabindex={-1}
  style="position: fixed; top: {y}px; left: {x}px; min-width: 170px; z-index: 1000;"
  onmouseleave={filesController.closeContextMenu}
>
  {#if isDir}
    <button class="panel-item" role="menuitem" onclick={() => filesController.handleContextAction('new_file')}>New File</button>
    <button class="panel-item" role="menuitem" onclick={() => filesController.handleContextAction('new_folder')}>New Folder</button>
    <div class="panel-divider"></div>
  {/if}
  
  {#if !isRoot}
    <button class="panel-item" role="menuitem" onclick={() => filesController.handleContextAction('rename')}>Rename (F2)</button>
    <button class="panel-item" role="menuitem" onclick={() => filesController.handleContextAction('delete')}>Delete</button>
    <div class="panel-divider"></div>
  {/if}
  
  <button class="panel-item" role="menuitem" onclick={() => filesController.handleContextAction('reveal')}>Reveal in OS</button>
</LiquidGlassPanel>

<style>
  :global(.context-menu) {
    min-width: 170px;
  }
</style>
