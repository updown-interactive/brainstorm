import { Decoration, EditorView, WidgetType, ViewPlugin } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import mermaid from 'mermaid';
import { detectFrontmatter } from './frontmatter';
import { getActiveRegion } from './active-region';
import { RenderingScheduler } from './rendering-scheduler';
import type { ActiveRegion } from './active-region';

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

class CopyCodeWidget extends WidgetType {
	constructor(public code: string) {
		super();
	}

	eq(other: CopyCodeWidget): boolean {
		return other.code === this.code;
	}

	toDOM(): HTMLElement {
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
		return btn;
	}

	updateDOM(): boolean {
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
	constructor(public checked: boolean) {
		super();
	}

	eq(other: CheckboxWidget): boolean {
		return other.checked === this.checked;
	}

	toDOM(): HTMLElement {
		const wrap = document.createElement('span');
		wrap.className = 'cm-task-checkbox-wrap';
		const input = document.createElement('input');
		input.type = 'checkbox';
		input.checked = this.checked;
		input.className = 'cm-task-checkbox';
		input.disabled = true;
		wrap.appendChild(input);
		return wrap;
	}

	updateDOM(dom: HTMLElement): boolean {
		const input = dom.querySelector('input') as HTMLInputElement | null;
		if (input) {
			input.checked = this.checked;
			return true;
		}
		return false;
	}

	ignoreEvent(event: Event): boolean {
		return event.type !== 'mousedown';
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

// ---------------------------------------------------------------------------
// Decoration builder — viewport-scoped, active-region-aware
// ---------------------------------------------------------------------------

function buildPreviewDecorations(
	view: EditorView,
	activeRegion: ActiveRegion,
	frontmatterRange: { bodyFrom: number } | null
): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const state = view.state;
	const { activeLines } = activeRegion;

	const decos: { from: number; to: number; deco: Decoration }[] = [];

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

				// Fenced code blocks & Mermaid
				if (node.name === 'FencedCode') {
					const text = state.doc.sliceString(node.from, node.to);
					const mermaidMatch = text.match(/```mermaid\s*\n([\s\S]*?)```/);

					if (mermaidMatch && !isActive) {
						const code = mermaidMatch[1].trim();
						decos.push({
							from: node.from,
							to: node.to,
							deco: Decoration.replace({ widget: new MermaidWidget(code) })
						});
					} else {
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
								decos.push({
									from: line.to,
									to: line.to,
									deco: Decoration.widget({ widget: new CopyCodeWidget(innerCode), side: 1 })
								});
							}
							if (i === endLine) className += ' cm-codeblock-bottom';
							decos.push({
								from: line.from,
								to: line.from,
								deco: Decoration.line({ class: className })
							});
						}
					}
					return false;
				}

				if (node.name === 'InlineCode') {
					decos.push({
						from: node.from,
						to: node.to,
						deco: Decoration.mark({ class: 'cm-inline-code' })
					});
				}

				if (!isActive) {
					if (node.name === 'HorizontalRule') {
						decos.push({
							from: node.from,
							to: node.to,
							deco: Decoration.replace({ widget: new HrWidget() })
						});
					} else if (node.name === 'TaskMarker') {
						const text = state.doc.sliceString(node.from, node.to);
						const isChecked = text.includes('x') || text.includes('X');
						decos.push({
							from: node.from,
							to: node.to,
							deco: Decoration.replace({ widget: new CheckboxWidget(isChecked) })
						});
					} else if (node.name === 'Image') {
						const text = state.doc.sliceString(node.from, node.to);
						const imgMatch = text.match(/!\[(.*?)\]\((.*?)\)/);
						if (imgMatch) {
							decos.push({
								from: node.from,
								to: node.to,
								deco: Decoration.replace({ widget: new ImageWidget(imgMatch[2], imgMatch[1]) })
							});
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
						decos.push({
							from: node.from,
							to: node.to,
							deco: Decoration.replace({ widget: new TableWidget(text) })
						});
					} else if (hiddenMarkerTypes.has(node.name)) {
						const isTokenActive = isSelectionIntersecting(state.selection.ranges, node.from, node.to);
						if (isTokenActive) {
							decos.push({ from: node.from, to: node.to, deco: visibleSyntaxMark });
						} else {
							const line = state.doc.lineAt(node.from);
							let { from, to } = node;

							if ((node.name === 'HeaderMark' || node.name === 'QuoteMark') && to < line.to) {
								if (state.doc.sliceString(to, to + 1) === ' ') {
									to += 1;
								}
							}

							decos.push({ from, to, deco: hiddenMark });
						}
					}
				}
			}
		});
	}

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

// ---------------------------------------------------------------------------
// ViewPlugin
// ---------------------------------------------------------------------------

class LivePreviewPluginImpl {
	decorations: DecorationSet;
	private scheduler = new RenderingScheduler(300);
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
}

export const livePreviewPlugin = ViewPlugin.fromClass(LivePreviewPluginImpl, {
	decorations: (v) => v.decorations
});
