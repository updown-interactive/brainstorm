<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Columns2, FilePlus, MoreVertical, X } from 'lucide-svelte';
  import FileTree from './FileTree.svelte';
  import FileQuickOpen from './FileQuickOpen.svelte';
  import FileTabBar from './FileTabBar.svelte';
  import { filesController } from '../controller';
  import LiquidGlassPanel from '$lib/shared/ui/LiquidGlassPanel.svelte';

  let explorerMenuWrap: HTMLDivElement;
  let dialogEl: HTMLDivElement | undefined;
  let isDraggingDialog = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dialogPosX = 0;
  let dialogPosY = 0;

  function startDraggingDialog(event: PointerEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a')) return;
    
    isDraggingDialog = true;
    dragStartX = event.clientX - dialogPosX;
    dragStartY = event.clientY - dialogPosY;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  function handleDialogPointerMove(event: PointerEvent) {
    if (!isDraggingDialog || !dialogEl) return;
    dialogPosX = event.clientX - dragStartX;
    dialogPosY = event.clientY - dragStartY;
    dialogEl.style.setProperty('--dialog-x', `${dialogPosX}px`);
    dialogEl.style.setProperty('--dialog-y', `${dialogPosY}px`);
  }

  function stopDraggingDialog(event: PointerEvent) {
    if (isDraggingDialog) {
      isDraggingDialog = false;
    }
  }

  function resetDialogPos() {
    dialogPosX = 0;
    dialogPosY = 0;
    if (dialogEl) {
      dialogEl.style.removeProperty('--dialog-x');
      dialogEl.style.removeProperty('--dialog-y');
      dialogEl.style.removeProperty('width');
      dialogEl.style.removeProperty('height');
    }
  }

  $: if (!$filesController.showBrainstormSettings) {
    resetDialogPos();
  }

  onMount(() => {
    filesController.mount();
    filesController.setExplorerMenuWrap(explorerMenuWrap);
  });

  onDestroy(() => {
    filesController.destroy();
  });
</script>

<div class="files-view" class:is-explorer-right={$filesController.explorerPosition === 'right'}>
  <div class="files-sidebar" class:is-right={$filesController.explorerPosition === 'right'} style="width: {$filesController.sidebarWidth}px;">
    <div class="sidebar-header">
      <span class="sidebar-title">EXPLORER</span>
      <div class="actions">
        <button class="action-btn" title="New File" onclick={filesController.triggerNewFile}>
          <FilePlus size={14} />
        </button>
        <button class="action-btn" title="New Folder" onclick={filesController.triggerNewFolder}>
          <svelte:component this={filesController.newFolderIcon} size={14} />
        </button>
        <button class="action-btn" title="Open File (Cmd+O)" onclick={filesController.openQuickOpen}>
          <svelte:component this={filesController.searchIcon} size={14} />
        </button>
        <div class="explorer-menu-wrap" bind:this={explorerMenuWrap}>
          <button class="action-btn" title="Explorer Menu" onclick={filesController.toggleExplorerMenu}>
            <MoreVertical size={14} />
          </button>
          {#if $filesController.showExplorerMenu}
            <LiquidGlassPanel class="explorer-menu">
              <button class="panel-item" onclick={filesController.splitActivePane}>
                <Columns2 class="panel-icon" size={14} />
                <span>New Pane</span>
              </button>
              <button class="panel-item" onclick={filesController.openBrainstormSettings}>
                <svelte:component this={filesController.settingsIcon} class="panel-icon" size={14} />
                <span>Settings</span>
              </button>
            </LiquidGlassPanel>
          {/if}
        </div>
      </div>
    </div>
    <div class="tree-wrapper">
      <FileTree />
    </div>
    <button
      class="sidebar-resizer"
      class:is-right={$filesController.explorerPosition === 'right'}
      class:is-resizing={$filesController.isResizingSidebar}
      title="Resize explorer"
      aria-label="Resize explorer"
      onpointerdown={filesController.startSidebarResize}
    ></button>
  </div>

  <div class="files-main" class:has-file={filesController.hasOpenEditor($filesController.editorState)}>
    {#if filesController.hasOpenEditor($filesController.editorState)}
      <div class="pane-grid" style="grid-template-columns: repeat({$filesController.editorState.panes.length}, minmax(260px, 1fr));">
        {#each $filesController.editorState.panes as pane (pane.id)}
          <section
            class="editor-pane"
            class:is-active={$filesController.editorState.activePaneId === pane.id}
            aria-label="Editor pane"
            onpointerdown={() => filesController.setActivePane(pane.id)}
            onfocusin={() => filesController.setActivePane(pane.id)}
          >
            <FileTabBar {pane} />

            <div class="editor-container">
              {#if pane.activeTabId}
                <svelte:component this={filesController.editorComponent} path={pane.activeTabId} />
              {:else}
                <div class="pane-placeholder">Open a file in this pane</div>
              {/if}
            </div>
          </section>
        {/each}
      </div>
    {:else}
      <div class="placeholder">Select a file to open</div>
    {/if}
  </div>

  {#if $filesController.showBrainstormSettings}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="config-window-backdrop"
      role="button"
      tabindex="-1"
      onclick={filesController.closeBrainstormSettings}
      onkeydown={(e) => {
        if (e.key === 'Escape') filesController.closeBrainstormSettings();
      }}
    >
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        bind:this={dialogEl}
        class="config-window-dialog"
        class:is-dragging={isDraggingDialog}
        role="dialog"
        aria-label="Configuration Window"
        tabindex={-1}
        onpointermove={handleDialogPointerMove}
        onpointerup={stopDraggingDialog}
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
      >
        <svelte:component
          this={filesController.settingsComponent}
          onConfigChange={filesController.loadExplorerConfig}
          onClose={filesController.closeBrainstormSettings}
          isPopup={true}
          onHeaderPointerDown={startDraggingDialog}
        />
      </div>
    </div>
  {/if}

  <FileQuickOpen />
</div>

<style>
  .files-view {
    display: flex;
    position: relative;
    height: 100%;
    width: 100%;
    background-color: var(--colors-background);
  }

  .files-view.is-explorer-right {
    flex-direction: row-reverse;
  }

  .files-sidebar {
    position: relative;
    flex: 0 0 auto;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--colors-border);
    background-color: var(--colors-surface);
  }

  .files-sidebar.is-right {
    border-right: 0;
    border-left: 1px solid var(--colors-border);
  }

  .sidebar-resizer {
    position: absolute;
    top: 0;
    right: -4px;
    width: 8px;
    height: 100%;
    border: 0;
    padding: 0;
    background-color: transparent;
    cursor: col-resize;
    z-index: 5;
  }

  .sidebar-resizer.is-right {
    right: auto;
    left: -4px;
  }

  .sidebar-resizer::after {
    content: '';
    position: absolute;
    top: 0;
    left: 3px;
    width: 1px;
    height: 100%;
    background-color: transparent;
  }

  .sidebar-resizer:hover::after,
  .sidebar-resizer.is-resizing::after {
    background-color: var(--colors-primary);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--colors-border);
  }

  .sidebar-title {
    margin: 0;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--colors-textMuted);
  }

  .actions {
    display: flex;
    gap: 4px;
    position: relative;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--colors-textMuted);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: background-color 0.2s, color 0.2s;
  }

  .action-btn:hover {
    background-color: var(--colors-hover);
    color: var(--colors-text);
  }

  .explorer-menu-wrap {
    position: relative;
  }

  :global(.explorer-menu) {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 20;
    min-width: 160px;
  }

  .tree-wrapper {
    flex: 1;
    overflow: hidden;
  }

  .files-main {
    flex: 1;
    min-width: 0;
    min-height: 0;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--colors-background);
    overflow: hidden;
  }

  .files-main.has-file {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    flex: 1;
    min-width: 0;
    min-height: 0;
    height: 100%;
    overflow: hidden;
  }

  .pane-grid {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: grid;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .editor-pane {
    min-width: 260px;
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-rows: 36px minmax(0, 1fr);
    border-right: 1px solid var(--colors-border);
    background-color: var(--colors-background);
    overflow: hidden;
  }

  .editor-pane.is-active {
    box-shadow: inset 0 1px 0 var(--colors-primary);
  }

  .editor-container {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }

  .placeholder,
  .pane-placeholder {
    color: var(--colors-textMuted);
  }

  .pane-placeholder {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .config-window-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    background-color: rgba(0, 0, 0, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: fadeIn 0.15s ease-out;
  }

  .config-window-dialog {
    transform: translate(var(--dialog-x, 0px), var(--dialog-y, 0px));
    width: 920px;
    height: 640px;
    min-width: 440px;
    min-height: 280px;
    max-width: 95vw;
    max-height: 92vh;
    resize: both;
    overflow: hidden;
    border-radius: 18px;
    border: 1px solid color-mix(in srgb, var(--colors-border) 60%, transparent);
    background-color: color-mix(in srgb, var(--colors-background) 40%, transparent);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    animation: windowPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    touch-action: none;
  }

  .config-window-dialog.is-dragging {
    user-select: none;
    cursor: grabbing;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes windowPopIn {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
