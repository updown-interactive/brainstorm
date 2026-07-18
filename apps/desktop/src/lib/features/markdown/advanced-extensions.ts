import { ViewPlugin, Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { detectFrontmatter } from './frontmatter';

// Hidden marker decoration
const hiddenMark = Decoration.replace({});

// Inline syntax configurations
const INLINE_SYNTAX = [
  { regex: /==(.*?)==/g, markClass: 'cm-highlight-mark', contentClass: 'cm-highlight', length: 2 },
  { regex: /\+\+(.*?)\+\+/g, markClass: 'cm-underline-mark', contentClass: 'cm-underline', length: 2 },
  { regex: /\^(.*?)\^/g, markClass: 'cm-superscript-mark', contentClass: 'cm-superscript', length: 1 },
  { regex: /~(.*?)~/g, markClass: 'cm-subscript-mark', contentClass: 'cm-subscript', length: 1 },
  { regex: /\[\[(.*?)\]\]/g, markClass: 'cm-wikilink-mark', contentClass: 'cm-wikilink', length: 2 },
  { regex: /(?<!\w)(#[A-Za-z0-9_/-]+)/g, markClass: '', contentClass: 'cm-tag', length: 0 },
  { regex: /\$(.*?)\$/g, markClass: 'cm-math-mark', contentClass: 'cm-math', length: 1 }
];

function buildExtensionsDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const state = view.state;
  const frontmatterRange = detectFrontmatter(state.doc.toString());
  
  // 1. Identify cursor/head lines to know when to reveal syntax markers.
  // A broad selection after paste should not make the entire document raw.
  const activeLines = new Set<number>();
  for (const range of state.selection.ranges) {
    activeLines.add(state.doc.lineAt(range.head).number);
  }

  // 2. Collect all decorations first so we can sort them by 'from' position
  // CodeMirror's RangeSetBuilder STRICTLY requires decorations to be added in ascending order.
  const decos: { from: number, to: number, deco: Decoration }[] = [];

  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = state.doc.lineAt(pos);
      const text = line.text;
      const isActive = activeLines.has(line.number);

      if (frontmatterRange && line.from < frontmatterRange.bodyFrom) {
        pos = line.to + 1;
        continue;
      }

      // Inline Regex parsing
      for (const syntax of INLINE_SYNTAX) {
        let match;
        syntax.regex.lastIndex = 0;
        while ((match = syntax.regex.exec(text)) !== null) {
          const matchStart = line.from + match.index;
          const matchEnd = matchStart + match[0].length;
          
          if (syntax.length > 0) {
            const leftMarkStart = matchStart;
            const leftMarkEnd = matchStart + syntax.length;
            const contentStart = leftMarkEnd;
            const contentEnd = matchEnd - syntax.length;
            const rightMarkStart = contentEnd;
            const rightMarkEnd = matchEnd;

            // Hide or style markers (Left)
            if (!isActive) {
              decos.push({ from: leftMarkStart, to: leftMarkEnd, deco: hiddenMark });
            } else if (syntax.markClass) {
              decos.push({ from: leftMarkStart, to: leftMarkEnd, deco: Decoration.mark({ class: syntax.markClass }) });
            }

            // Apply content class (Middle)
            decos.push({ from: contentStart, to: contentEnd, deco: Decoration.mark({ class: syntax.contentClass }) });
            
            // Hide or style markers (Right)
            if (!isActive) {
              decos.push({ from: rightMarkStart, to: rightMarkEnd, deco: hiddenMark });
            } else if (syntax.markClass) {
              decos.push({ from: rightMarkStart, to: rightMarkEnd, deco: Decoration.mark({ class: syntax.markClass }) });
            }
          } else {
            decos.push({ from: matchStart, to: matchEnd, deco: Decoration.mark({ class: syntax.contentClass }) });
          }
        }
      }

      // Check Callouts
      if (text.startsWith('> [!')) {
        const typeMatch = text.match(/> \[!([A-Za-z0-9_-]+)\]/);
        if (typeMatch) {
          const calloutType = typeMatch[1].toLowerCase();
          
          let blockEnd = line.to;
          let currentLine = line.number;
          while (currentLine < state.doc.lines) {
            const nextLine = state.doc.line(currentLine + 1);
            if (!nextLine.text.startsWith('>')) {
              break;
            }
            blockEnd = nextLine.to;
            currentLine++;
          }

          decos.push({ 
            from: line.from, 
            to: blockEnd, 
            deco: Decoration.mark({ class: `cm-callout cm-callout-${calloutType}` }) 
          });

          if (!isActive) {
             const headerEnd = line.from + typeMatch[0].length;
             decos.push({ from: line.from, to: headerEnd, deco: hiddenMark });
          }
        }
      }

      pos = line.to + 1;
    }
  }

  // Sort decorations by 'from' position, then by 'to' position
  decos.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from;
    return a.to - b.to;
  });

  // Filter out any overlapping decorations
  let lastTo = -1;
  for (const d of decos) {
    if (d.from >= lastTo) {
      builder.add(d.from, d.to, d.deco);
      lastTo = d.to;
    }
  }

  try {
    return builder.finish();
  } catch (e) {
    console.warn('Decoration overlap error', e);
    return Decoration.none;
  }
}

export const advancedExtensionsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildExtensionsDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildExtensionsDecorations(update.view);
      }
    }
  },
  {
    decorations: (v: any) => v.decorations
  }
);
