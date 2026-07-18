<script lang="ts">
  import type { EditorView } from '@codemirror/view';
  import { EditorSelection } from '@codemirror/state';
  import {
    Bold, Italic, Strikethrough, Highlighter, Underline,
    Heading1, Heading2, Heading3, Link, Image, Table, 
    Code, Quote, CheckSquare, GripVertical, Sparkles, X
  } from 'lucide-svelte';

  export let view: EditorView | null = null;

  let isDragging = false;
  let dragMoved = false;
  let isExpanded = false;
  let startX = 0;
  let startY = 0;
  let x: number | undefined = undefined;
  let y: number | undefined = undefined;
  
  let toolbarEl: HTMLElement;

  function onMouseDown(e: MouseEvent) {
    if (!toolbarEl) return;
    isDragging = true;
    dragMoved = false;
    
    if (x === undefined || y === undefined) {
      const rect = toolbarEl.getBoundingClientRect();
      const parentRect = toolbarEl.parentElement!.getBoundingClientRect();
      x = rect.left - parentRect.left;
      y = rect.top - parentRect.top;
    }
    
    startX = e.clientX - x;
    startY = e.clientY - y;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    
    // Only count as a drag if moved more than a couple pixels
    if (Math.abs(e.clientX - startX - (x || 0)) > 3 || Math.abs(e.clientY - startY - (y || 0)) > 3) {
      dragMoved = true;
    }
    
    x = e.clientX - startX;
    y = e.clientY - startY;
  }

  function onMouseUp() {
    isDragging = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }
  
  function handleMagicClick(e: MouseEvent) {
    if (dragMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    isExpanded = true;
  }

  function wrapText(before: string, after: string = before, defaultText: string = 'text') {
    if (!view) return;
    const { state, dispatch } = view;
    const changes = state.changeByRange(range => {
      const isSelection = !range.empty;
      if (isSelection) {
        return {
          changes: [
            { insert: before, from: range.from },
            { insert: after, from: range.to }
          ],
          range: EditorSelection.range(range.from + before.length, range.to + before.length)
        };
      } else {
        return {
          changes: [{ insert: before + defaultText + after, from: range.from }],
          range: EditorSelection.range(range.from + before.length, range.from + before.length + defaultText.length)
        };
      }
    });
    dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input' }));
    view.focus();
  }

  function insertText(text: string) {
    if (!view) return;
    const { state, dispatch } = view;
    const changes = state.changeByRange(range => {
      return {
        changes: [{ insert: text, from: range.from }],
        range: EditorSelection.range(range.from + text.length, range.from + text.length)
      };
    });
    dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input' }));
    view.focus();
  }

  const handleBold = () => wrapText('**');
  const handleItalic = () => wrapText('_');
  const handleStrike = () => wrapText('~~');
  const handleHighlight = () => wrapText('==');
  const handleUnderline = () => wrapText('++');
  
  const handleH1 = () => wrapText('# ', '', 'Heading 1');
  const handleH2 = () => wrapText('## ', '', 'Heading 2');
  const handleH3 = () => wrapText('### ', '', 'Heading 3');
  
  const handleQuote = () => wrapText('> ', '', 'Quote');
  const handleCode = () => wrapText('```\n', '\n```', 'code block');
  const handleLink = () => wrapText('[', '](url)', 'Link Text');
  const handleImage = () => wrapText('![', '](url)', 'Alt Text');
  const handleCheckbox = () => insertText('- [ ] ');
  const handleTable = () => insertText('\n| Column 1 | Column 2 |\n|----------|----------|\n| Data     | Data     |\n');
  const handleMermaid = () => insertText('\n```mermaid\ngraph TD\n    A[Start] --> B[Stop]\n```\n');

</script>

<div class="toolbar-container" bind:this={toolbarEl} style="top: {y !== undefined ? y + 'px' : '16px'}; {x !== undefined ? `left: ${x}px;` : 'left: 16px;'}">
  {#if !isExpanded}
    <button class="magic-button" onmousedown={onMouseDown} onclick={handleMagicClick} title="Formatting Toolbar">
      <Sparkles size={20} />
    </button>
  {:else}
    <div class="toolbar">
      <!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
      <div class="drag-handle" onmousedown={onMouseDown} role="button" tabindex="0">
        <GripVertical size={16} />
      </div>
      <div class="toolbar-buttons">
        <button onclick={handleBold} title="Bold"><Bold size={16} /></button>
        <button onclick={handleItalic} title="Italic"><Italic size={16} /></button>
        <button onclick={handleStrike} title="Strikethrough"><Strikethrough size={16} /></button>
        <button onclick={handleHighlight} title="Highlight"><Highlighter size={16} /></button>
        <button onclick={handleUnderline} title="Underline"><Underline size={16} /></button>
        <div class="divider"></div>
        <button onclick={handleH1} title="Heading 1"><Heading1 size={16} /></button>
        <button onclick={handleH2} title="Heading 2"><Heading2 size={16} /></button>
        <button onclick={handleH3} title="Heading 3"><Heading3 size={16} /></button>
        <div class="divider"></div>
        <button onclick={handleQuote} title="Blockquote"><Quote size={16} /></button>
        <button onclick={handleCode} title="Code Block"><Code size={16} /></button>
        <button onclick={handleCheckbox} title="Task List"><CheckSquare size={16} /></button>
        <div class="divider"></div>
        <button onclick={handleLink} title="Link"><Link size={16} /></button>
        <button onclick={handleImage} title="Image"><Image size={16} /></button>
        <button onclick={handleTable} title="Table"><Table size={16} /></button>
        <button onclick={handleMermaid} title="Mermaid Diagram">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-git-merge"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
        </button>
        <div class="divider"></div>
        <button class="close-button" onclick={() => isExpanded = false} title="Close">
          <X size={16} />
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .toolbar-container {
    position: absolute;
    z-index: 100;
  }

  .magic-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: none;
    background: var(--colors-primary);
    color: #fff;
    border-radius: 50%;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .magic-button:hover {
    transform: scale(1.1);
  }

  .toolbar {
    display: flex;
    align-items: stretch;
    background: var(--colors-surface);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--colors-border);
    border-radius: 8px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    z-index: 1000;
    user-select: none;
    overflow: hidden;
  }

  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    cursor: grab;
    background: rgba(255, 255, 255, 0.03);
    border-right: 1px solid var(--colors-border);
    color: var(--colors-text-muted);
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .toolbar-buttons {
    display: flex;
    align-items: center;
    padding: 4px;
    gap: 2px;
  }

  .toolbar-buttons button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: 6px;
    color: var(--colors-text);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toolbar-buttons button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--colors-primary);
  }
  
  .toolbar-buttons button.close-button {
    color: var(--colors-text-muted);
  }
  
  .toolbar-buttons button.close-button:hover {
    color: var(--colors-error);
    background: rgba(255, 0, 0, 0.1);
  }

  .divider {
    width: 1px;
    height: 24px;
    background: var(--colors-border);
    margin: 0 4px;
  }
</style>
