<script lang="ts">
  import { Archive, Menu, MessageSquare, MoreHorizontal, Plus, Search, Settings2, Trash2 } from 'lucide-svelte';
  import LiquidGlassPanel from '$lib/shared/ui/LiquidGlassPanel.svelte';
  import type { ConversationSummary } from '../types';
  import { renderMarkdown } from '../engine/markdown';

  export let conversations: ConversationSummary[] = [];
  export let activeConversationId: string | null = null;
  export let projectId = '';
  export let openConversationMenuId: string | null = null;
  export let onCreateConversation: () => void;
  export let onSelectConversation: (conversationId: string) => void;
  export let onToggleConversationMenu: (conversationId: string, event: Event) => void;
  export let onDeleteConversation: (conversationId: string, event: Event) => void;
  let conversationMenuPosition: { x: number; y: number } | null = null;

  const toggleConversationMenu = (conversationId: string, event: MouseEvent): void => {
    if (openConversationMenuId === conversationId) {
      conversationMenuPosition = null;
      onToggleConversationMenu(conversationId, event);
      return;
    }
    conversationMenuPosition = {
      x: event.clientX + 8,
      y: event.clientY + 8
    };
    onToggleConversationMenu(conversationId, event);
  };
</script>

<aside class="chat-history-panel">
  <div class="chat-history-header">
    <div class="chat-brand"><span>Brainstorm</span></div>
    <button class="chat-icon-button" type="button" aria-label="Collapse conversations" title="Collapse conversations"><Menu size={16} /></button>
  </div>

  <button class="new-conversation-button" type="button" onclick={onCreateConversation} disabled={!projectId}>
    <span class="new-conversation-icon"><Plus size={15} /></span>
    <span>New conversation</span>
    <span class="new-conversation-shortcut">⌘ N</span>
  </button>

  <label class="conversation-search">
    <Search size={14} />
    <input placeholder="Search conversations" aria-label="Search conversations" />
    <span>⌘ K</span>
  </label>

  <div class="conversation-list">
    <div class="conversation-group">
      <div class="conversation-group-label">Today</div>
      {#each conversations as conversation}
        <div class="conversation-item-row" class:has-open-menu={openConversationMenuId === conversation.id}>
          <button class="conversation-item" class:is-active={conversation.id === activeConversationId} type="button" onclick={() => onSelectConversation(conversation.id)}>
            <MessageSquare size={14} />
            <span class="conversation-item-copy"><span class="conversation-title-markdown">{@html renderMarkdown(conversation.title)}</span></span>
          </button>
          <div class="conversation-menu-wrap">
            <button class="conversation-menu-button" type="button" aria-label={`More options for ${conversation.title}`} title="Conversation options" aria-expanded={openConversationMenuId === conversation.id} onclick={(event) => toggleConversationMenu(conversation.id, event)}><MoreHorizontal size={14} /></button>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="history-footer">
    <button class="history-footer-button" type="button"><Archive size={14} /> Archived conversations</button>
    <button class="history-footer-button" type="button"><Settings2 size={14} /> Chat settings</button>
  </div>
</aside>

{#if openConversationMenuId}
  {@const openConversation = conversations.find((conversation) => conversation.id === openConversationMenuId)}
  {#if openConversation}
    <LiquidGlassPanel class="conversation-menu" role="menu" style={`position: fixed; top: ${conversationMenuPosition?.y ?? 8}px; left: ${conversationMenuPosition?.x ?? 8}px; min-width: 190px; z-index: 10000;`}>
      <button class="conversation-menu-item delete-action" type="button" role="menuitem" onclick={(event) => onDeleteConversation(openConversation.id, event)}><Trash2 size={13} /><span>Delete conversation</span></button>
    </LiquidGlassPanel>
  {/if}
{/if}
