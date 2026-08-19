<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { Check, Copy, FilePlus, Sparkles } from 'lucide-svelte';
  import mermaid from 'mermaid';
  import 'katex/dist/katex.min.css';
  import { escapeMessageText, renderMarkdown } from '../engine/markdown';
  import { parseFrontmatter } from '../../markdown';
  import type { ConversationMessage } from '../types';
  import KnowledgeCreateDialog from './KnowledgeCreateDialog.svelte';

  export let messages: ConversationMessage[] = [];
  export let conversationTitle = 'Conversation';
  export let emptyStatePrompt = 'What’s on your mind?';
  export let projectPath = '';
  export let onCreateKnowledgeFolder: (relativePath: string) => Promise<void>;
  export let providerConfigId = '';
  export let model = '';
  export let onCreateKnowledgeDraft: (args: { title: string; response: string; messageId: string; providerConfigId?: string; model?: string }) => Promise<{ absolutePath: string; relativePath: string; title: string; content: string; properties: Record<string, unknown> }>;
  export let onCreateKnowledgeResponse: (args: { title: string; response: string; messageId: string; providerConfigId?: string; model?: string }) => Promise<{ message: ConversationMessage; draft: { absolutePath: string; relativePath: string; content: string; properties: Record<string, unknown> }; title: string }>;
  export let onPreviewKnowledge: (args: { message: ConversationMessage }) => Promise<{ absolutePath: string; relativePath: string; content: string; properties: Record<string, unknown> }>;
  export let onFinalizeKnowledgeNote: (args: { sourcePath: string; folderPath: string; title: string; content: string }) => Promise<void>;
  export let onDeleteKnowledgeDraft: (path: string) => Promise<void>;
  let messageScroll: HTMLDivElement | undefined;
  let messageColumn: HTMLDivElement | undefined;
  let copiedMessageId: string | null = null;
  let previousMessageSnapshot = '';
  let knowledgeMessage: ConversationMessage | null = null;
  let knowledgeDraft: { absolutePath: string; relativePath: string; content: string; properties: Record<string, unknown> } | null = null;
  let knowledgePreview: { message: ConversationMessage; draft: { absolutePath: string; relativePath: string; content: string; properties: Record<string, unknown> }; title: string } | null = null;
  let creatingKnowledgeMessageId: string | null = null;
  let highlightedMessageId: string | null = null;
  let preserveScrollTop: number | null = null;
  let restoreScrollFrames = 0;

  const preserveChatScroll = (): void => {
    preserveScrollTop = Math.max(messageScroll?.scrollTop ?? 0, messageColumn?.scrollTop ?? 0);
    restoreScrollFrames = 4;
  };

  const restoreChatScroll = (): void => {
    if (preserveScrollTop === null) return;
    if (messageScroll) messageScroll.scrollTop = preserveScrollTop;
    if (messageColumn) messageColumn.scrollTop = preserveScrollTop;
    restoreScrollFrames -= 1;
    if (restoreScrollFrames > 0) {
      requestAnimationFrame(restoreChatScroll);
    } else {
      preserveScrollTop = null;
    }
  };

  afterUpdate(() => {
    if (!messageScroll) return;
    if (preserveScrollTop !== null) {
      requestAnimationFrame(restoreChatScroll);
      return;
    }
    const messageSnapshot = messages.map((message) => `${message.id}:${message.status}:${message.content}`).join('|');
    if (messageSnapshot === previousMessageSnapshot) return;
    previousMessageSnapshot = messageSnapshot;
    requestAnimationFrame(() => {
      const scroller = knowledgeMessage ? messageColumn : messageScroll;
      scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
    });
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
      const readableContent = displayMessageContent(content);
      await navigator.clipboard.writeText(readableContent);
      copiedMessageId = messageId;
      window.setTimeout(() => {
        if (copiedMessageId === messageId) copiedMessageId = null;
      }, 1400);
    } catch {
      copiedMessageId = null;
    }
  };

  const displayMessageContent = (content: string): string => {
    const withoutStructuredOptions = content.replace(/<!--\s*brainstorm-plan-data\s*[\s\S]*?-->/gi, '').trim();
    const optionsHeading = withoutStructuredOptions.search(/(?:^|\n)#{0,6}\s*options\s*:?\s*(?:\n|$)/i);
    return optionsHeading === -1
      ? withoutStructuredOptions
      : withoutStructuredOptions.slice(0, optionsHeading).trim();
  };

  const responseShortName = (content: string): string => {
    const line = displayMessageContent(content)
      .split(/\r?\n/)
      .map((item) => item.replace(/^\s{0,3}(?:#{1,6}\s+|[-*+]\s+)/, '').replace(/[*_`]/g, '').trim())
      .find(Boolean);
    if (!line) return 'Assistant response';
    return line.length > 56 ? `${line.slice(0, 53).trimEnd()}…` : line;
  };

  const scrollToSourceResponse = (requestMessageId: string): void => {
    const requestIndex = messages.findIndex((message) => message.id === requestMessageId);
    const requestMessage = requestIndex === -1 ? undefined : messages[requestIndex];
    const mentionedLabel = requestMessage?.content
      .slice('Create notes '.length)
      .replace(/^#/, '')
      .trim();
    const previousMessages = requestIndex === -1 ? [] : messages.slice(0, requestIndex);
    const sourceMessage = [...previousMessages].reverse().find((message) => (
      message.role === 'assistant' && mentionedLabel && responseShortName(message.content) === mentionedLabel
    )) ?? [...previousMessages].reverse().find((message) => message.role === 'assistant');
    if (!sourceMessage) return;
    highlightedMessageId = sourceMessage.id;
    const sourceElement = document.getElementById(`chat-message-${sourceMessage.id}`);
    const scrollContainer = knowledgeMessage ? messageColumn : messageScroll;
    if (sourceElement && scrollContainer) {
      const sourceTop = sourceElement.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top + scrollContainer.scrollTop;
      scrollContainer.scrollTo({
        top: Math.max(0, sourceTop - (scrollContainer.clientHeight - sourceElement.offsetHeight) / 2),
        behavior: 'smooth'
      });
    }
    window.setTimeout(() => {
      if (highlightedMessageId === sourceMessage.id) highlightedMessageId = null;
    }, 1400);
  };

  const createKnowledgeResponse = async (message: ConversationMessage): Promise<void> => {
    if (creatingKnowledgeMessageId) return;
    creatingKnowledgeMessageId = message.id;
    try {
      const result = await onCreateKnowledgeResponse({ title: responseShortName(message.content), response: message.content, messageId: message.id, providerConfigId, model });
      knowledgePreview = result;
    } catch (error) {
      console.error('[Chat knowledge] response generation failed', error);
    } finally {
      creatingKnowledgeMessageId = null;
    }
  };

  const openKnowledgePreview = (): void => {
    if (!knowledgePreview) return;
    preserveChatScroll();
    knowledgeMessage = knowledgePreview.message;
    knowledgeDraft = knowledgePreview.draft;
  };

  const closeKnowledgePreview = (): void => {
    preserveChatScroll();
    knowledgeMessage = null;
  };

  const isKnowledgeResponse = (message: ConversationMessage): boolean => {
    if (message.id === knowledgePreview?.message.id || message.id === knowledgeMessage?.id) return true;
    const parsed = parseFrontmatter(message.content);
    if (parsed.range && parsed.data.author === 'BrainStorm' && parsed.data.created && parsed.data.updated && parsed.data.type && parsed.data.domain && parsed.data.status) return true;
    return hasUnfencedKnowledgeProperties(message.content);
  };

  const knowledgeBody = (content: string): string => {
    if (!content.trimStart().startsWith('---')) {
      if (!hasUnfencedKnowledgeProperties(content)) return content;
      const lines = content.trimStart().split(/\r?\n/);
      const bodyStart = lines.findIndex((line) => /^(?:#{1,6}\s|\*\*[^*]+\*\*)/.test(line.trim()));
      return bodyStart === -1 ? content : lines.slice(bodyStart).join('\n').trim();
    }
    const lines = content.trimStart().split(/\r?\n/);
    const closingFence = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    return closingFence === -1 ? content : lines.slice(closingFence + 1).join('\n').trim();
  };

  const hasUnfencedKnowledgeProperties = (content: string): boolean => {
    const header = content.trimStart().split(/\r?\n/).slice(0, 30).join('\n');
    return /(?:^|\n)author:\s*BrainStorm\b/i.test(header)
      && /(?:^|\n)created:\s*\d{4}-\d{2}-\d{2}/i.test(header)
      && /(?:^|\n)updated:\s*\d{4}-\d{2}-\d{2}/i.test(header)
      && /(?:^|\n)(?:name|type|domain|status):\s*\S+/i.test(header);
  };

  const previewPersistedKnowledge = async (message: ConversationMessage): Promise<void> => {
    try {
      preserveChatScroll();
      const draft = await onPreviewKnowledge({ message });
      knowledgePreview = { message, draft, title: parseFrontmatter(message.content).data.name?.toString() ?? 'Knowledge note' };
      knowledgeMessage = message;
      knowledgeDraft = draft;
    } catch (error) {
      console.error('[Chat knowledge] persisted preview failed', error);
    }
  };
</script>

<div class:has-knowledge-preview={knowledgeMessage !== null} class="chat-message-scroll" bind:this={messageScroll}>
  <div class="chat-message-column" bind:this={messageColumn}>
    {#if messages.length === 0}
      <div class="chat-empty-state">
        <h2>{emptyStatePrompt}</h2>
      </div>
    {:else}
      <div class="chat-date-divider"><span class="conversation-title-markdown">{@html renderMarkdown(conversationTitle)}</span></div>
      {#each messages as message}
        <article id="chat-message-{message.id}" class:knowledge-source-target={highlightedMessageId === message.id} class="chat-message {message.role === 'assistant' ? 'assistant-message' : 'user-message'}">
          <div class="message-body"><div class="message-markdown">{#if message.role === 'assistant'}{@html renderMarkdown(isKnowledgeResponse(message) ? knowledgeBody(message.content) : displayMessageContent(message.content))}{:else if message.content.startsWith('Create notes #')}<p><span>Create notes </span><button class="knowledge-source-mention" type="button" onclick={() => scrollToSourceResponse(message.id)} aria-label="View the assistant response used to create this note">{message.content.slice('Create notes '.length)}</button></p>{:else}<p>{escapeMessageText(message.content)}</p>{/if}</div>{#if message.role === 'assistant' && message.metadata?.knowledge}<details class="knowledge-used-indicator"><summary>✦ Used {message.metadata.knowledge.sources.length} knowledge source{message.metadata.knowledge.sources.length === 1 ? '' : 's'}</summary><ul>{#each message.metadata.knowledge.sources as source}<li>{source}</li>{/each}</ul></details>{/if}{#if message.role === 'assistant'}<span class="message-status">{message.status}</span>{/if}</div>
          <div class="message-actions">
            {#if message.role === 'assistant' && isKnowledgeResponse(message) && message.id !== knowledgeMessage?.id}{#if message.id === knowledgePreview?.message.id}<button class="knowledge-preview-button knowledge-response-preview-button" type="button" onclick={openKnowledgePreview}>Preview knowledge</button>{:else}<button class="knowledge-preview-button knowledge-response-preview-button" type="button" onclick={() => void previewPersistedKnowledge(message)}>Preview knowledge</button>{/if}{:else if message.role === 'assistant' && message.id !== knowledgeMessage?.id}<button class="knowledge-action-button" type="button" aria-label="Create knowledge note from this assistant response" title={creatingKnowledgeMessageId === message.id ? 'Creating knowledge note' : 'Create note from this response'} disabled={creatingKnowledgeMessageId === message.id} onclick={() => void createKnowledgeResponse(message)}><FilePlus size={13} /></button>{/if}<button class="message-copy-button" type="button" aria-label="Copy message" title="Copy message" onclick={() => void copyMessage(message.id, message.content)}>{#if copiedMessageId === message.id}<Check size={12} />{:else}<Copy size={12} />{/if}</button>
          </div>
        </article>
      {/each}
      {#if creatingKnowledgeMessageId}
        <article class="chat-message assistant-message knowledge-work-status">
          <div class="message-body"><div class="knowledge-work-indicator"><span class="knowledge-work-dot"></span><span>Working on your knowledge note…</span></div><span class="message-status">Creating and formatting the Markdown file</span></div>
        </article>
      {/if}
    {/if}
  </div>
  {#if knowledgeMessage}
    <aside class="knowledge-side-pane" aria-label="Knowledge preview">
      <KnowledgeCreateDialog
        {projectPath}
        inline
        existingDraft={knowledgeDraft}
        conversationTitle={responseShortName(knowledgeMessage.content)}
        sourceResponse={knowledgeMessage.content}
        initialTitle={knowledgePreview?.title ?? conversationTitle}
        onCreateFolder={(relativePath) => onCreateKnowledgeFolder(relativePath)}
        onCreateKnowledgeDraft={(title) => onCreateKnowledgeDraft({ title, response: knowledgeMessage?.content ?? '', messageId: knowledgeMessage?.id ?? '', providerConfigId, model })}
        onFinalizeKnowledge={(sourcePath, folderPath, title, content) => onFinalizeKnowledgeNote({ sourcePath, folderPath, title, content })}
        onDeleteKnowledgeDraft={onDeleteKnowledgeDraft}
        onClose={closeKnowledgePreview}
      />
    </aside>
  {/if}
</div>
