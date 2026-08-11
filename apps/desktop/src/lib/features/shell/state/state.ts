import { writable } from "svelte/store";
import type { Project } from '../../../core/service/projectsService';

export type ShellTab = 'chat' | 'files' | 'graph' | 'settings';

export interface ShellState {
  currentProject: Project | null;
  allProjects: Project[];
  showProjectDropdown: boolean;
  loading: boolean;
  activeTab: ShellTab;
}

export const shellState = writable<ShellState>({
  currentProject: null,
  allProjects: [],
  showProjectDropdown: false,
  loading: true,
  activeTab: 'chat'
});
