import { goto } from '$app/navigation';
import { get, writable } from 'svelte/store';
import { ROUTES } from '../../../app/routes';
import { onboardingState } from '../state';
import { hexToProjectColor, onboardingService } from '../data/onboarding-service';
import { onboardingIconOptions } from '../config/constants';
import type { OnboardingIconId, OnboardingViewState } from '../types';

class OnboardingController {
	private readonly state = writable<OnboardingViewState>({
		hasProjects: get(onboardingState).hasProjects,
		name: '',
		description: '',
		color: '#007ACC',
		path: '',
		selectedIconId: 'folder',
		showIconDropdown: false,
		isSubmitting: false,
		error: ''
	});

	readonly subscribe = this.state.subscribe;
	readonly iconOptions = onboardingIconOptions;

	private unsubscribeOnboardingState: (() => void) | null = null;

	mount(): void {
		this.unsubscribeOnboardingState = onboardingState.subscribe((state) => {
			this.patchState({ hasProjects: state.hasProjects });
		});
		void this.loadProjectPresence();
	}

	destroy(): void {
		this.unsubscribeOnboardingState?.();
		this.unsubscribeOnboardingState = null;
	}

	async load(): Promise<void> {
		try {
			const projects = await onboardingService.getProjects();
			if (projects && projects.length > 0) {
				await goto(ROUTES.SHELL);
			} else {
				await goto(ROUTES.ONBOARDING);
			}
		} catch (error) {
			console.error('Failed to load projects:', error);
			await goto(ROUTES.ONBOARDING);
		}
	}

	updateForm(patch: Partial<OnboardingViewState>): void {
		this.patchState(patch);
	}

	toggleIconDropdown = (): void => {
		this.patchState({ showIconDropdown: !this.snapshot().showIconDropdown });
	};

	selectIcon = (iconId: string): void => {
		const selectedIconId = this.iconOptions.some((option) => option.id === iconId)
			? iconId as OnboardingIconId
			: 'folder';
		this.patchState({ selectedIconId, showIconDropdown: false });
	};

	cancel = async (): Promise<void> => {
		await goto(ROUTES.SHELL);
	};

	openProjectFolder = async (): Promise<void> => {
		try {
			const path = await onboardingService.pickProjectDirectory();
			if (path) this.patchState({ path });
		} catch (error) {
			console.error('Failed to open dialog:', error);
		}
	};

	createProject = async (): Promise<void> => {
		const state = this.snapshot();
		if (!state.name.trim()) {
			this.patchState({ error: 'Project name is required' });
			return;
		}
		if (!state.path.trim()) {
			this.patchState({ error: 'Project path is required' });
			return;
		}

		this.patchState({ isSubmitting: true, error: '' });
		try {
			await onboardingService.createProject({
				name: state.name,
				description: state.description.trim() || null,
				color: hexToProjectColor(state.color),
				path: state.path,
				icon: state.selectedIconId,
				banner: null,
				template: 'blank'
			});
			await goto(ROUTES.SHELL);
		} catch (error) {
			this.patchState({
				error: error instanceof Error ? error.message : typeof error === 'string' ? error : 'Failed to create project'
			});
			console.error(error);
		} finally {
			this.patchState({ isSubmitting: false });
		}
	};

	private async loadProjectPresence(): Promise<void> {
		try {
			const projects = await onboardingService.getProjects();
			const hasProjects = Boolean(projects && projects.length > 0);
			onboardingState.update((state) => ({ ...state, hasProjects }));
			this.patchState({ hasProjects });
		} catch (error) {
			console.error('Failed to check projects', error);
		}
	}

	private patchState(patch: Partial<OnboardingViewState>): void {
		this.state.update((state) => ({ ...state, ...patch }));
	}

	private snapshot(): OnboardingViewState {
		let value!: OnboardingViewState;
		const unsubscribe = this.state.subscribe((state) => {
			value = state;
		});
		unsubscribe();
		return value;
	}
}

export const onboardingController = new OnboardingController();
