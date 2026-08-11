import { goto } from '$app/navigation';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { projectService, type Project } from '../../../core/service/projectsService';
import { projectStore } from '../../../core/stores/projectStore';
import { buildVaultIndex, updateVaultIndexEntry } from '../../files/data/vault-index';
import { initLayoutSettings } from '../../settings/data/settings-service';
import { shellState } from '../state/state';
import { ROUTES } from '../../../app/routes';

class ShellController {
  private activeRuntimePath = '';
  private unlistenFsChange: UnlistenFn | null = null;

  async init() {
    shellState.update(s => ({ ...s, loading: true }));
    void initLayoutSettings();
    try {
      const allProjects = await projectService.getProjects();
      projectStore.setProjects(allProjects);
      if (allProjects.length > 0) {
        // Sort by last_opened_at descending
        allProjects.sort((a, b) => (b.last_opened_at || 0) - (a.last_opened_at || 0));
        
        let activeProject = allProjects[0];
        const savedProjectId = sessionStorage.getItem('activeProjectId');
        if (savedProjectId) {
          const found = allProjects.find(p => p.id === savedProjectId);
          if (found) {
            activeProject = found;
          }
        }
        
        shellState.update(s => ({
          ...s,
          allProjects,
          currentProject: activeProject,
          loading: false
        }));
        projectStore.setCurrentProject(activeProject);
      } else {
        shellState.update(s => ({ ...s, loading: false }));
        projectStore.setCurrentProject(null);
      }
    } catch (error) {
      console.error('Failed to load projects for shell view:', error);
      shellState.update(s => ({ ...s, loading: false }));
    }
  }

  toggleProjectDropdown() {
    shellState.update(s => ({ ...s, showProjectDropdown: !s.showProjectDropdown }));
  }
  
  closeProjectDropdown() {
    shellState.update(s => ({ ...s, showProjectDropdown: false }));
  }

  selectProject(project: Project) {
    sessionStorage.setItem('activeProjectId', project.id);
    shellState.update(s => ({ 
      ...s, 
      currentProject: project,
      showProjectDropdown: false 
    }));
    projectStore.setCurrentProject(project);
  }

  async ensureProjectRuntime(project: Project) {
    if (!project.path || project.path === this.activeRuntimePath) return;
    this.activeRuntimePath = project.path;

    await this.unlistenFsChange?.();
    this.unlistenFsChange = null;

    try {
      await buildVaultIndex(project.path);
      await invoke('start_project_watcher', { path: project.path });
      this.unlistenFsChange = await listen('fs-change', async (event: any) => {
        const { kind, path } = event.payload ?? {};
        if (typeof path === 'string') {
          await updateVaultIndexEntry(path, kind);
        }
      });
    } catch (error) {
      console.error('Failed to initialize project runtime', error);
    }
  }

  switchTab(tab: import('../state/state').ShellTab) {
    shellState.update(s => ({ ...s, activeTab: tab }));
  }

  createNewProject() {
    this.closeProjectDropdown();
    goto(ROUTES.ONBOARDING || '/onboarding');
  }

  async closeWindow() {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (e) {
      console.error('Failed to close window:', e);
    }
  }

  async minimizeWindow() {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (e) {
      console.error('Failed to minimize window:', e);
    }
  }

  async maximizeWindow() {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      const isFull = await appWindow.isFullscreen();
      await appWindow.setFullscreen(!isFull);
    } catch (e) {
      console.warn('Native setFullscreen failed, falling back to toggleMaximize:', e);
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        await appWindow.toggleMaximize();
      } catch (err) {
        console.error('Failed to toggle window maximize state:', err);
      }
    }
  }
}

export const shellController = new ShellController();
