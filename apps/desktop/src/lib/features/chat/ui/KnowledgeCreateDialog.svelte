<script lang="ts">
  import { Check, Folder, FolderPlus, LoaderCircle, X } from 'lucide-svelte';
  import { FileTree } from '../../files';
  import { MarkdownEditor } from '../../markdown';

  export let projectPath = '';
  export let conversationTitle = 'Conversation';
  export let sourceResponse = '';
  export let initialTitle = 'Brainstorm note';
  export let onCreateFolder: (relativePath: string) => Promise<void>;
  export let onCreateKnowledgeDraft: (title: string) => Promise<{ absolutePath: string; relativePath: string; title: string; content: string; properties: Record<string, unknown> }>;
  export let onFinalizeKnowledge: (sourcePath: string, folderPath: string, title: string, content: string) => Promise<void>;
  export let onDeleteKnowledgeDraft: (path: string) => Promise<void>;
  export let onClose: () => void;
  export let inline = false;
  export let existingDraft: { absolutePath: string; relativePath: string; content: string } | null = null;

  let phase: 'generating' | 'preview' | 'location' = 'generating';
  let currentPath = projectPath;
  let title = initialTitle;
  let newFolderName = '';
  let isSaving = false;
  let error = '';
  let draftPath = '';
  let draftRelativePath = '';
  let isFinalized = false;
  let editorContent = '';

  $: relativeCurrentPath = currentPath === projectPath
    ? ''
    : currentPath.startsWith(`${projectPath.replace(/\/$/, '')}/`)
      ? currentPath.slice(projectPath.replace(/\/$/, '').length + 1)
      : '';

  const generatePreview = async (): Promise<void> => {
    try {
      const draft = await onCreateKnowledgeDraft(title);
      draftPath = draft.absolutePath;
      draftRelativePath = draft.relativePath;
      title = draft.title;
      editorContent = draft.content;
      phase = 'preview';
    } catch (generateError) {
      console.error('[Chat knowledge] preview generation failed', {
        projectPath,
        title,
        error: generateError
      });
      error = generateError instanceof Error ? generateError.message : 'Unable to generate knowledge preview.';
    }
  };

  const chooseLocation = async (): Promise<void> => {
    phase = 'location';
    currentPath = projectPath;
  };

  const selectTreeFolder = (path: string): void => {
    currentPath = path;
  };

  const createFolder = async (): Promise<void> => {
    const name = newFolderName.trim();
    if (!name || name.includes('/') || name.includes('\\')) return;
    try {
      await onCreateFolder(relativeCurrentPath ? `${relativeCurrentPath}/${name}` : name);
      newFolderName = '';
    } catch (createError) {
      console.error('[Chat knowledge] create folder failed', { currentPath, relativeCurrentPath, name, error: createError });
      error = createError instanceof Error ? createError.message : 'Unable to create folder.';
    }
  };

  const save = async (): Promise<void> => {
    if (isSaving) return;
    isSaving = true;
    error = '';
    try {
      await onFinalizeKnowledge(draftRelativePath, relativeCurrentPath, title, editorContent);
      isFinalized = true;
      onClose();
    } catch (saveError) {
      console.error('[Chat knowledge] save knowledge failed', { draftRelativePath, relativeCurrentPath, title, error: saveError });
      error = saveError instanceof Error ? saveError.message : 'Unable to save knowledge note.';
    } finally {
      isSaving = false;
    }
  };

  const closeDialog = async (): Promise<void> => {
    if (draftRelativePath && !isFinalized && !inline) {
      try { await onDeleteKnowledgeDraft(draftRelativePath); } catch { /* best-effort cleanup */ }
    }
    onClose();
  };

  if (existingDraft) {
    draftPath = existingDraft.absolutePath;
    draftRelativePath = existingDraft.relativePath;
    editorContent = existingDraft.content;
    phase = 'preview';
  } else {
    void generatePreview();
  }
</script>

<div class:knowledge-inline-backdrop={inline} class="knowledge-dialog-backdrop" role="presentation" onclick={(event) => { if (!inline && event.target === event.currentTarget) void closeDialog(); }}>
  <div class:knowledge-inline-response={inline} class="knowledge-dialog" role="dialog" aria-modal={!inline} aria-labelledby="knowledge-dialog-title">
    <header class="knowledge-dialog-header">
      <div><h2 id="knowledge-dialog-title">Create note</h2><p>{phase === 'location' ? 'Choose where this edited response should be saved.' : 'Generated from the response and ready to edit.'}</p></div>
      <button class="chat-icon-button" type="button" aria-label="Close" onclick={() => void closeDialog()}><X size={16} /></button>
    </header>


    {#if phase === 'generating'}
      {#if error}<p class="knowledge-error">{error}</p><footer class="knowledge-dialog-footer"><button type="button" class="knowledge-cancel-button" onclick={() => void closeDialog()}>Close</button><button type="button" class="knowledge-save-button" onclick={() => { error = ''; void generatePreview(); }}>Retry</button></footer>{:else}<div class="knowledge-generating"><LoaderCircle class="knowledge-spinner" size={20} /><span>Preparing knowledge preview…</span></div>{/if}
    {:else if phase === 'preview'}
      <div class="knowledge-preview-header"><strong>Preview and edit</strong><span>Changes save automatically.</span></div>
      <div class="knowledge-editor-preview"><MarkdownEditor path={draftPath || 'knowledge-preview.md'} initialContent={editorContent} persist={false} onContentChange={(content) => editorContent = content} /></div>
      <footer class="knowledge-dialog-footer"><button type="button" class="knowledge-cancel-button" onclick={() => void closeDialog()}>Cancel</button><button type="button" class="knowledge-save-button" onclick={() => void chooseLocation()}><Folder size={14} /> Choose folder &amp; save</button></footer>
    {:else}
      <div class="knowledge-location-bar"><span>{relativeCurrentPath || 'Project root'}</span><button type="button" class="knowledge-new-folder" onclick={() => void createFolder()} disabled={!newFolderName.trim()}><FolderPlus size={14} /> New folder</button></div>
      <div class="knowledge-new-folder-input"><input bind:value={newFolderName} placeholder="New folder name" aria-label="New folder name" onkeydown={(event) => { if (event.key === 'Enter') void createFolder(); }} /></div>
      <div class="knowledge-folder-list knowledge-file-tree"><FileTree rootPath={projectPath} directorySelection={true} onDirectorySelect={selectTreeFolder} manageLifecycle={false} /></div>
      {#if error}<p class="knowledge-error">{error}</p>{/if}
      <footer class="knowledge-dialog-footer"><button type="button" class="knowledge-cancel-button" onclick={() => phase = 'preview'}>Back to preview</button><button type="button" class="knowledge-save-button" onclick={() => void save()} disabled={isSaving}><Check size={14} /> {isSaving ? 'Saving…' : 'Save knowledge'}</button></footer>
    {/if}
  </div>
</div>
