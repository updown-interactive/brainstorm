<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { BookOpen, ChevronDown, Paperclip, Send, Square, Sparkles } from 'lucide-svelte';
  import LiquidGlassPanel from '$lib/shared/ui/LiquidGlassPanel.svelte';
  import type { ProviderConfig } from '../../settings/types/providers';
  import type { ChatMode, ConversationMessage, PlanOption } from '../types';
  import { CHAT_MODES } from '../types';

  export let draft = '';
  export let configuredProviders: ProviderConfig[] = [];
  export let selectedProviderId = '';
  export let selectedProvider: ProviderConfig | undefined;
  export let selectedMode: ChatMode = 'normal';
  export let messages: ConversationMessage[] = [];
  export let planOptions: PlanOption[] = [];
  export let onSelectPlanOption: (option: PlanOption) => void = () => {};
  export let onSubmit: () => void;
  let isProviderMenuOpen = false;
  let isModeMenuOpen = false;
  let composerTextarea: HTMLTextAreaElement | undefined;
  let showMentionMenu = false;
  let mentionMatches: ConversationMessage[] = [];
  let mentionStart = -1;
  let mentionEnd = -1;
  let selectedMentionIndex = 0;
  let focusComposerAfterMention = false;

  const selectProvider = (providerId: string): void => {
    selectedProviderId = providerId;
    isProviderMenuOpen = false;
  };

  const modeLabels: Record<ChatMode, { label: string; description: string }> = {
    normal: { label: 'Normal', description: 'Natural conversation' },
    plan: { label: 'Plan', description: 'Clarify before acting' },
    research: { label: 'Research', description: 'Investigate deeply' }
  };

  const modeIcon = (mode: ChatMode) => mode === 'research' ? BookOpen : mode === 'plan' ? Sparkles : Send;

  const cycleMode = (): void => {
    const currentIndex = CHAT_MODES.indexOf(selectedMode);
    selectedMode = CHAT_MODES[(currentIndex + 1) % CHAT_MODES.length];
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
    showMentionMenu = false;
    onSubmit();
    requestAnimationFrame(() => resizeComposer());
  };

  const updateMentionMatches = (): void => {
    const cursor = composerTextarea?.selectionStart ?? draft.length;
    const beforeCursor = draft.slice(0, cursor);
    const mentionMatch = beforeCursor.match(/(?:^|\s)#([^\s#]*)$/);
    if (!mentionMatch) {
      showMentionMenu = false;
      mentionMatches = [];
      return;
    }

    const query = mentionMatch[1].toLocaleLowerCase();
    mentionStart = cursor - mentionMatch[0].length + mentionMatch[0].lastIndexOf('#');
    mentionEnd = cursor;
    mentionMatches = messages
      .filter((message) => message.role === 'assistant')
      .filter((message) => responseShortName(message.content).toLocaleLowerCase().includes(query))
      .slice(0, 8);
    selectedMentionIndex = Math.min(selectedMentionIndex, Math.max(mentionMatches.length - 1, 0));
    showMentionMenu = mentionMatches.length > 0;
  };

  const responseShortName = (content: string): string => {
    const line = content
      .replace(/<!--\s*brainstorm-plan-data\s*[\s\S]*?-->/gi, '')
      .split(/\r?\n/)
      .map((item) => item.replace(/^\s{0,3}(?:#{1,6}\s+|[-*+]\s+)/, '').replace(/[*_`]/g, '').trim())
      .find(Boolean);
    if (!line) return 'Assistant response';
    return line.length > 56 ? `${line.slice(0, 53).trimEnd()}…` : line;
  };

  const selectMention = (message: ConversationMessage): void => {
    const replacement = `#${responseShortName(message.content)} `;
    draft = `${draft.slice(0, mentionStart)}${replacement}${draft.slice(mentionEnd)}`;
    showMentionMenu = false;
    focusComposerAfterMention = true;
  };

  const handleComposerInput = (event: Event): void => {
    resizeComposer(event.currentTarget instanceof HTMLTextAreaElement ? event.currentTarget : undefined);
    updateMentionMatches();
  };

  const handleComposerKeydown = (event: KeyboardEvent): void => {
    if (showMentionMenu && mentionMatches.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedMentionIndex = (selectedMentionIndex + 1) % mentionMatches.length;
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedMentionIndex = (selectedMentionIndex - 1 + mentionMatches.length) % mentionMatches.length;
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        selectMention(mentionMatches[selectedMentionIndex]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        showMentionMenu = false;
        return;
      }
    }

    if (event.key === 'Tab' && event.shiftKey) {
      event.preventDefault();
      cycleMode();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  afterUpdate(() => {
    if (!draft.trim()) resizeComposer();
    if (focusComposerAfterMention && composerTextarea) {
      const cursor = draft.length;
      composerTextarea.focus();
      composerTextarea.setSelectionRange(cursor, cursor);
      focusComposerAfterMention = false;
      resizeComposer();
    }
  });

</script>

<div class="chat-composer-area">
  <div class="composer-shell">
    {#if selectedMode === 'plan' && planOptions.length > 0}
      <div class="composer-plan-options" aria-label="Plan options">
        <span class="composer-plan-options-label">Choose a direction</span>
        {#each planOptions as option, index}
          <button class="composer-plan-option" type="button" onclick={() => onSelectPlanOption(option)}>
            <span class="composer-plan-option-index">{index + 1}</span>
            <span class="composer-plan-option-copy"><strong>{option.title}</strong>{#if option.description}<small>{option.description}</small>{/if}</span>
          </button>
        {/each}
      </div>
    {/if}
    <div class="composer-input-wrap">
      <textarea bind:this={composerTextarea} bind:value={draft} placeholder="Message Brainstorm..." aria-label="Message Brainstorm" rows="1" oninput={handleComposerInput} onkeydown={handleComposerKeydown}></textarea>
      {#if showMentionMenu}
        <LiquidGlassPanel class="composer-mention-menu" role="listbox" aria-label="Conversation mentions">
          <div class="composer-mention-label">Mention a conversation</div>
          {#each mentionMatches as message, index}
            <button type="button" class="composer-mention-item" class:is-selected={index === selectedMentionIndex} role="option" aria-selected={index === selectedMentionIndex} onclick={() => selectMention(message)}>
              <span class="composer-mention-hash">#</span>
              <span class="composer-mention-copy"><strong>{responseShortName(message.content)}</strong><small>Assistant response</small></span>
            </button>
          {/each}
        </LiquidGlassPanel>
      {/if}
    </div>
    <div class="composer-toolbar">
      <div class="composer-tools"><button type="button" class="composer-tool-button"><Paperclip size={15} /> Attach</button></div>
      <div class="composer-selectors">
        <div class="selector-wrap">
          <button class="selector-button" type="button" onclick={() => isModeMenuOpen = !isModeMenuOpen} aria-label="Chat mode" aria-expanded={isModeMenuOpen}><Sparkles size={14} /><span>{modeLabels[selectedMode].label}</span><ChevronDown size={13} /></button>
          {#if isModeMenuOpen}<div class="selector-menu-overlay"><LiquidGlassPanel class="selector-menu"><div class="selector-menu-label">Chat mode <small>Shift + Tab to switch</small></div>{#each CHAT_MODES as mode}{@const ModeIcon = modeIcon(mode)}<button type="button" class="selector-menu-item" class:is-selected={selectedMode === mode} onclick={() => { selectedMode = mode; isModeMenuOpen = false; }}><ModeIcon size={14} /><span><strong>{modeLabels[mode].label}</strong><small>{modeLabels[mode].description}</small></span></button>{/each}</LiquidGlassPanel></div>{/if}
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
