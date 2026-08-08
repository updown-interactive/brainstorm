import { Decoration, EditorView, WidgetType, ViewPlugin } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { StateField } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import mermaid from 'mermaid';
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

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

// ---------------------------------------------------------------------------
// Decoration constants
// ---------------------------------------------------------------------------

const hiddenMarkerTypes = new Set([
	'HeaderMark',
	'EmphasisMark',
	'StrikethroughMark',
	'QuoteMark',
	'CodeMark',
	'LinkMark'
]);

const hiddenMark = Decoration.mark({ class: 'cm-syntax-hidden' });
const visibleSyntaxMark = Decoration.mark({ class: 'cm-syntax-visible' });

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

class HrWidget extends WidgetType {
	eq(): boolean {
		return true;
	}

	toDOM(): HTMLElement {
		const hr = document.createElement('hr');
		hr.className = 'cm-hr';
		return hr;
	}

	updateDOM(): boolean {
		return true;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

function formatLanguageName(lang: string): string {
	if (!lang) return '';
	const l = lang.trim().toLowerCase();
	const map: Record<string, string> = {
		js: 'JavaScript',
		javascript: 'JavaScript',
		ts: 'TypeScript',
		typescript: 'TypeScript',
		dart: 'Dart',
		json: 'JSON',
		html: 'HTML',
		css: 'CSS',
		py: 'Python',
		python: 'Python',
		cpp: 'C++',
		c: 'C',
		rust: 'Rust',
		go: 'Go',
		sql: 'SQL',
		bash: 'Bash',
		sh: 'Bash',
		shell: 'Shell',
		yaml: 'YAML',
		yml: 'YAML',
		md: 'Markdown',
		markdown: 'Markdown'
	};
	if (map[l]) return map[l];
	return lang.charAt(0).toUpperCase() + lang.slice(1);
}

class CopyCodeWidget extends WidgetType {
	constructor(
		public code: string,
		public lang: string = ''
	) {
		super();
	}

	eq(other: CopyCodeWidget): boolean {
		return other.code === this.code && other.lang === this.lang;
	}

	toDOM(): HTMLElement {
		const wrap = document.createElement('span');
		wrap.className = 'cm-codeblock-action-wrap';

		if (this.lang) {
			const tag = document.createElement('span');
			tag.className = 'cm-codeblock-lang-tag';
			tag.textContent = formatLanguageName(this.lang);
			wrap.appendChild(tag);
		}

		const btn = document.createElement('button');
		btn.className = 'cm-copy-code-btn';
		btn.title = 'Copy Code';
		this.renderCopyIcon(btn);

		btn.onclick = (e) => {
			e.preventDefault();
			e.stopPropagation();
			void navigator.clipboard.writeText(this.code);
			this.renderCheckIcon(btn);
			setTimeout(() => this.renderCopyIcon(btn), 2000);
		};
		wrap.appendChild(btn);
		return wrap;
	}

	updateDOM(dom: HTMLElement): boolean {
		const tag = dom.querySelector('.cm-codeblock-lang-tag');
		if (tag) tag.textContent = formatLanguageName(this.lang);
		return true;
	}

	ignoreEvent(event: Event): boolean {
		return event.type !== 'mousedown';
	}

	private renderCopyIcon(el: HTMLElement): void {
		el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
	}

	private renderCheckIcon(el: HTMLElement): void {
		el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;
	}
}

class CheckboxWidget extends WidgetType {
	constructor(
		public checked: boolean,
		public pos: number
	) {
		super();
	}

	eq(other: CheckboxWidget): boolean {
		return other.checked === this.checked && other.pos === this.pos;
	}

	toDOM(view: EditorView): HTMLElement {
		const wrap = document.createElement('span');
		wrap.className = `cm-task-checkbox-wrap ${this.checked ? 'is-checked' : ''}`;
		
		const input = document.createElement('input');
		input.type = 'checkbox';
		input.checked = this.checked;
		input.className = 'cm-task-checkbox';

		input.onclick = (e) => {
			e.preventDefault();
			e.stopPropagation();

			const doc = view.state.doc;
			if (this.pos >= doc.length) return;

			const line = doc.lineAt(this.pos);
			const taskMatch = line.text.match(/^(\s*(?:[-+*]|\d+[\.\)])\s*)\[([ xX])\]/);

			let targetFrom = this.pos;
			let targetTo = Math.min(doc.length, this.pos + 3);
			let isCurrentlyChecked = this.checked;

			if (taskMatch) {
				const prefixLen = taskMatch[1].length;
				targetFrom = line.from + prefixLen;
				targetTo = Math.min(doc.length, targetFrom + 3);
				isCurrentlyChecked = taskMatch[2].toLowerCase() === 'x';
			}

			const nextText = isCurrentlyChecked ? '[ ]' : '[x]';

			view.dispatch({
				changes: { from: targetFrom, to: targetTo, insert: nextText }
			});
		};

		wrap.appendChild(input);
		return wrap;
	}

	updateDOM(dom: HTMLElement): boolean {
		const input = dom.querySelector('input') as HTMLInputElement | null;
		if (input) {
			input.checked = this.checked;
			dom.className = `cm-task-checkbox-wrap ${this.checked ? 'is-checked' : ''}`;
			return true;
		}
		return false;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

function toLowerRoman(num: number): string {
	const lookup: [number, string][] = [
		[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'],
		[100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'],
		[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']
	];
	let roman = '';
	let n = num;
	for (const [val, char] of lookup) {
		while (n >= val) {
			roman += char;
			n -= val;
		}
	}
	return roman || 'i';
}

function toLowerAlpha(num: number): string {
	if (num <= 0) return 'a';
	let alpha = '';
	let n = num;
	while (n > 0) {
		const rem = (n - 1) % 26;
		alpha = String.fromCharCode(97 + rem) + alpha;
		n = Math.floor((n - 1) / 26);
	}
	return alpha;
}

function parseMarkerNumber(marker: string): number {
	const numMatch = marker.match(/\d+/);
	if (numMatch) return parseInt(numMatch[0], 10);

	const clean = marker.replace(/[\.\)]/g, '').trim().toLowerCase();
	const romanMap: Record<string, number> = {
		i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10
	};
	if (romanMap[clean]) return romanMap[clean];

	if (clean.length === 1 && clean >= 'a' && clean <= 'z') {
		return clean.charCodeAt(0) - 96;
	}

	return 1;
}

class ListMarkerWidget extends WidgetType {
	constructor(
		private readonly symbol: string,
		private readonly isUnordered: boolean,
		private readonly depth: number
	) {
		super();
	}

	eq(other: ListMarkerWidget): boolean {
		return other.symbol === this.symbol && other.isUnordered === this.isUnordered && other.depth === this.depth;
	}

	toDOM(): HTMLElement {
		const marker = document.createElement('span');
		marker.className = `cm-list-marker-preview ${this.isUnordered ? 'is-unordered' : 'is-ordered'} depth-${this.depth}`;
		marker.textContent = this.symbol;
		return marker;
	}

	updateDOM(dom: HTMLElement): boolean {
		dom.className = `cm-list-marker-preview ${this.isUnordered ? 'is-unordered' : 'is-ordered'} depth-${this.depth}`;
		dom.textContent = this.symbol;
		return true;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

class ImageWidget extends WidgetType {
	constructor(
		public url: string,
		public alt: string
	) {
		super();
	}

	eq(other: ImageWidget): boolean {
		return other.url === this.url && other.alt === this.alt;
	}

	toDOM(): HTMLElement {
		const wrap = document.createElement('span');
		wrap.className = 'cm-image-preview-wrap';
		const img = document.createElement('img');
		img.src = this.url;
		if (this.alt) img.alt = this.alt;
		img.className = 'cm-image-preview';
		wrap.appendChild(img);
		return wrap;
	}

	updateDOM(dom: HTMLElement): boolean {
		const img = dom.querySelector('img') as HTMLImageElement | null;
		if (img) {
			img.src = this.url;
			img.alt = this.alt || '';
			return true;
		}
		return false;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

class LinkWidget extends WidgetType {
	constructor(
		public label: string,
		public href: string
	) {
		super();
	}

	eq(other: LinkWidget): boolean {
		return other.label === this.label && other.href === this.href;
	}

	toDOM(): HTMLElement {
		const anchor = document.createElement('a');
		anchor.className = 'cm-link-preview';
		anchor.textContent = this.label;
		anchor.href = this.href;
		anchor.title = this.href;
		anchor.target = '_blank';
		anchor.rel = 'noopener noreferrer';
		return anchor;
	}

	updateDOM(dom: HTMLElement): boolean {
		const anchor = dom as HTMLAnchorElement;
		anchor.textContent = this.label;
		anchor.href = this.href;
		anchor.title = this.href;
		return true;
	}

	ignoreEvent(event: Event): boolean {
		return event.type !== 'mousedown';
	}
}

class TableWidget extends WidgetType {
	constructor(public text: string) {
		super();
	}

	eq(other: TableWidget): boolean {
		return other.text === this.text;
	}

	toDOM(): HTMLElement {
		const wrap = document.createElement('div');
		wrap.className = 'cm-table-widget-wrap';
		this.buildTable(wrap);
		return wrap;
	}

	updateDOM(dom: HTMLElement): boolean {
		dom.innerHTML = '';
		this.buildTable(dom);
		return true;
	}

	ignoreEvent(): boolean {
		return true;
	}

	private buildTable(container: HTMLElement): void {
		const rows = this.text.trim().split('\n');
		if (rows.length === 0) return;

		const table = document.createElement('table');
		table.className = 'cm-table-widget';
		const aligns = parseTableAlignments(rows[1] ?? '');

		const headerCells = rows[0]
			.split('|')
			.map((c) => c.trim())
			.filter((c, i, arr) => !(c === '' && (i === 0 || i === arr.length - 1)));
		const thead = document.createElement('thead');
		const tr = document.createElement('tr');
		headerCells.forEach((c) => {
			const th = document.createElement('th');
			th.innerText = c;
			applyTableAlignment(th, aligns[tr.children.length]);
			tr.appendChild(th);
		});
		thead.appendChild(tr);
		table.appendChild(thead);

		const tbody = document.createElement('tbody');
		for (let i = 2; i < rows.length; i++) {
			const rowText = rows[i];
			const cells = rowText
				.split('|')
				.map((c) => c.trim())
				.filter((c, idx, arr) => !(c === '' && (idx === 0 || idx === arr.length - 1)));
			if (cells.length === 0) continue;
			const r = document.createElement('tr');
			cells.forEach((c) => {
				const td = document.createElement('td');
				td.innerText = c;
				applyTableAlignment(td, aligns[r.children.length]);
				r.appendChild(td);
			});
			tbody.appendChild(r);
		}
		table.appendChild(tbody);
		container.appendChild(table);
	}
}

class MermaidWidget extends WidgetType {
	private static svgCache = new Map<string, string>();

	constructor(public code: string) {
		super();
	}

	eq(other: MermaidWidget): boolean {
		return other.code === this.code;
	}

	toDOM(): HTMLElement {
		const wrap = document.createElement('div');
		wrap.className = 'cm-mermaid-widget-wrap';

		const cached = MermaidWidget.svgCache.get(this.code);
		if (cached) {
			wrap.innerHTML = cached;
			return wrap;
		}

		const id = `mermaid-${this.contentHash()}`;

		queueMicrotask(() => {
			void mermaid
				.render(id, this.code)
				.then(({ svg }) => {
					wrap.innerHTML = svg;
					MermaidWidget.svgCache.set(this.code, svg);
				})
				.catch((e: Error) => {
					const errorMsg = document.createElement('pre');
					errorMsg.className = 'cm-mermaid-error';
					errorMsg.innerText = e.message || 'Mermaid Syntax Error';
					wrap.replaceChildren(errorMsg);
				});
		});

		return wrap;
	}

	updateDOM(dom: HTMLElement): boolean {
		const cached = MermaidWidget.svgCache.get(this.code);
		if (cached) {
			dom.innerHTML = cached;
			return true;
		}
		return false;
	}

	ignoreEvent(): boolean {
		return true;
	}

	private contentHash(): string {
		let hash = 0;
		for (let i = 0; i < this.code.length; i++) {
			hash = (hash << 5) - hash + this.code.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash).toString(36);
	}
}

function parseTableAlignments(alignRow: string): string[] {
	return alignRow
		.split('|')
		.map((c) => c.trim())
		.filter((c, i, arr) => !(c === '' && (i === 0 || i === arr.length - 1)))
		.map((cell) => {
			const left = cell.startsWith(':');
			const right = cell.endsWith(':');
			if (left && right) return 'center';
			if (right) return 'right';
			if (left) return 'left';
			return 'left';
		});
}

function applyTableAlignment(el: HTMLElement, align: string | undefined): void {
	if (align && align !== 'left') {
		el.style.textAlign = align;
	}
}

function parseMarkdownLink(text: string): { label: string; href: string } | null {
	const match = text.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
	if (!match) return null;

	const label = match[1].trim();
	const rawHref = match[2].trim();
	const href = normalizeHref(rawHref);

	if (!label || !href) return null;
	return { label, href };
}

function normalizeHref(href: string): string {
	const value = href.replace(/^<(.+)>$/, '$1');
	if (
		/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value) ||
		value.startsWith('/') ||
		value.startsWith('#')
	) {
		return value;
	}
	return `https://${value}`;
}

function isSelectionIntersecting(ranges: readonly { from: number; to: number }[], from: number, to: number): boolean {
	for (const range of ranges) {
		if (range.from <= to + 1 && range.to >= from - 1) {
			return true;
		}
	}
	return false;
}

function isNodeInActiveRegion(state: EditorState, activeRegion: ActiveRegion, from: number, to: number): boolean {
	const startLine = state.doc.lineAt(from).number;
	const endLine = state.doc.lineAt(to).number;

	for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
		if (activeRegion.activeLines.has(lineNumber)) return true;
	}

	return false;
}

function isFrontmatterNode(
	frontmatterRange: { bodyFrom: number } | null,
	from: number,
	to: number
): boolean {
	return Boolean(frontmatterRange && from < frontmatterRange.bodyFrom && to <= frontmatterRange.bodyFrom);
}

function createBlockWidgetDecoration(
	from: number,
	to: number,
	source: string,
	widget: WidgetType,
	label: string,
	minHeight: number
): RenderDecorationInput {
	return {
		from,
		to,
		kind: 'replace',
		source,
		deco: Decoration.replace({
			widget: new RenderSafeWidget(widget, {
				label,
				block: true,
				minHeight
			}),
			block: true
		})
	};
}

function buildBlockPreviewDecorations(state: EditorState): DecorationSet {
	const activeRegion = getActiveRegion(state);
	const frontmatterRange = detectFrontmatter(state.doc.toString());
	const decos: RenderDecorationInput[] = [];

	syntaxTree(state).iterate({
		enter(node) {
			if (isFrontmatterNode(frontmatterRange, node.from, node.to)) return false;
			if (isNodeInActiveRegion(state, activeRegion, node.from, node.to)) return undefined;

			if (node.name === 'FencedCode') {
				const text = state.doc.sliceString(node.from, node.to);
				const mermaidMatch = text.match(/```mermaid\s*\n([\s\S]*?)```/);
				if (!mermaidMatch) return undefined;

				decos.push(createBlockWidgetDecoration(
					node.from,
					node.to,
					'block-preview:mermaid',
					new MermaidWidget(mermaidMatch[1].trim()),
					'Mermaid',
					120
				));
				return false;
			}

			if (node.name === 'Table') {
				decos.push(createBlockWidgetDecoration(
					node.from,
					node.to,
					'block-preview:table',
					new TableWidget(state.doc.sliceString(node.from, node.to)),
					'Table',
					72
				));
				return false;
			}

			return undefined;
		}
	});

	return superviseDecorations({
		docLength: state.doc.length,
		decorations: decos,
		source: 'block-preview',
		getText: (from, to) => state.doc.sliceString(from, to),
		allowLineBreakReplacement: true
	});
}

export const blockPreviewExtension = StateField.define<DecorationSet>({
	create(state) {
		return buildBlockPreviewDecorations(state);
	},
	update(decorations, tr) {
		if (tr.docChanged || tr.selection) {
			return buildBlockPreviewDecorations(tr.state);
		}
		return decorations;
	},
	provide: (field) => EditorView.decorations.from(field)
});

// ---------------------------------------------------------------------------
// Decoration builder — viewport-scoped, active-region-aware
// ---------------------------------------------------------------------------

function buildPreviewDecorations(
	view: EditorView,
	activeRegion: ActiveRegion,
	frontmatterRange: { bodyFrom: number } | null
): DecorationSet {
	const state = view.state;
	const { activeLines } = activeRegion;

	const decos: RenderDecorationInput[] = [];

	for (const { from: visFrom, to: visTo } of view.visibleRanges) {
		syntaxTree(state).iterate({
			from: visFrom,
			to: visTo,
			enter(node) {
				const startLine = state.doc.lineAt(node.from).number;
				const endLine = state.doc.lineAt(node.to).number;

				if (
					frontmatterRange &&
					node.from < frontmatterRange.bodyFrom &&
					node.to <= frontmatterRange.bodyFrom
				) {
					return false;
				}

				let isActive = false;
				for (let i = startLine; i <= endLine; i++) {
					if (activeLines.has(i)) {
						isActive = true;
						break;
					}
				}

function extractInnerCodeAndLang(text: string): { innerCode: string; lang: string } {
	const lines = text.split('\n');
	if (lines.length === 0) return { innerCode: '', lang: '' };

	const openingLine = lines[0];
	const langMatch = openingLine.match(/^(?:```|~~~)\s*([A-Za-z0-9_+#.-]*)/);
	const lang = langMatch ? langMatch[1] : '';

	const hasClosingFence = lines.length > 1 && /^(?:```|~~~)\s*$/.test(lines[lines.length - 1].trim());
	const innerLines = lines.slice(1, hasClosingFence ? lines.length - 1 : lines.length);

	return {
		innerCode: innerLines.join('\n'),
		lang
	};
}

				// Fenced code blocks & Mermaid
				if (node.name === 'FencedCode') {
					const text = state.doc.sliceString(node.from, node.to);
					const mermaidMatch = text.match(/```mermaid\s*\n([\s\S]*?)```/);

					if (mermaidMatch && !isActive) {
						return false;
					}

					const { innerCode, lang } = extractInnerCodeAndLang(text);
					const isOpeningFenceActive = activeLines.has(startLine);
					const isClosingFenceActive = activeLines.has(endLine);

					if (startLine < endLine) {
						const firstVisibleLine = isOpeningFenceActive ? startLine : startLine + 1;
						const lastVisibleLine = isClosingFenceActive ? endLine : endLine - 1;

						for (let i = startLine; i <= endLine; i++) {
							const line = state.doc.line(i);
							const isStartHidden = i === startLine && !isOpeningFenceActive;
							const isEndHidden = i === endLine && !isClosingFenceActive;

							if (isStartHidden || isEndHidden) {
								decos.push({
									from: line.from,
									to: line.from,
									kind: 'line',
									source: 'live-preview:code-line-hidden',
									deco: Decoration.line({ class: 'cm-codeblock-fence-hidden' })
								});
								decos.push({
									from: line.from,
									to: line.to,
									kind: 'mark',
									source: 'live-preview:code-fence-mark',
									deco: hiddenMark
								});
							} else {
								let className = 'cm-codeblock-line';
								if (i === firstVisibleLine) className += ' cm-codeblock-top';
								if (i === lastVisibleLine) className += ' cm-codeblock-bottom';

								decos.push({
									from: line.from,
									to: line.from,
									kind: 'line',
									source: 'live-preview:code-line',
									deco: Decoration.line({ class: className })
								});

								if (i === firstVisibleLine) {
									decos.push({
										from: line.to,
										to: line.to,
										kind: 'widget',
										source: 'live-preview:copy-code',
										deco: Decoration.widget({
											widget: new RenderSafeWidget(new CopyCodeWidget(innerCode, lang), {
												label: 'Copy Code'
											}),
											side: 1
										})
									});
								}
							}
						}
					} else {
						const line = state.doc.line(startLine);
						decos.push({
							from: line.from,
							to: line.from,
							kind: 'line',
							source: 'live-preview:code-line',
							deco: Decoration.line({ class: 'cm-codeblock-line cm-codeblock-top cm-codeblock-bottom' })
						});
						decos.push({
							from: line.to,
							to: line.to,
							kind: 'widget',
							source: 'live-preview:copy-code',
							deco: Decoration.widget({
								widget: new RenderSafeWidget(new CopyCodeWidget(innerCode, lang), {
									label: 'Copy Code'
								}),
								side: 1
							})
						});
					}
					return false;
				}

				if (node.name === 'InlineCode') {
					decos.push({
						from: node.from,
						to: node.to,
						kind: 'mark',
						source: 'live-preview:inline-code',
						deco: Decoration.mark({ class: 'cm-inline-code' })
					});
				}

				if (!isActive) {
					if (node.name === 'Table') {
						return false;
					}

					if (node.name === 'HorizontalRule') {
						decos.push({
							from: node.from,
							to: node.to,
							kind: 'replace',
							source: 'live-preview:horizontal-rule',
							deco: Decoration.replace({
								widget: new RenderSafeWidget(new HrWidget(), {
									label: 'Horizontal Rule',
									block: true
								})
							})
						});
					} else if (node.name === 'ListMark') {
						const rawMarker = state.doc.sliceString(node.from, node.to);
						const markerTo = node.to < state.doc.length && state.doc.sliceString(node.to, node.to + 1) === ' '
							? node.to + 1
							: node.to;

						const parentNode = node.node.parent;
						const hasTaskChild = parentNode && Boolean(parentNode.getChild('TaskMarker'));
						const lineText = state.doc.lineAt(node.from).text;
						const textAfterMark = lineText.slice(node.to - state.doc.lineAt(node.from).from).trim();
						const isTaskItem = hasTaskChild || /^\[[ xX]\]/.test(textAfterMark);

						if (isTaskItem) {
							decos.push({
								from: node.from,
								to: markerTo,
								kind: 'mark',
								source: 'live-preview:list-marker-task-hidden',
								deco: hiddenMark
							});
						} else {
							const cleanMarker = rawMarker.trim();
							const isOrdered = /^\d+[\.\)]/.test(cleanMarker) || /^[ivx]+[\.\)]/i.test(cleanMarker) || /^[a-z][\.\)]/i.test(cleanMarker);

							let bulletDepth = 0;
							let orderedDepth = 0;
							let curr = node.node.parent;
							while (curr) {
								if (curr.name === 'BulletList') {
									bulletDepth++;
								} else if (curr.name === 'OrderedList') {
									orderedDepth++;
								}
								curr = curr.parent;
							}

							const leadingSpaces = lineText.match(/^\s*/)?.[0].length ?? 0;
							const indentDepth = Math.floor(leadingSpaces / 2) + 1;

							const effectiveBulletDepth = bulletDepth > 0 ? bulletDepth : indentDepth;
							const effectiveOrderedDepth = orderedDepth > 0 ? orderedDepth : indentDepth;

							let displaySymbol = cleanMarker;

							if (!isOrdered) {
								const depth = Math.max(1, effectiveBulletDepth);
								if (depth === 1) {
									displaySymbol = '•';
								} else if (depth === 2) {
									displaySymbol = '◦';
								} else {
									displaySymbol = '▪';
								}
							} else {
								const depth = Math.max(1, effectiveOrderedDepth);
								const num = parseMarkerNumber(cleanMarker);
								const punctuation = cleanMarker.endsWith(')') ? ')' : '.';
								if (depth === 1) {
									displaySymbol = `${num}${punctuation}`;
								} else if (depth === 2) {
									displaySymbol = `${toLowerRoman(num)}${punctuation}`;
								} else {
									displaySymbol = `${toLowerAlpha(num)}${punctuation}`;
								}
							}

							decos.push({
								from: node.from,
								to: markerTo,
								kind: 'replace',
								source: 'live-preview:list-marker-widget',
								deco: Decoration.replace({
									widget: new RenderSafeWidget(
										new ListMarkerWidget(
											displaySymbol,
											!isOrdered,
											isOrdered ? effectiveOrderedDepth : effectiveBulletDepth
										),
										{ label: 'List Marker' }
									)
								})
							});
						}
					} else if (node.name === 'TaskMarker') {
						const text = state.doc.sliceString(node.from, node.to);
						const isChecked = text.includes('x') || text.includes('X');
						const markerTo = node.to < state.doc.length && state.doc.sliceString(node.to, node.to + 1) === ' '
							? node.to + 1
							: node.to;

						decos.push({
							from: node.from,
							to: markerTo,
							kind: 'replace',
							source: 'live-preview:task-marker',
							deco: Decoration.replace({
								widget: new RenderSafeWidget(new CheckboxWidget(isChecked, node.from), {
									label: 'Task Checkbox'
								})
							})
						});
					} else if (node.name === 'Image') {
						const text = state.doc.sliceString(node.from, node.to);
						const imgMatch = text.match(/!\[(.*?)\]\((.*?)\)/);
						if (imgMatch) {
							decos.push({
								from: node.from,
								to: node.to,
								kind: 'replace',
								source: 'live-preview:image',
								deco: Decoration.replace({
									widget: new RenderSafeWidget(new ImageWidget(imgMatch[2], imgMatch[1]), {
										label: 'Image',
										minHeight: 32
									})
								})
							});
						}
					} else if (node.name === 'Link') {
						const text = state.doc.sliceString(node.from, node.to);
						const link = parseMarkdownLink(text);
						if (link) {
							decos.push({
								from: node.from,
								to: node.to,
								kind: 'replace',
								source: 'live-preview:link',
								deco: Decoration.replace({
									widget: new RenderSafeWidget(new LinkWidget(link.label, link.href), {
										label: 'Link'
									})
								})
							});
						}
					} else if (node.name === 'URL') {
						const text = state.doc.sliceString(node.from, node.to);
						decos.push({
							from: node.from,
							to: node.to,
							kind: 'replace',
							source: 'live-preview:url',
							deco: Decoration.replace({
								widget: new RenderSafeWidget(new LinkWidget(text, normalizeHref(text)), {
									label: 'URL'
								})
							})
						});
					} else if (hiddenMarkerTypes.has(node.name)) {
						const isTokenActive = isSelectionIntersecting(state.selection.ranges, node.from, node.to);
						if (isTokenActive) {
							decos.push({
								from: node.from,
								to: node.to,
								kind: 'mark',
								source: 'live-preview:visible-syntax',
								deco: visibleSyntaxMark
							});
						} else {
							const line = state.doc.lineAt(node.from);
							let { from, to } = node;

							if ((node.name === 'HeaderMark' || node.name === 'QuoteMark') && to < line.to) {
								if (state.doc.sliceString(to, to + 1) === ' ') {
									to += 1;
								}
							}

							decos.push({
								from,
								to,
								kind: 'mark',
								source: 'live-preview:hidden-syntax',
								deco: hiddenMark
							});
						}
					}
				}
			}
		});
	}

	return superviseDecorations({
		docLength: state.doc.length,
		decorations: decos,
		source: 'live-preview',
		getText: (from, to) => state.doc.sliceString(from, to)
	});
}

// ---------------------------------------------------------------------------
// ViewPlugin
// ---------------------------------------------------------------------------

class LivePreviewPluginImpl {
	decorations: DecorationSet;
	private scheduler = new RenderingScheduler(300);
	private guard: RenderGuardCounters = createRenderGuard();
	private lastActiveRegion: ActiveRegion;
	private cachedFrontmatter: { bodyFrom: number } | null = null;

	constructor(view: EditorView) {
		this.lastActiveRegion = getActiveRegion(view.state);
		this.cachedFrontmatter = detectFrontmatter(view.state.doc.toString());
		this.decorations = buildPreviewDecorations(view, this.lastActiveRegion, this.cachedFrontmatter);
	}

	update(update: ViewUpdate): void {
		if (update.view.composing) return;

		if (this.scheduler.consumeRebuild()) {
			if (!this.canRender('render')) return;
			this.lastActiveRegion = getActiveRegion(update.state);
			this.decorations = buildPreviewDecorations(
				update.view,
				this.lastActiveRegion,
				this.cachedFrontmatter
			);
			return;
		}

		if (update.docChanged) {
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
				this.decorations = buildPreviewDecorations(
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
			this.decorations = buildPreviewDecorations(
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
			console.warn(`[markdown-render] live preview ${result.reason}`);
		}
		return result.shouldRender;
	}
}

export const livePreviewPlugin = ViewPlugin.fromClass(LivePreviewPluginImpl, {
	decorations: (v) => v.decorations
});
