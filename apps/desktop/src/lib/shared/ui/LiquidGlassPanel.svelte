<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    class?: string;
    children?: Snippet;
  }

  let { class: className = '', children, ...restProps }: Props = $props();
</script>

<div class="liquid-glass-panel {className}" {...restProps}>
  {@render children?.()}
</div>

<style>
  :global(.liquid-glass-panel) {
    position: relative;
    isolation: isolate;
    border-radius: 20px;
    overflow: hidden;
    padding: 4px;
    color: var(--colors-text);
    box-shadow:
      0 20px 50px rgba(0, 0, 0, 0.35),
      inset 0 1px 1px color-mix(in srgb, var(--colors-text) 25%, transparent),
      inset 0 -1px 1px color-mix(in srgb, var(--colors-text) 8%, transparent);
  }

  /* refraction + blur layer with embedded theme surface color */
  :global(.liquid-glass-panel::before) {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    background: color-mix(in srgb, var(--colors-surfaceVariant, var(--colors-surface, #1C1C1E)) 55%, transparent);
    backdrop-filter: url(#liquid-glass-refract-dark) blur(8px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
  }

  /* the rim highlight — adapting dynamically to theme text/highlight color */
  :global(.liquid-glass-panel::after) {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(
      160deg,
      color-mix(in srgb, var(--colors-text) 50%, transparent) 0%,
      color-mix(in srgb, var(--colors-text) 15%, transparent) 18%,
      transparent 45%,
      color-mix(in srgb, var(--colors-text) 10%, transparent) 100%
    );
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  @supports not (backdrop-filter: url(#x)) {
    :global(.liquid-glass-panel::before) {
      backdrop-filter: blur(20px) saturate(160%);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
    }
  }

  :global(.liquid-glass-panel > *) {
    position: relative;
    z-index: 2;
  }

  /* ---- panel content helpers ---- */

  :global(.liquid-glass-panel .panel-label) {
    padding: 6px 10px 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--colors-textMuted);
  }

  :global(.liquid-glass-panel .panel-item) {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 2px 4px;
    padding: 6px 10px;
    border-radius: 8px;
    color: var(--colors-text);
    font-size: 13px;
    font-weight: 400;
    font-family: var(--typography-fontFamily), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    cursor: pointer;
    border: none;
    background: transparent;
    width: calc(100% - 8px);
    box-sizing: border-box;
    text-align: left;
    transition: background 0.12s ease, color 0.12s ease;
  }

  :global(.liquid-glass-panel .panel-item:hover) {
    background: color-mix(in srgb, var(--colors-hover) 75%, transparent);
    color: var(--colors-text);
  }

  :global(.liquid-glass-panel .panel-item.active) {
    background: var(--colors-primary, #0A84FF);
    color: #ffffff;
    font-weight: 500;
  }

  :global(.liquid-glass-panel .panel-item.active:hover) {
    background: color-mix(in srgb, var(--colors-primary, #0A84FF) 90%, #ffffff);
    color: #ffffff;
  }

  :global(.liquid-glass-panel .panel-item.muted) {
    color: var(--colors-textMuted);
    cursor: default;
  }

  :global(.liquid-glass-panel .panel-divider) {
    height: 1px;
    margin: 4px 6px;
    background: color-mix(in srgb, var(--colors-border) 60%, transparent);
  }

  :global(.liquid-glass-panel .panel-icon) {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    opacity: 0.9;
    color: currentColor;
    stroke: currentColor;
  }
</style>
