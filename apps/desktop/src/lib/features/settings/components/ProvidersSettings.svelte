<script lang="ts">
  import { Cpu, Key, ShieldCheck } from 'lucide-svelte';
</script>

<div class="settings-page">
  <div class="settings-page-header">
    <h1>AI Model Providers</h1>
    <p>Configure model inference providers, API credentials, and rate limits.</p>
  </div>

  <div class="settings-section-heading">Connected Providers</div>

  <div class="settings-card">
    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="provider-local">
          <Cpu size={15} style="color: var(--colors-primary, #0A84FF);" />
          Local Runtime / Ollama
        </label>
        <p>Inference engine running locally on your computer.</p>
      </div>
      <div class="settings-card-input">
        <span style="font-size: 12px; font-weight: 500; color: #30D158; display: flex; align-items: center; gap: 4px;">
          <ShieldCheck size={14} /> Active
        </span>
      </div>
    </div>

    <div class="settings-card-row">
      <div class="settings-card-label">
        <label for="provider-key">
          <Key size={15} style="color: var(--colors-primary, #0A84FF);" />
          Cloud API Access
        </label>
        <p>Managed cloud endpoints for high-throughput model inference.</p>
      </div>
      <div class="settings-card-input">
        <span style="font-size: 12px; color: var(--colors-textMuted);">System Default</span>
      </div>
    </div>
  </div>
</div>
