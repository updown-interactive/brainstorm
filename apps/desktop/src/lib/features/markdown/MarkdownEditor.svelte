<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { MarkdownController } from './controller';
  import { EditorView, keymap } from '@codemirror/view';
  import { Compartment, EditorSelection, EditorState } from '@codemirror/state';
  import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
  import { json } from '@codemirror/lang-json';
  import { languages } from '@codemirror/language-data';
  import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
  import { brainstormTheme, brainstormHighlightStyle, tagAccentTheme } from './theme';
  import { livePreviewPlugin } from './live-preview';
  import { advancedExtensionsPlugin } from './advanced-extensions';
  import { openAddPropertyPalette, propertiesExtension } from './properties-extension';
  import { detectFrontmatter, ensureMarkdownFrontmatter, parseFrontmatter } from './frontmatter';
  import { listSharedTags, normalizeTagColor, normalizeTagName } from './tag-registry';
  import { GFM } from '@lezer/markdown';
  import MarkdownToolbar from './MarkdownToolbar.svelte';

  export let path: string;

  const markdownController = new MarkdownController();
  const state = markdownController.state;
  const tagAccentCompartment = new Compartment();

  let editorContainer: HTMLDivElement;
  let markdownContainer: HTMLDivElement;
  let view: EditorView;
  let isApplyingLifecycleFrontmatter = false;
  let activeTagColor = '';
  let tagColorRequest = 0;

  // Track the current loaded path so we don't reload on our own changes
  let loadedPath = '';

  onMount(() => {
    const startState = EditorState.create({
      doc: '',
      extensions: editorExtensions(path)
    });

    view = new EditorView({
      state: startState,
      parent: editorContainer
    });
    view.focus();
  });

  function editorExtensions(filePath: string) {
    const isMarkdown = isMarkdownPath(filePath);
    const isJson = isJsonPath(filePath);
    return [
        history(),
        keymap.of([
          ...(isMarkdown ? [{ key: 'Mod-p', run: openAddPropertyPalette }] : []),
          ...defaultKeymap,
          ...historyKeymap
        ]),
        isJson
          ? json()
          : markdown({ base: markdownLanguage, codeLanguages: languages, extensions: [GFM] }),
        brainstormTheme,
        brainstormHighlightStyle,
        tagAccentCompartment.of(tagAccentTheme(activeTagColor)),
        isMarkdown ? propertiesExtension : [],
        isMarkdown ? livePreviewPlugin : [],
        isMarkdown ? advancedExtensionsPlugin : [],
        EditorView.domEventHandlers({
          paste(event, view) {
            const text = event.clipboardData?.getData('text/plain');
            if (!text) return false;

            const normalizedText = isMarkdown ? stripMarkdownPasteFence(text) : text;
            if (normalizedText === text) return false;

            event.preventDefault();
            const changes = view.state.changeByRange((range) => ({
              changes: { from: range.from, to: range.to, insert: normalizedText },
              range: EditorSelection.cursor(range.from + normalizedText.length)
            }));
            view.dispatch(view.state.update(changes, { scrollIntoView: true, userEvent: 'input.paste' }));
            return true;
          }
        }),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && loadedPath === path) {
            const content = update.state.doc.toString();

            if (isApplyingLifecycleFrontmatter) {
              triggerSave(content);
              return;
            }

            if (!isMarkdown) {
              triggerSave(content);
              return;
            }

            const normalizedContent = ensureMarkdownFrontmatter(content, path, true);
            if (normalizedContent !== content) {
              isApplyingLifecycleFrontmatter = true;
              update.view.dispatch({
                changes: { from: 0, to: content.length, insert: normalizedContent },
                userEvent: 'input.frontmatterLifecycle'
              });
              isApplyingLifecycleFrontmatter = false;
              return;
            }

            triggerSave(content);
          }
        })
      ];
  }

  function stripMarkdownPasteFence(text: string) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const firstContentLine = lines.findIndex((line) => line.trim().length > 0);
    if (firstContentLine === -1) return text;

    let lastContentLine = lines.length - 1;
    while (lastContentLine >= 0 && lines[lastContentLine].trim().length === 0) {
      lastContentLine -= 1;
    }

    const opening = lines[firstContentLine].trim().match(/^(`{3,}|~{3,})\s*(markdown|md)\s*$/i);
    if (!opening) return text;

    const closingText = lines[lastContentLine]?.trim() ?? '';
    const closing = closingText.match(/^(`{3,}|~{3,})\s*$/);
    if (!closing) return text;
    if (closing[1][0] !== opening[1][0] || closing[1].length < opening[1].length) return text;

    return lines.slice(firstContentLine + 1, lastContentLine).join('\n');
  }

  async function updateTagAccentColor(content: string) {
    if (!isMarkdownPath(path)) {
      setActiveTagColor('');
      return;
    }

    const parsed = parseFrontmatter(content);
    const rawTags = Array.isArray(parsed.data.tags) ? parsed.data.tags : [];
    const frontmatterTags = rawTags.map((tag) => normalizeTagName(`${tag}`)).filter(Boolean);
    const inlineTags = [...content.matchAll(/(?<!\w)(#[A-Za-z0-9_/-]+)/g)]
      .map((match) => normalizeTagName(match[1]))
      .filter(Boolean);
    const tags = uniqueStrings([...frontmatterTags, ...inlineTags]);

    const requestId = ++tagColorRequest;
    if (tags.length === 0) {
      setActiveTagColor('');
      return;
    }

    const sharedTags = await listSharedTags();
    if (requestId !== tagColorRequest) return;

    const tagSet = new Set(tags.map((tag) => tag.toLocaleLowerCase()));
    const match = sharedTags.find((tag) => tagSet.has(tag.name.toLocaleLowerCase()));
    setActiveTagColor(match ? normalizeTagColor(match.color) : '');
  }

  function setActiveTagColor(color: string) {
    activeTagColor = color;
    for (const element of [markdownContainer, editorContainer, view?.dom]) {
      if (!element) continue;
      if (color) {
        element.style.setProperty('--colors-primary', color);
      } else {
        element.style.removeProperty('--colors-primary');
      }
    }

    if (view) {
      view.dispatch({
        effects: tagAccentCompartment.reconfigure(tagAccentTheme(color))
      });
    }
  }

  function uniqueStrings(values: string[]) {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
      const normalized = value.toLocaleLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(value);
    }
    return result;
  }

  onDestroy(() => {
    if (view) {
      view.destroy();
    }
  });

  $: {
    if (path) {
      markdownController.loadFile(path);
    }
  }

  $: {
    // When the file is loaded and we haven't rendered it yet for this path
    if ($state.path === path && loadedPath !== path && !$state.isSaving) {
      loadedPath = path;
      if (view) {
        // Completely replace the state to clear history and load new content
        const newState = EditorState.create({
          doc: $state.content,
          extensions: editorExtensions(path)
        });
        view.setState(newState);
        const frontmatter = isMarkdownPath(path) ? detectFrontmatter($state.content) : null;
        if (frontmatter) {
          view.dispatch({ selection: EditorSelection.cursor(frontmatter.bodyFrom) });
        } else if (!isMarkdownPath(path)) {
          setActiveTagColor('');
        }
        view.focus();
      }
    }
  }

  $: if ($state.content) {
    void updateTagAccentColor($state.content);
  }

  let updateTimeout: any;
  function triggerSave(newContent: string) {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      markdownController.updateContent(newContent);
    }, 300);
  }

  function isMarkdownPath(filePath: string) {
    return /\.md(?:x)?$/i.test(filePath);
  }

  function isJsonPath(filePath: string) {
    return /\.json$/i.test(filePath);
  }

</script>

<div class="markdown-container" bind:this={markdownContainer} style={activeTagColor ? `--colors-primary: ${activeTagColor};` : ''}>
  <div class="editor-wrapper" bind:this={editorContainer}></div>

  {#if view && isMarkdownPath(path)}
    <MarkdownToolbar {view} />
  {/if}
</div>

<style>
  .markdown-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .editor-wrapper {
    width: 100%;
    height: 100%;
    background-color: var(--colors-background);
  }

  /* Ensure CM takes full height */
  .editor-wrapper :global(.cm-editor) {
    height: 100%;
  }
</style>
