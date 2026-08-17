<script lang="ts">
  import { onMount } from 'svelte';
  import { Cpu, Key, ShieldCheck, ChevronDown, Check, Pencil, X } from 'lucide-svelte';
  import { providersController } from '../controller/providers-controller';

  let providerId = 'google';
  let name = '';
  let model = 'gemini-2.0-flash';
  let apiKey = '';
  let baseUrl = '';
  let isSaving = false;
  let editingProviderId: string | null = null;
  let showProviderDropdown = false;
  let providerDropdownEl: HTMLDivElement;

  $: selectedDefinition = $providersController.definitions.find((definition) => definition.id === providerId);

  const applyProviderDefaults = (id: string): void => {
    const definition = providersController.snapshot().definitions.find((item) => item.id === id);
    baseUrl = definition?.default_base_url ?? '';
    model = definition?.models[0] ?? '';
  };

  onMount(() => {
    void providersController.load().then(() => applyProviderDefaults(providerId));
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
    applyProviderDefaults(id);
    showProviderDropdown = false;
  };

  const resetForm = (): void => {
    editingProviderId = null;
    providerId = 'google';
    name = '';
    model = '';
    apiKey = '';
    baseUrl = '';
    applyProviderDefaults(providerId);
  };

  const editProvider = (provider: typeof $providersController.configured[number]): void => {
    editingProviderId = provider.id;
    providerId = provider.provider_id;
    name = provider.name;
    model = provider.model;
    baseUrl = provider.base_url ?? '';
    apiKey = '';
    showProviderDropdown = false;
  };

  const saveProvider = async (): Promise<void> => {
    isSaving = true;
    try {
      if (editingProviderId) {
        await providersController.update({ id: editingProviderId, name: name.trim(), model: model.trim(), api_key: apiKey.trim() || undefined, base_url: baseUrl.trim() || undefined });
      } else {
        await providersController.add({ provider_id: providerId, name: name.trim(), model: model.trim(), api_key: apiKey, base_url: undefined });
      }
      resetForm();
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
        <div class="connected-provider-actions"><button type="button" class="connected-provider-edit" onclick={() => editProvider(provider)}><Pencil size={13} /> Edit</button><button type="button" onclick={() => providersController.remove(provider.id)}>Remove</button></div>
      </div>
    {/each}
  </div>

  <div class="settings-section-heading">{editingProviderId ? 'Edit Provider' : 'Add Provider'}</div>
  <form class="settings-card provider-form-card" onsubmit={(event) => { event.preventDefault(); void saveProvider(); }}>
    <div class="settings-card-row">
      <label for="provider-type">Provider</label>
      <div class="provider-dropdown-wrap" bind:this={providerDropdownEl}>
        <button
          type="button"
          id="provider-type"
          class="provider-dropdown-trigger"
          disabled={editingProviderId !== null}
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
          <div class="provider-dropdown-menu" role="listbox" aria-labelledby="provider-type">
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
          </div>
        {/if}
      </div>
    </div>
    <div class="settings-card-row"><label for="provider-name">Name</label><input id="provider-name" bind:value={name} required /></div>
    <div class="settings-card-row">
      <label for="provider-model">Model</label>
      {#if selectedDefinition?.models.length}
        <select id="provider-model" class="provider-model-select" bind:value={model} required>
          {#each selectedDefinition.models as providerModel}
            <option value={providerModel}>{providerModel}</option>
          {/each}
        </select>
      {:else}
        <input id="provider-model" bind:value={model} placeholder="Discovered by provider" required />
      {/if}
    </div>
    <div class="settings-card-row"><label for="provider-base-url">Base URL</label><input id="provider-base-url" value={baseUrl} readonly aria-readonly="true" /></div>
    <div class="settings-card-row"><label for="provider-api-key">API key</label><input id="provider-api-key" type="password" autocomplete="off" bind:value={apiKey} /></div>
    <div class="provider-form-footer">
      <button class="save-provider-button" type="submit" disabled={isSaving}>
        <span class="save-provider-copy">
          <span>{isSaving ? (editingProviderId ? 'Updating provider…' : 'Securing provider…') : (editingProviderId ? 'Update provider' : 'Save provider')}</span>
        </span>
        <span class="save-provider-arrow">→</span>
      </button>
      {#if editingProviderId}<button class="provider-cancel-button" type="button" onclick={resetForm} disabled={isSaving}><X size={14} /> Cancel</button>{/if}
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

  .provider-dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 290px;
    z-index: 1000;
    padding: 6px;
    border-radius: 14px;
    background: var(--colors-surface, #1c1c1e);
    border: 1px solid color-mix(in srgb, var(--colors-border, #3a3a3c) 80%, transparent);
    color: var(--colors-text, #f5f5f7);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
    box-sizing: border-box;
  }

  .provider-dropdown-label {
    padding: 5px 10px 7px;
    color: var(--colors-textMuted, #a1a1a6);
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
    color: var(--colors-text, #f5f5f7) !important;
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
    color: var(--colors-text, #f5f5f7);
  }

  .provider-dropdown-description {
    overflow: hidden;
    color: var(--colors-textMuted, #a1a1a6);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .provider-model-select {
    width: 250px;
    min-height: 34px;
    padding: 7px 11px;
    border: 1px solid color-mix(in srgb, var(--colors-border) 60%, transparent);
    border-radius: 9px;
    background: color-mix(in srgb, var(--colors-surfaceVariant, #242428) 48%, transparent);
    color: var(--colors-text, #f5f5f7);
    font: inherit;
    font-size: 13px;
  }

  :global(.provider-dropdown-check) {
    flex-shrink: 0;
    color: var(--colors-primary);
  }

  .provider-form-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
    padding: 14px 16px 16px;
    background: color-mix(in srgb, var(--colors-background) 35%, transparent);
    border-top: 1px solid color-mix(in srgb, var(--colors-border) 25%, transparent);
  }

  .connected-provider-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .connected-provider-edit {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .provider-cancel-button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 8px 10px;
    border: 1px solid color-mix(in srgb, var(--colors-border) 55%, transparent);
    border-radius: 9px;
    background: transparent;
    color: var(--colors-textMuted);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
  }

  .provider-cancel-button:hover:not(:disabled) {
    background: var(--colors-hover);
    color: var(--colors-text);
  }

  .provider-dropdown-trigger:disabled {
    opacity: 0.65;
    cursor: not-allowed;
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

  .save-provider-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 1px;
    font-size: 13px;
    font-weight: 600;
  }

  .save-provider-arrow {
    font-size: 19px;
    line-height: 1;
    opacity: 0.9;
  }
</style>
