import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, WidgetType } from '@codemirror/view';
import type { DecorationSet, EditorView } from '@codemirror/view';

type RenderDecorationKind = 'mark' | 'replace' | 'widget' | 'line';

export interface RenderDecorationInput {
	from: number;
	to: number;
	deco: Decoration;
	kind: RenderDecorationKind;
	source: string;
	priority?: number;
}

export interface RenderGuardCounters {
	renderCount: number;
	viewportCount: number;
	layoutCount: number;
	frameStartedAt: number;
}

export interface RenderGuardResult {
	shouldRender: boolean;
	reason?: string;
}

interface NormalizedRenderDecoration extends RenderDecorationInput {
	priority: number;
}

const frameWindowMs = 16;
const maxPassesPerFrame = 10;

export class RenderSafeWidget extends WidgetType {
	constructor(
		private readonly widget: WidgetType,
		private readonly options: {
			label: string;
			block?: boolean;
			minHeight?: number;
		}
	) {
		super();
	}

	eq(other: RenderSafeWidget): boolean {
		return this.options.label === other.options.label && this.widget.eq(other.widget);
	}

	toDOM(view: EditorView): HTMLElement {
		const tagName = this.options.block ? 'div' : 'span';
		const boundary = document.createElement(tagName);
		boundary.className = 'cm-render-widget-boundary';
		boundary.dataset.renderWidget = this.options.label;
		if (this.options.minHeight && this.options.minHeight > 0) {
			boundary.style.minHeight = `${this.options.minHeight}px`;
		}

		try {
			const dom = this.widget.toDOM(view);
			boundary.replaceChildren(dom);
		} catch (error) {
			boundary.replaceChildren(createRenderErrorElement(this.options.label, error));
		}

		return boundary;
	}

	updateDOM(dom: HTMLElement, view: EditorView, _from: this): boolean {
		const child = dom.firstElementChild as HTMLElement | null;
		try {
			if (child && this.widget.updateDOM(child, view, this.widget)) return true;
			return false;
		} catch (error) {
			dom.replaceChildren(createRenderErrorElement(this.options.label, error));
			return true;
		}
	}

	ignoreEvent(event: Event): boolean {
		try {
			return this.widget.ignoreEvent(event);
		} catch {
			return true;
		}
	}
}

export function superviseDecorations(params: {
	docLength: number;
	decorations: RenderDecorationInput[];
	source: string;
	getText?: (from: number, to: number) => string;
	allowLineBreakReplacement?: boolean;
}): DecorationSet {
	const normalized = normalizeDecorations({
		decorations: params.decorations,
		docLength: params.docLength,
		source: params.source,
		getText: params.getText,
		allowLineBreakReplacement: params.allowLineBreakReplacement ?? false
	});
	const builder = new RangeSetBuilder<Decoration>();

	for (const decoration of normalized) {
		builder.add(decoration.from, decoration.to, decoration.deco);
	}

	try {
		return builder.finish();
	} catch (error) {
		console.warn(`[markdown-render] ${params.source} failed to build decorations`, error);
		return Decoration.none;
	}
}

export function createRenderGuard(): RenderGuardCounters {
	return {
		renderCount: 0,
		viewportCount: 0,
		layoutCount: 0,
		frameStartedAt: performance.now()
	};
}

export function recordRenderPass(
	counters: RenderGuardCounters,
	type: 'render' | 'viewport' | 'layout'
): RenderGuardResult {
	const now = performance.now();
	if (now - counters.frameStartedAt > frameWindowMs) {
		counters.renderCount = 0;
		counters.viewportCount = 0;
		counters.layoutCount = 0;
		counters.frameStartedAt = now;
	}

	if (type === 'render') counters.renderCount += 1;
	if (type === 'viewport') counters.viewportCount += 1;
	if (type === 'layout') counters.layoutCount += 1;

	const totalPasses = counters.renderCount + counters.viewportCount + counters.layoutCount;
	if (totalPasses > maxPassesPerFrame) {
		return {
			shouldRender: false,
			reason: `render loop guard stopped ${totalPasses} passes within one frame`
		};
	}

	return { shouldRender: true };
}

function normalizeDecorations(params: {
	decorations: RenderDecorationInput[];
	docLength: number;
	source: string;
	getText?: (from: number, to: number) => string;
	allowLineBreakReplacement: boolean;
}): NormalizedRenderDecoration[] {
	const valid: NormalizedRenderDecoration[] = [];

	for (const decoration of params.decorations) {
		const priority = decoration.priority ?? priorityForKind(decoration.kind);
		if (!isValidRange(decoration, params.docLength)) {
			console.warn(`[markdown-render] discarded invalid decoration from ${params.source}`, decoration);
			continue;
		}

		if (
			decoration.kind === 'replace' &&
			!params.allowLineBreakReplacement &&
			params.getText?.(decoration.from, decoration.to).includes('\n')
		) {
			console.warn(`[markdown-render] discarded plugin replacement across line break from ${decoration.source}`);
			continue;
		}

		valid.push({ ...decoration, priority });
	}

	valid.sort((left, right) => {
		if (left.from !== right.from) return left.from - right.from;
		if (left.priority !== right.priority) return right.priority - left.priority;
		if (left.to !== right.to) return left.to - right.to;
		return left.source.localeCompare(right.source);
	});

	const accepted: NormalizedRenderDecoration[] = [];
	const occupiedReplacements: Array<{ from: number; to: number; source: string }> = [];

	for (const decoration of valid) {
		if (decoration.kind === 'replace' && overlapsRange(occupiedReplacements, decoration.from, decoration.to)) {
			console.warn(`[markdown-render] discarded overlapping replacement from ${decoration.source}`);
			continue;
		}

		if (
			decoration.kind !== 'replace' &&
			decoration.from < decoration.to &&
			overlapsRange(occupiedReplacements, decoration.from, decoration.to)
		) {
			console.warn(`[markdown-render] discarded decoration inside replacement from ${decoration.source}`);
			continue;
		}

		if (decoration.kind === 'replace' && decoration.from < decoration.to) {
			occupiedReplacements.push({
				from: decoration.from,
				to: decoration.to,
				source: decoration.source
			});
		}

		accepted.push(decoration);
	}

	return accepted.sort((left, right) => {
		if (left.from !== right.from) return left.from - right.from;
		if (left.to !== right.to) return left.to - right.to;
		return left.priority - right.priority;
	});
}

function isValidRange(decoration: RenderDecorationInput, docLength: number): boolean {
	if (!Number.isInteger(decoration.from) || !Number.isInteger(decoration.to)) return false;
	if (decoration.from < 0 || decoration.to < 0) return false;
	if (decoration.from > decoration.to) return false;
	if (decoration.to > docLength) return false;
	if (decoration.kind === 'replace' && decoration.from === decoration.to) return false;
	return true;
}

function priorityForKind(kind: RenderDecorationKind): number {
	if (kind === 'replace') return 40;
	if (kind === 'widget') return 30;
	if (kind === 'line') return 20;
	return 10;
}

function overlapsRange(ranges: Array<{ from: number; to: number }>, from: number, to: number): boolean {
	return ranges.some((range) => from < range.to && to > range.from);
}

function createRenderErrorElement(label: string, error: unknown): HTMLElement {
	const element = document.createElement('pre');
	element.className = 'cm-render-error';
	const message = error instanceof Error ? error.message : 'Unable to render widget.';
	element.textContent = `${label}: ${message}`;
	return element;
}
