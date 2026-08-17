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
  import type { ChatMode, ChatStreamEvent, PlanOption } from '../types';
  import './chat.css';

  let draft = '';
  let selectedProviderId = '';
  let selectedMode: ChatMode = 'normal';
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
  $: projectPath = $shellState.currentProject?.path ?? '';
  $: conversations = $chatState.conversations;
  $: activeConversation = conversations.find((conversation) => conversation.id === $chatState.activeConversationId);
  $: planResponse = selectedMode === 'plan' ? chatController.getPlanResponse($chatState.messages) : null;
  $: planOptions = planResponse?.options ?? [];

  onMount(() => {
    emptyStatePrompt = emptyStatePrompts[Math.floor(Math.random() * emptyStatePrompts.length)];
    void providersController.load();
    if (projectId) void chatController.loadForProject(projectId);
    let disposed = false;
    void listen<ChatStreamEvent>('chat-stream', (event) => chatController.applyStreamEvent(event.payload)).then((unlisten) => {
      if (disposed) unlisten();
      else unlistenChatStream = unlisten;
    });
    const closeConversationMenu = (event: PointerEvent): void => {
      const target = event.target;
      if (target instanceof Node && !(target as Element).closest('.conversation-menu-wrap, .conversation-menu')) openConversationMenuId = null;
    };
    document.addEventListener('pointerdown', closeConversationMenu, true);
    return () => {
      disposed = true;
      unlistenChatStream?.();
      document.removeEventListener('pointerdown', closeConversationMenu, true);
      chatController.resetSession();
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
    void chatController.send(projectId, content, selectedMode, selectedProvider?.id, selectedProvider?.model);
  };

  const submitPlanOption = (option: PlanOption): void => {
    const content = option.prompt.trim();
    if (!content || !projectId) return;
    draft = '';
    void chatController.send(projectId, content, selectedMode, selectedProvider?.id, selectedProvider?.model);
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

  <section class="chat-main-panel" class:is-empty-chat={$chatState.messages.length === 0} aria-label="Chat workspace">
    <ChatMessageList
      messages={$chatState.messages}
      conversationTitle={activeConversation?.title ?? 'Conversation'}
      {emptyStatePrompt}
      {projectPath}
      providerConfigId={selectedProvider?.id ?? ''}
      model={selectedProvider?.model ?? ''}
      onCreateKnowledgeFolder={(relativePath) => chatController.createKnowledgeFolder(projectPath, relativePath)}
      onCreateKnowledgeDraft={({ title, response, messageId, providerConfigId, model }) => chatController.createKnowledgeDraft({ projectPath, title, response, conversationTitle: activeConversation?.title ?? 'Conversation', messageId, providerConfigId, model })}
      onCreateKnowledgeResponse={({ response, messageId, providerConfigId, model }) => chatController.createKnowledgeResponse({ projectId, projectPath, title: activeConversation?.title ?? 'Conversation', response, messageId, providerConfigId, model })}
      onPreviewKnowledge={({ message }) => chatController.previewKnowledgeMessage(projectPath, message)}
      onFinalizeKnowledgeNote={({ sourcePath, folderPath, title, content }) => chatController.finalizeKnowledgeNote(projectPath, sourcePath, folderPath, title, content)}
      onDeleteKnowledgeDraft={(path) => chatController.deleteKnowledgeDraft(projectPath, path)}
    />
    {#if $chatState.error}<p class="chat-error" role="alert">{$chatState.error}</p>{/if}
    <ChatComposer bind:draft bind:selectedProviderId bind:selectedMode {configuredProviders} {selectedProvider} {planOptions} onSelectPlanOption={submitPlanOption} onSubmit={submitMessage} />
  </section>
</div>
