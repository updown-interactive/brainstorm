import { get } from 'svelte/store';
import { projectService, type Project, type UpdateProjectPayload } from '../../../core/service/projectsService';
import { settingsService } from '../../../core/service/settingsService';
import { themeManager } from '../../../core/theme/ThemeManager';
import { shellState } from '../../shell/state';

class SettingsFeatureService {
	getCurrentProject(): Project | null {
		return get(shellState).currentProject;
	}

	subscribeToProject(callback: (project: Project | null) => void): () => void {
		return shellState.subscribe((state) => callback(state.currentProject));
	}

	async getTheme(): Promise<string> {
		const settings = await settingsService.getSettings();
		return settings.theme || 'dark';
	}

	async switchTheme(theme: string): Promise<void> {
		await themeManager.switchTheme(theme);
	}

	async copyToClipboard(text: string): Promise<void> {
		await navigator.clipboard.writeText(text);
	}

	async updateProject(payload: UpdateProjectPayload): Promise<void> {
		await projectService.updateProject(payload);
		shellState.update((state) => {
			if (!state.currentProject || state.currentProject.id !== payload.id) return state;
			const updatedProject = {
				...state.currentProject,
				name: payload.name,
				description: payload.description || null,
				icon: payload.icon || null,
				color: payload.color || null
			};
			return {
				...state,
				currentProject: updatedProject,
				allProjects: state.allProjects.map((project) => project.id === payload.id ? updatedProject : project)
			};
		});
	}

	async deleteProject(projectId: string): Promise<Project | null> {
		await projectService.deleteProject(projectId);
		let nextProject: Project | null = null;
		shellState.update((state) => {
			const remaining = state.allProjects.filter((project) => project.id !== projectId);
			nextProject = remaining[0] ?? null;
			return {
				...state,
				allProjects: remaining,
				currentProject: nextProject
			};
		});
		return nextProject;
	}
}

export function projectColorToHex(colorInt: number | null | undefined): string {
	if (colorInt == null) return '#007ACC';
	return `#${colorInt.toString(16).padStart(6, '0')}`;
}

export function hexToProjectColor(hex: string): number {
	return parseInt(hex.replace(/^#/, ''), 16);
}

export const settingsFeatureService = new SettingsFeatureService();
