<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { json } from '@codemirror/lang-json';
  import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
  import { EditorState } from '@codemirror/state';
  import { EditorView, lineNumbers } from '@codemirror/view';
  import { tags as t } from '@lezer/highlight';
  import { brainstormTheme } from '../../markdown/theme';

  export let content = '';
  export let error = '';
  export let onChange: (content: string) => void = () => {};

  let editorHost: HTMLDivElement;
  let view: EditorView | null = null;
  let renderedContent = '';
  let lastEmittedContent = '';
  let isApplyingExternalContent = false;

  $: formattedContent = formatJson(content);
  $: if (view && content !== lastEmittedContent && formattedContent !== renderedContent) {
    renderedContent = formattedContent;
    isApplyingExternalContent = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: formattedContent }
    });
    isApplyingExternalContent = false;
  }

  onMount(() => {
    renderedContent = formattedContent;
    view = new EditorView({
      state: EditorState.create({
        doc: formattedContent,
        extensions: [
          EditorState.tabSize.of(2),
          EditorView.editable.of(true),
          lineNumbers(),
          json(),
          brainstormTheme,
          jsonInspectorTheme,
          jsonHighlightStyle,
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (!update.docChanged || isApplyingExternalContent) return;
            renderedContent = update.state.doc.toString();
            lastEmittedContent = renderedContent;
            onChange(renderedContent);
          })
        ]
      }),
      parent: editorHost
    });
  });

  onDestroy(() => {
    view?.destroy();
  });

  function formatJson(value: string) {
    try {
      return `${JSON.stringify(JSON.parse(value || '{}'), null, 2)}\n`;
    } catch {
      return value;
    }
  }

  const jsonInspectorTheme = EditorView.theme({
    '&': {
      height: '100%',
      backgroundColor: 'var(--colors-background)'
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'var(--font-mono, monospace)'
    },
    '.cm-content': {
      maxWidth: 'none',
      margin: '0',
      padding: '16px',
      fontFamily: 'var(--font-mono, monospace)',
      fontSize: '12px',
      lineHeight: '1.6'
    },
    '.cm-line': {
      fontFamily: 'var(--font-mono, monospace)',
      lineHeight: '1.6'
    },
    '.cm-gutters': {
      display: 'flex',
      borderRight: '1px solid var(--colors-border)',
      backgroundColor: 'var(--colors-surface)',
      color: 'var(--colors-textMuted)'
    },
    '.cm-lineNumbers .cm-gutterElement': {
      minWidth: '34px',
      padding: '0 8px 0 10px'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--colors-hover)'
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--colors-hover)'
    },
    '.cm-selectionBackground': {
      backgroundColor: 'var(--colors-selection)'
    }
  }, { dark: true });

  const jsonHighlightStyle = syntaxHighlighting(HighlightStyle.define([
    { tag: t.propertyName, color: 'var(--colors-primary)' },
    { tag: t.string, color: 'var(--colors-success)' },
    { tag: t.number, color: 'var(--colors-warning)' },
    { tag: [t.bool, t.null], color: 'var(--colors-secondary)' },
    { tag: t.punctuation, color: 'var(--colors-textMuted)' },
    { tag: t.invalid, color: 'var(--colors-error)' }
  ]));
</script>

<div class="json-editor-shell">
  <div class="json-inspector" bind:this={editorHost}></div>
  {#if error}
    <div class="json-inline-error" role="status">{error}</div>
  {/if}
</div>

<style>
  .json-editor-shell {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    background-color: var(--colors-background);
  }

  .json-inspector {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    background-color: var(--colors-background);
  }

  .json-inspector :global(.cm-editor) {
    height: 100%;
  }

  .json-inline-error {
    min-height: 32px;
    display: flex;
    align-items: center;
    border-top: 1px solid var(--colors-border);
    background-color: color-mix(in srgb, var(--colors-error) 12%, var(--colors-background));
    color: var(--colors-error);
    padding: 6px 12px;
    font-size: 12px;
    line-height: 1.35;
  }
</style>
