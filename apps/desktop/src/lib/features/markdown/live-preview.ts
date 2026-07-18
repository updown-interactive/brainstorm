import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder, StateField, EditorState } from '@codemirror/state';
import mermaid from 'mermaid';
import { detectFrontmatter } from './frontmatter';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

// The markers we want to hide when the line is not focused
const hiddenMarkerTypes = new Set([
  'HeaderMark',
  'EmphasisMark',
  'StrikethroughMark',
  'QuoteMark',
  'CodeMark',
  'LinkMark'
]);

class HrWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement('hr');
    hr.className = 'cm-hr';
    return hr;
  }
}

class CopyCodeWidget extends WidgetType {
  constructor(public code: string) { super(); }
  eq(other: CopyCodeWidget) { return other.code === this.code; }
  toDOM() {
    const btn = document.createElement('button');
    btn.className = 'cm-copy-code-btn';
    btn.title = 'Copy Code';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(this.code);
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;
      setTimeout(() => {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
      }, 2000);
    };
    return btn;
  }
}

class CheckboxWidget extends WidgetType {
  constructor(public checked: boolean) { super(); }
  eq(other: CheckboxWidget) { return other.checked === this.checked; }
  toDOM() {
    const wrap = document.createElement('span');
    wrap.className = 'cm-task-checkbox-wrap';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = this.checked;
    input.className = 'cm-task-checkbox';
    input.disabled = true; // Read-only for now when unfocused
    wrap.appendChild(input);
    return wrap;
  }
}

class ImageWidget extends WidgetType {
  constructor(public url: string, public alt: string) { super(); }
  eq(other: ImageWidget) { return other.url === this.url && other.alt === this.alt; }
  toDOM() {
    const wrap = document.createElement('span');
    wrap.className = 'cm-image-preview-wrap';
    const img = document.createElement('img');
    img.src = this.url;
    if (this.alt) img.alt = this.alt;
    img.className = 'cm-image-preview';
    wrap.appendChild(img);
    return wrap;
  }
}

class LinkWidget extends WidgetType {
  constructor(public label: string, public href: string) { super(); }
  eq(other: LinkWidget) { return other.label === this.label && other.href === this.href; }
  toDOM() {
    const anchor = document.createElement('a');
    anchor.className = 'cm-link-preview';
    anchor.textContent = this.label;
    anchor.href = this.href;
    anchor.title = this.href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    return anchor;
  }
}

class TableWidget extends WidgetType {
  constructor(public text: string) { super(); }
  eq(other: TableWidget) { return other.text === this.text; }
  toDOM() {
    const wrap = document.createElement('div');
    wrap.className = 'cm-table-widget-wrap';
    
    const rows = this.text.trim().split('\n');
    if (rows.length === 0) return wrap;

    const table = document.createElement('table');
    table.className = 'cm-table-widget';

    const headerCells = rows[0].split('|').map(c => c.trim()).filter((c, i, arr) => !(c === '' && (i === 0 || i === arr.length - 1)));
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    headerCells.forEach(c => {
      const th = document.createElement('th');
      th.innerText = c;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let i = 2; i < rows.length; i++) {
      const rowText = rows[i];
      const cells = rowText.split('|').map(c => c.trim()).filter((c, idx, arr) => !(c === '' && (idx === 0 || idx === arr.length - 1)));
      if (cells.length === 0) continue;
      const r = document.createElement('tr');
      cells.forEach(c => {
        const td = document.createElement('td');
        td.innerText = c;
        r.appendChild(td);
      });
      tbody.appendChild(r);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    
    return wrap;
  }
}

class MermaidWidget extends WidgetType {
  constructor(public code: string) { super(); }
  eq(other: MermaidWidget) { return other.code === this.code; }
  toDOM() {
    const wrap = document.createElement('div');
    wrap.className = 'cm-mermaid-widget-wrap';
    
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

    queueMicrotask(() => {
      mermaid.render(id, this.code).then(({ svg }) => {
        wrap.innerHTML = svg;
      }).catch((e) => {
        const errorMsg = document.createElement('pre');
        errorMsg.className = 'cm-mermaid-error';
        errorMsg.innerText = e.message || 'Mermaid Syntax Error';
        wrap.replaceChildren(errorMsg);
      });
    });

    return wrap;
  }
}

const hiddenMark = Decoration.replace({});
const hrDeco = Decoration.replace({ widget: new HrWidget() });

function parseMarkdownLink(text: string) {
  const match = text.match(/^\[([^\]]+)\]\((\S+?)(?:\s+['"][\s\S]*?['"])?\)$/);
  if (!match) return null;
  return { label: match[1], href: normalizeHref(match[2]) };
}

function normalizeHref(value: string) {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return `mailto:${value}`;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return value;
  }
  return `https://${value}`;
}

function buildPreviewDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const frontmatterRange = detectFrontmatter(state.doc.toString());
  
  // Only reveal syntax on the cursor/head line. A paste can leave a broad
  // selection, and treating every selected line as active breaks live preview.
  const activeLines = new Set<number>();
  for (const range of state.selection.ranges) {
    activeLines.add(state.doc.lineAt(range.head).number);
  }

  const decos: { from: number, to: number, deco: Decoration }[] = [];

  syntaxTree(state).iterate({
    enter(node: any) {
      const startLine = state.doc.lineAt(node.from).number;
      const endLine = state.doc.lineAt(node.to).number;

      if (frontmatterRange && node.from < frontmatterRange.bodyFrom && node.to <= frontmatterRange.bodyFrom) {
        return false;
      }
      
      let isActive = false;
      for (let i = startLine; i <= endLine; i++) {
        if (activeLines.has(i)) {
          isActive = true;
          break;
        }
      }

      // Always style code blocks and inline code regardless of focus
      if (node.name === 'FencedCode') {
        const text = state.doc.sliceString(node.from, node.to);
        const match = text.match(/```mermaid\s*\n([\s\S]*?)```/);
        
        if (match && !isActive) {
          // Mermaid rendering when unfocused
          const code = match[1].trim();
          decos.push({ from: node.from, to: node.to, deco: Decoration.replace({ widget: new MermaidWidget(code) }) });
        } else {
          // Standard Fenced Code Block styling
          const lines = text.split('\n');
          let innerCode = '';
          if (lines.length >= 2) {
             innerCode = lines.slice(1, lines.length - 1).join('\n');
          }

          for (let i = startLine; i <= endLine; i++) {
            const line = state.doc.line(i);
            let className = 'cm-codeblock-line';
            if (i === startLine) {
              className += ' cm-codeblock-top';
              // Place the copy button at the end of the first line
              decos.push({ from: line.to, to: line.to, deco: Decoration.widget({ widget: new CopyCodeWidget(innerCode), side: 1 }) });
            }
            if (i === endLine) className += ' cm-codeblock-bottom';
            decos.push({ from: line.from, to: line.from, deco: Decoration.line({ class: className }) });
          }
        }
      } else if (node.name === 'InlineCode') {
        decos.push({ from: node.from, to: node.to, deco: Decoration.mark({ class: 'cm-inline-code' }) });
      }

      if (!isActive) {
        if (node.name === 'HorizontalRule') {
            decos.push({ from: node.from, to: node.to, deco: hrDeco });
          } else if (node.name === 'TaskMarker') {
            const text = state.doc.sliceString(node.from, node.to);
            const isChecked = text.includes('x') || text.includes('X');
            decos.push({ from: node.from, to: node.to, deco: Decoration.replace({ widget: new CheckboxWidget(isChecked) }) });
          } else if (node.name === 'Image') {
            const text = state.doc.sliceString(node.from, node.to);
            const match = text.match(/!\[(.*?)\]\((.*?)\)/);
            if (match) {
              const alt = match[1];
              const url = match[2];
              decos.push({ from: node.from, to: node.to, deco: Decoration.replace({ widget: new ImageWidget(url, alt) }) });
            }
          } else if (node.name === 'Link') {
            const text = state.doc.sliceString(node.from, node.to);
            const link = parseMarkdownLink(text);
            if (link) {
              decos.push({
                from: node.from,
                to: node.to,
                deco: Decoration.replace({ widget: new LinkWidget(link.label, link.href) })
              });
            }
          } else if (node.name === 'URL') {
            const text = state.doc.sliceString(node.from, node.to);
            decos.push({
              from: node.from,
              to: node.to,
              deco: Decoration.replace({ widget: new LinkWidget(text, normalizeHref(text)) })
            });
          } else if (node.name === 'Table') {
            const text = state.doc.sliceString(node.from, node.to);
            decos.push({ from: node.from, to: node.to, deco: Decoration.replace({ widget: new TableWidget(text) }) });
          } else if (hiddenMarkerTypes.has(node.name)) {
            const line = state.doc.lineAt(node.from);
            let { from, to } = node;

            // For headings and blockquotes, also hide the trailing space if there is one
            if ((node.name === 'HeaderMark' || node.name === 'QuoteMark') && to < line.to) {
              if (state.doc.sliceString(to, to + 1) === ' ') {
                to += 1;
              }
            }

            decos.push({ from, to, deco: hiddenMark });
          }
        }
      }
  });
  
  decos.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from;
    return b.to - a.to;
  });
  let lastTo = -1;
  for (const d of decos) {
    if (d.from >= lastTo) {
      builder.add(d.from, d.to, d.deco);
      lastTo = d.to;
    }
  }

  return builder.finish();
}

export const livePreviewPlugin = StateField.define<DecorationSet>({
  create(state) {
    return buildPreviewDecorations(state);
  },
  update(decorations, tr) {
    if (tr.docChanged || tr.selection) {
      return buildPreviewDecorations(tr.state);
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f)
});
