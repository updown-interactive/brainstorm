import { invoke } from '@tauri-apps/api/core';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: number | null;
  banner: string | null;
  path: string;
  template: string;
  version: string;
  schema_version: number;
  document_count: number;
  graph_node_count: number;
  chat_count: number;
  task_count: number;
  attachment_count: number;
  is_favorite: number;
  is_archived: number;
  created_at: number;
  updated_at: number;
  last_opened_at: number | null;
  last_conversation_id: string | null;
  metadata: string | null;
}

export interface CreateProjectPayload {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: number | null;
  banner?: string | null;
  path: string;
  template?: string | null;
}

export interface UpdateProjectPayload {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: number | null;
}

class ProjectService {
  private cache: Project[] | null = null;

  async getProjects(): Promise<Project[]> {
    if (this.cache) return this.cache;
    try {
      const projects = await invoke<Project[]>('get_projects');
      this.cache = projects;
      return projects;
    } catch (e) {
      console.error('Failed to get projects:', e);
      return [];
    }
  }
  
  async createProject(payload: CreateProjectPayload): Promise<Project> {
    const project = await invoke<Project>('create_project', { payload });
    if (this.cache) {
      const existingIndex = this.cache.findIndex(p => p.id === project.id);
      if (existingIndex !== -1) {
        this.cache[existingIndex] = project;
      } else {
        this.cache.push(project);
      }
    }
    return project;
  }

  async updateProject(payload: UpdateProjectPayload): Promise<void> {
    await invoke<void>('update_project', { payload });
    if (this.cache) {
      const index = this.cache.findIndex(p => p.id === payload.id);
      if (index !== -1) {
        this.cache[index] = { ...this.cache[index], ...payload };
      }
    }
  }

  async deleteProject(id: string): Promise<void> {
    await invoke<void>('delete_project', { id });
    if (this.cache) {
      this.cache = this.cache.filter(p => p.id !== id);
    }
  }
  
  clearCache(): void {
    this.cache = null;
  }
}

export const projectService = new ProjectService();
