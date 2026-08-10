import type { Project } from '../../../core/service/projectsService';
import type { SettingsTab } from '../state';
import type { settingsIconOptions } from '../config/constants';

export type SettingsIconId = typeof settingsIconOptions[number]['id'];

export interface GeneralSettingsForm {
	name: string;
	description: string;
	color: string;
	icon: SettingsIconId;
	showIconDropdown: boolean;
	showDeleteConfirm: boolean;
	deleteConfirmName: string;
	isSaving: boolean;
	error: string;
}

export type LayoutMode = 'expanded' | 'hover';
export type SidepanelPosition = 'left' | 'right';
export type ToolbarPosition = 'top' | 'bottom';

export interface AppearanceSettingsState {
	currentTheme: string;
	sidepanelMode: LayoutMode;
	toolbarMode: LayoutMode;
	sidepanelPosition: SidepanelPosition;
	toolbarPosition: ToolbarPosition;
	isLoading: boolean;
	error: string;
}

export interface SettingsViewState {
	activeTab: SettingsTab;
	project: Project | null;
	general: GeneralSettingsForm;
	appearance: AppearanceSettingsState;
}
