<script lang="ts">
  import { Sun, Moon, Layout, Sidebar, PanelTop, Compass } from 'lucide-svelte';
  import { settingsController } from '../controller';
</script>

<div class="settings-page">
  <div class="settings-page-header">
    <h1>Appearance</h1>
    <p>Customize system themes, panel behavior, and workspace layout.</p>
  </div>

  <div class="settings-section-heading">Theme</div>

  <div class="settings-card">
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="color-theme">
          <Sun size={15} style="color: var(--colors-primary, #0A84FF);" />
          Color Theme
        </label>
        <p>Select dark or light appearance for the desktop application.</p>
      </div>
      <div class="settings-card-input">
        <div class="apple-segmented-control" role="group" aria-label="Color Theme">
          <button
            type="button"
            class="segmented-btn {$settingsController.appearance.currentTheme === 'dark' ? 'active' : ''}"
            disabled={$settingsController.appearance.isLoading}
            onclick={() => settingsController.setTheme('dark')}
          >
            <div style="display: flex; align-items: center; gap: 6px;">
              <Moon size={13} />
              <span>Dark</span>
            </div>
          </button>
          <button
            type="button"
            class="segmented-btn {$settingsController.appearance.currentTheme === 'light' ? 'active' : ''}"
            disabled={$settingsController.appearance.isLoading}
            onclick={() => settingsController.setTheme('light')}
          >
            <div style="display: flex; align-items: center; gap: 6px;">
              <Sun size={13} />
              <span>Light</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="settings-section-heading">Layout & Docking</div>

  <div class="settings-card">
    <!-- Display Mode -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="display-mode">
          <Sidebar size={15} style="color: var(--colors-primary, #0A84FF);" />
          Display Mode
        </label>
        <p>Switch between Normal (expanded docked bars) and Full Screen (floating glass hover overlays).</p>
      </div>
      <div class="settings-card-input">
        <div class="apple-segmented-control" role="group" aria-label="Display Mode">
          <button
            type="button"
            class="segmented-btn {$settingsController.appearance.sidepanelMode !== 'hover' && $settingsController.appearance.toolbarMode !== 'hover' ? 'active' : ''}"
            disabled={$settingsController.appearance.isLoading}
            onclick={() => settingsController.setDisplayMode('normal')}
          >
            Normal
          </button>
          <button
            type="button"
            class="segmented-btn {$settingsController.appearance.sidepanelMode === 'hover' && $settingsController.appearance.toolbarMode === 'hover' ? 'active' : ''}"
            disabled={$settingsController.appearance.isLoading}
            onclick={() => settingsController.setDisplayMode('fullscreen')}
          >
            Full Screen
          </button>
        </div>
      </div>
    </div>

    <!-- Side Panel Position -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="sidepanel-position">
          <Compass size={15} style="color: var(--colors-primary, #0A84FF);" />
          Side Panel Dock Position
        </label>
        <p>Dock the main side panel to the left or right side of the window.</p>
      </div>
      <div class="settings-card-input">
        <div class="apple-segmented-control" role="group" aria-label="Side Panel Position">
          <button
            type="button"
            class="segmented-btn {$settingsController.appearance.sidepanelPosition === 'left' ? 'active' : ''}"
            disabled={$settingsController.appearance.isLoading}
            onclick={() => settingsController.setSidepanelPosition('left')}
          >
            Left
          </button>
          <button
            type="button"
            class="segmented-btn {$settingsController.appearance.sidepanelPosition === 'right' ? 'active' : ''}"
            disabled={$settingsController.appearance.isLoading}
            onclick={() => settingsController.setSidepanelPosition('right')}
          >
            Right
          </button>
        </div>
      </div>
    </div>

    <!-- Toolbar Position -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="toolbar-position">
          <Layout size={15} style="color: var(--colors-primary, #0A84FF);" />
          Toolbar Dock Position
        </label>
        <p>Dock the toolbar section to the top or bottom of the window.</p>
      </div>
      <div class="settings-card-input">
        <div class="apple-segmented-control" role="group" aria-label="Toolbar Position">
          <button
            type="button"
            class="segmented-btn {$settingsController.appearance.toolbarPosition === 'top' ? 'active' : ''}"
            disabled={$settingsController.appearance.isLoading}
            onclick={() => settingsController.setToolbarPosition('top')}
          >
            Top
          </button>
          <button
            type="button"
            class="segmented-btn {$settingsController.appearance.toolbarPosition === 'bottom' ? 'active' : ''}"
            disabled={$settingsController.appearance.isLoading}
            onclick={() => settingsController.setToolbarPosition('bottom')}
          >
            Bottom
          </button>
        </div>
      </div>
    </div>
  </div>

  {#if $settingsController.appearance.error}
    <p class="settings-error">{$settingsController.appearance.error}</p>
  {/if}
</div>
