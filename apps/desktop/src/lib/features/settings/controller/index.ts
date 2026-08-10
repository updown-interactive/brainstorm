import { goto } from '$app/navigation';
import { get, writable } from 'svelte/store';
import { ROUTES } from '../../../app/routes';
import { layoutSettingsState, settingsState, type SettingsTab } from '../state';
import {
	hexToProjectColor,
	projectColorToHex,
	settingsFeatureService
} from '../data/settings-service';
import { settingsIconOptions } from '../config/constants';
import type { AppearanceSettingsState, GeneralSettingsForm, LayoutMode, SidepanelPosition, ToolbarPosition, SettingsIconId, SettingsViewState } from '../types';
import type { Project } from '../../../core/service/projectsService';

class SettingsController {
	private readonly state = writable<SettingsViewState>({
		activeTab: get(settingsState).activeTab,
		project: settingsFeatureService.getCurrentProject(),
		general: this.createGeneralForm(settingsFeatureService.getCurrentProject()),
		appearance: {
			currentTheme: 'dark',
			sidepanelMode: 'expanded',
			toolbarMode: 'expanded',
			sidepanelPosition: 'left',
			toolbarPosition: 'top',
			isLoading: true,
			error: ''
		}
	});

	readonly subscribe = this.state.subscribe;
	readonly iconOptions = settingsIconOptions;

	private unsubscribeSettingsState: (() => void) | null = null;
	private unsubscribeProjectState: (() => void) | null = null;

	mount(): void {
		this.unsubscribeSettingsState = settingsState.subscribe((state) => {
			this.patchState({ activeTab: state.activeTab });
		});
		this.unsubscribeProjectState = settingsFeatureService.subscribeToProject((project) => {
			const currentProjectId = this.snapshot().project?.id;
			this.patchState({
				project,
				general: currentProjectId === project?.id ? this.snapshot().general : this.createGeneralForm(project)
			});
		});
		void this.loadAppearance();
	}

	destroy(): void {
		this.unsubscribeSettingsState?.();
		this.unsubscribeSettingsState = null;
		this.unsubscribeProjectState?.();
		this.unsubscribeProjectState = null;
	}

	switchTab(tab: SettingsTab): void {
		settingsState.update((state) => ({ ...state, activeTab: tab }));
	}

	updateGeneralForm(patch: Partial<GeneralSettingsForm>): void {
		this.state.update((state) => ({
			...state,
			general: { ...state.general, ...patch }
		}));
	}

	toggleIconDropdown = (): void => {
		const form = this.snapshot().general;
		this.updateGeneralForm({ showIconDropdown: !form.showIconDropdown });
	};

	selectIcon = (icon: string): void => {
		const nextIcon = this.iconOptions.some((option) => option.id === icon) ? icon as SettingsIconId : 'folder';
		this.updateGeneralForm({ icon: nextIcon, showIconDropdown: false });
	};

	openDeleteConfirm = (): void => {
		this.updateGeneralForm({ showDeleteConfirm: true, deleteConfirmName: '' });
	};

	cancelDeleteConfirm = (): void => {
		this.updateGeneralForm({ showDeleteConfirm: false, deleteConfirmName: '' });
	};

	saveGeneralSettings = async (): Promise<void> => {
		const { project, general } = this.snapshot();
		if (!project) return;
		this.updateGeneralForm({ isSaving: true, error: '' });
		try {
			await settingsFeatureService.updateProject({
				id: project.id,
				name: general.name,
				description: general.description.trim() || null,
				icon: general.icon,
				color: hexToProjectColor(general.color)
			});
		} catch (error) {
			this.updateGeneralForm({
				error: error instanceof Error ? error.message : 'Failed to update project settings.'
			});
		} finally {
			this.updateGeneralForm({ isSaving: false });
		}
	};

	deleteProject = async (): Promise<void> => {
		const { project, general } = this.snapshot();
		if (!project || general.deleteConfirmName !== project.name) return;
		this.updateGeneralForm({ isSaving: true, error: '' });
		try {
			const nextProject = await settingsFeatureService.deleteProject(project.id);
			if (nextProject) {
				window.location.reload();
			} else {
				await goto(ROUTES.ONBOARDING);
			}
		} catch (error) {
			this.updateGeneralForm({
				error: error instanceof Error ? error.message : 'Failed to delete project.'
			});
		} finally {
			this.updateGeneralForm({ isSaving: false });
		}
	};

	copyToClipboard = async (text: string): Promise<void> => {
		try {
			await settingsFeatureService.copyToClipboard(text);
		} catch (error) {
			console.error('Failed to copy text:', error);
		}
	};

	loadAppearance = async (): Promise<void> => {
		this.patchAppearance({ isLoading: true, error: '' });
		try {
			const appearance = await settingsFeatureService.getAppearanceSettings();
			this.patchAppearance({
				currentTheme: appearance.theme,
				sidepanelMode: appearance.sidepanelMode,
				toolbarMode: appearance.toolbarMode,
				sidepanelPosition: appearance.sidepanelPosition,
				toolbarPosition: appearance.toolbarPosition,
				isLoading: false
			});
			layoutSettingsState.set({
				sidepanelMode: appearance.sidepanelMode,
				toolbarMode: appearance.toolbarMode,
				sidepanelPosition: appearance.sidepanelPosition,
				toolbarPosition: appearance.toolbarPosition
			});
		} catch (error) {
			this.patchAppearance({
				currentTheme: 'dark',
				sidepanelMode: 'expanded',
				toolbarMode: 'expanded',
				sidepanelPosition: 'left',
				toolbarPosition: 'top',
				isLoading: false,
				error: error instanceof Error ? error.message : 'Failed to load appearance settings.'
			});
		}
	};

	setTheme = async (theme: string): Promise<void> => {
		this.patchAppearance({ currentTheme: theme, error: '' });
		try {
			await settingsFeatureService.switchTheme(theme);
		} catch (error) {
			this.patchAppearance({
				error: error instanceof Error ? error.message : 'Failed to save theme.'
			});
		}
	};

	setDisplayMode = async (mode: 'normal' | 'fullscreen'): Promise<void> => {
		const layoutMode: LayoutMode = mode === 'fullscreen' ? 'hover' : 'expanded';
		this.patchAppearance({ sidepanelMode: layoutMode, toolbarMode: layoutMode, error: '' });
		layoutSettingsState.update((state) => ({ ...state, sidepanelMode: layoutMode, toolbarMode: layoutMode }));
		try {
			await Promise.all([
				settingsFeatureService.setSidepanelMode(layoutMode),
				settingsFeatureService.setToolbarMode(layoutMode)
			]);
		} catch (error) {
			this.patchAppearance({
				error: error instanceof Error ? error.message : 'Failed to save display mode setting.'
			});
		}
	};

	setSidepanelMode = async (mode: LayoutMode): Promise<void> => {
		this.patchAppearance({ sidepanelMode: mode, error: '' });
		layoutSettingsState.update((state) => ({ ...state, sidepanelMode: mode }));
		try {
			await settingsFeatureService.setSidepanelMode(mode);
		} catch (error) {
			this.patchAppearance({
				error: error instanceof Error ? error.message : 'Failed to save sidepanel setting.'
			});
		}
	};

	setToolbarMode = async (mode: LayoutMode): Promise<void> => {
		this.patchAppearance({ toolbarMode: mode, error: '' });
		layoutSettingsState.update((state) => ({ ...state, toolbarMode: mode }));
		try {
			await settingsFeatureService.setToolbarMode(mode);
		} catch (error) {
			this.patchAppearance({
				error: error instanceof Error ? error.message : 'Failed to save toolbar setting.'
			});
		}
	};

	setSidepanelPosition = async (position: SidepanelPosition): Promise<void> => {
		this.patchAppearance({ sidepanelPosition: position, error: '' });
		layoutSettingsState.update((state) => ({ ...state, sidepanelPosition: position }));
		try {
			await settingsFeatureService.setSidepanelPosition(position);
		} catch (error) {
			this.patchAppearance({
				error: error instanceof Error ? error.message : 'Failed to save sidepanel position.'
			});
		}
	};

	setToolbarPosition = async (position: ToolbarPosition): Promise<void> => {
		this.patchAppearance({ toolbarPosition: position, error: '' });
		layoutSettingsState.update((state) => ({ ...state, toolbarPosition: position }));
		try {
			await settingsFeatureService.setToolbarPosition(position);
		} catch (error) {
			this.patchAppearance({
				error: error instanceof Error ? error.message : 'Failed to save toolbar position.'
			});
		}
	};

	selectedIconOption(iconId?: string) {
		return this.iconOptions.find((option) => option.id === iconId) ?? this.iconOptions[0];
	}

	canDeleteProject(state = this.snapshot()): boolean {
		return Boolean(state.project?.name && state.general.deleteConfirmName === state.project.name);
	}

	private createGeneralForm(project: Project | null): GeneralSettingsForm {
		return {
			name: project?.name || '',
			description: project?.description || '',
			color: projectColorToHex(project?.color),
			icon: (project?.icon as SettingsIconId | null) || 'folder',
			showIconDropdown: false,
			showDeleteConfirm: false,
			deleteConfirmName: '',
			isSaving: false,
			error: ''
		};
	}

	private patchAppearance(patch: Partial<AppearanceSettingsState>): void {
		this.state.update((state) => ({
			...state,
			appearance: { ...state.appearance, ...patch }
		}));
	}

	private patchState(patch: Partial<SettingsViewState>): void {
		this.state.update((state) => ({ ...state, ...patch }));
	}

	private snapshot(): SettingsViewState {
		let value!: SettingsViewState;
		const unsubscribe = this.state.subscribe((state) => {
			value = state;
		});
		unsubscribe();
		return value;
	}
}

export const settingsController = new SettingsController();
