<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import { FileText, Search, X } from 'lucide-svelte';
  import { quickOpenController, type QuickOpenFile } from '../quickOpen';

  const { state } = quickOpenController;
  let searchInput: HTMLInputElement;

  $: filteredFiles = filterFiles($state.files, $state.query);
  $: if ($state.selectedIndex >= filteredFiles.length && filteredFiles.length > 0) {
    quickOpenController.setSelectedIndex(filteredFiles.length - 1);
  }

  function filterFiles(files: QuickOpenFile[], query: string) {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return files;

    const parts = normalizedQuery.split(/\s+/).filter(Boolean);
    return files
      .map((file) => {
        const haystack = `${file.label} ${file.relativePath}`.toLocaleLowerCase();
        const matches = parts.every((part) => haystack.includes(part));
        if (!matches) return null;

        const firstIndex = Math.min(
          ...parts.map((part) => {
            const index = haystack.indexOf(part);
            return index === -1 ? Number.MAX_SAFE_INTEGER : index;
          })
        );
        return { file, score: firstIndex + file.relativePath.length / 1000 };
      })
      .filter((match): match is { file: QuickOpenFile; score: number } => Boolean(match))
      .sort((left, right) => left.score - right.score || left.file.relativePath.localeCompare(right.file.relativePath))
      .map((match) => match.file);
  }

  function handleDocumentKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'o') {
      event.preventDefault();
      quickOpenController.open();
      return;
    }

    if (!$state.show) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      quickOpenController.close();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.min($state.selectedIndex + 1, filteredFiles.length - 1);
      quickOpenController.setSelectedIndex(Math.max(nextIndex, 0));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      quickOpenController.setSelectedIndex(Math.max($state.selectedIndex - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      const selected = filteredFiles[$state.selectedIndex];
      if (!selected) return;
      event.preventDefault();
      quickOpenController.openFile(selected);
    }
  }

  function handleBackdropPointerDown(event: PointerEvent) {
    if (event.target === event.currentTarget) {
      quickOpenController.close();
    }
  }

  function handleQueryInput(event: Event) {
    quickOpenController.setQuery((event.currentTarget as HTMLInputElement).value);
  }

  onMount(() => {
    document.addEventListener('keydown', handleDocumentKeydown, true);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleDocumentKeydown, true);
  });

  $: if ($state.show) {
    tick().then(() => searchInput?.focus());
  }
</script>

{#if $state.show}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="quick-open-overlay" onpointerdown={handleBackdropPointerDown}>
    <section class="quick-open" aria-label="Open file">
      <div class="quick-open-search-row">
        <Search size={18} />
        <input
          bind:this={searchInput}
          class="quick-open-search"
          value={$state.query}
          placeholder="Search files"
          oninput={handleQueryInput}
        />
        <button class="quick-open-close" title="Close" onclick={() => quickOpenController.close()}>
          <X size={16} />
        </button>
      </div>

      <div class="quick-open-list">
        {#if $state.isLoading && filteredFiles.length === 0}
          <div class="quick-open-empty">Loading files...</div>
        {:else if filteredFiles.length === 0}
          <div class="quick-open-empty">No matching files</div>
        {:else}
          {#each filteredFiles as file, index (file.path)}
            <button
              class="quick-open-item"
              class:is-selected={index === $state.selectedIndex}
              onmouseenter={() => quickOpenController.setSelectedIndex(index)}
              onclick={() => quickOpenController.openFile(file)}
            >
              <FileText size={16} />
              <span class="quick-open-file">
                <span class="quick-open-label">{file.label}</span>
                <span class="quick-open-path">{file.relativePath}</span>
              </span>
            </button>
          {/each}
        {/if}
      </div>
    </section>
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
    padding: 72px 24px 24px;
    background-color: color-mix(in srgb, var(--colors-background) 62%, transparent);
  }

  .quick-open {
    width: min(620px, calc(100vw - 48px));
    max-height: min(620px, calc(100vh - 120px));
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    border: 1px solid var(--colors-border);
    border-radius: 8px;
    background-color: var(--colors-surface);
    color: var(--colors-text);
    box-shadow: 0 18px 60px color-mix(in srgb, var(--colors-background) 78%, transparent);
  }

  .quick-open-search-row {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) 28px;
    align-items: center;
    gap: 8px;
    min-height: 52px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--colors-border);
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
    font-size: 15px;
  }

  .quick-open-search::placeholder {
    color: var(--colors-textMuted);
  }

  .quick-open-close {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 6px;
    background-color: transparent;
    color: var(--colors-textMuted);
    cursor: pointer;
  }

  .quick-open-close:hover {
    background-color: var(--colors-surfaceVariant);
    color: var(--colors-text);
  }

  .quick-open-list {
    min-height: 120px;
    max-height: 520px;
    overflow-y: auto;
    padding: 6px;
  }

  .quick-open-item {
    width: 100%;
    min-height: 44px;
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    border: 0;
    border-radius: 6px;
    background-color: transparent;
    color: var(--colors-text);
    padding: 6px 8px;
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

  .quick-open-file {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .quick-open-label,
  .quick-open-path {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .quick-open-label {
    font-size: 13px;
    font-weight: 600;
    color: inherit;
  }

  .quick-open-path {
    font-size: 11px;
    color: var(--colors-textMuted);
  }

  .quick-open-empty {
    padding: 24px 12px;
    color: var(--colors-textMuted);
    text-align: center;
    font-size: 13px;
  }
</style>
