<script lang="ts">
  import { settingsController } from '../controller';
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
        <label for="color-theme">Color Theme</label>
        <p>Switch between dark mode and light mode globally across the application.</p>
      </div>
      <div class="settings-card-input">
        <select
          id="color-theme"
          class="input-field"
          value={$settingsController.appearance.currentTheme}
          disabled={$settingsController.appearance.isLoading}
          onchange={(event) => settingsController.setTheme(event.currentTarget.value)}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
    </div>
  </div>

  {#if $settingsController.appearance.error}
    <p class="settings-error">{$settingsController.appearance.error}</p>
  {/if}
</div>
