<script lang="ts">
  import { onMount } from 'svelte';
  import { listen, type UnlistenFn } from '@tauri-apps/api/event';
  import { providersController } from '$lib/features/settings/controller/providers-controller';
  import { shellState } from '$lib/features/shell/state/state';
  import ChatComposer from './ChatComposer.svelte';
  import ChatMessageList from './ChatMessageList.svelte';
  import ChatSidebar from './ChatSidebar.svelte';
  import { chatController } from '../controller';
  import { chatState } from '../state';
  import type { ChatStreamEvent } from '../types';
  import './chat.css';

  let draft = '';
  let selectedProviderId = '';
  let openConversationMenuId: string | null = null;
  let emptyStatePrompt = 'What’s on your mind?';
  let unlistenChatStream: UnlistenFn | undefined;

  const emptyStatePrompts = [
    'What’s on your mind?', 'What are you thinking about?', 'Where should we start?', 'What are you working on?',
    'What should we figure out?', 'What would you like to explore?', 'What are you curious about?', 'What’s worth thinking through?',
    'What should we build today?', 'What can we work through together?', 'Let’s think.', 'Let’s figure it out.',
    'Start with an idea.', 'Bring an idea.', 'Think out loud.', 'Explore an idea.', 'Let’s make sense of it.',
    'Begin anywhere.', 'Start thinking.', 'What comes to mind?', 'Start with a thought.', 'Think freely.',
    'Explore freely.', 'Ask. Explore. Create.', 'Think with Brainstorm.', 'Let’s work through it.', 'Ask Brainstorm anything.',
    'Have an idea? Start here.', 'What can we solve together?', 'Tell me where to begin.'
  ];

  $: configuredProviders = $providersController.configured;
  $: selectedProvider = configuredProviders.find((provider) => provider.id === selectedProviderId) ?? configuredProviders[0];
  $: projectId = $shellState.currentProject?.id ?? '';
  $: conversations = $chatState.conversations;
  $: activeConversation = conversations.find((conversation) => conversation.id === $chatState.activeConversationId);

  onMount(() => {
    emptyStatePrompt = emptyStatePrompts[Math.floor(Math.random() * emptyStatePrompts.length)];
    void providersController.load();
    if (projectId) void chatController.loadForProject(projectId);
    let disposed = false;
    void listen<ChatStreamEvent>('chat-stream', (event) => {
      if (event.payload.progress) chatController.applyProgress(event.payload.progress, event.payload.conversationId);
      else chatController.applyStreamEvent(event.payload);
    }).then((unlisten) => {
      if (disposed) unlisten();
      else unlistenChatStream = unlisten;
    });
    const closeConversationMenu = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node && !(target as Element).closest('.conversation-menu-wrap')) openConversationMenuId = null;
    };
    document.addEventListener('pointerdown', closeConversationMenu, true);
    return () => {
      disposed = true;
      unlistenChatStream?.();
      document.removeEventListener('pointerdown', closeConversationMenu, true);
    };
  });

  const selectConversation = (conversationId: string): void => {
    if (projectId) void chatController.select(projectId, conversationId);
  };

  const createConversation = (): void => {
    if (projectId) void chatController.create(projectId);
  };

  const toggleConversationMenu = (conversationId: string, event: Event): void => {
    event.stopPropagation();
    openConversationMenuId = openConversationMenuId === conversationId ? null : conversationId;
  };

  const deleteConversation = (conversationId: string, event: Event): void => {
    event.stopPropagation();
    openConversationMenuId = null;
    if (projectId) void chatController.remove(projectId, conversationId);
  };

  const submitMessage = (): void => {
    const content = draft.trim();
    if (!content || !projectId) return;
    draft = '';
    void chatController.send(projectId, content, selectedProvider?.id, selectedProvider?.model);
  };
</script>

<div class="chat-workspace">
  <ChatSidebar
    {conversations}
    activeConversationId={$chatState.activeConversationId}
    {projectId}
    {openConversationMenuId}
    onCreateConversation={createConversation}
    onSelectConversation={selectConversation}
    onToggleConversationMenu={toggleConversationMenu}
    onDeleteConversation={deleteConversation}
  />

  <section class="chat-main-panel" aria-label="Chat workspace">
    <ChatMessageList messages={$chatState.messages} conversationTitle={activeConversation?.title ?? 'Conversation'} runStatus={$chatState.runStatus} createdFilesByMessage={$chatState.createdFilesByMessage} {emptyStatePrompt} />
    {#if $chatState.error}<div class="chat-error" role="alert">{$chatState.error}</div>{/if}
    <ChatComposer bind:draft bind:selectedProviderId {configuredProviders} {selectedProvider} onSubmit={submitMessage} />
  </section>
</div>
