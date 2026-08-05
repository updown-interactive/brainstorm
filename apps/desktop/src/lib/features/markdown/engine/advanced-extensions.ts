import { ViewPlugin, Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { detectFrontmatter } from './frontmatter';
import { getActiveRegion } from './active-region';
import { RenderingScheduler } from './rendering-scheduler';
import type { ActiveRegion } from './active-region';

const hiddenMark = Decoration.mark({ class: 'cm-syntax-hidden' });
const visibleSyntaxMark = Decoration.mark({ class: 'cm-syntax-visible' });

const INLINE_SYNTAX = [
	{ regex: /==(.*?)==/g, markClass: 'cm-highlight-mark', contentClass: 'cm-highlight', length: 2 },
	{ regex: /\+\+(.*?)\+\+/g, markClass: 'cm-underline-mark', contentClass: 'cm-underline', length: 2 },
	{ regex: /\^(.*?)\^/g, markClass: 'cm-superscript-mark', contentClass: 'cm-superscript', length: 1 },
	{ regex: /~(.*?)~/g, markClass: 'cm-subscript-mark', contentClass: 'cm-subscript', length: 1 },
	{ regex: /\[\[(.*?)\]\]/g, markClass: 'cm-wikilink-mark', contentClass: 'cm-wikilink', length: 2 },
	{ regex: /(?<!\w)(#[A-Za-z0-9_/-]+)/g, markClass: '', contentClass: 'cm-tag', length: 0 },
	{ regex: /\$(.*?)\$/g, markClass: 'cm-math-mark', contentClass: 'cm-math', length: 1 }
];

function isSelectionIntersecting(ranges: readonly { from: number; to: number }[], from: number, to: number): boolean {
	for (const range of ranges) {
		if (range.from <= to + 1 && range.to >= from - 1) {
			return true;
		}
	}
	return false;
}

function buildExtensionsDecorations(
	view: EditorView,
	activeRegion: ActiveRegion,
	frontmatterRange: { bodyFrom: number } | null
): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const state = view.state;
	const { activeLines } = activeRegion;

	const decos: { from: number; to: number; deco: Decoration }[] = [];

	for (const { from, to } of view.visibleRanges) {
		let pos = from;
		while (pos <= to) {
			const line = state.doc.lineAt(pos);
			const text = line.text;
			const isActive = activeLines.has(line.number);

			// Skip frontmatter lines
			if (
				frontmatterRange &&
				line.from < frontmatterRange.bodyFrom &&
				line.to <= frontmatterRange.bodyFrom
			) {
				pos = line.to + 1;
				continue;
			}

			for (const syntax of INLINE_SYNTAX) {
				let match;
				syntax.regex.lastIndex = 0;
				while ((match = syntax.regex.exec(text)) !== null) {
					const matchStart = line.from + match.index;
					const matchEnd = matchStart + match[0].length;
					const isTokenActive = isSelectionIntersecting(state.selection.ranges, matchStart, matchEnd);

					if (syntax.length > 0) {
						const leftMarkStart = matchStart;
						const leftMarkEnd = matchStart + syntax.length;
						const contentStart = leftMarkEnd;
						const contentEnd = matchEnd - syntax.length;
						const rightMarkStart = contentEnd;
						const rightMarkEnd = matchEnd;

						const markDeco = isTokenActive
							? Decoration.mark({ class: syntax.markClass || 'cm-syntax-visible' })
							: hiddenMark;

						decos.push({ from: leftMarkStart, to: leftMarkEnd, deco: markDeco });
						decos.push({
							from: contentStart,
							to: contentEnd,
							deco: Decoration.mark({ class: syntax.contentClass })
						});
						decos.push({ from: rightMarkStart, to: rightMarkEnd, deco: markDeco });
					} else {
						decos.push({
							from: matchStart,
							to: matchEnd,
							deco: Decoration.mark({ class: syntax.contentClass })
						});
					}
				}
			}

			// Callout blocks
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

					const headerEnd = line.from + typeMatch[0].length;
					const isCalloutHeaderActive = isSelectionIntersecting(state.selection.ranges, line.from, headerEnd);
					if (!isCalloutHeaderActive) {
						decos.push({ from: line.from, to: headerEnd, deco: hiddenMark });
					}
				}
			}

			pos = line.to + 1;
		}
	}

	decos.sort((a, b) => {
		if (a.from !== b.from) return a.from - b.from;
		return a.to - b.to;
	});

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

class AdvancedExtensionsPluginImpl {
	decorations: DecorationSet;
	private scheduler = new RenderingScheduler(300);
	private lastActiveRegion: ActiveRegion;
	private cachedFrontmatter: { bodyFrom: number } | null = null;

	constructor(view: EditorView) {
		this.lastActiveRegion = getActiveRegion(view.state);
		this.cachedFrontmatter = detectFrontmatter(view.state.doc.toString());
		this.decorations = buildExtensionsDecorations(view, this.lastActiveRegion, this.cachedFrontmatter);
	}

	update(update: ViewUpdate): void {
		// Suppress updates during IME composition
		if (update.view.composing) return;

		// Handle scheduled rebuild
		if (this.scheduler.consumeRebuild()) {
			this.lastActiveRegion = getActiveRegion(update.state);
			this.decorations = buildExtensionsDecorations(
				update.view,
				this.lastActiveRegion,
				this.cachedFrontmatter
			);
			return;
		}

		if (update.docChanged) {
			// Map existing decorations through changes, then schedule rebuild
			this.decorations = this.decorations.map(update.changes);
			this.cachedFrontmatter = detectFrontmatter(update.state.doc.toString());
			this.scheduler.scheduleRebuild(update.view);
			return;
		}

		if (update.selectionSet) {
			const newRegion = getActiveRegion(update.state);
			if (newRegion !== this.lastActiveRegion) {
				this.lastActiveRegion = newRegion;
				this.decorations = buildExtensionsDecorations(
					update.view,
					newRegion,
					this.cachedFrontmatter
				);
			}
			return;
		}

		if (update.viewportChanged) {
			this.lastActiveRegion = getActiveRegion(update.state);
			this.decorations = buildExtensionsDecorations(
				update.view,
				this.lastActiveRegion,
				this.cachedFrontmatter
			);
		}
	}

	destroy(): void {
		this.scheduler.destroy();
	}
}

export const advancedExtensionsPlugin = ViewPlugin.fromClass(AdvancedExtensionsPluginImpl, {
	decorations: (v: AdvancedExtensionsPluginImpl) => v.decorations
});