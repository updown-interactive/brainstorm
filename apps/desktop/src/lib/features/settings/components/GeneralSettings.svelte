<script lang="ts">
  import { settingsController } from '../controller';
  import { Copy, Folder, Brain, Code, Rocket, Sparkles, Box, ChevronDown } from 'lucide-svelte';

  const iconComponents = [
    { id: 'folder', icon: Folder, label: 'Folder' },
    { id: 'brain', icon: Brain, label: 'Brain' },
    { id: 'code', icon: Code, label: 'Code' },
    { id: 'rocket', icon: Rocket, label: 'Rocket' },
    { id: 'sparkles', icon: Sparkles, label: 'Sparkles' },
    { id: 'box', icon: Box, label: 'Box' }
  ];

  $: project = $settingsController.project;
  $: form = $settingsController.general;
  $: selectedOpt = iconComponents.find((option) => option.id === form.icon) || iconComponents[0];
</script>

<div class="settings-page">
  <div class="settings-page-header">
    <h1>Project Settings</h1>
    <p>General configuration, domains, ownership, and lifecycle</p>
  </div>

  <h2 class="settings-section-heading">General settings</h2>

  <div class="settings-card">
    
    <!-- Project Name -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="project-name">Project name</label>
        <p>Displayed throughout the dashboard.</p>
      </div>
      <div class="settings-card-input">
        <input
          id="project-name"
          type="text"
          class="input-field"
          value={form.name}
          disabled={form.isSaving}
          oninput={(event) => settingsController.updateGeneralForm({ name: event.currentTarget.value })}
        />
      </div>
    </div>
    
    <!-- Description -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="project-description">Description</label>
        <p>Briefly describe what this project is about.</p>
      </div>
      <div class="settings-card-input">
        <textarea
          id="project-description"
          class="input-field"
          rows="3"
          value={form.description}
          disabled={form.isSaving}
          oninput={(event) => settingsController.updateGeneralForm({ description: event.currentTarget.value })}
        ></textarea>
      </div>
    </div>
    
    <!-- Theme & Icon -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="project-color">Theme & Icon</label>
        <p>Customize your project's workspace identity.</p>
      </div>
      <div class="settings-card-input">
        <div style="display: flex; gap: 12px; align-items: center;">
          <input
            id="project-color"
            type="color"
            class="input-field"
            style="width: 60px; padding: 0; cursor: pointer; height: 36px;"
            value={form.color}
            disabled={form.isSaving}
            oninput={(event) => settingsController.updateGeneralForm({ color: event.currentTarget.value })}
          />
          
          <div style="position: relative;">
            <button 
              type="button" 
              class="input-field" 
              style="display: flex; align-items: center; gap: 8px; width: auto; cursor: pointer;"
              onclick={settingsController.toggleIconDropdown}
              disabled={form.isSaving}
            >
              <svelte:component this={selectedOpt.icon} size={18} color={form.color} />
              <ChevronDown size={14} />
            </button>

            {#if form.showIconDropdown}
              <div style="position: absolute; top: calc(100% + 4px); left: 0; background: var(--colors-surfaceVariant); border: 1px solid var(--colors-border); border-radius: 8px; padding: 4px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; z-index: 10;">
                {#each iconComponents as opt}
                  <button 
                    type="button" 
                    style="background: transparent; border: none; padding: 8px; cursor: pointer; border-radius: 4px;"
                    onclick={() => settingsController.selectIcon(opt.id)}
                  >
                    <svelte:component this={opt.icon} size={20} color={form.icon === opt.id ? form.color : 'var(--colors-textMuted)'} />
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Project ID (Readonly + Copy) -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="project-id">Project ID</label>
        <p>Reference used in APIs and URLs.</p>
      </div>
      <div class="settings-card-input">
        <div class="input-with-copy">
          <input id="project-id" type="text" class="input-field" readonly value={project?.id || ''} style="color: var(--colors-textMuted);" />
          <button class="copy-btn" onclick={() => settingsController.copyToClipboard(project?.id || '')}>
            <Copy size={12} /> Copy
          </button>
        </div>
      </div>
    </div>
    
    <!-- Project Folder (Readonly + Copy) -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="project-path">Project folder</label>
        <p>The local directory where your project files and database live.</p>
      </div>
      <div class="settings-card-input">
        <div class="input-with-copy">
          <input id="project-path" type="text" class="input-field" readonly value={project?.path || ''} style="color: var(--colors-textMuted);" />
          <button class="copy-btn" onclick={() => settingsController.copyToClipboard(project?.path || '')}>
            <Copy size={12} /> Copy
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="settings-card-footer">
      <button class="btn-success" onclick={settingsController.saveGeneralSettings} disabled={form.isSaving}>
        {form.isSaving ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  </div>

  <h2 class="settings-section-heading" style="margin-top: 48px; color: var(--colors-error);">Danger Zone</h2>

  <div class="settings-card" style="border-color: rgba(255, 69, 58, 0.3);">
    <div class="settings-card-row">
      <div class="settings-card-label">
        <div class="danger-label">Delete Project</div>
        <p>Permanently delete this project and all of its data. This action cannot be undone.</p>
      </div>
      <div class="settings-card-input" style="flex-direction: column; align-items: flex-end; gap: 16px;">
        {#if !form.showDeleteConfirm}
          <button class="btn" style="background-color: var(--colors-error); color: white; border: none;" onclick={settingsController.openDeleteConfirm}>
            Delete Project
          </button>
        {:else}
          <div style="width: 100%; display: flex; flex-direction: column; gap: 8px;">
            <p style="font-size: 13px; color: var(--colors-text);">Please type <strong>{project?.name}</strong> to confirm.</p>
            <input
              type="text"
              class="input-field"
              value={form.deleteConfirmName}
              placeholder={project?.name}
              disabled={form.isSaving}
              oninput={(event) => settingsController.updateGeneralForm({ deleteConfirmName: event.currentTarget.value })}
            />
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
              <button class="btn" style="background-color: transparent; border: 1px solid var(--colors-border);" onclick={settingsController.cancelDeleteConfirm}>
                Cancel
              </button>
              <button 
                class="btn" 
                style="background-color: var(--colors-error); color: white; border: none; opacity: {settingsController.canDeleteProject($settingsController) ? '1' : '0.5'}; cursor: {settingsController.canDeleteProject($settingsController) ? 'pointer' : 'not-allowed'};" 
                disabled={!settingsController.canDeleteProject($settingsController) || form.isSaving}
                onclick={settingsController.deleteProject}
              >
                I understand, delete this project
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
