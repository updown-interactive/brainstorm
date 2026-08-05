import { open } from '@tauri-apps/plugin-dialog';
import { projectService, type CreateProjectPayload, type Project } from '../../../core/service/projectsService';

class OnboardingService {
	getProjects(): Promise<Project[]> {
		return projectService.getProjects();
	}

	createProject(payload: CreateProjectPayload): Promise<Project> {
		return projectService.createProject(payload);
	}

	async pickProjectDirectory(): Promise<string | null> {
		const selectedPath = await open({
			directory: true,
			multiple: false,
			title: 'Select Project Directory'
		});
		return selectedPath && typeof selectedPath === 'string' ? selectedPath : null;
	}
}

export function hexToProjectColor(hex: string): number {
	return parseInt(hex.replace(/^#/, ''), 16);
}

export const onboardingService = new OnboardingService();
