<script lang="ts">
  import { Blocks, ChevronsUpDown, Plus, Folder, Brain, Code, Rocket, Sparkles, Box, X, Minus, Maximize2 } from 'lucide-svelte';
  import type { Project } from '../../../core/service/projectsService';
  import LiquidGlassPanel from '$lib/shared/ui/LiquidGlassPanel.svelte';

  export let mode: 'hover' | 'expanded';
  export let position: 'top' | 'bottom';
  export let isRevealed: boolean;
  export let currentProject: Project | null;
  export let allProjects: Project[];
  export let isLoading: boolean;
  export let showProjectDropdown: boolean;
  export let isFullscreen: boolean;
  export let isTrafficHovered: boolean;
  export let onEnter: () => void;
  export let onLeave: () => void;
  export let onTrafficEnter: () => void;
  export let onTrafficLeave: () => void;
  export let onCloseWindow: () => void;
  export let onMinimizeWindow: () => void;
  export let onMaximizeWindow: () => void;
  export let onToggleProjectDropdown: () => void;
  export let onSelectProject: (project: Project) => void;
  export let onCreateNewProject: () => void;

  const iconMap: Record<string, typeof Blocks> = {
    folder: Folder,
    brain: Brain,
    code: Code,
    rocket: Rocket,
    sparkles: Sparkles,
    box: Box,
    blocks: Blocks
  };

  $: currentIcon = iconMap[currentProject?.icon || 'blocks'] || Blocks;
  $: toolbarClass = `shell-toolbar toolbar-${position}${mode === 'hover' ? ` toolbar-collapsible ${isRevealed ? 'revealed' : ''}` : ''}`;
  $: projectName = currentProject?.name || (isLoading ? 'Loading...' : 'No Project');
</script>

<header class={toolbarClass} role="region" aria-label="Toolbar" data-tauri-drag-region onmouseenter={onEnter} onmouseleave={onLeave}>
  <div class="toolbar-content">
    {@render WindowControls()}
    {@render ProjectPicker()}
  </div>
</header>

{#snippet ProjectPicker()}
  <div class="project-picker-container">
    <button class="project-picker-btn" onclick={onToggleProjectDropdown}>
      <svelte:component this={currentIcon} size={16} color="currentColor" strokeWidth={1.5} />
      <span class="project-name">{projectName}</span>
      <ChevronsUpDown size={14} color="currentColor" />
    </button>
    {#if showProjectDropdown}
      <LiquidGlassPanel class="project-dropdown-menu">
        <div class="panel-label">Switch Project</div>
        {#each allProjects as project}
          <button class="panel-item {currentProject?.id === project.id ? 'active' : ''}" onclick={() => onSelectProject(project)}>
            <svelte:component this={iconMap[project.icon || 'blocks'] || Blocks} class="panel-icon" size={14} />
            <span>{project.name}</span>
          </button>
        {/each}
        <div class="panel-divider"></div>
        <button class="panel-item" onclick={onCreateNewProject}>
          <Plus class="panel-icon" size={14} />
          <span>New Project</span>
        </button>
      </LiquidGlassPanel>
    {/if}
  </div>
{/snippet}

{#snippet WindowControls()}
  <div class="toolbar-window-controls {isFullscreen ? 'fullscreen-hidden' : ''}">
    <div class="window-traffic-lights" role="region" aria-label="Window controls" onmouseenter={onTrafficEnter} onmouseleave={onTrafficLeave}>
      <button type="button" class="traffic-btn close" onclick={onCloseWindow} aria-label="Close Window">
        {#if isTrafficHovered && !isFullscreen}<span class="traffic-symbol"><X size={8.5} strokeWidth={2.8} /></span>{/if}
      </button>
      <button type="button" class="traffic-btn minimize" onclick={onMinimizeWindow} aria-label="Minimize Window">
        {#if isTrafficHovered && !isFullscreen}<span class="traffic-symbol"><Minus size={8.5} strokeWidth={2.8} /></span>{/if}
      </button>
      <button type="button" class="traffic-btn maximize" onclick={onMaximizeWindow} aria-label="Zoom Window">
        {#if isTrafficHovered && !isFullscreen}<span class="traffic-symbol"><Maximize2 size={7.5} strokeWidth={2.8} /></span>{/if}
      </button>
    </div>
  </div>
{/snippet}
