<script lang="ts">
  import { FileJson, SlidersHorizontal, Palette, Network } from 'lucide-svelte';
  import { settingsState } from './state';
  import { settingsController } from './controller';
  import GeneralSettings from './GeneralSettings.svelte';
  import ProvidersSettings from './ProvidersSettings.svelte';
  import AppearanceSettings from './AppearanceSettings.svelte';
  import BrainstormSettingsPanel from '../files/components/BrainstormSettingsPanel.svelte';
  import './settings.css';
</script>

<div class="settings-container">
  <aside class="settings-sidebar">
    <div class="settings-section-title">Project Settings</div>
    
    <button 
      class="settings-nav-item {$settingsState.activeTab === 'general' ? 'active' : ''}"
      onclick={() => settingsController.switchTab('general')}
    >
      <SlidersHorizontal size={16} />
      <span>General</span>
    </button>
    
    <button 
      class="settings-nav-item {$settingsState.activeTab === 'providers' ? 'active' : ''}"
      onclick={() => settingsController.switchTab('providers')}
    >
      <Network size={16} />
      <span>Providers</span>
    </button>

    <button 
      class="settings-nav-item {$settingsState.activeTab === 'configurations' ? 'active' : ''}"
      onclick={() => settingsController.switchTab('configurations')}
    >
      <FileJson size={16} />
      <span>Configurations</span>
    </button>

    <div class="settings-section-title">App Settings</div>
    
    <button 
      class="settings-nav-item {$settingsState.activeTab === 'appearance' ? 'active' : ''}"
      onclick={() => settingsController.switchTab('appearance')}
    >
      <Palette size={16} />
      <span>Appearance</span>
    </button>
  </aside>

  <main class="settings-content" class:is-configurations={$settingsState.activeTab === 'configurations'}>
    {#if $settingsState.activeTab === 'general'}
      <GeneralSettings />
    {:else if $settingsState.activeTab === 'providers'}
      <ProvidersSettings />
    {:else if $settingsState.activeTab === 'configurations'}
      <div class="settings-configurations">
        <BrainstormSettingsPanel onClose={() => settingsController.switchTab('general')} />
      </div>
    {:else if $settingsState.activeTab === 'appearance'}
      <AppearanceSettings />
    {/if}
  </main>
</div>
