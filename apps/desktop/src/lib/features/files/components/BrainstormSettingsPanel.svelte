<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { Braces, Edit2, FileJson, PanelLeft, PanelRight, Plus, RefreshCw, Settings, Tag, X } from 'lucide-svelte';
  import {
    clampExplorerSidebarWidth,
    ensureExplorerConfigPath,
    maxExplorerSidebarWidth,
    minExplorerSidebarWidth,
    normalizeExplorerConfig,
    readExplorerConfig,
    writeExplorerConfig,
    type ExplorerConfig,
    type ExplorerPosition
  } from '../explorer-config';
  import { fileTreeState, type FileEntry } from '../state';
  import {
    ensurePropertyConfigPath,
    normalizeTagColor,
    normalizeTagName,
    readPropertyConfig,
    saveSharedTags,
    type SharedTag
  } from '../../markdown/tag-registry';
  import { todayString } from '../../markdown/frontmatter';
  import { shellState } from '../../shell/state';
  import { ensureGraphConfigPath } from '../../graph/graph-config';
  import JsonInspector from './JsonInspector.svelte';

  export let onClose: () => void;
  export let onConfigChange: () => void = () => {};

  interface BrainstormFile {
    name: string;
    path: string;
  }

  const propertyConfigFileName = 'property-config.json';
  const legacyPropertiesSchemaFileName = 'properties-schema.json';
  const explorerConfigFileName = 'explorer-config.json';
  const explorerStateFileName = 'explorer-state.json';
  const graphConfigFileName = 'graph-config.json';
  const legacyGraphStateFileName = 'graph-state.json';

  let files: BrainstormFile[] = [];
  let selectedPath = '';
  let selectedName = '';
  let rawContent = '';
  let parseError = '';
  let showJson = false;
  let isLoading = false;
  let showTagForm = false;
  let editingTagName: string | null = null;
  let tagForm = createEmptyTagForm();
  let jsonSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  let jsonEditorError = '';

  $: propertyConfig = parsePropertyConfig(rawContent);
  $: explorerConfig = parseExplorerConfig(rawContent);
  $: tags = normalizeTags(propertyConfig?.tags);

  function projectRootPath() {
    return $fileTreeState.rootPath ?? $shellState.currentProject?.path ?? null;
  }

  function brainstormPath() {
    const rootPath = projectRootPath();
    return rootPath ? `${rootPath}/.brainstorm` : null;
  }

  async function loadFiles() {
    isLoading = true;
    parseError = '';

    const rootPath = projectRootPath();
    const explorerConfigPath = await ensureExplorerConfigPath(rootPath);
    const schemaPath = await ensurePropertyConfigPath(rootPath);
    const graphConfigPath = await ensureGraphConfigPath(rootPath);
    const folderPath = brainstormPath();
    if (!folderPath || !schemaPath || !explorerConfigPath || !graphConfigPath) {
      isLoading = false;
      return;
    }

    try {
      await migrateLegacyBrainstormFiles(folderPath);
      const entries = await invoke<FileEntry[]>('read_dir_entries', { path: folderPath });
      files = entries
        .filter((entry) =>
          !entry.is_dir
          && entry.name !== 'config.json'
          && entry.name !== explorerStateFileName
          && entry.name !== legacyPropertiesSchemaFileName
          && entry.name !== legacyGraphStateFileName
        )
        .map((entry) => ({ name: entry.name, path: entry.path }))
        .sort((left, right) => left.name.localeCompare(right.name));

      if (!files.some((file) => file.name === explorerConfigFileName)) {
        files = [...files, { name: explorerConfigFileName, path: explorerConfigPath }]
          .sort((left, right) => left.name.localeCompare(right.name));
      }

      if (!files.some((file) => file.name === propertyConfigFileName)) {
        files = [...files, { name: propertyConfigFileName, path: schemaPath }]
          .sort((left, right) => left.name.localeCompare(right.name));
      }

      if (!files.some((file) => file.name === graphConfigFileName)) {
        files = [...files, { name: graphConfigFileName, path: graphConfigPath }]
          .sort((left, right) => left.name.localeCompare(right.name));
      }

      if (files.length === 0) {
        files = [{ name: explorerConfigFileName, path: explorerConfigPath }];
      }

      const nextSelection = files.find((file) => file.path === selectedPath)
        ?? files.find((file) => file.name === explorerConfigFileName)
        ?? files.find((file) => file.name === propertyConfigFileName)
        ?? files[0];
      await selectFile(nextSelection);
    } catch (error) {
      parseError = error instanceof Error ? error.message : 'Failed to load .brainstorm files.';
    } finally {
      isLoading = false;
    }
  }

  async function migrateLegacyBrainstormFiles(folderPath: string) {
    const explorerStatePath = `${folderPath}/${explorerStateFileName}`;
    const legacyGraphStatePath = `${folderPath}/${legacyGraphStateFileName}`;
    const graphConfigPath = `${folderPath}/${graphConfigFileName}`;

    try {
      const legacyGraphStateExists = await invoke<boolean>('path_exists', { path: legacyGraphStatePath });
      if (legacyGraphStateExists) {
        const graphConfigExists = await invoke<boolean>('path_exists', { path: graphConfigPath });
        if (graphConfigExists) {
          await invoke('delete_path', { path: legacyGraphStatePath, useTrash: false });
        } else {
          await invoke('rename_path', { oldPath: legacyGraphStatePath, newPath: graphConfigPath });
        }
      }

      const explorerStateExists = await invoke<boolean>('path_exists', { path: explorerStatePath });
      if (explorerStateExists) {
        await invoke('delete_path', { path: explorerStatePath, useTrash: false });
      }
    } catch (error) {
      console.error('Failed to migrate .brainstorm files', error);
    }
  }

  async function selectFile(file: BrainstormFile) {
    flushJsonSave();
    selectedPath = file.path;
    selectedName = file.name;
    parseError = '';
    jsonEditorError = '';
    const rootPath = projectRootPath();

    try {
      if (file.name === explorerConfigFileName) {
        rawContent = `${JSON.stringify(await readExplorerConfig(rootPath), null, 2)}\n`;
      } else if (file.name === propertyConfigFileName) {
        rawContent = `${JSON.stringify(await readPropertyConfig(rootPath), null, 2)}\n`;
      } else {
        rawContent = await invoke<string>('read_file', { path: file.path });
      }
    } catch (error) {
      rawContent = '';
      parseError = error instanceof Error ? error.message : `Failed to read ${file.name}.`;
      jsonEditorError = parseError;
    }
  }

  function parsePropertyConfig(content: string) {
    if (selectedName !== propertyConfigFileName) return null;
    try {
      const parsed = JSON.parse(content || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as { tags?: SharedTag[] }
        : null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON.';
      if (showJson) {
        jsonEditorError = message;
      } else {
        parseError = message;
      }
      return null;
    }
  }

  function parseExplorerConfig(content: string): ExplorerConfig {
    if (selectedName !== explorerConfigFileName) return normalizeExplorerConfig({});
    try {
      return normalizeExplorerConfig(JSON.parse(content || '{}'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON.';
      if (showJson) {
        jsonEditorError = message;
      } else {
        parseError = message;
      }
      return normalizeExplorerConfig({});
    }
  }

  function normalizeTags(value: unknown): SharedTag[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((tag): tag is SharedTag => tag && typeof tag === 'object' && 'name' in tag)
      .map((tag) => ({
        name: `${tag.name ?? ''}`,
        color: normalizeTagColor(tag.color),
        description: `${tag.description ?? ''}`,
        created: `${tag.created ?? ''}`
      }));
  }

  function createEmptyTagForm() {
    return {
      name: '',
      color: getDefaultTagColor(),
      description: ''
    };
  }

  function startCreateTag() {
    showTagForm = true;
    editingTagName = null;
    tagForm = createEmptyTagForm();
  }

  function startEditTag(tag: SharedTag) {
    showTagForm = true;
    editingTagName = tag.name;
    tagForm = {
      name: tag.name,
      color: normalizeTagColor(tag.color),
      description: tag.description || ''
    };
  }

  function cancelTagEdit() {
    showTagForm = false;
    editingTagName = null;
    tagForm = createEmptyTagForm();
  }

  async function saveTag() {
    const name = normalizeTagName(tagForm.name);
    if (!name) {
      parseError = 'Tag name is required.';
      return;
    }

    const normalizedEditingName = editingTagName?.toLocaleLowerCase();
    const duplicate = tags.some((tag) => (
      tag.name.toLocaleLowerCase() === name.toLocaleLowerCase()
      && tag.name.toLocaleLowerCase() !== normalizedEditingName
    ));
    if (duplicate) {
      parseError = `${name} already exists.`;
      return;
    }

    const existing = tags.find((tag) => tag.name.toLocaleLowerCase() === normalizedEditingName);
    const nextTag: SharedTag = {
      name,
      color: normalizeTagColor(tagForm.color),
      description: tagForm.description.trim(),
      created: existing?.created || todayString()
    };

    const nextTags = editingTagName
      ? tags.map((tag) => tag.name === editingTagName ? nextTag : tag)
      : [...tags, nextTag];

    await saveSharedTags(nextTags, projectRootPath());
    await selectFile({ name: propertyConfigFileName, path: selectedPath });
    cancelTagEdit();
    parseError = '';
  }

  async function saveExplorerPosition(position: ExplorerPosition) {
    const nextConfig = await writeExplorerConfig({ ...explorerConfig, position }, projectRootPath());
    rawContent = `${JSON.stringify(nextConfig, null, 2)}\n`;
    parseError = '';
    onConfigChange();
  }

  async function saveExplorerSidebarWidth(width: number) {
    const nextConfig = await writeExplorerConfig({
      ...explorerConfig,
      sidebarWidth: clampExplorerSidebarWidth(width)
    }, projectRootPath());
    rawContent = `${JSON.stringify(nextConfig, null, 2)}\n`;
    parseError = '';
    onConfigChange();
  }

  function handleJsonChange(content: string) {
    rawContent = content;
    parseError = '';

    const validationError = validateJson(content);
    if (validationError) {
      jsonEditorError = validationError;
      if (jsonSaveTimeout) {
        clearTimeout(jsonSaveTimeout);
        jsonSaveTimeout = null;
      }
      return;
    }

    jsonEditorError = '';
    if (jsonSaveTimeout) clearTimeout(jsonSaveTimeout);
    jsonSaveTimeout = setTimeout(() => {
      jsonSaveTimeout = null;
      void saveRawJsonContent();
    }, 400);
  }

  async function saveRawJsonContent() {
    if (!selectedPath) return;

    try {
      await invoke('write_file', { path: selectedPath, content: rawContent });
      jsonEditorError = '';
      if (selectedName === explorerConfigFileName) {
        onConfigChange();
      }
    } catch (error) {
      jsonEditorError = error instanceof Error ? error.message : `Failed to save ${selectedName}.`;
    }
  }

  function flushJsonSave() {
    if (!jsonSaveTimeout) return;
    clearTimeout(jsonSaveTimeout);
    jsonSaveTimeout = null;
    void saveRawJsonContent();
  }

  function validateJson(content: string) {
    try {
      JSON.parse(content || '{}');
      return '';
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid JSON.';
    }
  }

  function getDefaultTagColor() {
    if (typeof document === 'undefined') return '#007ACC';
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--colors-primary').trim();
    return normalizeTagColor(primary || '#007ACC');
  }

  onMount(() => {
    void loadFiles();
  });

  onDestroy(() => {
    flushJsonSave();
  });
</script>

<div class="brainstorm-settings">
  <aside class="brainstorm-settings-sidebar">
    <div class="brainstorm-settings-sidebar-header">
      <span>.brainstorm</span>
      <button class="icon-btn" title="Refresh" onclick={() => loadFiles()}>
        <RefreshCw size={14} />
      </button>
    </div>

    <div class="brainstorm-file-list">
      {#if isLoading}
        <div class="brainstorm-empty">Loading...</div>
      {:else}
        {#each files as file (file.path)}
          <button
            class="brainstorm-file-item"
            class:is-selected={file.path === selectedPath}
            onclick={() => selectFile(file)}
          >
            <FileJson size={15} />
            <span>{file.name}</span>
          </button>
        {/each}
      {/if}
    </div>
  </aside>

  <section class="brainstorm-settings-main" aria-label="Brainstorm settings">
    <header class="brainstorm-settings-header">
      <div class="brainstorm-settings-title">
        <Settings size={16} />
        <span>{selectedName || 'Settings'}</span>
      </div>
      <div class="brainstorm-settings-actions">
        <button class="toolbar-btn" class:is-active={showJson} onclick={() => showJson = !showJson}>
          <Braces size={14} />
          <span>{showJson ? 'Show UI' : 'Inspect JSON'}</span>
        </button>
        <button class="icon-btn" title="Close settings" onclick={onClose}>
          <X size={15} />
        </button>
      </div>
    </header>

    {#if parseError && !showJson}
      <div class="brainstorm-error">{parseError}</div>
    {/if}

    {#if showJson}
      <JsonInspector content={rawContent} error={jsonEditorError} onChange={handleJsonChange} />
    {:else if selectedName === explorerConfigFileName}
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
                class:is-selected={explorerConfig.position === 'left'}
                onclick={() => saveExplorerPosition('left')}
              >
                <PanelLeft size={14} />
                <span>Left</span>
              </button>
              <button
                class:is-selected={explorerConfig.position === 'right'}
                onclick={() => saveExplorerPosition('right')}
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
                min={minExplorerSidebarWidth}
                max={maxExplorerSidebarWidth}
                value={explorerConfig.sidebarWidth}
                oninput={(event) => saveExplorerSidebarWidth(Number(event.currentTarget.value))}
              />
              <label>
                <input
                  class="width-input"
                  type="number"
                  min={minExplorerSidebarWidth}
                  max={maxExplorerSidebarWidth}
                  value={explorerConfig.sidebarWidth}
                  onchange={(event) => saveExplorerSidebarWidth(Number(event.currentTarget.value))}
                />
                <span>px</span>
              </label>
            </div>
          </div>
        </section>
      </div>
    {:else if selectedName === propertyConfigFileName}
      <div class="config-overview">
        <section class="config-section">
          <div class="config-section-header">
            <div>
              <h2>Tags</h2>
              <p>Shared tags available across markdown files.</p>
            </div>
            <div class="section-actions">
              <span class="count-pill">{tags.length}</span>
            </div>
          </div>

          {#if showTagForm}
            <div class="tag-editor">
              <div class="field-row">
                <label>
                  <span>Name</span>
                  <input class="settings-input" placeholder="#tag" bind:value={tagForm.name} />
                </label>
                <label>
                  <span>Color</span>
                  <div class="color-picker-field">
                    <input class="tag-color-picker" type="color" bind:value={tagForm.color} />
                    <span>{tagForm.color}</span>
                  </div>
                </label>
              </div>
              <label>
                <span>Description</span>
                <textarea class="settings-input settings-textarea" rows="2" bind:value={tagForm.description}></textarea>
              </label>
              <div class="form-actions">
                <button class="toolbar-btn primary" onclick={saveTag}>
                  <span>{editingTagName ? 'Save Tag' : 'Create Tag'}</span>
                </button>
                <button class="toolbar-btn" onclick={cancelTagEdit}>
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          {/if}

          {#if tags.length === 0 && !showTagForm}
            <div class="brainstorm-empty large">No shared tags yet.</div>
          {/if}

          <div class="tag-grid">
            {#if tags.length > 0}
              {#each tags as tag (tag.name)}
                <article class="tag-card">
                  <div class="tag-card-header">
                    <div class="tag-name">
                      <Tag size={14} />
                      <span style="color: {normalizeTagColor(tag.color)}">{tag.name}</span>
                    </div>
                    <span class="tag-color">
                      <span class="tag-color-swatch" style="background-color: {normalizeTagColor(tag.color)}"></span>
                      {normalizeTagColor(tag.color)}
                    </span>
                  </div>
                  <p>{tag.description || 'No description'}</p>
                  <div class="tag-card-footer">
                    <small>Created {tag.created || 'unknown'}</small>
                    <button class="tag-edit-btn" title="Edit tag" onclick={() => startEditTag(tag)}>
                      <Edit2 size={13} />
                    </button>
                  </div>
                </article>
              {/each}
            {/if}

            {#if !showTagForm}
              <button class="tag-card add-tag-card" onclick={startCreateTag}>
                <Plus size={20} />
                <span>Add Tag</span>
              </button>
            {/if}
          </div>
        </section>
      </div>
    {:else}
      <div class="brainstorm-empty large">No structured view for this file. Use Inspect JSON.</div>
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

  .brainstorm-settings-sidebar {
    min-width: 0;
    border-right: 1px solid var(--colors-border);
    background-color: var(--colors-surface);
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
    gap: 2px;
    padding: 6px;
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
  }

  .brainstorm-file-item:hover,
  .brainstorm-file-item.is-selected,
  .toolbar-btn:hover,
  .toolbar-btn.is-active,
  .icon-btn:hover {
    background-color: var(--colors-hover);
    color: var(--colors-text);
  }

  .brainstorm-settings-main {
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
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
</style>
