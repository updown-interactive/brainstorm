import { writable } from 'svelte/store';

export type SettingsTab = 'general' | 'providers' | 'configurations' | 'appearance';

export interface SettingsState {
  activeTab: SettingsTab;
}

export const settingsState = writable<SettingsState>({
  activeTab: 'general'
});
