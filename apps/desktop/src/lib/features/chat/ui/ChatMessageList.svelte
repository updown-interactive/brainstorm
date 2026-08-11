<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { Check, Copy, Sparkles } from 'lucide-svelte';
  import mermaid from 'mermaid';
  import 'katex/dist/katex.min.css';
  import { escapeMessageText, renderMarkdown } from '../engine/markdown';
  import type { ConversationMessage } from '../types';

  export let messages: ConversationMessage[] = [];
  export let conversationTitle = 'Conversation';
  export let emptyStatePrompt = 'What’s on your mind?';
  let messageScroll: HTMLDivElement | undefined;
  let copiedMessageId: string | null = null;
  let previousMessageSnapshot = '';

  afterUpdate(() => {
    if (!messageScroll) return;
    const messageSnapshot = messages.map((message) => `${message.id}:${message.status}:${message.content}`).join('|');
    if (messageSnapshot === previousMessageSnapshot) return;
    previousMessageSnapshot = messageSnapshot;
    requestAnimationFrame(() => { messageScroll?.scrollTo({ top: messageScroll.scrollHeight, behavior: 'auto' }); });
    void renderMermaidDiagrams();
  });

  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base' });

  const renderMermaidDiagrams = async (): Promise<void> => {
    const diagrams = messageScroll?.querySelectorAll('pre code.language-mermaid');
    if (!diagrams) return;
    for (const code of diagrams) {
      const parent = code.parentElement;
      if (!parent || parent.dataset.rendered === 'true') continue;
      const source = code.textContent ?? '';
      const id = `chat-mermaid-${Math.random().toString(36).slice(2)}`;
      try {
        const result = await mermaid.render(id, source);
        const container = document.createElement('div');
        container.className = 'mermaid-diagram';
        container.innerHTML = result.svg;
        parent.replaceWith(container);
      } catch {
        parent.dataset.rendered = 'true';
      }
    }
  };

  const copyMessage = async (messageId: string, content: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content);
      copiedMessageId = messageId;
      window.setTimeout(() => {
        if (copiedMessageId === messageId) copiedMessageId = null;
      }, 1400);
    } catch {
      copiedMessageId = null;
    }
  };
</script>

<div class="chat-message-scroll" bind:this={messageScroll}>
  <div class="chat-message-column">
    {#if messages.length === 0}
      <div class="chat-empty-state">
        <div class="chat-empty-mark"><Sparkles size={24} /></div>
        <h2>{emptyStatePrompt}</h2>
      </div>
    {:else}
      <div class="chat-date-divider"><span>{conversationTitle}</span></div>
      {#each messages as message}
        <article class="chat-message {message.role === 'assistant' ? 'assistant-message' : 'user-message'}">
          <div class="message-body"><div class="message-markdown">{@html message.role === 'assistant' ? renderMarkdown(message.content) : `<p>${escapeMessageText(message.content)}</p>`}</div>{#if message.role === 'assistant'}<span class="message-status">{message.status}</span>{/if}</div>
          <button class="message-copy-button" type="button" aria-label="Copy message" title="Copy message" onclick={() => void copyMessage(message.id, message.content)}>{#if copiedMessageId === message.id}<Check size={12} />{:else}<Copy size={12} />{/if}</button>
        </article>
      {/each}
    {/if}
  </div>
</div>
