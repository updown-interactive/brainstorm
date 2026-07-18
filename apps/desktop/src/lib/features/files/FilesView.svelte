<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Columns2, FilePlus, FolderPlus, MoreVertical, Search, Settings, X } from 'lucide-svelte';
  import BrainstormSettingsPanel from './components/BrainstormSettingsPanel.svelte';
  import FileTree from './components/FileTree.svelte';
  import FileQuickOpen from './components/FileQuickOpen.svelte';
  import { fileTreeController } from './controller';
  import {
    clampExplorerSidebarWidth,
    ensureExplorerConfigPath,
    readExplorerConfig,
    writeExplorerConfig,
    type ExplorerPosition
  } from './explorer-config';
  import { fileTreeState } from './state';
  import { quickOpenController } from './quickOpen';
  import { editorState } from './stores/editor';
  import MarkdownEditor from '../markdown/MarkdownEditor.svelte';

  let showExplorerMenu = false;
  let showBrainstormSettings = false;
  let explorerMenuWrap: HTMLDivElement;
  let sidebarWidth = 260;
  let isResizingSidebar = false;
  let explorerPosition: ExplorerPosition = 'left';

  const sidebarWidthStorageKey = 'brainstorm.explorer.sidebarWidth';
  function toggleExplorerMenu() {
    showExplorerMenu = !showExplorerMenu;
  }

  function splitActivePane() {
    showExplorerMenu = false;
    editorState.splitPane();
  }

  async function openBrainstormSettings() {
    showExplorerMenu = false;
    const rootPath = $fileTreeState.rootPath;
    if (!rootPath) return;

    const configPath = await ensureExplorerConfigPath();
    if (configPath) {
      await fileTreeController.loadChildren(rootPath);
    }
    showBrainstormSettings = true;
  }

  async function loadExplorerConfig() {
    const config = await readExplorerConfig();
    explorerPosition = config.position;
    sidebarWidth = clampSidebarWidth(config.sidebarWidth);
  }

  function handleDocumentPointerDown(event: PointerEvent) {
    const target = event.target;
    if (!showExplorerMenu) return;
    if (target instanceof Node && explorerMenuWrap?.contains(target)) return;
    showExplorerMenu = false;
  }

  function clampSidebarWidth(width: number) {
    return clampExplorerSidebarWidth(width);
  }

  function startSidebarResize(event: PointerEvent) {
    event.preventDefault();
    isResizingSidebar = true;
    updateSidebarWidth(event.clientX);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function updateSidebarWidth(clientX: number) {
    const nextWidth = explorerPosition === 'right' ? window.innerWidth - clientX : clientX;
    sidebarWidth = clampSidebarWidth(nextWidth);
  }

  function handleDocumentPointerMove(event: PointerEvent) {
    if (!isResizingSidebar) return;
    updateSidebarWidth(event.clientX);
  }

  function stopSidebarResize() {
    if (!isResizingSidebar) return;
    isResizingSidebar = false;
    localStorage.setItem(sidebarWidthStorageKey, `${sidebarWidth}`);
    void writeExplorerConfig({ sidebarWidth });
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  onMount(() => {
    const savedWidth = Number(localStorage.getItem(sidebarWidthStorageKey));
    if (Number.isFinite(savedWidth) && savedWidth > 0) {
      sidebarWidth = clampSidebarWidth(savedWidth);
    }
    void loadExplorerConfig();
    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    document.addEventListener('pointermove', handleDocumentPointerMove, true);
    document.addEventListener('pointerup', stopSidebarResize, true);
  });

  onDestroy(() => {
    document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
    document.removeEventListener('pointermove', handleDocumentPointerMove, true);
    document.removeEventListener('pointerup', stopSidebarResize, true);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
</script>

<div class="files-view" class:is-explorer-right={explorerPosition === 'right'}>
  <div class="files-sidebar" class:is-right={explorerPosition === 'right'} style="width: {sidebarWidth}px;">
    <div class="sidebar-header">
      <span class="sidebar-title">EXPLORER</span>
      <div class="actions">
        <button class="action-btn" title="New File" onclick={() => fileTreeController.triggerNewFile()}>
          <FilePlus size={14} />
        </button>
        <button class="action-btn" title="New Folder" onclick={() => fileTreeController.triggerNewFolder()}>
          <FolderPlus size={14} />
        </button>
        <button class="action-btn" title="Open File (Cmd+O)" onclick={() => quickOpenController.open()}>
          <Search size={14} />
        </button>
        <div class="explorer-menu-wrap" bind:this={explorerMenuWrap}>
          <button class="action-btn" title="Explorer Menu" onclick={toggleExplorerMenu}>
            <MoreVertical size={14} />
          </button>
          {#if showExplorerMenu}
            <div class="explorer-menu">
              <button class="explorer-menu-item" onclick={splitActivePane}>
                <Columns2 size={14} />
                <span>Split Pane</span>
              </button>
              <button class="explorer-menu-item" onclick={openBrainstormSettings}>
                <Settings size={14} />
                <span>Settings</span>
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
    <div class="tree-wrapper">
      <FileTree />
    </div>
    <button
      class="sidebar-resizer"
      class:is-right={explorerPosition === 'right'}
      class:is-resizing={isResizingSidebar}
      title="Resize explorer"
      aria-label="Resize explorer"
      onpointerdown={startSidebarResize}
    ></button>
  </div>

  <div class="files-main" class:has-file={showBrainstormSettings || $editorState.panes.length > 1 || $editorState.panes.some((pane) => pane.activeTabId)}>
    {#if showBrainstormSettings}
      <BrainstormSettingsPanel
        onConfigChange={loadExplorerConfig}
        onClose={() => {
          showBrainstormSettings = false;
          void loadExplorerConfig();
        }}
      />
    {:else if $editorState.panes.length > 1 || $editorState.panes.some((pane) => pane.activeTabId)}
      <div class="pane-grid" style="grid-template-columns: repeat({$editorState.panes.length}, minmax(260px, 1fr));">
        {#each $editorState.panes as pane (pane.id)}
          <section
            class="editor-pane"
            class:is-active={$editorState.activePaneId === pane.id}
            aria-label="Editor pane"
            onpointerdown={() => editorState.setActivePane(pane.id)}
            onfocusin={() => editorState.setActivePane(pane.id)}
          >
            <div class="pane-header">
              <span class="pane-title">
                {pane.tabs.find((tab) => tab.id === pane.activeTabId)?.name.replace(/\.md$/i, '') ?? 'Empty Pane'}
              </span>
              <div class="pane-actions">
                <button class="pane-btn" title="Split Pane" onclick={(event) => { event.stopPropagation(); editorState.splitPane(pane.id); }}>
                  <Columns2 size={14} />
                </button>
                {#if $editorState.panes.length > 1}
                  <button class="pane-btn" title="Close Pane" onclick={(event) => { event.stopPropagation(); editorState.closePane(pane.id); }}>
                    <X size={14} />
                  </button>
                {/if}
              </div>
            </div>

            <div class="editor-container">
              {#if pane.activeTabId}
                <MarkdownEditor path={pane.activeTabId} />
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

  .explorer-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 20;
    min-width: 160px;
    display: grid;
    gap: 2px;
    padding: 4px;
    border: 1px solid var(--colors-border);
    border-radius: 6px;
    background-color: var(--colors-surface);
    box-shadow: 0 10px 28px color-mix(in srgb, var(--colors-background) 72%, transparent);
  }

  .explorer-menu-item {
    min-height: 30px;
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    border: 0;
    border-radius: 4px;
    background-color: transparent;
    color: var(--colors-text);
    padding: 5px 8px;
    font: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }

  .explorer-menu-item:hover {
    background-color: var(--colors-hover);
  }

  .tree-wrapper {
    flex: 1;
    overflow: hidden;
  }

  .files-main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--colors-background);
  }

  .files-main.has-file {
    display: block;
    min-width: 0;
  }

  .pane-grid {
    width: 100%;
    height: 100%;
    display: grid;
    overflow-x: auto;
  }

  .editor-pane {
    min-width: 260px;
    height: 100%;
    display: grid;
    grid-template-rows: 34px minmax(0, 1fr);
    border-right: 1px solid var(--colors-border);
    background-color: var(--colors-background);
  }

  .editor-pane.is-active {
    box-shadow: inset 0 1px 0 var(--colors-primary);
  }

  .pane-header {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 0 8px 0 12px;
    border-bottom: 1px solid var(--colors-border);
    background-color: var(--colors-surface);
  }

  .pane-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--colors-textMuted);
    font-size: 12px;
    font-weight: 600;
  }

  .editor-pane.is-active .pane-title {
    color: var(--colors-text);
  }

  .pane-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 0 0 auto;
  }

  .pane-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 4px;
    background-color: transparent;
    color: var(--colors-textMuted);
    cursor: pointer;
  }

  .pane-btn:hover {
    background-color: var(--colors-hover);
    color: var(--colors-text);
  }

  .editor-container {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
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
</style>
