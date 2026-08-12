<script lang="ts">
  import { onMount } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { themeManager } from '../lib/core/theme/ThemeManager';
  import { layoutSettingsState } from '../lib/features/settings/state';
  import '@fontsource/inter';

  let initialized = false;
  let isMaximized = false;
  let isFullscreen = false;

  async function checkMaximized() {
    let isMax = false;
    let isFull = false;
    try {
      const appWindow = getCurrentWindow();
      isMax = await appWindow.isMaximized();
      isFull = await appWindow.isFullscreen();
    } catch {
      // ignore
    }

    const isMatchFull = typeof window !== 'undefined' && window.matchMedia('(display-mode: fullscreen)').matches;
    const isDocFull = typeof document !== 'undefined' && (document.fullscreenElement != null || (document as any).webkitFullscreenElement != null);

    const isNearWidth = typeof window !== 'undefined' && (
      Math.abs(window.innerWidth - screen.availWidth) <= 16 ||
      Math.abs(window.outerWidth - screen.width) <= 16
    );

    const isNearHeight = typeof window !== 'undefined' && (
      Math.abs(window.innerHeight - screen.availHeight) <= 16 ||
      Math.abs(window.outerHeight - screen.height) <= 16
    );

    const isDimensionMaximized = isNearWidth && isNearHeight;

    isFullscreen = isFull || isMatchFull || isDocFull;
    isMaximized = isMax || isFullscreen || isDimensionMaximized;
  }

  $: if (typeof document !== 'undefined') {
    if (isMaximized) {
      document.documentElement.classList.add('is-maximized');
      document.body.classList.add('is-maximized');
    } else {
      document.documentElement.classList.remove('is-maximized');
      document.body.classList.remove('is-maximized');
    }
    const isDisplayFullscreen = $layoutSettingsState.sidepanelMode === 'hover' && $layoutSettingsState.toolbarMode === 'hover';
    const shouldUseFullscreenShell = isFullscreen && isDisplayFullscreen;
    if (shouldUseFullscreenShell) {
      document.documentElement.classList.add('is-fullscreen-shell');
      document.body.classList.add('is-fullscreen-shell');
    } else {
      document.documentElement.classList.remove('is-fullscreen-shell');
      document.body.classList.remove('is-fullscreen-shell');
    }
  }

  onMount(() => {
    void themeManager.init().then(() => {
      initialized = true;
    });

    void checkMaximized();
    const handleResize = () => {
      void checkMaximized();
    };
    window.addEventListener('resize', handleResize);
    const interval = setInterval(checkMaximized, 200);

    let unlisten: (() => void) | null = null;
    try {
      const appWindow = getCurrentWindow();
      appWindow.onResized(() => {
        void checkMaximized();
      }).then((u) => {
        unlisten = u;
      }).catch(() => {});
    } catch {}

    const handleGlobalEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      // 1. Quick Open search files modal overlay
      const quickOpenOverlay = document.querySelector<HTMLElement>('.quick-open-overlay');
      if (quickOpenOverlay) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const input = quickOpenOverlay.querySelector<HTMLInputElement>('input');
        if (input) {
          const escEvt = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
          input.dispatchEvent(escEvt);
        }
        quickOpenOverlay.click();
        return;
      }

      // 2. Settings window backdrop
      const configBackdrop = document.querySelector<HTMLElement>('.config-window-backdrop');
      if (configBackdrop) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        configBackdrop.click();
        return;
      }

      // 3. Property Spotlight popup (⌘I / + Add property)
      const spotlightOverlay = document.querySelector<HTMLElement>('.cm-property-spotlight-overlay:not([hidden])');
      if (spotlightOverlay) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        spotlightOverlay.hidden = true;
        return;
      }

      // 4. Property popovers / autocompletes / calendars
      const openPopovers = document.querySelectorAll<HTMLElement>('.cm-property-menu:not([hidden]), .cm-property-calendar:not([hidden])');
      if (openPopovers.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openPopovers.forEach((popover) => {
          popover.hidden = true;
        });
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalEscape, true);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleGlobalEscape, true);
      if (unlisten) unlisten();
    };
  });
</script>

{#if initialized}
  <div
    class="global-layout"
    class:is-maximized={isMaximized}
    class:is-fullscreen={isFullscreen}
    class:is-fullscreen-shell={isFullscreen && $layoutSettingsState.sidepanelMode === 'hover' && $layoutSettingsState.toolbarMode === 'hover'}
  >
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
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    background-color: transparent !important;
    border-radius: 16px;
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
    border-radius: 16px;
    overflow: hidden;
    background-color: transparent;
    color: var(--colors-text, #FFFFFF);
    font-family: var(--typography-fontFamily), 'Inter', sans-serif;
    border: 1px solid color-mix(in srgb, var(--colors-border, #333336) 50%, rgba(255, 255, 255, 0.15));
    box-sizing: border-box;
  }

  .global-layout.is-maximized {
    border: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  :global(html.is-maximized),
  :global(body.is-maximized) {
    margin: 0 !important;
    padding: 0 !important;
  }

  .global-layout.is-fullscreen-shell {
    border-radius: 0 !important;
    border: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  :global(html.is-fullscreen-shell),
  :global(body.is-fullscreen-shell) {
    border-radius: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .app-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
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

  /* Global CodeMirror Property Popover Glass Styles */
  :global(.cm-property-menu),
  :global(.cm-property-calendar) {
    position: fixed !important;
    z-index: 999999 !important;
    box-sizing: border-box !important;
    border-radius: 16px !important;
    padding: 6px !important;
    color: var(--colors-text) !important;
    background-color: color-mix(in srgb, var(--colors-surface, #1C1C1E) 85%, rgba(20, 20, 24, 0.88)) !important;
    backdrop-filter: blur(24px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
    border: 1px solid color-mix(in srgb, var(--colors-text) 16%, rgba(255, 255, 255, 0.15)) !important;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 3px !important;
    max-height: 260px !important;
    overflow-y: auto !important;
  }

  :global(.cm-property-menu[hidden]),
  :global(.cm-property-calendar[hidden]) {
    display: none !important;
  }

  :global(.cm-property-menu .cm-property-menu-item) {
    min-height: 38px !important;
    width: 100% !important;
    box-sizing: border-box !important;
    border: 0 !important;
    border-radius: 8px !important;
    background-color: transparent !important;
    color: var(--colors-text) !important;
    padding: 6px 10px !important;
    font-family: inherit !important;
    font-size: 12.5px !important;
    text-align: left !important;
    cursor: pointer !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    justify-content: center !important;
    gap: 2px !important;
    margin: 0 !important;
    transition: background 0.12s ease, color 0.12s ease !important;
  }

  :global(.cm-property-menu .cm-property-menu-item-title) {
    font-size: 13px !important;
    font-weight: 600 !important;
    line-height: 1.3 !important;
    color: var(--colors-text) !important;
    display: block !important;
    width: 100% !important;
    text-align: left !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  :global(.cm-property-menu .cm-property-menu-item-subtitle) {
    font-size: 11px !important;
    font-weight: 400 !important;
    line-height: 1.3 !important;
    color: var(--colors-textMuted) !important;
    display: block !important;
    width: 100% !important;
    text-align: left !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  :global(.cm-property-menu .cm-property-menu-item:hover) {
    background-color: color-mix(in srgb, var(--colors-hover, #2C2C2E) 75%, transparent) !important;
    color: var(--colors-text) !important;
  }

  :global(.cm-property-menu .cm-property-menu-item.is-selected) {
    background-color: var(--colors-primary, #0A84FF) !important;
    color: #ffffff !important;
  }

  :global(.cm-property-menu .cm-property-menu-item.is-selected .cm-property-menu-item-title) {
    color: #ffffff !important;
  }

  :global(.cm-property-menu .cm-property-menu-item.is-selected .cm-property-menu-item-subtitle) {
    color: rgba(255, 255, 255, 0.75) !important;
  }

  /* Global Spotlight Modal Styles - 100% Identical LiquidGlassPanel to Search Files Popup */
  :global(.cm-property-spotlight-overlay) {
    position: fixed !important;
    inset: 0 !important;
    z-index: 999999 !important;
    display: flex !important;
    align-items: flex-start !important;
    justify-content: center !important;
    padding: 48px 16px 16px !important;
    background-color: color-mix(in srgb, var(--colors-background) 62%, transparent) !important;
  }

  :global(.cm-property-spotlight-overlay[hidden]) {
    display: none !important;
  }

  :global(.cm-property-spotlight) {
    position: relative !important;
    isolation: isolate !important;
    width: min(540px, calc(100vw - 32px)) !important;
    max-height: min(460px, calc(100vh - 80px)) !important;
    border-radius: 20px !important;
    padding: 0 !important;
    overflow: hidden !important;
    display: grid !important;
    grid-template-rows: auto minmax(0, 1fr) auto !important;
    color: var(--colors-text) !important;
    box-shadow:
      0 20px 50px rgba(0, 0, 0, 0.35),
      inset 0 1px 1px color-mix(in srgb, var(--colors-text) 25%, transparent),
      inset 0 -1px 1px color-mix(in srgb, var(--colors-text) 8%, transparent) !important;
    box-sizing: border-box !important;
  }

  /* Liquid glass refraction + blur layer (matching LiquidGlassPanel::before) */
  :global(.cm-property-spotlight::before) {
    content: "" !important;
    position: absolute !important;
    inset: 0 !important;
    z-index: 0 !important;
    background: color-mix(in srgb, var(--colors-surfaceVariant, var(--colors-surface, #1C1C1E)) 55%, transparent) !important;
    backdrop-filter: url(#liquid-glass-refract-dark) blur(8px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
  }

  /* Liquid glass rim highlight (matching LiquidGlassPanel::after) */
  :global(.cm-property-spotlight::after) {
    content: "" !important;
    position: absolute !important;
    inset: 0 !important;
    z-index: 1 !important;
    border-radius: inherit !important;
    padding: 1px !important;
    background: linear-gradient(
      160deg,
      color-mix(in srgb, var(--colors-text) 50%, transparent) 0%,
      color-mix(in srgb, var(--colors-text) 15%, transparent) 18%,
      transparent 45%,
      color-mix(in srgb, var(--colors-text) 10%, transparent) 100%
    ) !important;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0) !important;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0) !important;
    -webkit-mask-composite: xor !important;
    mask-composite: exclude !important;
    pointer-events: none !important;
  }

  @supports not (backdrop-filter: url(#x)) {
    :global(.cm-property-spotlight::before) {
      backdrop-filter: blur(20px) saturate(160%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
    }
  }

  :global(.cm-property-spotlight > *) {
    position: relative !important;
    z-index: 2 !important;
  }

  :global(.cm-property-spotlight-header) {
    border-bottom: 1px solid color-mix(in srgb, var(--colors-border) 40%, transparent) !important;
    background-color: transparent !important;
    padding: 8px 8px 6px !important;
  }

  :global(.cm-property-spotlight-search-row) {
    display: grid !important;
    grid-template-columns: 20px minmax(0, 1fr) 24px !important;
    align-items: center !important;
    gap: 8px !important;
    min-height: 38px !important;
    padding: 4px 8px 4px 10px !important;
    color: var(--colors-textMuted) !important;
  }

  :global(.cm-property-spotlight-search) {
    width: 100% !important;
    min-width: 0 !important;
    border: 0 !important;
    outline: none !important;
    background-color: transparent !important;
    color: var(--colors-text) !important;
    font: inherit !important;
    font-size: 13px !important;
  }

  :global(.cm-property-spotlight-search::placeholder) {
    color: var(--colors-textMuted) !important;
  }

  :global(.cm-property-spotlight-close) {
    width: 24px !important;
    height: 24px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border: 0 !important;
    border-radius: 4px !important;
    background-color: transparent !important;
    color: var(--colors-textMuted) !important;
    cursor: pointer !important;
  }

  :global(.cm-property-spotlight-close:hover) {
    background-color: var(--colors-surfaceVariant, #2C2C2E) !important;
    color: var(--colors-text) !important;
  }

  :global(.cm-property-spotlight-list) {
    min-height: 80px !important;
    max-height: 360px !important;
    overflow-y: auto !important;
    padding: 4px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 2px !important;
  }

  :global(.cm-property-spotlight .cm-property-menu-item) {
    width: 100% !important;
    min-height: 32px !important;
    box-sizing: border-box !important;
    border: 0 !important;
    border-radius: 5px !important;
    background-color: transparent !important;
    color: var(--colors-text) !important;
    padding: 6px 10px !important;
    font-family: inherit !important;
    font-size: 12.5px !important;
    text-align: left !important;
    cursor: pointer !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 2px !important;
    transition: background 0.12s ease, color 0.12s ease !important;
  }

  :global(.cm-property-spotlight .cm-property-menu-item:hover),
  :global(.cm-property-spotlight .cm-property-menu-item.is-selected) {
    background-color: var(--colors-surfaceVariant, #2C2C2E) !important;
    color: var(--colors-primary, #0A84FF) !important;
  }

  :global(.cm-property-spotlight .cm-property-menu-item small) {
    color: var(--colors-textMuted) !important;
    font-size: 11px !important;
  }

  :global(.cm-property-spotlight .cm-property-menu-item.is-selected small) {
    color: var(--colors-primary, #0A84FF) !important;
    opacity: 0.85 !important;
  }

  :global(.cm-property-custom-row) {
    border-top: 1px solid color-mix(in srgb, var(--colors-border) 40%, transparent) !important;
    padding: 8px 10px !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
  }

  :global(.cm-property-spotlight-empty) {
    padding: 20px 12px !important;
    text-align: center !important;
    color: var(--colors-textMuted) !important;
    font-size: 12px !important;
  }
</style>
