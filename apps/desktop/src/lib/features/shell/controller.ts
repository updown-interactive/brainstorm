import { goto } from '$app/navigation';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { projectService, type Project } from '../../core/service/projectsService';
import { buildVaultIndex, updateVaultIndexEntry } from '../files/data/vault-index';
import { shellState } from './state';
import { ROUTES } from '../../app/routes';

class ShellController {
  private activeRuntimePath = '';
  private unlistenFsChange: UnlistenFn | null = null;

  async init() {
    shellState.update(s => ({ ...s, loading: true }));
    try {
      const allProjects = await projectService.getProjects();
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
      } else {
        shellState.update(s => ({ ...s, loading: false }));
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

  switchTab(tab: import('./state').ShellTab) {
    shellState.update(s => ({ ...s, activeTab: tab }));
  }

  createNewProject() {
    this.closeProjectDropdown();
    goto(ROUTES.ONBOARDING || '/onboarding');
  }
}

export const shellController = new ShellController();
