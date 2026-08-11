<script lang="ts">
  import { onMount } from 'svelte';
  import { Cpu, Key, ShieldCheck, ChevronDown, Check, Sparkles } from 'lucide-svelte';
  import { providersController } from '../controller/providers-controller';
  import LiquidGlassPanel from '$lib/shared/ui/LiquidGlassPanel.svelte';

  let providerId = 'google';
  let name = '';
  let model = 'gemini-2.0-flash';
  let apiKey = '';
  let baseUrl = '';
  let isSaving = false;
  let showProviderDropdown = false;
  let providerDropdownEl: HTMLDivElement;

  $: selectedDefinition = $providersController.definitions.find((definition) => definition.id === providerId);

  onMount(() => {
    void providersController.load();
    const closeOnOutsidePointer = (event: PointerEvent): void => {
      if (showProviderDropdown && providerDropdownEl && !providerDropdownEl.contains(event.target as Node)) {
        showProviderDropdown = false;
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
  });

  const toggleProviderDropdown = (event: Event): void => {
    event.stopPropagation();
    showProviderDropdown = !showProviderDropdown;
  };

  const selectProvider = (id: string, event: Event): void => {
    event.stopPropagation();
    providerId = id;
    if (id === 'grok') model = 'grok-3-mini';
    if (id === 'google') model = 'gemini-2.0-flash';
    showProviderDropdown = false;
  };

  const saveProvider = async (): Promise<void> => {
    isSaving = true;
    try {
      await providersController.add({ provider_id: providerId, name: name.trim(), model: model.trim(), api_key: apiKey, base_url: baseUrl.trim() || undefined });
      apiKey = '';
      name = '';
    } finally {
      isSaving = false;
    }
  };
</script>

{#if $providersController.error}
  <p class="settings-error">{$providersController.error}</p>
{/if}

<div class="settings-page">
  <div class="settings-page-header">
    <h1>AI Model Providers</h1>
    <p>Configure model inference providers, API credentials, and rate limits.</p>
  </div>

  <div class="settings-section-heading">Connected Providers</div>

  <div class="settings-card">
    {#each $providersController.configured as provider}
      <div class="settings-card-row">
        <div class="settings-card-label"><strong>{provider.name}</strong><p>{provider.provider_id} · {provider.model}</p></div>
        <button type="button" onclick={() => providersController.remove(provider.id)}>Remove</button>
      </div>
    {/each}
  </div>

  <div class="settings-section-heading">Add Provider</div>
  <form class="settings-card provider-form-card" onsubmit={(event) => { event.preventDefault(); void saveProvider(); }}>
    <div class="settings-card-row">
      <label for="provider-type">Provider</label>
      <div class="provider-dropdown-wrap" bind:this={providerDropdownEl}>
        <button
          type="button"
          id="provider-type"
          class="provider-dropdown-trigger"
          class:is-open={showProviderDropdown}
          onclick={toggleProviderDropdown}
          aria-expanded={showProviderDropdown}
          aria-haspopup="listbox"
        >
          <span class="provider-dropdown-value">
            {selectedDefinition?.name ?? 'Select provider'}
          </span>
          <ChevronDown size={14} class="provider-dropdown-arrow" />
        </button>

        {#if showProviderDropdown}
          <LiquidGlassPanel class="provider-dropdown-menu" role="listbox" aria-labelledby="provider-type">
            <div class="provider-dropdown-label">Choose provider</div>
            {#each $providersController.definitions as definition}
              <button
                type="button"
                class="provider-dropdown-item"
                class:is-selected={definition.id === providerId}
                role="option"
                aria-selected={definition.id === providerId}
                onclick={(event) => selectProvider(definition.id, event)}
              >
                <span class="provider-dropdown-copy">
                  <span class="provider-dropdown-name">{definition.name}</span>
                  <span class="provider-dropdown-description">{definition.description}</span>
                </span>
                {#if definition.id === providerId}<Check size={14} class="provider-dropdown-check" />{/if}
              </button>
            {/each}
          </LiquidGlassPanel>
        {/if}
      </div>
    </div>
    <div class="settings-card-row"><label for="provider-name">Name</label><input id="provider-name" bind:value={name} required /></div>
    <div class="settings-card-row"><label for="provider-model">Model</label><input id="provider-model" bind:value={model} required /></div>
    <div class="settings-card-row"><label for="provider-base-url">Base URL</label><input id="provider-base-url" bind:value={baseUrl} /></div>
    <div class="settings-card-row"><label for="provider-api-key">API key</label><input id="provider-api-key" type="password" autocomplete="off" bind:value={apiKey} /></div>
    <div class="provider-form-footer">
      <button class="save-provider-button" type="submit" disabled={isSaving}>
        <span class="save-provider-copy">
          <span>{isSaving ? 'Securing provider…' : 'Save provider'}</span>
        </span>
        <span class="save-provider-arrow">→</span>
      </button>
    </div>
  </form>

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

<style>
  .provider-dropdown-wrap {
    position: relative;
    min-width: 250px;
    z-index: 20;
  }

  .provider-form-card {
    overflow: visible;
    position: relative;
    z-index: 10;
  }

  .provider-dropdown-trigger {
    width: 100%;
    min-height: 34px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 7px 11px;
    border: 1px solid color-mix(in srgb, var(--colors-border) 60%, transparent);
    border-radius: 9px;
    background: color-mix(in srgb, var(--colors-surfaceVariant, #242428) 48%, transparent);
    color: var(--colors-text);
    font: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .provider-dropdown-trigger:hover,
  .provider-dropdown-trigger.is-open {
    background: color-mix(in srgb, var(--colors-hover) 72%, transparent);
    border-color: color-mix(in srgb, var(--colors-primary) 70%, transparent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--colors-primary) 12%, transparent);
  }

  .provider-dropdown-value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.provider-dropdown-arrow) {
    flex-shrink: 0;
    color: var(--colors-textMuted);
    transition: transform 0.2s ease;
  }

  .provider-dropdown-trigger.is-open :global(.provider-dropdown-arrow) {
    transform: rotate(180deg);
  }

  :global(.liquid-glass-panel.provider-dropdown-menu) {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 290px;
    z-index: 1000;
    padding: 6px;
    border-radius: 14px;
  }

  .provider-dropdown-label {
    padding: 5px 10px 7px;
    color: var(--colors-textMuted);
    font-size: 10px;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .provider-dropdown-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 10px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--colors-text);
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }

  .provider-dropdown-item:hover {
    background: color-mix(in srgb, var(--colors-hover) 75%, transparent);
  }

  .provider-dropdown-item.is-selected {
    background: color-mix(in srgb, var(--colors-primary) 18%, transparent);
  }

  .provider-dropdown-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .provider-dropdown-name {
    font-size: 13px;
    font-weight: 520;
  }

  .provider-dropdown-description {
    overflow: hidden;
    color: var(--colors-textMuted);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.provider-dropdown-check) {
    flex-shrink: 0;
    color: var(--colors-primary);
  }

  .provider-form-footer {
    display: flex;
    justify-content: flex-end;
    padding: 14px 16px 16px;
    background: color-mix(in srgb, var(--colors-background) 35%, transparent);
    border-top: 1px solid color-mix(in srgb, var(--colors-border) 25%, transparent);
  }

  .save-provider-button {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 224px;
    padding: 9px 12px 9px 10px;
    border: 1px solid color-mix(in srgb, var(--colors-primary) 55%, white 10%);
    border-radius: 12px;
    background: linear-gradient(135deg, var(--colors-primary, #0A84FF), color-mix(in srgb, var(--colors-primary, #0A84FF) 62%, #7B61FF));
    color: #fff;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
  }

  .save-provider-button:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: saturate(1.12) brightness(1.05);
    box-shadow: 0 11px 28px color-mix(in srgb, var(--colors-primary) 38%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.34);
  }

  .save-provider-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .save-provider-button:disabled {
    opacity: 0.65;
    cursor: wait;
  }

  .save-provider-icon {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.18);
  }

  .save-provider-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 1px;
    font-size: 13px;
    font-weight: 600;
  }

  .save-provider-copy small {
    font-size: 10px;
    font-weight: 450;
    opacity: 0.78;
  }

  .save-provider-arrow {
    font-size: 19px;
    line-height: 1;
    opacity: 0.9;
  }
</style>
