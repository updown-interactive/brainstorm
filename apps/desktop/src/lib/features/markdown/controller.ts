import { writable, get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { ensureMarkdownFrontmatter } from './frontmatter';

export interface MarkdownState {
  content: string;
  isSaving: boolean;
  lastSavedAt: number | null;
  path: string | null;
}

export class MarkdownController {
  public state = writable<MarkdownState>({
    content: '',
    isSaving: false,
    lastSavedAt: null,
    path: null,
  });

  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentSavePromise: Promise<void> | null = null;

  async loadFile(path: string) {
    // Reset content but don't set path yet — we set path only after content is loaded
    // so the reactive block in MarkdownEditor doesn't fire on empty content.
    this.state.set({
      content: '',
      isSaving: false,
      lastSavedAt: null,
      path: null,
    });

    try {
      const rawContent = await invoke<string>('read_file', { path });
      const content = isMarkdownPath(path) && rawContent.trim().length === 0
        ? ensureMarkdownFrontmatter(rawContent, path)
        : rawContent;
      // Now set both path and content atomically
      this.state.set({
        content,
        isSaving: false,
        lastSavedAt: null,
        path,
      });
    } catch (err) {
      console.error('Failed to read file:', err);
    }
  }

  updateContent(newContent: string) {
    this.state.update(s => ({ ...s, content: newContent }));
    this.debouncedSave();
  }

  private debouncedSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.save();
    }, 500); // 500ms debounce
  }

  async save() {
    const s = get(this.state);
    if (!s.path) return;

    // wait for any ongoing save
    if (this.currentSavePromise) {
      await this.currentSavePromise;
    }

    this.state.update(st => ({ ...st, isSaving: true }));

    this.currentSavePromise = (async () => {
      try {
        await invoke('write_file', { path: s.path, content: s.content });
        this.state.update(st => ({ ...st, isSaving: false, lastSavedAt: Date.now() }));
      } catch (err) {
        console.error('Failed to save file:', err);
        this.state.update(st => ({ ...st, isSaving: false }));
      }
    })();

    await this.currentSavePromise;
  }
}

export const markdownController = new MarkdownController();

function isMarkdownPath(path: string) {
  return /\.md(?:x)?$/i.test(path);
}
