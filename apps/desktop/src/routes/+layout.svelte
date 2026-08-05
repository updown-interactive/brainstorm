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

<svg style="position:absolute; width:0; height:0;" aria-hidden="true">
  <filter id="liquid-glass-refract">
    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="noise" />
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
  </filter>
  <filter id="liquid-glass-refract-dark" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.01 0.015" numOctaves="2" seed="4" result="noise" />
    <feGaussianBlur in="noise" stdDeviation="4" result="blurredNoise" />
    <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="16" xChannelSelector="R" yChannelSelector="G" />
  </filter>
</svg>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    background-color: transparent !important;
  }

  :global(input),
  :global(textarea),
  :global(select),
  :global([contenteditable='true']),
  :global(.cm-editor),
  :global(.cm-editor *) {
    user-select: text;
    -webkit-user-select: text;
  }
  
  .global-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: transparent;
    color: var(--colors-text, #FFFFFF);
    font-family: var(--typography-fontFamily), 'Inter', sans-serif;
  }

  .app-content {
    flex: 1;
    overflow: auto;
    position: relative;
    z-index: 1;
    background-color: transparent;
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

  /* ================================================
     .liquid-glass — Apple-style liquid glass container
     Real refraction via SVG feDisplacementMap, layered
     with backdrop-filter blur/saturation. Chromium only
     for the distortion; other browsers get a clean
     frosted-glass fallback.
     ================================================ */
  :global(.liquid-glass) {
    position: relative;
    isolation: isolate;
    border-radius: 28px;
    overflow: hidden;
    color: var(--colors-text);
    box-shadow:
      0 8px 30px rgba(0, 0, 0, 0.25),
      inset 0 1px 1px rgba(255, 255, 255, 0.55),
      inset 0 -8px 20px rgba(255, 255, 255, 0.08),
      inset 0 0 0 1px rgba(255, 255, 255, 0.15);
    transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  :global(.liquid-glass:hover) {
    transform: translateY(-4px);
  }

  /* layer 1: the actual refraction, driven by the SVG filter
     #liquid-glass-refract (must be present in the page's markup) */
  :global(.liquid-glass::before) {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    backdrop-filter: url(#liquid-glass-refract) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
  }

  /* layer 2: faint tint so content stays legible over any background */
  :global(.liquid-glass::after) {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.05));
    pointer-events: none;
  }

  /* fallback for browsers that can't use an SVG filter as backdrop-filter */
  @supports not (backdrop-filter: url(#x)) {
    :global(.liquid-glass::before) {
      backdrop-filter: blur(16px) saturate(140%);
      -webkit-backdrop-filter: blur(16px) saturate(140%);
    }
  }

  :global(.liquid-glass > *) {
    position: relative;
    z-index: 2;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.liquid-glass) {
      transition: none;
    }
  }

  /* Global Liquid Glass Input Utility Class */
  :global(.liquid-glass-input) {
    position: relative;
    isolation: isolate;
    border-radius: 12px;
    overflow: hidden;
    color: var(--colors-text);
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.2),
      inset 0 1px 1px color-mix(in srgb, var(--colors-text) 25%, transparent),
      inset 0 -1px 1px color-mix(in srgb, var(--colors-text) 8%, transparent);
    transition: all 0.2s ease;
  }

  :global(.liquid-glass-input::before) {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    background: color-mix(in srgb, var(--colors-surfaceVariant, #242426) 45%, transparent);
    backdrop-filter: url(#liquid-glass-refract-dark) blur(8px) saturate(160%);
    -webkit-backdrop-filter: blur(16px) saturate(160%);
  }

  :global(.liquid-glass-input::after) {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(
      160deg,
      color-mix(in srgb, var(--colors-text) 45%, transparent) 0%,
      color-mix(in srgb, var(--colors-text) 12%, transparent) 25%,
      transparent 55%,
      color-mix(in srgb, var(--colors-text) 10%, transparent) 100%
    );
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  :global(.liquid-glass-input:focus-within) {
    box-shadow:
      0 4px 20px color-mix(in srgb, var(--colors-primary) 30%, transparent),
      inset 0 1px 1px color-mix(in srgb, var(--colors-primary) 60%, transparent);
  }

  :global(.liquid-glass-input > *) {
    position: relative;
    z-index: 2;
  }
</style>
