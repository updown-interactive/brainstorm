<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { Check, ChevronDown, Copy, Pencil, Search, Sparkles } from 'lucide-svelte';
  import mermaid from 'mermaid';
  import 'katex/dist/katex.min.css';
  import { escapeMessageText, renderMarkdown } from '../engine/markdown';
  import type { ChatFile, ChatProgress, ChatRun, ConversationMessage } from '../types';
  import { chatController } from '../controller';

  export let messages: ConversationMessage[] = [];
  export let conversationTitle = 'Conversation';
  export let emptyStatePrompt = 'What’s on your mind?';
  export let runStatus: ChatRun | null = null;
  export let createdFilesByMessage: Record<string, ChatFile[]> = {};
  let showRunDetails = false;
  let messageScroll: HTMLDivElement | undefined;
  let copiedMessageId: string | null = null;
  let previousMessageSnapshot = '';
  let lastRunStartedAt: number | null = null;
  $: visibleMessages = messages.filter((message) => message.role !== 'tool' && message.role !== 'system' && !message.content.startsWith('[tool_calls] '));
  $: latestUserMessageId = [...visibleMessages].reverse().find((message) => message.role === 'user')?.id ?? null;
  $: if (runStatus && runStatus.startedAt !== lastRunStartedAt) {
    lastRunStartedAt = runStatus.startedAt;
    showRunDetails = false;
  }

  afterUpdate(() => {
    if (!messageScroll) return;
    const messageSnapshot = `${runStatus?.durationMs ?? 0}:${runStatus?.steps.length ?? 0}:` + messages.map((message) => `${message.id}:${message.status}:${message.content}`).join('|');
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

  const stepLabel = (step: ChatProgress): string => {
    if (step.phase === 'thinking') return 'Thinking';
    if (step.phase === 'tool_completed') return `${toolLabel(step.toolName)} completed`;
    return toolLabel(step.toolName);
  };

  const toolLabel = (toolName: string | null): string => {
    const labels: Record<string, string> = { 'search.query': 'Read files', 'markdown.read': 'Read files', 'markdown.metadata': 'Read file metadata', 'markdown.links': 'Read links', 'markdown.headings': 'Read headings', 'vault.create_file': 'Create file', 'vault.create_folder': 'Create folder', 'vault.rename': 'Rename file', 'vault.move': 'Move file', 'vault.delete': 'Delete file', 'web.fetch': 'Read web page' };
    return toolName ? labels[toolName] ?? toolName : 'Using tool';
  };

  const durationLabel = (durationMs: number): string => {
    const seconds = Math.max(0, Math.round(durationMs / 1000));
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const runStatusForUser = (index: number): ChatRun | null => {
    const userMessage = visibleMessages[index];
    if (userMessage?.role !== 'user') return null;
    if (userMessage.id === latestUserMessageId && runStatus) return runStatus;
    const assistantMessage = visibleMessages.slice(index + 1).find((message) => message.role === 'assistant');
    return assistantMessage?.metadata?.workingHistory ?? null;
  };
</script>

<div class="chat-message-scroll" bind:this={messageScroll}>
  <div class="chat-message-column">
    {#if visibleMessages.length === 0}
      <div class="chat-empty-state">
        <div class="chat-empty-mark"><Sparkles size={24} /></div>
        <h2>{emptyStatePrompt}</h2>
      </div>
    {:else}
      <div class="chat-date-divider"><span>{conversationTitle}</span></div>
      {#each visibleMessages as message, index}
          <article class="chat-message {message.role === 'assistant' ? 'assistant-message' : 'user-message'}">
            <div class="message-body"><div class="message-markdown">{@html message.role === 'assistant' ? renderMarkdown(message.content) : `<p>${escapeMessageText(message.content)}</p>`}</div>{#if message.role === 'assistant'}<span class="message-status">{message.status}</span>{/if}</div>
            <button class="message-copy-button" type="button" aria-label="Copy message" title="Copy message" onclick={() => void copyMessage(message.id, message.content)}>{#if copiedMessageId === message.id}<Check size={12} />{:else}<Copy size={12} />{/if}</button>
          </article>
          {#if message.role === 'assistant' && createdFilesByMessage[message.id]?.length}
            <div class="chat-created-files">
              {#each createdFilesByMessage[message.id] as file}
                <button class="chat-created-file" type="button" onclick={() => chatController.openCreatedFile(file.path, file.name)}>
                  <Pencil size={14} /><span>Open {file.name}</span>
                </button>
              {/each}
            </div>
          {/if}
        {@const messageRunStatus = runStatusForUser(index)}
        {#if messageRunStatus}
          <section class="chat-run-status assistant-response-status" aria-live="polite">
            <button class="chat-run-header" type="button" onclick={() => showRunDetails = !showRunDetails} aria-expanded={showRunDetails}>
              <span>{messageRunStatus.completedAt ? `Worked for ${durationLabel(messageRunStatus.durationMs)}` : 'Working…'}</span>
              <ChevronDown size={17} class={showRunDetails ? '' : 'rotated'} />
            </button>
            {#if showRunDetails}
              <div class="chat-run-steps">
                {#each messageRunStatus.steps as step, stepIndex}
                  <div class="chat-run-step" class:is-current={!messageRunStatus.completedAt && stepIndex === messageRunStatus.steps.length - 1}>
                    {#if step.phase === 'thinking'}<Sparkles size={16} />{:else if step.phase === 'calling_tool'}<Search size={16} />{:else}<Pencil size={16} />{/if}
                    <span>{stepLabel(step)}{#if !messageRunStatus.completedAt && stepIndex === messageRunStatus.steps.length - 1}…{/if}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        {/if}
      {/each}
    {/if}
  </div>
</div>
