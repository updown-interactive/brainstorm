import { ViewPlugin, Decoration, EditorView, WidgetType } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { detectFrontmatter } from './frontmatter';
import { getActiveRegion } from './active-region';
import { RenderingScheduler } from './rendering-scheduler';
import {
	RenderSafeWidget,
	createRenderGuard,
	recordRenderPass,
	superviseDecorations
} from './render-supervisor';
import type { ActiveRegion } from './active-region';
import type { RenderDecorationInput, RenderGuardCounters } from './render-supervisor';

const hiddenMark = Decoration.mark({ class: 'cm-syntax-hidden' });
const visibleSyntaxMark = Decoration.mark({ class: 'cm-syntax-visible' });

const INLINE_SYNTAX = [
	{ regex: /==([^=\n]+?)==/g, markClass: 'cm-highlight-mark', contentClass: 'cm-highlight', length: 2 },
	{ regex: /\+\+([^+\n]+?)\+\+/g, markClass: 'cm-underline-mark', contentClass: 'cm-underline', length: 2 },
	{ regex: /(?<!\^)\^([^^\n]+?)\^(?!\^)/g, markClass: 'cm-superscript-mark', contentClass: 'cm-superscript', length: 1 },
	{ regex: /(?<!~)~([^~\n]+?)~(?!~)/g, markClass: 'cm-subscript-mark', contentClass: 'cm-subscript', length: 1 },
	{ regex: /\[\[([^\]\n]+?)\]\]/g, markClass: 'cm-wikilink-mark', contentClass: 'cm-wikilink', length: 2 },
	{ regex: /\[\^[^\]\n]+?\]/g, markClass: '', contentClass: 'cm-footnote-ref', length: 0 },
	{ regex: /(?<!\w)(#[A-Za-z0-9_/-]+)/g, markClass: '', contentClass: 'cm-tag', length: 0 },
	{ regex: /\$([^$\n]+?)\$/g, markClass: 'cm-math-mark', contentClass: 'cm-math', length: 1 }
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
	const state = view.state;
	const { activeLines } = activeRegion;

	const decos: RenderDecorationInput[] = [];

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

						const markDeco = isActive || isTokenActive
							? Decoration.mark({ class: syntax.markClass || 'cm-syntax-visible' })
							: hiddenMark;

						decos.push({
							from: leftMarkStart,
							to: leftMarkEnd,
							kind: 'mark',
							source: `advanced-extensions:${syntax.contentClass}:left`,
							deco: markDeco
						});
						decos.push({
							from: contentStart,
							to: contentEnd,
							kind: 'mark',
							source: `advanced-extensions:${syntax.contentClass}:content`,
							deco: Decoration.mark({ class: syntax.contentClass })
						});
						decos.push({
							from: rightMarkStart,
							to: rightMarkEnd,
							kind: 'mark',
							source: `advanced-extensions:${syntax.contentClass}:right`,
							deco: markDeco
						});
					} else {
						decos.push({
							from: matchStart,
							to: matchEnd,
							kind: 'mark',
							source: `advanced-extensions:${syntax.contentClass}`,
							deco: Decoration.mark({ class: syntax.contentClass })
						});
					}
				}
			}

function formatCalloutTitle(type: string): string {
	const t = type.toLowerCase();
	const map: Record<string, string> = {
		note: 'Note',
		tip: 'Tip',
		warning: 'Warning',
		important: 'Important',
		caution: 'Caution',
		success: 'Success',
		bug: 'Bug',
		question: 'Question',
		quote: 'Quote',
		danger: 'Danger',
		info: 'Info'
	};
	if (map[t]) return map[t];
	return type.charAt(0).toUpperCase() + type.slice(1);
}

function getCalloutSvgIcon(type: string): string {
	const t = type.toLowerCase();
	switch (t) {
		case 'note':
		case 'info':
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;
		case 'tip':
		case 'important':
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
		case 'warning':
		case 'caution':
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
		case 'success':
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
		case 'bug':
		case 'danger':
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/><path d="m10 4 1-2"/><path d="m14 4-1-2"/></svg>`;
		case 'question':
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
		case 'quote':
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>`;
		default:
			return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;
	}
}

class CalloutHeaderWidget extends WidgetType {
	constructor(
		private readonly type: string,
		private readonly customTitle: string = ''
	) {
		super();
	}

	eq(other: CalloutHeaderWidget): boolean {
		return other.type === this.type && other.customTitle === this.customTitle;
	}

	toDOM(): HTMLElement {
		const header = document.createElement('div');
		const t = this.type.toLowerCase();
		header.className = `cm-callout-header cm-callout-header-${t}`;

		const iconSpan = document.createElement('span');
		iconSpan.className = 'cm-callout-icon';
		iconSpan.innerHTML = getCalloutSvgIcon(t);

		const titleSpan = document.createElement('span');
		titleSpan.className = 'cm-callout-title';
		titleSpan.textContent = this.customTitle || formatCalloutTitle(t);

		header.appendChild(iconSpan);
		header.appendChild(titleSpan);
		return header;
	}

	updateDOM(dom: HTMLElement): boolean {
		const t = this.type.toLowerCase();
		dom.className = `cm-callout-header cm-callout-header-${t}`;
		const titleSpan = dom.querySelector('.cm-callout-title');
		if (titleSpan) titleSpan.textContent = this.customTitle || formatCalloutTitle(t);
		return true;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

			// Callout blocks
			if (text.startsWith('> [!')) {
				const typeMatch = text.match(/^>\s*\[!([A-Za-z0-9_-]+)\]\s*(.*)/);
				if (typeMatch) {
					const calloutType = typeMatch[1].toLowerCase();
					const customTitle = typeMatch[2].trim();

					const startLineNum = line.number;
					let currentLineNum = line.number;

					while (currentLineNum < state.doc.lines) {
						const nextLine = state.doc.line(currentLineNum + 1);
						if (!nextLine.text.startsWith('>')) {
							break;
						}
						currentLineNum++;
					}

					const endLineNum = currentLineNum;

					for (let i = startLineNum; i <= endLineNum; i++) {
						const l = state.doc.line(i);
						let className = `cm-callout-line cm-callout-${calloutType}`;
						if (i === startLineNum) className += ' cm-callout-top';
						if (i === endLineNum) className += ' cm-callout-bottom';

						decos.push({
							from: l.from,
							to: l.from,
							kind: 'line',
							source: `advanced-extensions:callout:${calloutType}:line`,
							deco: Decoration.line({ class: className })
						});

						if (i === startLineNum) {
							const isHeaderActive = isSelectionIntersecting(state.selection.ranges, l.from, l.to);
							if (!isHeaderActive) {
								decos.push({
									from: l.from,
									to: l.to,
									kind: 'replace',
									source: `advanced-extensions:callout:${calloutType}:header-replace`,
									deco: Decoration.replace({
										widget: new RenderSafeWidget(new CalloutHeaderWidget(calloutType, customTitle), {
											label: 'Callout Header'
										})
									})
								});
							}
						} else {
							const quoteMatch = l.text.match(/^>\s?/);
							if (quoteMatch) {
								const quoteLen = quoteMatch[0].length;
								const isLineActive = isSelectionIntersecting(state.selection.ranges, l.from, l.from + quoteLen);
								if (!isLineActive) {
									decos.push({
										from: l.from,
										to: l.from + quoteLen,
										kind: 'mark',
										source: `advanced-extensions:callout:${calloutType}:quote-mark`,
										deco: hiddenMark
									});
								}
							}
						}
					}

					pos = state.doc.line(endLineNum).to + 1;
					continue;
				}
			}

			pos = line.to + 1;
		}
	}

	return superviseDecorations({
		docLength: state.doc.length,
		decorations: decos,
		source: 'advanced-extensions',
		getText: (from, to) => state.doc.sliceString(from, to)
	});
}

class AdvancedExtensionsPluginImpl {
	decorations: DecorationSet;
	private scheduler = new RenderingScheduler(300);
	private guard: RenderGuardCounters = createRenderGuard();
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
			if (!this.canRender('render')) return;
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
			if (!this.canRender('render')) return;
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
			if (!this.canRender('viewport')) return;
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

	private canRender(type: 'render' | 'viewport' | 'layout'): boolean {
		const result = recordRenderPass(this.guard, type);
		if (!result.shouldRender) {
			console.warn(`[markdown-render] advanced extensions ${result.reason}`);
		}
		return result.shouldRender;
	}
}

export const advancedExtensionsPlugin = ViewPlugin.fromClass(AdvancedExtensionsPluginImpl, {
	decorations: (v: AdvancedExtensionsPluginImpl) => v.decorations
});
