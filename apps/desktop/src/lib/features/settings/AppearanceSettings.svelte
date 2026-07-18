<script lang="ts">
  import { onMount } from 'svelte';
  import { settingsService } from '$lib/core/service/settingsService';
  import { themeManager } from '../../core/theme/ThemeManager';
  
  let currentTheme = 'dark';
  
  onMount(async () => {
    const settings = await settingsService.getSettings();
    currentTheme = settings.theme || 'dark';
  });
  
  async function handleThemeChange() {
    await themeManager.switchTheme(currentTheme);
  }
</script>

<div class="settings-page">
  <div class="settings-page-header">
    <h1>Appearance</h1>
    <p>Customize the visual theme and layout of the application.</p>
  </div>

  <h2 class="settings-section-heading">Theme settings</h2>

  <div class="settings-card">
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label>Color Theme</label>
        <p>Switch between dark mode and light mode globally across the application.</p>
      </div>
      <div class="settings-card-input">
        <select class="input-field" bind:value={currentTheme} onchange={handleThemeChange}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
    </div>
  </div>
</div>
