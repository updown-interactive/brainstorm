import type { Project } from '../service/projectsService';

type ProjectListener = (project: Project | null) => void;

/** Runtime-only project context shared by services and controllers. */
export class ProjectStore {
  private currentProject: Project | null = null;
  private allProjects: Project[] = [];
  private readonly listeners = new Set<ProjectListener>();

  getCurrentProject(): Project | null {
    return this.currentProject;
  }

  getAllProjects(): Project[] {
    return [...this.allProjects];
  }

  setProjects(projects: Project[]): void {
    this.allProjects = [...projects];
  }

  setCurrentProject(project: Project | null): void {
    this.currentProject = project;
    for (const listener of this.listeners) listener(project);
  }

  updateCurrentProject(project: Project): void {
    this.allProjects = this.allProjects.map((item) => item.id === project.id ? project : item);
    this.setCurrentProject(project);
  }

  removeProject(projectId: string): Project | null {
    this.allProjects = this.allProjects.filter((project) => project.id !== projectId);
    if (this.currentProject?.id !== projectId) return this.currentProject;
    const nextProject = this.allProjects[0] ?? null;
    this.setCurrentProject(nextProject);
    return nextProject;
  }

  subscribe(listener: ProjectListener): () => void {
    this.listeners.add(listener);
    listener(this.currentProject);
    return () => this.listeners.delete(listener);
  }
}

export const projectStore = new ProjectStore();
