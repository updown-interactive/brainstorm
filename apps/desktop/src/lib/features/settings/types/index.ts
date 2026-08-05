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

export interface AppearanceSettingsState {
	currentTheme: string;
	isLoading: boolean;
	error: string;
}

export interface SettingsViewState {
	activeTab: SettingsTab;
	project: Project | null;
	general: GeneralSettingsForm;
	appearance: AppearanceSettingsState;
}
