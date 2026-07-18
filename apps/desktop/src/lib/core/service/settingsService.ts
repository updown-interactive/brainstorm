import { invoke } from '@tauri-apps/api/core';

export interface Settings {
  theme: string;
  [key: string]: any;
}

class SettingsService {
  private cache: Settings | null = null;

  async getSettings(): Promise<Settings> {
    if (this.cache) return this.cache;
    
    try {
      const settings = await invoke<Settings>('get_settings');
      this.cache = settings;
      return settings;
    } catch (e) {
      console.error('Failed to get settings:', e);
      return { theme: 'dark' };
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    this.cache = settings;
    try {
      await invoke('save_settings', { settings });
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  async updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    const current = await this.getSettings();
    await this.saveSettings({ ...current, [key]: value });
  }
}

export const settingsService = new SettingsService();
