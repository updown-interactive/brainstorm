<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { FileJson, SlidersHorizontal, Palette, Cpu } from 'lucide-svelte';
  import { settingsController } from '../controller';
  import GeneralSettings from './GeneralSettings.svelte';
  import ProvidersSettings from './ProvidersSettings.svelte';
  import AppearanceSettings from './AppearanceSettings.svelte';
  import { ConfigurationPanel } from '../../configuration';
  import './settings.css';

  onMount(() => {
    settingsController.mount();
  });

  onDestroy(() => {
    settingsController.destroy();
  });
</script>

<div class="settings-container">
  <aside class="settings-sidebar">
    <div class="settings-section-title">Project</div>
    
    <button 
      class="settings-nav-item {$settingsController.activeTab === 'general' ? 'active' : ''}"
      onclick={() => settingsController.switchTab('general')}
    >
      <SlidersHorizontal size={15} />
      <span>General</span>
    </button>
    
    <button 
      class="settings-nav-item {$settingsController.activeTab === 'providers' ? 'active' : ''}"
      onclick={() => settingsController.switchTab('providers')}
    >
      <Cpu size={15} />
      <span>Providers</span>
    </button>

    <button 
      class="settings-nav-item {$settingsController.activeTab === 'configurations' ? 'active' : ''}"
      onclick={() => settingsController.switchTab('configurations')}
    >
      <FileJson size={15} />
      <span>Configurations</span>
    </button>

    <div class="settings-section-title">System</div>
    
    <button 
      class="settings-nav-item {$settingsController.activeTab === 'appearance' ? 'active' : ''}"
      onclick={() => settingsController.switchTab('appearance')}
    >
      <Palette size={15} />
      <span>Appearance</span>
    </button>
  </aside>

  <main class="settings-content" class:is-configurations={$settingsController.activeTab === 'configurations'}>
    {#if $settingsController.activeTab === 'general'}
      <GeneralSettings />
    {:else if $settingsController.activeTab === 'providers'}
      <ProvidersSettings />
    {:else if $settingsController.activeTab === 'configurations'}
      <div class="settings-configurations">
        <ConfigurationPanel onClose={() => settingsController.switchTab('general')} />
      </div>
    {:else if $settingsController.activeTab === 'appearance'}
      <AppearanceSettings />
    {/if}
  </main>
</div>
