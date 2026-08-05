<script lang="ts">
  import { FileText, Folder, Layers, Search, X } from 'lucide-svelte';
  import { filesController } from '../controller';
  import type { QuickOpenFile, QuickOpenFilter } from '../types';
  import LiquidGlassPanel from '$lib/shared/ui/LiquidGlassPanel.svelte';

  let searchInput: HTMLInputElement;

  $: filter = $filesController.quickOpenState.filter;
  $: allFiles = $filesController.quickOpenState.files;
  $: filteredFiles = filesController.filterQuickOpenFiles(
    allFiles,
    $filesController.quickOpenState.query,
    filter
  );

  $: totalCount = allFiles.length;
  $: fileCount = allFiles.filter((f) => !f.isDir).length;
  $: folderCount = allFiles.filter((f) => Boolean(f.isDir)).length;

  $: filesController.syncQuickOpenSelectedIndex(filteredFiles, $filesController.quickOpenState.selectedIndex);

  function handleQueryInput(event: Event) {
    filesController.setQuickOpenQuery((event.currentTarget as HTMLInputElement).value);
  }

  function handleSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const filters: QuickOpenFilter[] = ['all', 'files', 'folders'];
      const currentIndex = filters.indexOf(filter);
      const nextIndex = event.shiftKey
        ? (currentIndex - 1 + filters.length) % filters.length
        : (currentIndex + 1) % filters.length;
      filesController.setQuickOpenFilter(filters[nextIndex]);
    }
  }

  $: if ($filesController.quickOpenState.show) {
    filesController.focusQuickOpenInput(searchInput);
  }
</script>

{#if $filesController.quickOpenState.show}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="quick-open-overlay" onpointerdown={filesController.handleQuickOpenBackdropPointerDown}>
    <LiquidGlassPanel class="quick-open" aria-label="Quick search">
      <div class="quick-open-header">
        <div class="quick-open-search-row liquid-glass-input">
          <Search size={15} class="search-icon" />
          <input
            bind:this={searchInput}
            class="quick-open-search"
            value={$filesController.quickOpenState.query}
            placeholder="Search files & folders..."
            oninput={handleQueryInput}
            onkeydown={handleSearchKeydown}
          />
          <button class="quick-open-close" title="Close (Esc)" onclick={filesController.closeQuickOpen}>
            <X size={14} />
          </button>
        </div>

        <div class="quick-open-filter-bar" role="tablist" aria-label="Filter search results">
          <button
            class="filter-pill"
            class:is-active={filter === 'all'}
            onclick={() => filesController.setQuickOpenFilter('all')}
            title="Show all items (Tab to cycle)"
          >
            <Layers size={12} />
            <span>All</span>
            <span class="filter-count">{totalCount}</span>
          </button>
          <button
            class="filter-pill"
            class:is-active={filter === 'files'}
            onclick={() => filesController.setQuickOpenFilter('files')}
            title="Show files only"
          >
            <FileText size={12} />
            <span>Files</span>
            <span class="filter-count">{fileCount}</span>
          </button>
          <button
            class="filter-pill"
            class:is-active={filter === 'folders'}
            onclick={() => filesController.setQuickOpenFilter('folders')}
            title="Show folders only"
          >
            <Folder size={12} />
            <span>Folders</span>
            <span class="filter-count">{folderCount}</span>
          </button>
        </div>
      </div>

      <div class="quick-open-list">
        {#if $filesController.quickOpenState.isLoading && filteredFiles.length === 0}
          <div class="quick-open-empty">Loading workspace items...</div>
        {:else if filteredFiles.length === 0}
          <div class="quick-open-empty">No matching {filter === 'all' ? 'files or folders' : filter}</div>
        {:else}
          {#each filteredFiles as file, index (file.path)}
            <button
              class="quick-open-item"
              class:is-selected={index === $filesController.quickOpenState.selectedIndex}
              onmouseenter={() => filesController.setQuickOpenSelectedIndex(index)}
              onclick={() => filesController.openQuickOpenFile(file)}
            >
              <div class="quick-open-icon">
                {#if file.isDir}
                  <Folder size={14} class="folder-icon" />
                {:else}
                  <FileText size={14} class="file-icon" />
                {/if}
              </div>
              <div class="quick-open-file">
                <span class="quick-open-label">{file.label}</span>
                <span class="quick-open-path">{file.relativePath}</span>
              </div>
              <span class="quick-open-type-tag" class:is-folder={file.isDir}>
                {file.isDir ? 'folder' : 'file'}
              </span>
            </button>
          {/each}
        {/if}
      </div>
    </LiquidGlassPanel>
  </div>
{/if}

<style>
  .quick-open-overlay {
    position: absolute;
    inset: 0;
    z-index: 300;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 48px 16px 16px;
    background-color: color-mix(in srgb, var(--colors-background) 62%, transparent);
  }

  :global(.quick-open) {
    width: min(540px, calc(100vw - 32px));
    max-height: min(460px, calc(100vh - 80px));
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    padding: 0;
  }

  .quick-open-header {
    border-bottom: 1px solid color-mix(in srgb, var(--colors-border) 40%, transparent);
    background-color: transparent;
    padding: 8px 8px 4px;
  }

  .quick-open-search-row {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) 24px;
    align-items: center;
    gap: 8px;
    min-height: 38px;
    padding: 4px 8px 4px 10px;
    color: var(--colors-textMuted);
  }

  .quick-open-search {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: none;
    background-color: transparent;
    color: var(--colors-text);
    font: inherit;
    font-size: 13px;
  }

  .quick-open-search::placeholder {
    color: var(--colors-textMuted);
  }

  .quick-open-close {
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

  .quick-open-close:hover {
    background-color: var(--colors-surfaceVariant);
    color: var(--colors-text);
  }

  .quick-open-filter-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px 6px;
  }

  .filter-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 22px;
    padding: 0 7px;
    border: 1px solid transparent;
    border-radius: 11px;
    background-color: transparent;
    color: var(--colors-textMuted);
    font: inherit;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .filter-pill:hover {
    background-color: var(--colors-surfaceVariant);
    color: var(--colors-text);
  }

  .filter-pill.is-active {
    background-color: color-mix(in srgb, var(--colors-primary) 14%, var(--colors-surfaceVariant));
    color: var(--colors-primary);
    border-color: color-mix(in srgb, var(--colors-primary) 30%, transparent);
    font-weight: 600;
  }

  .filter-count {
    font-size: 10px;
    opacity: 0.75;
    margin-left: 1px;
  }

  .quick-open-list {
    min-height: 80px;
    max-height: 360px;
    overflow-y: auto;
    padding: 4px;
  }

  .quick-open-item {
    width: 100%;
    min-height: 32px;
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    border: 0;
    border-radius: 5px;
    background-color: transparent;
    color: var(--colors-text);
    padding: 3px 6px;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .quick-open-item:hover,
  .quick-open-item.is-selected {
    background-color: var(--colors-surfaceVariant);
  }

  .quick-open-item.is-selected {
    color: var(--colors-primary);
  }

  .quick-open-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--colors-textMuted);
  }

  .quick-open-item.is-selected .quick-open-icon {
    color: var(--colors-primary);
  }

  :global(.quick-open-icon .folder-icon) {
    color: color-mix(in srgb, var(--colors-primary) 85%, #e5c07b);
  }

  .quick-open-file {
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 8px;
    overflow: hidden;
  }

  .quick-open-label {
    font-size: 12.5px;
    font-weight: 500;
    color: inherit;
    flex-shrink: 0;
  }

  .quick-open-path {
    font-size: 11px;
    color: var(--colors-textMuted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .quick-open-type-tag {
    font-size: 10px;
    font-weight: 500;
    padding: 1px 5px;
    border-radius: 4px;
    background-color: var(--colors-surfaceVariant);
    color: var(--colors-textMuted);
    text-transform: lowercase;
    line-height: 1.2;
  }

  .quick-open-type-tag.is-folder {
    background-color: color-mix(in srgb, var(--colors-primary) 12%, transparent);
    color: var(--colors-primary);
  }

  .quick-open-empty {
    padding: 20px 12px;
    color: var(--colors-textMuted);
    text-align: center;
    font-size: 12px;
  }
</style>
