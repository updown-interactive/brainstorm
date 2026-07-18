import { writable } from "svelte/store";

export interface OnboardingState {
    loading: boolean;
    hasProjects: boolean;
}

export const onboardingState = writable<OnboardingState>({
    loading: false,
    hasProjects: false
});
