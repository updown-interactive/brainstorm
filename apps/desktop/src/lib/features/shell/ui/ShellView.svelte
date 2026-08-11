<script lang="ts">
  import { onMount } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { shellState } from '../state/state';
  import { shellController } from '../controller/controller';
  import { layoutSettingsState } from '$lib/features/settings/state';
  import ShellToolbar from '../ui/ShellToolbar.svelte';
  import ShellSidebar from '../ui/ShellSidebar.svelte';
  import ChatView from '$lib/features/chat/ui/ChatView.svelte';
  import FilesView from '$lib/features/files/ui/FilesView.svelte';
  import GraphView from '$lib/features/graph/ui/GraphView.svelte';
  import SettingsView from '$lib/features/settings/ui/SettingsView.svelte';
  import './shell.css';

  let isToolbarHovered = false;
  let isSidebarHovered = false;
  let isTrafficHovered = false;
  let isMaximized = false;
  let isFullscreen = false;
  let toolbarTimeout: ReturnType<typeof setTimeout> | null = null;
  let sidebarTimeout: ReturnType<typeof setTimeout> | null = null;

  async function checkMaximizedState(): Promise<void> {
    let isMax = false;
    let isFull = false;
    try {
      const appWindow = getCurrentWindow();
      isMax = await appWindow.isMaximized();
      isFull = await appWindow.isFullscreen();
    } catch {
      // The browser preview does not expose the Tauri window API.
    }

    const isMatchFull = typeof window !== 'undefined' && window.matchMedia('(display-mode: fullscreen)').matches;
    const isDocFull = typeof document !== 'undefined' && document.fullscreenElement != null;
    const isNearWidth = typeof window !== 'undefined' && (
      Math.abs(window.innerWidth - screen.availWidth) <= 16 ||
      Math.abs(window.outerWidth - screen.width) <= 16
    );
    const isNearHeight = typeof window !== 'undefined' && (
      Math.abs(window.innerHeight - screen.availHeight) <= 16 ||
      Math.abs(window.outerHeight - screen.height) <= 16
    );

    isFullscreen = isFull || isMatchFull || isDocFull;
    isMaximized = isMax || isFullscreen || (isNearWidth && isNearHeight);
  }

  $: if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('is-maximized', isMaximized);
    document.body.classList.toggle('is-maximized', isMaximized);
    document.documentElement.classList.toggle('is-fullscreen', isFullscreen);
    document.body.classList.toggle('is-fullscreen', isFullscreen);
  }

  onMount(() => {
    shellController.init();
    void checkMaximizedState();

    const handleResize = (): void => void checkMaximizedState();
    window.addEventListener('resize', handleResize);
    const interval = setInterval(() => void checkMaximizedState(), 200);

    let unlisten: (() => void) | null = null;
    try {
      getCurrentWindow().onResized(() => void checkMaximizedState()).then((cleanup) => {
        unlisten = cleanup;
      }).catch(() => {
        // The browser preview does not support native resize events.
      });
    } catch {
      // The browser preview does not expose the Tauri window API.
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      unlisten?.();
      if (toolbarTimeout) clearTimeout(toolbarTimeout);
      if (sidebarTimeout) clearTimeout(sidebarTimeout);
    };
  });

  function getProjectColorHex(colorInt: number | null | undefined): string {
    if (colorInt == null) return 'var(--colors-primary)';
    return `#${colorInt.toString(16).padStart(6, '0')}`;
  }

  function handleToolbarEnter(): void {
    if (toolbarTimeout) clearTimeout(toolbarTimeout);
    toolbarTimeout = null;
    isToolbarHovered = true;
  }

  function handleToolbarLeave(): void {
    if (toolbarTimeout) clearTimeout(toolbarTimeout);
    toolbarTimeout = setTimeout(() => {
      isToolbarHovered = false;
    }, 180);
  }

  function handleSidebarEnter(): void {
    if (sidebarTimeout) clearTimeout(sidebarTimeout);
    sidebarTimeout = null;
    isSidebarHovered = true;
  }

  function handleSidebarLeave(): void {
    if (sidebarTimeout) clearTimeout(sidebarTimeout);
    sidebarTimeout = setTimeout(() => {
      isSidebarHovered = false;
    }, 180);
  }

  function handleTrafficEnter(): void {
    isTrafficHovered = true;
  }

  function handleTrafficLeave(): void {
    isTrafficHovered = false;
  }

  $: if ($shellState.currentProject) {
    void shellController.ensureProjectRuntime($shellState.currentProject);
  }

  $: isDisplayFullscreen = $layoutSettingsState.sidepanelMode === 'hover' && $layoutSettingsState.toolbarMode === 'hover';
  $: shouldUseFullscreenShell = isFullscreen && isDisplayFullscreen;
  $: isToolbarRevealed = isToolbarHovered || $shellState.showProjectDropdown;
  $: isSidebarRevealed = isSidebarHovered;
</script>

<div
  class="shell-container"
  class:is-maximized={isMaximized}
  class:is-fullscreen={isFullscreen}
  class:is-fullscreen-shell={shouldUseFullscreenShell}
  class:sidepanel-position-right={$layoutSettingsState.sidepanelPosition === 'right'}
  class:toolbar-position-bottom={$layoutSettingsState.toolbarPosition === 'bottom'}
  style="--colors-primary: {getProjectColorHex($shellState.currentProject?.color)}"
>
  {#if $layoutSettingsState.toolbarMode === 'hover'}
    <div class="toolbar-hover-trigger" role="presentation" onmouseenter={handleToolbarEnter} onmouseleave={handleToolbarLeave}></div>
  {/if}
  {#if $layoutSettingsState.sidepanelMode === 'hover'}
    <div class="sidebar-hover-trigger" role="presentation" onmouseenter={handleSidebarEnter} onmouseleave={handleSidebarLeave}></div>
  {/if}

  {#if $layoutSettingsState.toolbarPosition !== 'bottom'}
    <ShellToolbar
      mode={$layoutSettingsState.toolbarMode}
      position="top"
      isRevealed={isToolbarRevealed}
      currentProject={$shellState.currentProject}
      allProjects={$shellState.allProjects}
      isLoading={$shellState.loading}
      showProjectDropdown={$shellState.showProjectDropdown}
      {isFullscreen}
      {isTrafficHovered}
      onEnter={handleToolbarEnter}
      onLeave={handleToolbarLeave}
      onTrafficEnter={handleTrafficEnter}
      onTrafficLeave={handleTrafficLeave}
      onCloseWindow={() => void shellController.closeWindow()}
      onMinimizeWindow={() => void shellController.minimizeWindow()}
      onMaximizeWindow={() => void shellController.maximizeWindow()}
      onToggleProjectDropdown={() => shellController.toggleProjectDropdown()}
      onSelectProject={(project) => shellController.selectProject(project)}
      onCreateNewProject={() => shellController.createNewProject()}
    />
  {/if}

  <div class="shell-workspace-row" class:sidepanel-position-right={$layoutSettingsState.sidepanelPosition === 'right'}>
    <ShellSidebar
      mode={$layoutSettingsState.sidepanelMode}
      isRevealed={isSidebarRevealed}
      activeTab={$shellState.activeTab}
      onEnter={handleSidebarEnter}
      onLeave={handleSidebarLeave}
      onSwitchTab={(tab) => shellController.switchTab(tab)}
    />

    <div class="shell-main-column">
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

  {#if $layoutSettingsState.toolbarPosition === 'bottom'}
    <ShellToolbar
      mode={$layoutSettingsState.toolbarMode}
      position="bottom"
      isRevealed={isToolbarRevealed}
      currentProject={$shellState.currentProject}
      allProjects={$shellState.allProjects}
      isLoading={$shellState.loading}
      showProjectDropdown={$shellState.showProjectDropdown}
      {isFullscreen}
      {isTrafficHovered}
      onEnter={handleToolbarEnter}
      onLeave={handleToolbarLeave}
      onTrafficEnter={handleTrafficEnter}
      onTrafficLeave={handleTrafficLeave}
      onCloseWindow={() => void shellController.closeWindow()}
      onMinimizeWindow={() => void shellController.minimizeWindow()}
      onMaximizeWindow={() => void shellController.maximizeWindow()}
      onToggleProjectDropdown={() => shellController.toggleProjectDropdown()}
      onSelectProject={(project) => shellController.selectProject(project)}
      onCreateNewProject={() => shellController.createNewProject()}
    />
  {/if}
</div>
