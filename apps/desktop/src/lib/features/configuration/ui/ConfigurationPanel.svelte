<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Braces, Brain, Check, ChevronDown, Database, Edit2, FileJson, FileText, GitBranch, Network, PanelLeft, PanelRight, Plus, RefreshCw, Settings, SlidersHorizontal, Tag, TerminalSquare, Wrench, X } from 'lucide-svelte';
  import { configurationController } from '../controller';
  import JsonInspector from './JsonInspector.svelte';
  import YamlInspector from './YamlInspector.svelte';
  import LiquidGlassPanel from '$lib/shared/ui/LiquidGlassPanel.svelte';
  import type { PropertiesDisplayMode } from '../../markdown/config/editor-config';

  export let onClose: () => void;
  export let onConfigChange: () => void = () => {};
  export let isPopup = false;
  export let onHeaderPointerDown: ((event: PointerEvent) => void) | undefined = undefined;

  function handleHeaderPointerDown(event: PointerEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a')) return;
    onHeaderPointerDown?.(event);
  }

  let showPropertiesDropdown = false;
  let dropdownWrapEl: HTMLDivElement;

  function togglePropertiesDropdown(event?: Event) {
    event?.stopPropagation();
    showPropertiesDropdown = !showPropertiesDropdown;
  }

  function selectPropertiesMode(mode: PropertiesDisplayMode, event?: Event) {
    event?.stopPropagation();
    void configurationController.saveEditorPropertiesDisplayMode(mode);
    showPropertiesDropdown = false;
  }

  function handlePointerDown(event: PointerEvent) {
    const target = event.target;
    if (showPropertiesDropdown && target instanceof Node && !dropdownWrapEl?.contains(target)) {
      showPropertiesDropdown = false;
    }
  }

  onMount(() => {
    configurationController.mount(onConfigChange);
    document.addEventListener('pointerdown', handlePointerDown, true);
  });

  onDestroy(() => {
    document.removeEventListener('pointerdown', handlePointerDown, true);
    configurationController.destroy();
  });
</script>

<div class="brainstorm-settings" class:is-popup={isPopup}>
  {#if isPopup}
    <LiquidGlassPanel class="brainstorm-settings-sidebar">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="brainstorm-settings-sidebar-header" class:is-draggable={isPopup} onpointerdown={handleHeaderPointerDown}>
        <span>.brainstorm</span>
        <button class="icon-btn" title="Refresh" onclick={configurationController.loadFiles}>
          <RefreshCw size={14} />
        </button>
      </div>

      <div class="brainstorm-file-list">
        {#if $configurationController.isLoading}
          <div class="brainstorm-empty">Loading...</div>
        {:else}
          {#each $configurationController.sections as section (section.path)}
            <section class="configuration-sidebar-section" aria-label={section.name}>
              <div class="configuration-section-header">{section.name}</div>
              <div class="configuration-section-files">
                {#each section.files as file (file.path)}
                  <button
                    class="brainstorm-file-item"
                    class:is-selected={file.path === $configurationController.selectedPath}
                    onclick={() => configurationController.selectFile(file)}
                  >
                    {#if file.kind === 'yaml'}
                      <FileText size={15} />
                    {:else}
                      <FileJson size={15} />
                    {/if}
                    <span>{file.name}</span>
                  </button>
                {/each}
              </div>
            </section>
          {/each}
        {/if}
      </div>
    </LiquidGlassPanel>
  {:else}
    <aside class="brainstorm-settings-sidebar">
      <div class="brainstorm-settings-sidebar-header">
        <span>.brainstorm</span>
        <button class="icon-btn" title="Refresh" onclick={configurationController.loadFiles}>
          <RefreshCw size={14} />
        </button>
      </div>

      <div class="brainstorm-file-list">
        {#if $configurationController.isLoading}
          <div class="brainstorm-empty">Loading...</div>
        {:else}
          {#each $configurationController.sections as section (section.path)}
            <section class="configuration-sidebar-section" aria-label={section.name}>
              <div class="configuration-section-header">{section.name}</div>
              <div class="configuration-section-files">
                {#each section.files as file (file.path)}
                  <button
                    class="brainstorm-file-item"
                    class:is-selected={file.path === $configurationController.selectedPath}
                    onclick={() => configurationController.selectFile(file)}
                  >
                    {#if file.kind === 'yaml'}
                      <FileJson size={15} />
                    {/if}
                    <span>{file.name}</span>
                  </button>
                {/each}
              </div>
            </section>
          {/each}
        {/if}
      </div>
    </aside>
  {/if}

  <section class="brainstorm-settings-main" aria-label="Brainstorm settings">
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <header class="brainstorm-settings-header" class:is-draggable={isPopup} onpointerdown={handleHeaderPointerDown}>
      <div class="brainstorm-settings-title">
        <Settings size={16} />
        <span>{$configurationController.selectedName || 'Settings'}</span>
      </div>
      <div class="brainstorm-settings-actions">
        {#if $configurationController.selectedKind === 'configuration'}
          <button class="toolbar-btn" class:is-active={$configurationController.showJson} onclick={configurationController.toggleJson}>
            <Braces size={14} />
            <span>{$configurationController.showJson ? 'Show UI' : 'Inspect JSON'}</span>
          </button>
        {/if}
        {#if isPopup}
          <button class="icon-btn" title="Close settings" onclick={onClose}>
            <X size={15} />
          </button>
        {/if}
      </div>
    </header>

    {#if $configurationController.parseError && !$configurationController.showJson}
      <div class="brainstorm-error">{$configurationController.parseError}</div>
    {/if}

    {#if $configurationController.selectedKind === 'configuration' && $configurationController.showJson}
      <JsonInspector
        content={$configurationController.rawContent}
        error={$configurationController.jsonEditorError}
        onChange={configurationController.handleJsonChange}
      />
    {:else if $configurationController.selectedKind === 'yaml'}
      <YamlInspector
        content={$configurationController.rawContent}
        error={$configurationController.jsonEditorError}
        onChange={configurationController.handleYamlChange}
      />
    {:else if $configurationController.selectedName === configurationController.explorerConfigFileName}
      <div class="config-overview">
        <section class="config-section">
          <div class="config-section-header">
            <div>
              <h2>Explorer</h2>
              <p>Controls the file explorer behavior.</p>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-copy">
              <h3>Position</h3>
              <p>Choose which side the Explorer panel uses.</p>
            </div>
            <div class="segmented-control" aria-label="Explorer position">
              <button
                class:is-selected={$configurationController.explorerConfig.position === 'left'}
                onclick={() => configurationController.saveExplorerPosition('left')}
              >
                <PanelLeft size={14} />
                <span>Left</span>
              </button>
              <button
                class:is-selected={$configurationController.explorerConfig.position === 'right'}
                onclick={() => configurationController.saveExplorerPosition('right')}
              >
                <PanelRight size={14} />
                <span>Right</span>
              </button>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-copy">
              <h3>Side Panel Width</h3>
              <p>Set the Explorer width used by the file panel.</p>
            </div>
            <div class="width-control">
              <input
                type="range"
                min={configurationController.minExplorerSidebarWidth}
                max={configurationController.maxExplorerSidebarWidth}
                value={$configurationController.explorerConfig.sidebarWidth}
                oninput={(event) => configurationController.saveExplorerSidebarWidth(Number(event.currentTarget.value))}
              />
              <label>
                <input
                  class="width-input"
                  type="number"
                  min={configurationController.minExplorerSidebarWidth}
                  max={configurationController.maxExplorerSidebarWidth}
                  value={$configurationController.explorerConfig.sidebarWidth}
                  onchange={(event) => configurationController.saveExplorerSidebarWidth(Number(event.currentTarget.value))}
                />
                <span>px</span>
              </label>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-copy">
              <h3>Show .brainstorm Folder</h3>
              <p>Display the hidden .brainstorm folder in the file tree explorer.</p>
            </div>
            <div class="segmented-control" aria-label="Show .brainstorm folder">
              <button
                class:is-selected={$configurationController.explorerConfig.showBrainstormFolder}
                onclick={() => configurationController.saveExplorerShowBrainstormFolder(true)}
              >
                <span>Visible</span>
              </button>
              <button
                class:is-selected={!$configurationController.explorerConfig.showBrainstormFolder}
                onclick={() => configurationController.saveExplorerShowBrainstormFolder(false)}
              >
                <span>Hidden</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    {:else if $configurationController.selectedName === configurationController.editorConfigFileName}
      <div class="config-overview">
        <section class="config-section">
          <div class="config-section-header">
            <div>
              <h2>Editor</h2>
              <p>Controls markdown editor display and behavior.</p>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-copy">
              <h3>Properties Section</h3>
              <p>Choose the initial display mode for file YAML frontmatter properties.</p>
            </div>
            <div class="custom-dropdown-wrap" bind:this={dropdownWrapEl}>
              <button
                type="button"
                class="custom-dropdown-trigger"
                class:is-open={showPropertiesDropdown}
                onclick={togglePropertiesDropdown}
                aria-expanded={showPropertiesDropdown}
                aria-haspopup="listbox"
              >
                <span class="dropdown-value">
                  {#if $configurationController.editorConfig.propertiesDisplayMode === 'expanded'}
                    Expanded
                  {:else if $configurationController.editorConfig.propertiesDisplayMode === 'hover'}
                    Hover
                  {:else}
                    Collapsed
                  {/if}
                </span>
                <ChevronDown size={14} class="dropdown-arrow" />
              </button>

              {#if showPropertiesDropdown}
                <div class="custom-dropdown-menu" role="listbox">
                  <button
                    type="button"
                    class="custom-dropdown-item"
                    class:is-selected={$configurationController.editorConfig.propertiesDisplayMode === 'collapsed'}
                    onclick={(e) => selectPropertiesMode('collapsed', e)}
                    role="option"
                    aria-selected={$configurationController.editorConfig.propertiesDisplayMode === 'collapsed'}
                  >
                    <div class="dropdown-item-copy">
                      <span class="dropdown-item-title">Collapsed</span>
                      <span class="dropdown-item-desc">Properties section is collapsed by default</span>
                    </div>
                    {#if $configurationController.editorConfig.propertiesDisplayMode === 'collapsed'}
                      <Check size={14} class="dropdown-check" />
                    {/if}
                  </button>

                  <button
                    type="button"
                    class="custom-dropdown-item"
                    class:is-selected={$configurationController.editorConfig.propertiesDisplayMode === 'expanded'}
                    onclick={(e) => selectPropertiesMode('expanded', e)}
                    role="option"
                    aria-selected={$configurationController.editorConfig.propertiesDisplayMode === 'expanded'}
                  >
                    <div class="dropdown-item-copy">
                      <span class="dropdown-item-title">Expanded</span>
                      <span class="dropdown-item-desc">Properties section is open by default</span>
                    </div>
                    {#if $configurationController.editorConfig.propertiesDisplayMode === 'expanded'}
                      <Check size={14} class="dropdown-check" />
                    {/if}
                  </button>

                  <button
                    type="button"
                    class="custom-dropdown-item"
                    class:is-selected={$configurationController.editorConfig.propertiesDisplayMode === 'hover'}
                    onclick={(e) => selectPropertiesMode('hover', e)}
                    role="option"
                    aria-selected={$configurationController.editorConfig.propertiesDisplayMode === 'hover'}
                  >
                    <div class="dropdown-item-copy">
                      <span class="dropdown-item-title">Hover</span>
                      <span class="dropdown-item-desc">Properties section expands on mouse hover</span>
                    </div>
                    {#if $configurationController.editorConfig.propertiesDisplayMode === 'hover'}
                      <Check size={14} class="dropdown-check" />
                    {/if}
                  </button>
                </div>
              {/if}
            </div>
          </div>
        </section>
      </div>
    {:else if $configurationController.selectedName === configurationController.graphConfigFileName}
      <div class="config-overview">
        <section class="config-section">
          <div class="config-section-header">
            <div>
              <h2>Graph</h2>
              <p>Controls graph rendering, physics, and panel defaults.</p>
            </div>
            <div class="section-actions">
              <span class="count-pill">Model v{$configurationController.graphConfig.forceModelVersion}</span>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-copy">
              <h3>Link Arrows</h3>
              <p>Show direction markers on graph links.</p>
            </div>
            <button
              class="switch-button"
              class:is-on={$configurationController.graphConfig.display.arrows}
              aria-label="Toggle graph link arrows"
              aria-pressed={$configurationController.graphConfig.display.arrows}
              onclick={() => configurationController.saveGraphDisplayConfig({
                arrows: !$configurationController.graphConfig.display.arrows
              })}
            >
              <span></span>
            </button>
          </div>

          <div class="config-subsection">
            <div class="subsection-heading">
              <SlidersHorizontal size={15} />
              <h3>Display</h3>
            </div>
            {#each configurationController.graphDisplaySettings as setting (setting.key)}
              <div class="setting-row">
                <div class="setting-copy">
                  <h3>{setting.label}</h3>
                  <p>{setting.description}</p>
                </div>
                <div class="range-control">
                  <input
                    type="range"
                    min={setting.min}
                    max={setting.max}
                    step={setting.step}
                    value={$configurationController.graphConfig.display[setting.key]}
                    oninput={(event) => configurationController.saveGraphDisplayConfig({
                      [setting.key]: Number(event.currentTarget.value)
                    })}
                  />
                  <label>
                    <input
                      class="range-input"
                      type="number"
                      min={setting.min}
                      max={setting.max}
                      step={setting.step}
                      value={$configurationController.graphConfig.display[setting.key]}
                      onchange={(event) => configurationController.saveGraphDisplayConfig({
                        [setting.key]: Number(event.currentTarget.value)
                      })}
                    />
                  </label>
                </div>
              </div>
            {/each}
          </div>

          <div class="config-subsection">
            <div class="subsection-heading">
              <GitBranch size={15} />
              <h3>Forces</h3>
            </div>
            {#each configurationController.graphForceSettings as setting (setting.key)}
              <div class="setting-row">
                <div class="setting-copy">
                  <h3>{setting.label}</h3>
                  <p>{setting.description}</p>
                </div>
                <div class="range-control">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={$configurationController.graphConfig.forces[setting.key]}
                    oninput={(event) => configurationController.saveGraphForceConfig({
                      [setting.key]: Number(event.currentTarget.value)
                    })}
                  />
                  <label>
                    <input
                      class="range-input"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={$configurationController.graphConfig.forces[setting.key]}
                      onchange={(event) => configurationController.saveGraphForceConfig({
                        [setting.key]: Number(event.currentTarget.value)
                      })}
                    />
                    <span>%</span>
                  </label>
                </div>
              </div>
            {/each}
          </div>

          <div class="config-subsection">
            <div class="subsection-heading">
              <Settings size={15} />
              <h3>Panel</h3>
            </div>
            <div class="toggle-grid">
              <button
                class="toggle-card"
                class:is-selected={$configurationController.graphConfig.panel.open}
                aria-pressed={$configurationController.graphConfig.panel.open}
                onclick={() => configurationController.saveGraphPanelConfig({
                  open: !$configurationController.graphConfig.panel.open
                })}
              >
                <span>Controls Open</span>
              </button>
              <button
                class="toggle-card"
                class:is-selected={$configurationController.graphConfig.panel.displayOpen}
                aria-pressed={$configurationController.graphConfig.panel.displayOpen}
                onclick={() => configurationController.saveGraphPanelConfig({
                  displayOpen: !$configurationController.graphConfig.panel.displayOpen
                })}
              >
                <span>Display Section</span>
              </button>
              <button
                class="toggle-card"
                class:is-selected={$configurationController.graphConfig.panel.forcesOpen}
                aria-pressed={$configurationController.graphConfig.panel.forcesOpen}
                onclick={() => configurationController.saveGraphPanelConfig({
                  forcesOpen: !$configurationController.graphConfig.panel.forcesOpen
                })}
              >
                <span>Forces Section</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    {:else if $configurationController.selectedName === configurationController.propertyConfigFileName}
      <div class="config-overview">
        <section class="config-section">
          <div class="config-section-header">
            <div>
              <h2>Tags</h2>
              <p>Shared tags available across markdown files.</p>
            </div>
            <div class="section-actions">
              <span class="count-pill">{$configurationController.tags.length}</span>
            </div>
          </div>

          {#if $configurationController.showTagForm}
            <div class="tag-editor">
              <div class="field-row">
                <label>
                  <span>Name</span>
                  <input
                    class="settings-input"
                    placeholder="#tag"
                    value={$configurationController.tagForm.name}
                    oninput={(event) => configurationController.updateTagForm({ name: event.currentTarget.value })}
                  />
                </label>
                <label>
                  <span>Color</span>
                  <div class="color-picker-field">
                    <input
                      class="tag-color-picker"
                      type="color"
                      value={$configurationController.tagForm.color}
                      oninput={(event) => configurationController.updateTagForm({ color: event.currentTarget.value })}
                    />
                    <span>{$configurationController.tagForm.color}</span>
                  </div>
                </label>
              </div>
              <label>
                <span>Description</span>
                <textarea
                  class="settings-input settings-textarea"
                  rows="2"
                  value={$configurationController.tagForm.description}
                  oninput={(event) => configurationController.updateTagForm({ description: event.currentTarget.value })}
                ></textarea>
              </label>
              <div class="form-actions">
                <button class="toolbar-btn primary" onclick={configurationController.saveTag}>
                  <span>{$configurationController.editingTagName ? 'Save Tag' : 'Create Tag'}</span>
                </button>
                <button class="toolbar-btn" onclick={configurationController.cancelTagEdit}>
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          {/if}

          {#if $configurationController.tags.length === 0 && !$configurationController.showTagForm}
            <div class="brainstorm-empty large">No shared tags yet.</div>
          {/if}

          <div class="tag-grid">
            {#if $configurationController.tags.length > 0}
              {#each $configurationController.tags as tag (tag.name)}
                <article class="tag-card">
                  <div class="tag-card-header">
                    <div class="tag-name">
                      <Tag size={14} />
                      <span style="color: {tag.color}">{tag.name}</span>
                    </div>
                    <span class="tag-color">
                      <span class="tag-color-swatch" style="background-color: {tag.color}"></span>
                      {tag.color}
                    </span>
                  </div>
                  <p>{tag.description || 'No description'}</p>
                  <div class="tag-card-footer">
                    <small>Created {tag.created || 'unknown'}</small>
                    <button class="tag-edit-btn" title="Edit tag" onclick={() => configurationController.startEditTag(tag)}>
                      <Edit2 size={13} />
                    </button>
                  </div>
                </article>
              {/each}
            {/if}

            {#if !$configurationController.showTagForm}
              <button class="tag-card add-tag-card" onclick={configurationController.startCreateTag}>
                <Plus size={20} />
                <span>Add Tag</span>
              </button>
            {/if}
          </div>
        </section>
      </div>
    {:else}
      <div class="brainstorm-empty large">No structured view for this file.</div>
    {/if}
  </section>
</div>

<style>
  .brainstorm-settings {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    background-color: var(--colors-background);
    color: var(--colors-text);
  }

  .brainstorm-settings.is-popup {
    background-color: transparent;
    padding: 8px;
    gap: 8px;
    box-sizing: border-box;
  }

  .brainstorm-settings-sidebar {
    min-width: 0;
    border-right: 1px solid var(--colors-border);
    background-color: var(--colors-surface);
  }

  .brainstorm-settings.is-popup :global(.brainstorm-settings-sidebar) {
    min-width: 0;
    border-radius: 14px !important;
    border: 1px solid color-mix(in srgb, var(--colors-border) 45%, transparent);
    overflow: hidden;
    padding: 0;
  }

  .brainstorm-settings-sidebar-header,
  .brainstorm-settings-header {
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 0 10px;
    border-bottom: 1px solid var(--colors-border);
  }

  .brainstorm-settings-sidebar-header {
    color: var(--colors-textMuted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .brainstorm-file-list {
    display: grid;
    gap: 8px;
    padding: 6px;
  }

  .configuration-sidebar-section {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .configuration-section-header {
    min-height: 24px;
    display: flex;
    align-items: center;
    padding: 4px 8px 2px;
    color: var(--colors-textMuted);
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .configuration-section-files {
    display: grid;
    gap: 2px;
  }

  .brainstorm-file-item,
  .toolbar-btn,
  .icon-btn {
    border: 0;
    border-radius: 6px;
    background-color: transparent;
    color: var(--colors-textMuted);
    font: inherit;
    cursor: pointer;
  }

  .brainstorm-file-item {
    min-height: 32px;
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr);
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    text-align: left;
  }

  .brainstorm-file-item span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }

  .brainstorm-file-item:hover,
  .toolbar-btn:hover,
  .icon-btn:hover {
    background-color: var(--colors-hover);
    color: var(--colors-text);
  }

  .brainstorm-settings-main {
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    background-color: var(--colors-background);
  }

  .brainstorm-settings.is-popup .brainstorm-settings-main {
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--colors-border) 50%, transparent);
    overflow: hidden;
  }

  .brainstorm-settings-title,
  .brainstorm-settings-actions,
  .toolbar-btn {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .brainstorm-settings-title {
    min-width: 0;
    color: var(--colors-text);
    font-size: 13px;
    font-weight: 700;
  }

  .brainstorm-settings-actions {
    flex: 0 0 auto;
  }

  .toolbar-btn {
    min-height: 28px;
    padding: 0 8px;
    font-size: 12px;
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .config-overview {
    min-height: 0;
    overflow: auto;
    padding: 18px;
  }

  .config-section {
    display: grid;
    gap: 12px;
  }

  .config-subsection {
    display: grid;
    gap: 8px;
  }

  .subsection-heading {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--colors-textMuted);
  }

  .subsection-heading h3 {
    margin: 0;
    color: var(--colors-text);
    font-size: 13px;
  }

  .config-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .config-section-header h2 {
    margin: 0;
    font-size: 16px;
  }

  .config-section-header p {
    margin: 4px 0 0;
    color: var(--colors-textMuted);
    font-size: 12px;
  }

  .section-actions,
  .form-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border: 1px solid var(--colors-border);
    border-radius: 8px;
    background-color: var(--colors-surface);
    padding: 12px;
  }

  .setting-copy {
    min-width: 0;
  }

  .setting-copy h3 {
    margin: 0;
    color: var(--colors-text);
    font-size: 13px;
  }

  .setting-copy p {
    margin: 4px 0 0;
    color: var(--colors-textMuted);
    font-size: 12px;
  }

  .segmented-control {
    flex: 0 0 auto;
    display: inline-grid;
    grid-template-columns: repeat(2, minmax(82px, 1fr));
    gap: 2px;
    border: 1px solid var(--colors-border);
    border-radius: 6px;
    background-color: var(--colors-background);
    padding: 2px;
  }

  .segmented-control button {
    min-height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 0;
    border-radius: 4px;
    background-color: transparent;
    color: var(--colors-textMuted);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .segmented-control button:hover,
  .segmented-control button.is-selected {
    background-color: var(--colors-hover);
    color: var(--colors-text);
  }

  .segmented-control button.is-selected {
    box-shadow: inset 0 0 0 1px var(--colors-primary);
  }

  .width-control {
    flex: 0 0 min(320px, 44%);
    min-width: 220px;
    display: grid;
    grid-template-columns: minmax(120px, 1fr) 86px;
    align-items: center;
    gap: 10px;
  }

  .width-control input[type='range'] {
    width: 100%;
    accent-color: var(--colors-primary);
  }

  .width-control label {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 5px;
    border: 1px solid var(--colors-border);
    border-radius: 6px;
    background-color: var(--colors-background);
    color: var(--colors-textMuted);
    padding: 0 8px;
    font-size: 12px;
    font-weight: 600;
  }

  .width-control label:focus-within {
    border-color: var(--colors-primary);
  }

  .width-input {
    min-width: 0;
    height: 30px;
    border: 0;
    outline: 0;
    background-color: transparent;
    color: var(--colors-text);
    font: inherit;
    text-align: right;
  }

  .range-control {
    flex: 0 0 min(360px, 48%);
    min-width: 240px;
    display: grid;
    grid-template-columns: minmax(130px, 1fr) 86px;
    align-items: center;
    gap: 10px;
  }

  .range-control input[type='range'] {
    width: 100%;
    accent-color: var(--colors-primary);
  }

  .range-control label {
    min-width: 0;
    min-height: 32px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 5px;
    border: 1px solid var(--colors-border);
    border-radius: 6px;
    background-color: var(--colors-background);
    color: var(--colors-textMuted);
    padding: 0 8px;
    font-size: 12px;
    font-weight: 600;
  }

  .range-control label:focus-within {
    border-color: var(--colors-primary);
  }

  .range-input {
    min-width: 0;
    height: 30px;
    border: 0;
    outline: 0;
    background-color: transparent;
    color: var(--colors-text);
    font: inherit;
    text-align: right;
  }

  .switch-button {
    position: relative;
    flex: 0 0 auto;
    width: 42px;
    height: 24px;
    border: 1px solid var(--colors-border);
    border-radius: 999px;
    background-color: var(--colors-background);
    cursor: pointer;
  }

  .switch-button span {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background-color: var(--colors-textMuted);
    transition: transform 120ms ease, background-color 120ms ease;
  }

  .switch-button.is-on {
    border-color: var(--colors-primary);
    background-color: var(--colors-hover);
  }

  .switch-button.is-on span {
    background-color: var(--colors-primary);
    transform: translateX(18px);
  }

  .toggle-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
  }

  .toggle-card {
    min-height: 42px;
    border: 1px solid var(--colors-border);
    border-radius: 8px;
    background-color: var(--colors-surface);
    color: var(--colors-textMuted);
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .toggle-card:hover,
  .toggle-card.is-selected {
    background-color: var(--colors-hover);
    color: var(--colors-text);
  }

  .toggle-card.is-selected {
    border-color: var(--colors-primary);
  }

  .count-pill,
  .tag-color {
    border: 1px solid var(--colors-border);
    border-radius: 999px;
    color: var(--colors-textMuted);
    padding: 2px 8px;
    font-size: 11px;
  }

  .tag-editor {
    display: grid;
    gap: 10px;
    border: 1px solid var(--colors-border);
    border-radius: 8px;
    background-color: var(--colors-surface);
    padding: 12px;
  }

  .field-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(140px, 220px);
    gap: 10px;
  }

  label {
    min-width: 0;
    display: grid;
    gap: 5px;
    color: var(--colors-textMuted);
    font-size: 12px;
    font-weight: 600;
  }

  .settings-input {
    width: 100%;
    min-width: 0;
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

  .settings-input:focus {
    border-color: var(--colors-primary);
  }

  .settings-textarea {
    resize: vertical;
    line-height: 1.4;
  }

  .color-picker-field {
    min-height: 32px;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    border: 1px solid var(--colors-border);
    border-radius: 6px;
    background-color: var(--colors-background);
    padding: 4px 8px 4px 4px;
  }

  .color-picker-field:focus-within {
    border-color: var(--colors-primary);
  }

  .color-picker-field span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--colors-text);
    font-size: 12px;
    font-weight: 500;
  }

  .tag-color-picker {
    width: 34px;
    height: 24px;
    border: 0;
    border-radius: 4px;
    background-color: transparent;
    padding: 0;
    cursor: pointer;
  }

  .toolbar-btn.primary {
    background-color: var(--colors-primary);
    color: var(--colors-text);
  }

  .tag-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
  }

  .tag-card {
    min-width: 0;
    display: grid;
    gap: 8px;
    border: 1px solid var(--colors-border);
    border-radius: 8px;
    background-color: var(--colors-surface);
    padding: 10px;
  }

  .add-tag-card {
    min-height: 112px;
    place-items: center;
    align-content: center;
    color: var(--colors-textMuted);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    border-style: dashed;
  }

  .add-tag-card:hover {
    color: var(--colors-text);
    border-color: var(--colors-primary);
    background-color: var(--colors-hover);
  }

  .tag-card-header,
  .tag-name {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tag-card-header {
    justify-content: space-between;
  }

  .tag-name span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--colors-primary);
    font-weight: 700;
  }

  .tag-card p {
    min-height: 18px;
    margin: 0;
    color: var(--colors-text);
    font-size: 13px;
  }

  .tag-card small {
    color: var(--colors-textMuted);
    font-size: 11px;
  }

  .tag-color {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .tag-color-swatch {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    border: 1px solid var(--colors-border);
  }

  .tag-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .tag-edit-btn {
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

  .tag-edit-btn:hover {
    background-color: var(--colors-hover);
    color: var(--colors-text);
  }

  .brainstorm-empty,
  .brainstorm-error {
    color: var(--colors-textMuted);
    padding: 12px;
    font-size: 13px;
  }

  .brainstorm-empty.large {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 160px;
    border: 1px solid var(--colors-border);
    border-radius: 8px;
    background-color: var(--colors-surface);
  }

  .brainstorm-error {
    color: var(--colors-error);
    border-bottom: 1px solid var(--colors-border);
  }

  .custom-dropdown-wrap {
    position: relative;
    min-width: 170px;
  }

  .custom-dropdown-trigger {
    width: 100%;
    min-height: 34px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 12px;
    border: 1px solid var(--colors-border);
    border-radius: 6px;
    background-color: var(--colors-surface);
    color: var(--colors-text);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .custom-dropdown-trigger:hover,
  .custom-dropdown-trigger.is-open {
    background-color: var(--colors-hover);
    border-color: var(--colors-primary);
  }

  .dropdown-value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.dropdown-arrow) {
    color: var(--colors-textMuted);
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }

  .custom-dropdown-trigger.is-open :global(.dropdown-arrow) {
    transform: rotate(180deg);
  }

  .custom-dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 240px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
    border: 1px solid var(--colors-border);
    border-radius: 8px;
    background-color: var(--colors-surface);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  }

  .custom-dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--colors-text);
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .custom-dropdown-item:hover {
    background-color: var(--colors-hover);
  }

  .custom-dropdown-item.is-selected {
    background-color: color-mix(in srgb, var(--colors-primary) 14%, transparent);
  }

  .dropdown-item-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .dropdown-item-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--colors-text);
  }

  .dropdown-item-desc {
    font-size: 11px;
    color: var(--colors-textMuted);
  }

  :global(.dropdown-check) {
    color: var(--colors-primary);
    flex-shrink: 0;
  }
</style>
