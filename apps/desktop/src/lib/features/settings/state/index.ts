import { writable } from 'svelte/store';

export type SettingsTab = 'general' | 'providers' | 'configurations' | 'appearance';

export interface SettingsState {
  activeTab: SettingsTab;
}

export const settingsState = writable<SettingsState>({
  activeTab: 'general'
});

export interface LayoutSettingsState {
  sidepanelMode: import('../types').LayoutMode;
  toolbarMode: import('../types').LayoutMode;
  sidepanelPosition: import('../types').SidepanelPosition;
  toolbarPosition: import('../types').ToolbarPosition;
}

export const layoutSettingsState = writable<LayoutSettingsState>({
  sidepanelMode: 'expanded',
  toolbarMode: 'expanded',
  sidepanelPosition: 'left',
  toolbarPosition: 'top'
});
