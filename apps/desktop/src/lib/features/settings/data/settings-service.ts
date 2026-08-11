import { projectService, type Project, type UpdateProjectPayload } from '../../../core/service/projectsService';
import { settingsService } from '../../../core/service/settingsService';
import { themeManager } from '../../../core/theme/ThemeManager';
import { projectStore } from '../../../core/stores/projectStore';
import { shellState } from '../../shell/state/state';

class SettingsFeatureService {
	getCurrentProject(): Project | null {
		return projectStore.getCurrentProject();
	}

	subscribeToProject(callback: (project: Project | null) => void): () => void {
		return projectStore.subscribe(callback);
	}

	async getTheme(): Promise<string> {
		const settings = await settingsService.getSettings();
		return settings.theme || 'dark';
	}

	async getAppearanceSettings(): Promise<{
		theme: string;
		sidepanelMode: import('../types').LayoutMode;
		toolbarMode: import('../types').LayoutMode;
		sidepanelPosition: import('../types').SidepanelPosition;
		toolbarPosition: import('../types').ToolbarPosition;
	}> {
		const settings = await settingsService.getSettings();
		const sidepanelMode = (settings.sidepanelMode === 'hover' ? 'hover' : 'expanded') as import('../types').LayoutMode;
		const toolbarMode = (settings.toolbarMode === 'hover' ? 'hover' : 'expanded') as import('../types').LayoutMode;
		// Display Mode is a single user-facing choice. Treat a legacy or partially
		// saved mixed pair as Normal instead of leaving the selector indeterminate.
		const resolvedMode = sidepanelMode === toolbarMode ? sidepanelMode : 'expanded';
		const sidepanelPosition = (settings.sidepanelPosition === 'right' ? 'right' : 'left') as import('../types').SidepanelPosition;
		const toolbarPosition = (settings.toolbarPosition === 'bottom' ? 'bottom' : 'top') as import('../types').ToolbarPosition;
		return {
			theme: settings.theme || 'dark',
			sidepanelMode: resolvedMode,
			toolbarMode: resolvedMode,
			sidepanelPosition,
			toolbarPosition
		};
	}

	async switchTheme(theme: string): Promise<void> {
		await themeManager.switchTheme(theme);
	}

	async setSidepanelMode(mode: import('../types').LayoutMode): Promise<void> {
		await settingsService.updateSetting('sidepanelMode', mode);
	}

	async setToolbarMode(mode: import('../types').LayoutMode): Promise<void> {
		await settingsService.updateSetting('toolbarMode', mode);
	}

	async setSidepanelPosition(position: import('../types').SidepanelPosition): Promise<void> {
		await settingsService.updateSetting('sidepanelPosition', position);
	}

	async setToolbarPosition(position: import('../types').ToolbarPosition): Promise<void> {
		await settingsService.updateSetting('toolbarPosition', position);
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
		const currentProject = projectStore.getCurrentProject();
		if (currentProject?.id === payload.id) {
			projectStore.updateCurrentProject({
				...currentProject,
				name: payload.name,
				description: payload.description || null,
				icon: payload.icon || null,
				color: payload.color || null
			});
		}
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
		projectStore.removeProject(projectId);
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

export async function initLayoutSettings(): Promise<void> {
	const appearance = await settingsFeatureService.getAppearanceSettings();
	const { layoutSettingsState } = await import('../state');
	layoutSettingsState.set({
		sidepanelMode: appearance.sidepanelMode,
		toolbarMode: appearance.toolbarMode,
		sidepanelPosition: appearance.sidepanelPosition,
		toolbarPosition: appearance.toolbarPosition
	});
}
