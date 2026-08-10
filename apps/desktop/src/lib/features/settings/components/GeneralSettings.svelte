<script lang="ts">
  import { settingsController } from '../controller';
  import { Copy, Folder, Brain, Code, Rocket, Sparkles, Box, ChevronDown, Check, AlertTriangle } from 'lucide-svelte';

  const iconComponents = [
    { id: 'folder', icon: Folder, label: 'Folder' },
    { id: 'brain', icon: Brain, label: 'Brain' },
    { id: 'code', icon: Code, label: 'Code' },
    { id: 'rocket', icon: Rocket, label: 'Rocket' },
    { id: 'sparkles', icon: Sparkles, label: 'Sparkles' },
    { id: 'box', icon: Box, label: 'Box' }
  ];

  let copiedId = false;
  let copiedPath = false;

  $: project = $settingsController.project;
  $: form = $settingsController.general;
  $: selectedOpt = iconComponents.find((option) => option.id === form.icon) || iconComponents[0];

  function copyId() {
    if (!project?.id) return;
    void settingsController.copyToClipboard(project.id);
    copiedId = true;
    setTimeout(() => { copiedId = false; }, 2000);
  }

  function copyPath() {
    if (!project?.path) return;
    void settingsController.copyToClipboard(project.path);
    copiedPath = true;
    setTimeout(() => { copiedPath = false; }, 2000);
  }
</script>

<div class="settings-page">
  <div class="settings-page-header">
    <h1>General Settings</h1>
    <p>Project configuration, workspace identity, paths, and lifecycle.</p>
  </div>

  <div class="settings-section-heading">Project Information</div>

  <div class="settings-card">
    <!-- Project Name -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="project-name">Project Name</label>
        <p>Title displayed across workspace dashboards.</p>
      </div>
      <div class="settings-card-input">
        <input
          id="project-name"
          type="text"
          class="input-field"
          style="width: 280px;"
          value={form.name}
          disabled={form.isSaving}
          oninput={(event) => settingsController.updateGeneralForm({ name: event.currentTarget.value })}
        />
      </div>
    </div>
    
    <!-- Description -->
    <div class="settings-card-row" style="align-items: flex-start;">
      <div class="settings-card-label" style="padding-top: 4px;">
        <label for="project-description">Description</label>
        <p>Summary of project scope and features.</p>
      </div>
      <div class="settings-card-input">
        <textarea
          id="project-description"
          class="input-field"
          rows="2"
          style="width: 280px; resize: vertical; min-height: 52px;"
          value={form.description}
          disabled={form.isSaving}
          oninput={(event) => settingsController.updateGeneralForm({ description: event.currentTarget.value })}
        ></textarea>
      </div>
    </div>
    
    <!-- Theme & Icon -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="project-color">Workspace Identity</label>
        <p>Accent color and icon badge for navigation.</p>
      </div>
      <div class="settings-card-input">
        <div style="display: flex; gap: 8px; align-items: center;">
          <input
            id="project-color"
            type="color"
            class="input-field"
            style="width: 38px; height: 32px; padding: 2px; cursor: pointer; border-radius: 8px;"
            value={form.color}
            disabled={form.isSaving}
            oninput={(event) => settingsController.updateGeneralForm({ color: event.currentTarget.value })}
          />
          
          <div style="position: relative;">
            <button 
              type="button" 
              class="input-field" 
              style="display: flex; align-items: center; gap: 6px; padding: 5px 10px; cursor: pointer;"
              onclick={settingsController.toggleIconDropdown}
              disabled={form.isSaving}
            >
              <svelte:component this={selectedOpt.icon} size={16} color={form.color} />
              <span style="font-size: 12px; text-transform: capitalize; color: var(--colors-text);">{selectedOpt.label}</span>
              <ChevronDown size={12} style="color: var(--colors-textMuted);" />
            </button>

            {#if form.showIconDropdown}
              <div style="position: absolute; top: calc(100% + 4px); right: 0; background: var(--colors-surfaceVariant, #2C2C2E); border: 1px solid var(--colors-border); border-radius: 10px; padding: 6px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
                {#each iconComponents as opt}
                  <button 
                    type="button" 
                    style="background: {form.icon === opt.id ? 'color-mix(in srgb, var(--colors-primary) 25%, transparent)' : 'transparent'}; border: none; padding: 8px; cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center;"
                    onclick={() => settingsController.selectIcon(opt.id)}
                  >
                    <svelte:component this={opt.icon} size={18} color={form.icon === opt.id ? form.color : 'var(--colors-textMuted)'} />
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Project ID -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="project-id">Project Identifier</label>
        <p>Internal storage reference key.</p>
      </div>
      <div class="settings-card-input">
        <div class="input-with-copy">
          <input id="project-id" type="text" class="input-field" readonly value={project?.id || ''} style="color: var(--colors-textMuted); font-family: monospace; font-size: 12px;" />
          <button type="button" class="copy-btn" onclick={copyId}>
            {#if copiedId}
              <Check size={12} style="color: var(--colors-primary, #0A84FF);" /> Copied
            {:else}
              <Copy size={12} /> Copy
            {/if}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Project Folder -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="project-path">Project Directory</label>
        <p>Local disk path of project workspace.</p>
      </div>
      <div class="settings-card-input">
        <div class="input-with-copy">
          <input id="project-path" type="text" class="input-field" readonly value={project?.path || ''} style="color: var(--colors-textMuted); font-family: monospace; font-size: 11.5px;" />
          <button type="button" class="copy-btn" onclick={copyPath}>
            {#if copiedPath}
              <Check size={12} style="color: var(--colors-primary, #0A84FF);" /> Copied
            {:else}
              <Copy size={12} /> Copy
            {/if}
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="settings-card-footer">
      <button class="btn-success" onclick={settingsController.saveGeneralSettings} disabled={form.isSaving}>
        {form.isSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  </div>

  <div class="settings-section-heading" style="color: var(--colors-error, #FF453A);">Danger Zone</div>

  <div class="settings-card" style="border-color: rgba(255, 69, 58, 0.3);">
    <div class="settings-card-row" style="align-items: flex-start;">
      <div class="settings-card-label">
        <div class="danger-label" style="display: flex; align-items: center; gap: 6px;">
          <AlertTriangle size={15} />
          Delete Project
        </div>
        <p>Permanently remove this project and disk index. This operation cannot be undone.</p>
      </div>
      <div class="settings-card-input" style="flex-direction: column; align-items: flex-end; gap: 12px;">
        {#if !form.showDeleteConfirm}
          <button type="button" class="btn-danger" onclick={settingsController.openDeleteConfirm}>
            Delete Project...
          </button>
        {:else}
          <div style="width: 280px; display: flex; flex-direction: column; gap: 8px;">
            <p style="font-size: 12px; color: var(--colors-text); margin: 0;">Type <strong>{project?.name}</strong> to confirm deletion:</p>
            <input
              type="text"
              class="input-field"
              value={form.deleteConfirmName}
              placeholder={project?.name}
              disabled={form.isSaving}
              oninput={(event) => settingsController.updateGeneralForm({ deleteConfirmName: event.currentTarget.value })}
            />
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
              <button 
                type="button" 
                class="segmented-btn" 
                style="border: 1px solid var(--colors-border); padding: 4px 10px;" 
                onclick={settingsController.cancelDeleteConfirm}
              >
                Cancel
              </button>
              <button 
                type="button"
                class="btn-danger" 
                style="opacity: {settingsController.canDeleteProject($settingsController) ? '1' : '0.5'}; cursor: {settingsController.canDeleteProject($settingsController) ? 'pointer' : 'not-allowed'}; padding: 4px 10px; font-size: 12px;" 
                disabled={!settingsController.canDeleteProject($settingsController) || form.isSaving}
                onclick={settingsController.deleteProject}
              >
                Delete
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if form.error}
    <p class="settings-error">{form.error}</p>
  {/if}
</div>
