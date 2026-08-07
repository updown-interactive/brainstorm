<script lang="ts">
  import { Columns2, X } from 'lucide-svelte';
  import type { EditorPane } from '../state/editor';
  import { filesController } from '../controller';

  interface Props {
    pane: EditorPane;
  }

  let { pane }: Props = $props();

  function handleAuxClick(event: MouseEvent, tabId: string) {
    if (event.button === 1) {
      event.preventDefault();
      filesController.closeTab(tabId, pane.id, event);
    }
  }
</script>

<div class="pane-tab-bar">
  <div class="tabs-scroll-container">
    {#each pane.tabs as tab (tab.id)}
      {@const Icon = filesController.fileIcon(tab.name, tab.path)}
      {@const isActive = tab.id === pane.activeTabId}
      {@const accentColor = filesController.getFileAccentColor(tab.name)}
      <div
        class="tab-item"
        class:is-active={isActive}
        style="--tab-accent-color: {accentColor};"
        role="button"
        tabindex="0"
        title={tab.path}
        onclick={(e) => filesController.selectTab(tab.id, pane.id, e)}
        onauxclick={(e) => handleAuxClick(e, tab.id)}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            filesController.selectTab(tab.id, pane.id, e);
          }
        }}
      >
        <span class="tab-icon">
          <Icon size={14} />
        </span>
        <span class="tab-name">
          {tab.name.replace(/\.md$/i, '')}
        </span>
        <button
          class="tab-close-btn"
          title="Close tab"
          aria-label="Close tab"
          onclick={(e) => filesController.closeTab(tab.id, pane.id, e)}
        >
          <X size={15} />
        </button>
      </div>
    {/each}

    {#if pane.tabs.length === 0}
      <div class="empty-tab-label">No open tabs</div>
    {/if}
  </div>

  <div class="pane-actions">
    <button class="pane-btn" title="New Pane" onclick={(e) => filesController.splitPane(pane.id, e)}>
      <Columns2 size={14} />
    </button>
    {#if $filesController.editorState.panes.length > 1}
      <button class="pane-btn" title="Close Pane" onclick={(e) => filesController.closePane(pane.id, e)}>
        <X size={14} />
      </button>
    {/if}
  </div>
</div>

<style>
  .pane-tab-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 36px;
    background-color: var(--colors-surface);
    border-bottom: 1px solid var(--colors-border);
    overflow: hidden;
    user-select: none;
  }

  .tabs-scroll-container {
    display: flex;
    align-items: center;
    height: 100%;
    flex: 1;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tabs-scroll-container::-webkit-scrollbar {
    display: none;
  }

  .tab-item {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 100%;
    padding: 0 10px 0 12px;
    font-size: 12px;
    color: var(--colors-textMuted);
    background-color: transparent;
    border-right: 1px solid var(--colors-border);
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.15s ease, color 0.15s ease;
    position: relative;
  }

  .tab-item:hover {
    background-color: var(--colors-hover);
    color: var(--colors-text);
  }

  .tab-item.is-active {
    color: var(--colors-text);
    background-color: var(--colors-background);
    font-weight: 500;
  }

  .tab-item.is-active::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background-color: var(--tab-accent-color, var(--colors-primary));
    border-radius: 3px 3px 0 0;
  }

  .tab-icon {
    display: flex;
    align-items: center;
    color: var(--colors-textMuted);
    opacity: 0.85;
  }

  .tab-item.is-active .tab-icon {
    color: var(--tab-accent-color, var(--colors-primary));
    opacity: 1;
  }

  .tab-name {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tab-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--colors-textMuted);
    cursor: pointer;
    margin-left: 4px;
    opacity: 0.7;
    transition: opacity 0.15s ease, background-color 0.15s ease, color 0.15s ease;
  }

  .tab-item:hover .tab-close-btn {
    opacity: 0.95;
  }

  .tab-close-btn:hover {
    opacity: 1;
    background-color: var(--colors-hover);
    color: var(--colors-text);
  }

  .empty-tab-label {
    padding: 0 12px;
    font-size: 12px;
    color: var(--colors-textMuted);
    font-style: italic;
  }

  .pane-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 6px;
    height: 100%;
    background-color: var(--colors-surface);
    border-left: 1px solid var(--colors-border);
    flex-shrink: 0;
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
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  .pane-btn:hover {
    background-color: var(--colors-hover);
    color: var(--colors-text);
  }
</style>
