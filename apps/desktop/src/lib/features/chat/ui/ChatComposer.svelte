<script lang="ts">
  import { Bot, ChevronDown, Paperclip, Send, Sparkles, Square } from 'lucide-svelte';
  import LiquidGlassPanel from '$lib/shared/ui/LiquidGlassPanel.svelte';
  import type { ProviderConfig } from '../../settings/types/providers';

  export let draft = '';
  export let configuredProviders: ProviderConfig[] = [];
  export let selectedProviderId = '';
  export let selectedProvider: ProviderConfig | undefined;
  export let selectedAgent = 'Cerebrum';
  export let onSubmit: () => void;
  let isProviderMenuOpen = false;
  let isAgentMenuOpen = false;
  let composerTextarea: HTMLTextAreaElement | undefined;

  const selectProvider = (providerId: string): void => {
    selectedProviderId = providerId;
    isProviderMenuOpen = false;
  };

  const resizeComposer = (textarea: HTMLTextAreaElement | undefined = composerTextarea): void => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    const minimumHeight = 28;
    const maximumHeight = 166;
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minimumHeight), maximumHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maximumHeight ? 'auto' : 'hidden';
  };

  const handleSubmit = (): void => {
    onSubmit();
    resizeComposer();
  };
</script>

<div class="chat-composer-area">
  <div class="composer-shell">
    <textarea bind:this={composerTextarea} bind:value={draft} placeholder="Message Brainstorm..." aria-label="Message Brainstorm" rows="1" oninput={(event) => resizeComposer(event.currentTarget instanceof HTMLTextAreaElement ? event.currentTarget : undefined)} onkeydown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSubmit(); } }}></textarea>
    <div class="composer-toolbar">
      <div class="composer-tools"><button type="button" class="composer-tool-button"><Paperclip size={15} /> Attach</button><button type="button" class="composer-tool-button"><Bot size={15} /> Tools</button></div>
      <div class="composer-selectors">
        <div class="selector-wrap">
          <button class="selector-button" type="button" onclick={() => isAgentMenuOpen = !isAgentMenuOpen} aria-expanded={isAgentMenuOpen}><Bot size={14} /><span>{selectedAgent}</span><ChevronDown size={13} /></button>
          {#if isAgentMenuOpen}<div class="selector-menu-overlay"><LiquidGlassPanel class="selector-menu"><button type="button" class="selector-menu-item is-selected" onclick={() => { selectedAgent = 'Cerebrum'; isAgentMenuOpen = false; }}><Bot size={14} /><span><strong>Cerebrum</strong><small>Orchestrator</small></span></button><button type="button" class="selector-menu-item" onclick={() => { selectedAgent = 'Cortex'; isAgentMenuOpen = false; }}><Sparkles size={14} /><span><strong>Cortex</strong><small>Deep reasoning</small></span></button></LiquidGlassPanel></div>{/if}
        </div>
        <div class="selector-wrap">
          <button class="selector-button provider-selector" type="button" onclick={() => isProviderMenuOpen = !isProviderMenuOpen} aria-expanded={isProviderMenuOpen}><span class="provider-status-dot" class:has-provider={selectedProvider}></span><span>{selectedProvider?.name ?? 'No provider'}</span><ChevronDown size={13} /></button>
          {#if isProviderMenuOpen}<div class="selector-menu-overlay"><LiquidGlassPanel class="selector-menu"><div class="selector-menu-label">Model provider</div>{#if configuredProviders.length === 0}<div class="selector-empty">Configure a provider in Settings.</div>{:else}{#each configuredProviders as provider}<button type="button" class="selector-menu-item" class:is-selected={selectedProvider?.id === provider.id} onclick={() => selectProvider(provider.id)}><span class="provider-status-dot has-provider"></span><span><strong>{provider.name}</strong><small>{provider.model}</small></span></button>{/each}{/if}</LiquidGlassPanel></div>{/if}
        </div>
        <button class="send-button" type="button" aria-label="Send message" onclick={handleSubmit} disabled={!draft.trim()}>{#if draft.trim()}<Send size={16} />{:else}<Square size={13} />{/if}</button>
      </div>
    </div>
  </div>
</div>
