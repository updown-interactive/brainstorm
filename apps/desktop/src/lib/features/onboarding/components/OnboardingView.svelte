<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Folder, Brain, Code, Rocket, Sparkles, Box, ChevronDown } from 'lucide-svelte';
  import { onboardingController } from '../controller';
  import './onboarding.css';

  const iconComponents = [
    { id: 'folder', icon: Folder, label: 'Folder' },
    { id: 'brain', icon: Brain, label: 'Brain' },
    { id: 'code', icon: Code, label: 'Code' },
    { id: 'rocket', icon: Rocket, label: 'Rocket' },
    { id: 'sparkles', icon: Sparkles, label: 'Sparkles' },
    { id: 'box', icon: Box, label: 'Box' }
  ];

  $: form = $onboardingController;
  $: selectedOpt = iconComponents.find((option) => option.id === form.selectedIconId) || iconComponents[0];

  onMount(() => {
    onboardingController.mount();
  });

  onDestroy(() => {
    onboardingController.destroy();
  });
</script>

<div class="onboarding-container" style="--colors-primary: {form.color}">
  <form class="onboarding-panel" onsubmit={(event) => { event.preventDefault(); onboardingController.createProject(); }}>
    
    <div class="panel-header">
      <h1 class="panel-title">Create a new project</h1>
      <p class="panel-description">Your project will have its own dedicated workspace and local database. A local environment will be set up so you can easily interact with your ideas.</p>
    </div>

    {#if form.error}
      <div class="p-4 bg-red-900/30 border-b border-red-500/50 text-red-300 text-sm">
        {form.error}
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
          value={form.name}
          oninput={(event) => onboardingController.updateForm({ name: event.currentTarget.value })}
          class="input-field" 
          placeholder="Project name" 
          required 
          disabled={form.isSubmitting}
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
          value={form.description}
          oninput={(event) => onboardingController.updateForm({ description: event.currentTarget.value })}
          class="input-field" 
          placeholder="Briefly describe what this project is about..."
          disabled={form.isSubmitting}
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
            value={form.color}
            oninput={(event) => onboardingController.updateForm({ color: event.currentTarget.value })}
            class="input-field color-picker" 
            disabled={form.isSubmitting}
          />

          <div class="icon-dropdown-container">
            <button 
              type="button" 
              class="input-field icon-dropdown-btn" 
              onclick={onboardingController.toggleIconDropdown}
              disabled={form.isSubmitting}
            >
              <svelte:component this={selectedOpt.icon} size={20} color={form.color} />
              <ChevronDown size={14} class="dropdown-arrow" />
            </button>

            {#if form.showIconDropdown}
              <div class="icon-dropdown-menu">
                {#each iconComponents as opt}
                  <button 
                    type="button" 
                    class="icon-dropdown-item {form.selectedIconId === opt.id ? 'active' : ''}" 
                    onclick={() => onboardingController.selectIcon(opt.id)}
                  >
                    <svelte:component this={opt.icon} size={20} color={form.selectedIconId === opt.id ? form.color : 'currentColor'} />
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
            value={form.path}
            oninput={(event) => onboardingController.updateForm({ path: event.currentTarget.value })}
            class="input-field" 
            placeholder="e.g. /Users/name/projects/my-idea" 
            required 
            disabled={form.isSubmitting}
          />
          <button type="button" class="btn btn-secondary" onclick={onboardingController.openProjectFolder} disabled={form.isSubmitting}>
            Browse...
          </button>
        </div>
        <p class="input-help">Select the local directory where your project files and database will live.</p>
      </div>
    </div>

    <div class="panel-footer" style="gap: 12px;">
      {#if form.hasProjects}
        <button type="button" class="btn btn-secondary" onclick={onboardingController.cancel} disabled={form.isSubmitting}>
          Cancel
        </button>
      {/if}
      <button type="submit" class="btn btn-primary" disabled={form.isSubmitting}>
        {form.isSubmitting ? 'Creating...' : 'Create new project'}
      </button>
    </div>

  </form>
</div>
