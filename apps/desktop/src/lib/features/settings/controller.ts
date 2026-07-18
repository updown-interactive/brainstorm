import { settingsState, type SettingsTab } from './state';
import { projectService, type UpdateProjectPayload } from '../../core/service/projectsService';
import { shellState } from '../shell/state';
import { get } from 'svelte/store';

class SettingsController {
  switchTab(tab: SettingsTab) {
    settingsState.update(s => ({ ...s, activeTab: tab }));
  }

  async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

  async saveGeneralSettings(payload: UpdateProjectPayload) {
    try {
      await projectService.updateProject(payload);
      
      // Update local state so UI reflects changes immediately without reload
      shellState.update(s => {
        if (s.currentProject && s.currentProject.id === payload.id) {
          const updatedProject = {
            ...s.currentProject,
            name: payload.name,
            description: payload.description || null,
            icon: payload.icon || null,
            color: payload.color || null,
          };
          
          // Also update it in allProjects
          const updatedAllProjects = s.allProjects.map(p => 
            p.id === payload.id ? updatedProject : p
          );
          
          return {
            ...s,
            currentProject: updatedProject,
            allProjects: updatedAllProjects
          };
        }
        return s;
      });
      
    } catch (err) {
      console.error('Failed to update project settings:', err);
    }
  }

  async deleteProject(projectId: string) {
    try {
      await projectService.deleteProject(projectId);
      
      // Update global state, then navigate
      shellState.update(s => {
        const remaining = s.allProjects.filter(p => p.id !== projectId);
        return {
          ...s,
          allProjects: remaining,
          // Unset current project so shell can redirect appropriately
          currentProject: remaining.length > 0 ? remaining[0] : null
        };
      });

      // Simple navigation strategy:
      const s = get(shellState);
      if (s.currentProject) {
        // Just reload the page or switch to new project
        window.location.reload(); 
      } else {
        // Goto onboarding if no projects remain
        window.location.href = '/onboarding';
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  }
}

export const settingsController = new SettingsController();
