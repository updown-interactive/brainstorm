<script lang="ts">
  import { onMount } from 'svelte';
  import { Blocks, ChevronsUpDown, Plus, MessageSquare, Folder, Network, Settings, Brain, Code, Rocket, Sparkles, Box } from 'lucide-svelte';
  import { shellState } from './state';
  import { shellController } from './controller';
  import LiquidGlassPanel from '$lib/shared/ui/LiquidGlassPanel.svelte';
  import ChatView from '../chat/ChatView.svelte';
  import FilesView from '../files/components/FilesView.svelte';
  import GraphView from '../graph/components/GraphView.svelte';
  import SettingsView from '../settings/components/SettingsView.svelte';
  import './shell.css';
  
  onMount(() => {
    shellController.init();
  });

  function getProjectColorHex(colorInt: number | null | undefined) {
    if (colorInt == null) return 'var(--colors-primary)';
    return '#' + colorInt.toString(16).padStart(6, '0');
  }

  const iconMap: Record<string, any> = {
    folder: Folder,
    brain: Brain,
    code: Code,
    rocket: Rocket,
    sparkles: Sparkles,
    box: Box,
    blocks: Blocks
  };

  $: currentIcon = iconMap[$shellState.currentProject?.icon || 'blocks'] || Blocks;
  $: if ($shellState.currentProject) {
    void shellController.ensureProjectRuntime($shellState.currentProject);
  }
</script>

<div class="shell-container" style="--colors-primary: {getProjectColorHex($shellState.currentProject?.color)}">
  
  <!-- Top Toolbar -->
  <header class="shell-toolbar" data-tauri-drag-region>
    <!-- Spacer for macOS traffic lights -->
    <div class="mac-spacer" data-tauri-drag-region></div>

    <div class="toolbar-content">
      <!-- Project Picker -->
      <div class="project-picker-container">
        <button class="project-picker-btn" onclick={() => shellController.toggleProjectDropdown()}>
          <svelte:component this={currentIcon} size={16} color="currentColor" strokeWidth={1.5} />
          <span class="project-name">{$shellState.currentProject?.name || ($shellState.loading ? 'Loading...' : 'No Project')}</span>
          {#if $shellState.currentProject?.metadata}
            <!-- Assuming we might store 'badge' inside metadata or just don't show badge for now -->
          {/if}
          <ChevronsUpDown size={14} color="currentColor" />
        </button>

        {#if $shellState.showProjectDropdown}
          <LiquidGlassPanel class="project-dropdown-menu">
            <div class="panel-label">Switch Project</div>
            {#each $shellState.allProjects as project}
              <button 
                class="panel-item {$shellState.currentProject?.id === project.id ? 'active' : ''}"
                onclick={() => shellController.selectProject(project)}
              >
                <svelte:component this={iconMap[project.icon || 'blocks'] || Blocks} class="panel-icon" size={14} />
                <span>{project.name}</span>
              </button>
            {/each}
            <div class="panel-divider"></div>
            <button class="panel-item" onclick={() => shellController.createNewProject()}>
              <Plus class="panel-icon" size={14} />
              <span>New Project</span>
            </button>
          </LiquidGlassPanel>
        {/if}
      </div>
    </div>
  </header>

  <!-- Main Workspace Area -->
  <div class="shell-body">
    <!-- Compact Sidebar -->
    <aside class="shell-sidebar">
      <button 
        class="sidebar-btn {$shellState.activeTab === 'chat' ? 'active' : ''}" 
        onclick={() => shellController.switchTab('chat')}
        title="Chat"
      >
        <MessageSquare size={18} />
      </button>
      <button 
        class="sidebar-btn {$shellState.activeTab === 'files' ? 'active' : ''}" 
        onclick={() => shellController.switchTab('files')}
        title="Files"
      >
        <Folder size={18} />
      </button>
      <button 
        class="sidebar-btn {$shellState.activeTab === 'graph' ? 'active' : ''}" 
        onclick={() => shellController.switchTab('graph')}
        title="Graph"
      >
        <Network size={18} />
      </button>

      <!-- Settings anchored to bottom -->
      <button 
        class="sidebar-btn {$shellState.activeTab === 'settings' ? 'active' : ''}" 
        onclick={() => shellController.switchTab('settings')}
        style="margin-top: auto;"
        title="Settings"
      >
        <Settings size={18} />
      </button>
    </aside>

    <!-- Content Area -->
    <main class="shell-content">
      {#if $shellState.loading}
        <div style="padding: 24px;"><h1>Loading Workspace...</h1></div>
      {:else if $shellState.currentProject}
        {#key $shellState.currentProject.id}
          {#if $shellState.activeTab === 'chat'}
            <ChatView />
          {:else if $shellState.activeTab === 'files'}
            <FilesView />
          {:else if $shellState.activeTab === 'graph'}
            <GraphView />
          {:else if $shellState.activeTab === 'settings'}
            <SettingsView />
          {/if}
        {/key}
      {:else}
        <div style="padding: 24px;"><h1>No Project Selected</h1></div>
      {/if}
    </main>
  </div>
</div>
