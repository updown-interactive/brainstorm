import darkTheme from './themes/dark.json';
import lightTheme from './themes/light.json';
import { settingsService } from '../service/settingsService';

type Theme = typeof darkTheme;
const themes: Record<string, Theme> = {
  dark: darkTheme,
  light: lightTheme
};

class ThemeManager {
  private flattenObject(obj: any, prefix = ''): Record<string, string | number> {
    let flattened: Record<string, string | number> = {};
    
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const nested = this.flattenObject(obj[key], `${prefix}${key}-`);
        flattened = { ...flattened, ...nested };
      } else {
        flattened[`${prefix}${key}`] = obj[key];
      }
    }
    
    return flattened;
  }

  async init(): Promise<void> {
    const settings = await settingsService.getSettings();
    this.applyTheme(settings.theme || 'dark');
  }

  applyTheme(themeId: string): void {
    const theme = themes[themeId] || themes.dark;
    
    // Ignore meta properties like id and name
    const { id, name, ...themeData } = theme;
    
    const flattened = this.flattenObject(themeData);
    
    const root = document.documentElement;
    for (const [key, value] of Object.entries(flattened)) {
      // e.g. colors-background -> --colors-background
      // for spacing and radius, append 'px' if it's a number
      let finalValue = value.toString();
      if (typeof value === 'number' && (key.startsWith('spacing-') || key.startsWith('radius-') || key.startsWith('typography-'))) {
          // If it's typography and not a size, don't append px, but we structured typography sizes as numbers
          finalValue = `${value}px`;
      }
      
      root.style.setProperty(`--${key}`, finalValue);
    }
    
    // Optionally set color-scheme for native scrollbars/inputs
    root.style.setProperty('color-scheme', themeId === 'light' ? 'light' : 'dark');
  }

  async switchTheme(themeId: string): Promise<void> {
    this.applyTheme(themeId);
    await settingsService.updateSetting('theme', themeId);
  }
}

export const themeManager = new ThemeManager();
