<script lang="ts">
  import { shellState } from '../shell/state';
  import { settingsController } from './controller';
  import { Copy, Folder, Brain, Code, Rocket, Sparkles, Box, ChevronDown } from 'lucide-svelte';
  
  let project = $shellState.currentProject;
  
  // Local state for editing
  let name = project?.name || '';
  let description = project?.description || '';
  
  // Delete confirmation state
  let showDeleteConfirm = false;
  let deleteConfirmName = '';
  
  function getProjectColorHex(colorInt: number | null | undefined) {
    if (colorInt == null) return '#007ACC';
    return '#' + colorInt.toString(16).padStart(6, '0');
  }
  
  function hexToInt(hexStr: string): number {
    return parseInt(hexStr.replace(/^#/, ''), 16);
  }
  
  let color = getProjectColorHex(project?.color);
  let icon = project?.icon || 'folder';
  
  // Icon options
  const iconOptions = [
    { id: 'folder', icon: Folder, label: 'Folder' },
    { id: 'brain', icon: Brain, label: 'Brain' },
    { id: 'code', icon: Code, label: 'Code' },
    { id: 'rocket', icon: Rocket, label: 'Rocket' },
    { id: 'sparkles', icon: Sparkles, label: 'Sparkles' },
    { id: 'box', icon: Box, label: 'Box' }
  ];
  let showIconDropdown = false;
  $: selectedOpt = iconOptions.find(i => i.id === icon) || iconOptions[0];
  
  function saveChanges() {
    if (!project) return;
    settingsController.saveGeneralSettings({
      id: project.id,
      name,
      description: description.trim() || null,
      icon,
      color: hexToInt(color)
    });
  }
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
        <label>Project name</label>
        <p>Displayed throughout the dashboard.</p>
      </div>
      <div class="settings-card-input">
        <input type="text" class="input-field" bind:value={name} />
      </div>
    </div>
    
    <!-- Description -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label>Description</label>
        <p>Briefly describe what this project is about.</p>
      </div>
      <div class="settings-card-input">
        <textarea class="input-field" rows="3" bind:value={description}></textarea>
      </div>
    </div>
    
    <!-- Theme & Icon -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label>Theme & Icon</label>
        <p>Customize your project's workspace identity.</p>
      </div>
      <div class="settings-card-input">
        <div style="display: flex; gap: 12px; align-items: center;">
          <input type="color" class="input-field" style="width: 60px; padding: 0; cursor: pointer; height: 36px;" bind:value={color} />
          
          <div style="position: relative;">
            <button 
              type="button" 
              class="input-field" 
              style="display: flex; align-items: center; gap: 8px; width: auto; cursor: pointer;"
              onclick={() => showIconDropdown = !showIconDropdown}
            >
              <svelte:component this={selectedOpt.icon} size={18} color={color} />
              <ChevronDown size={14} />
            </button>

            {#if showIconDropdown}
              <div style="position: absolute; top: calc(100% + 4px); left: 0; background: var(--colors-surfaceVariant); border: 1px solid var(--colors-border); border-radius: 8px; padding: 4px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; z-index: 10;">
                {#each iconOptions as opt}
                  <button 
                    type="button" 
                    style="background: transparent; border: none; padding: 8px; cursor: pointer; border-radius: 4px;"
                    onclick={() => { icon = opt.id; showIconDropdown = false; }}
                  >
                    <svelte:component this={opt.icon} size={20} color={icon === opt.id ? color : 'var(--colors-textMuted)'} />
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
        <label>Project ID</label>
        <p>Reference used in APIs and URLs.</p>
      </div>
      <div class="settings-card-input">
        <div class="input-with-copy">
          <input type="text" class="input-field" readonly value={project?.id || ''} style="color: var(--colors-textMuted);" />
          <button class="copy-btn" onclick={() => settingsController.copyToClipboard(project?.id || '')}>
            <Copy size={12} /> Copy
          </button>
        </div>
      </div>
    </div>
    
    <!-- Project Folder (Readonly + Copy) -->
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label>Project folder</label>
        <p>The local directory where your project files and database live.</p>
      </div>
      <div class="settings-card-input">
        <div class="input-with-copy">
          <input type="text" class="input-field" readonly value={project?.path || ''} style="color: var(--colors-textMuted);" />
          <button class="copy-btn" onclick={() => settingsController.copyToClipboard(project?.path || '')}>
            <Copy size={12} /> Copy
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="settings-card-footer">
      <button class="btn-success" onclick={saveChanges}>Save changes</button>
    </div>
  </div>

  <h2 class="settings-section-heading" style="margin-top: 48px; color: var(--colors-error);">Danger Zone</h2>

  <div class="settings-card" style="border-color: rgba(255, 69, 58, 0.3);">
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label style="color: var(--colors-error);">Delete Project</label>
        <p>Permanently delete this project and all of its data. This action cannot be undone.</p>
      </div>
      <div class="settings-card-input" style="flex-direction: column; align-items: flex-end; gap: 16px;">
        {#if !showDeleteConfirm}
          <button class="btn" style="background-color: var(--colors-error); color: white; border: none;" onclick={() => showDeleteConfirm = true}>
            Delete Project
          </button>
        {:else}
          <div style="width: 100%; display: flex; flex-direction: column; gap: 8px;">
            <p style="font-size: 13px; color: var(--colors-text);">Please type <strong>{project?.name}</strong> to confirm.</p>
            <input type="text" class="input-field" bind:value={deleteConfirmName} placeholder={project?.name} />
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
              <button class="btn" style="background-color: transparent; border: 1px solid var(--colors-border);" onclick={() => { showDeleteConfirm = false; deleteConfirmName = ''; }}>
                Cancel
              </button>
              <button 
                class="btn" 
                style="background-color: var(--colors-error); color: white; border: none; opacity: {deleteConfirmName === project?.name ? '1' : '0.5'}; cursor: {deleteConfirmName === project?.name ? 'pointer' : 'not-allowed'};" 
                disabled={deleteConfirmName !== project?.name}
                onclick={() => {
                  if (project) {
                    settingsController.deleteProject(project.id);
                  }
                }}
              >
                I understand, delete this project
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
