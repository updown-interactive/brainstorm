import type { onboardingIconOptions } from '../config/constants';

export type OnboardingIconId = typeof onboardingIconOptions[number]['id'];

export interface OnboardingViewState {
	hasProjects: boolean;
	name: string;
	description: string;
	color: string;
	path: string;
	selectedIconId: OnboardingIconId;
	showIconDropdown: boolean;
	isSubmitting: boolean;
	error: string;
}
