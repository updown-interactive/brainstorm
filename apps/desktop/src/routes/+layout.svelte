<script lang="ts">
  import { onMount } from 'svelte';
  import { themeManager } from '../lib/core/theme/ThemeManager';
  import '@fontsource/inter';

  let initialized = false;

  onMount(async () => {
    await themeManager.init();
    initialized = true;
  });
</script>

{#if initialized}
  <div class="global-layout">
    <div class="app-content">
      <slot />
    </div>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  
  .global-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: var(--colors-background, #1E1E1E);
    color: var(--colors-text, #FFFFFF);
    font-family: var(--typography-fontFamily), 'Inter', sans-serif;
  }

  .app-content {
    flex: 1;
    overflow: auto;
    position: relative;
    z-index: 1;
  }

  :global(.cm-property-spotlight-overlay) {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background-color: color-mix(in srgb, var(--colors-background) 64%, transparent);
  }

  :global(.cm-property-spotlight-overlay[hidden]) {
    display: none;
  }

  :global(.cm-property-spotlight) {
    width: min(560px, calc(100vw - 32px));
    max-height: min(560px, calc(100vh - 96px));
    box-sizing: border-box;
    border: 1px solid var(--colors-border);
    border-radius: 8px;
    background-color: var(--colors-surface);
    color: var(--colors-text);
    padding: 10px;
    display: grid;
    gap: 10px;
  }

  :global(.cm-property-spotlight-search) {
    width: 100%;
    min-height: 44px;
    box-sizing: border-box;
    border: 1px solid var(--colors-border);
    border-radius: 8px;
    background-color: var(--colors-background);
    color: var(--colors-text);
    padding: 9px 12px;
    font: inherit;
    font-size: 15px;
    outline: none;
  }

  :global(.cm-property-spotlight-search:focus) {
    border-color: var(--colors-primary);
  }

  :global(.cm-property-spotlight-list) {
    display: grid;
    gap: 4px;
    max-height: 320px;
    overflow-y: auto;
  }

  :global(.cm-property-spotlight .cm-property-menu-item) {
    min-height: 44px;
    border: 0;
    border-radius: 6px;
    background-color: transparent;
    color: var(--colors-text);
    padding: 7px 10px;
    font: inherit;
    text-align: left;
    cursor: pointer;
    display: grid;
    gap: 2px;
  }

  :global(.cm-property-spotlight .cm-property-menu-item small) {
    color: var(--colors-textMuted);
    font-size: 11px;
    line-height: 1.2;
  }

  :global(.cm-property-spotlight .cm-property-menu-item:hover),
  :global(.cm-property-spotlight .cm-property-menu-item.is-selected) {
    background-color: var(--colors-surfaceVariant);
  }

  :global(.cm-property-spotlight-empty) {
    color: var(--colors-textMuted);
    font-size: 13px;
    padding: 12px;
    text-align: center;
  }

  :global(.cm-property-spotlight .cm-property-custom-row) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--colors-border);
  }

  :global(.cm-property-spotlight .cm-property-custom-row[hidden]) {
    display: none;
  }

  :global(.cm-property-spotlight .cm-property-input) {
    width: 100%;
    min-height: 32px;
    box-sizing: border-box;
    border: 1px solid var(--colors-border);
    border-radius: 6px;
    background-color: var(--colors-background);
    color: var(--colors-text);
    padding: 6px 9px;
    font: inherit;
    outline: none;
  }

  :global(.cm-property-spotlight .cm-property-input:focus) {
    border-color: var(--colors-primary);
  }

  :global(.cm-property-spotlight .cm-property-menu-action) {
    min-height: 32px;
    border: 1px solid var(--colors-border);
    border-radius: 6px;
    background-color: var(--colors-surface);
    color: var(--colors-text);
    padding: 0 10px;
    font: inherit;
    cursor: pointer;
  }

  :global(.cm-property-spotlight .cm-property-menu-action:hover) {
    border-color: var(--colors-primary);
  }
</style>
