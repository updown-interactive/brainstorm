<script lang="ts">
  import { onMount } from 'svelte';
  import { open } from '@tauri-apps/plugin-dialog';
  import { goto } from '$app/navigation';
  import { projectService, type CreateProjectPayload } from '../../core/service/projectsService';
  import { Folder, Brain, Code, Rocket, Sparkles, Box, ChevronDown } from 'lucide-svelte';
  import { onboardingState } from './state';
  import './onboarding.css';

  const iconOptions = [
    { id: 'folder', icon: Folder, label: 'Folder' },
    { id: 'brain', icon: Brain, label: 'Brain' },
    { id: 'code', icon: Code, label: 'Code' },
    { id: 'rocket', icon: Rocket, label: 'Rocket' },
    { id: 'sparkles', icon: Sparkles, label: 'Sparkles' },
    { id: 'box', icon: Box, label: 'Box' }
  ];

  let selectedIconId = iconOptions[0].id;
  let showIconDropdown = false;
  
  $: selectedOpt = iconOptions.find(i => i.id === selectedIconId) || iconOptions[0];

  let name = '';
  let description = '';
  let color = '#007ACC'; // Default to a standard hex (var(--colors-primary) equivalent)
  let path = '';
  let isSubmitting = false;
  let error = '';

  onMount(async () => {
    try {
      const projects = await projectService.getProjects();
      onboardingState.update(s => ({ ...s, hasProjects: projects && projects.length > 0 }));
    } catch (err) {
      console.error('Failed to check projects', err);
    }
  });

  function cancel() {
    goto('/shell');
  }

  async function handleOpenFolder() {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Directory'
      });
      if (selectedPath && typeof selectedPath === 'string') {
        path = selectedPath;
      }
    } catch (err) {
      console.error('Failed to open dialog:', err);
    }
  }

  function hexToInt(hexStr: string): number {
    return parseInt(hexStr.replace(/^#/, ''), 16);
  }

  async function createProject() {
    if (!name.trim()) {
      error = 'Project name is required';
      return;
    }
    if (!path.trim()) {
      error = 'Project path is required';
      return;
    }

    isSubmitting = true;
    error = '';

    try {
      const payload: CreateProjectPayload = {
        name,
        description: description.trim() || null,
        color: hexToInt(color),
        path,
        icon: null,
        banner: null,
        template: 'blank'
      };

      await projectService.createProject(payload);
      await goto('/shell');
    } catch (err: any) {
      error = typeof err === 'string' ? err : err.message || 'Failed to create project';
      console.error(err);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="onboarding-container" style="--colors-primary: {color}">
  <form class="onboarding-panel" onsubmit={(e) => { e.preventDefault(); createProject(); }}>
    
    <div class="panel-header">
      <h1 class="panel-title">Create a new project</h1>
      <p class="panel-description">Your project will have its own dedicated workspace and local database. A local environment will be set up so you can easily interact with your ideas.</p>
    </div>

    {#if error}
      <div class="p-4 bg-red-900/30 border-b border-red-500/50 text-red-300 text-sm">
        {error}
      </div>
    {/if}

    <div class="panel-row">
      <div class="row-label">
        <label for="name">Project name</label>
      </div>
      <div class="row-content">
        <input 
          id="name" 
          type="text" 
          bind:value={name} 
          class="input-field" 
          placeholder="Project name" 
          required 
          disabled={isSubmitting}
        />
      </div>
    </div>

    <div class="panel-row">
      <div class="row-label">
        <label for="description">Description (optional)</label>
      </div>
      <div class="row-content">
        <textarea 
          id="description" 
          bind:value={description} 
          class="input-field" 
          placeholder="Briefly describe what this project is about..."
          disabled={isSubmitting}
        ></textarea>
        <p class="input-help">The description helps you quickly identify the purpose of this project workspace.</p>
      </div>
    </div>

    <div class="panel-row">
      <div class="row-label">
        <label for="color">Theme & Icon</label>
      </div>
      <div class="row-content">
        <div class="theme-row-inputs">
          <input 
            id="color" 
            type="color" 
            bind:value={color} 
            class="input-field color-picker" 
            disabled={isSubmitting}
          />

          <div class="icon-dropdown-container">
            <button 
              type="button" 
              class="input-field icon-dropdown-btn" 
              onclick={() => showIconDropdown = !showIconDropdown}
              disabled={isSubmitting}
            >
              <svelte:component this={selectedOpt.icon} size={20} color={color} />
              <ChevronDown size={14} class="dropdown-arrow" />
            </button>

            {#if showIconDropdown}
              <div class="icon-dropdown-menu">
                {#each iconOptions as opt}
                  <button 
                    type="button" 
                    class="icon-dropdown-item {selectedIconId === opt.id ? 'active' : ''}" 
                    onclick={() => { selectedIconId = opt.id; showIconDropdown = false; }}
                  >
                    <svelte:component this={opt.icon} size={20} color={selectedIconId === opt.id ? color : 'currentColor'} />
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>
        <p class="input-help">Pick a primary color and icon to customize your project's workspace.</p>
      </div>
    </div>

    <div class="panel-row">
      <div class="row-label">
        <label for="path">Project Path</label>
      </div>
      <div class="row-content">
        <div class="path-wrapper">
          <input 
            id="path" 
            type="text" 
            bind:value={path} 
            class="input-field" 
            placeholder="e.g. /Users/name/projects/my-idea" 
            required 
            disabled={isSubmitting}
          />
          <button type="button" class="btn btn-secondary" onclick={handleOpenFolder} disabled={isSubmitting}>
            Browse...
          </button>
        </div>
        <p class="input-help">Select the local directory where your project files and database will live.</p>
      </div>
    </div>

    <div class="panel-footer" style="gap: 12px;">
      {#if $onboardingState.hasProjects}
        <button type="button" class="btn btn-secondary" onclick={cancel} disabled={isSubmitting}>
          Cancel
        </button>
      {/if}
      <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create new project'}
      </button>
    </div>

  </form>
</div>
