import { StateField } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

/**
 * Block-level syntax node types that define editing region boundaries.
 * When the cursor is inside one of these blocks, the entire block
 * (plus a 1-line buffer above and below) becomes the active editing region.
 */
const BLOCK_TYPES = new Set([
	'FencedCode',
	'CodeBlock',
	'Table',
	'Blockquote',
	'BulletList',
	'OrderedList',
	'ListItem',
	'ATXHeading1',
	'ATXHeading2',
	'ATXHeading3',
	'ATXHeading4',
	'ATXHeading5',
	'ATXHeading6',
	'SetextHeading1',
	'SetextHeading2',
	'HorizontalRule',
	'HTMLBlock',
	'Paragraph'
]);

export interface ActiveRegion {
	/** Start position (inclusive) of the active editing region. */
	readonly from: number;
	/** End position (inclusive) of the active editing region. */
	readonly to: number;
	/** Set of line numbers within the active region. */
	readonly activeLines: ReadonlySet<number>;
}

function computeActiveRegion(state: EditorState): ActiveRegion {
	const activeLines = new Set<number>();
	let regionFrom = Infinity;
	let regionTo = -Infinity;

	const tree = syntaxTree(state);

	for (const range of state.selection.ranges) {
		let blockFrom = range.from;
		let blockTo = range.to;

		// Walk up the syntax tree from cursor to find the enclosing block
		let current = tree.resolveInner(range.from, 1);
		while (current) {
			if (BLOCK_TYPES.has(current.name)) {
				blockFrom = Math.min(blockFrom, current.from);
				blockTo = Math.max(blockTo, current.to);
				break;
			}
			if (!current.parent) break;
			current = current.parent;
		}

		// For multi-position selections, also resolve the end
		if (range.to !== range.from) {
			let endCurrent = tree.resolveInner(range.to, -1);
			while (endCurrent) {
				if (BLOCK_TYPES.has(endCurrent.name)) {
					blockFrom = Math.min(blockFrom, endCurrent.from);
					blockTo = Math.max(blockTo, endCurrent.to);
					break;
				}
				if (!endCurrent.parent) break;
				endCurrent = endCurrent.parent;
			}
		}

		// Add a 1-line buffer above and below
		const startLine = state.doc.lineAt(blockFrom);
		const endLine = state.doc.lineAt(blockTo);
		const bufferStart = Math.max(1, startLine.number - 1);
		const bufferEnd = Math.min(state.doc.lines, endLine.number + 1);

		const from = state.doc.line(bufferStart).from;
		const to = state.doc.line(bufferEnd).to;

		regionFrom = Math.min(regionFrom, from);
		regionTo = Math.max(regionTo, to);

		for (let lineNum = bufferStart; lineNum <= bufferEnd; lineNum++) {
			activeLines.add(lineNum);
		}
	}

	return {
		from: regionFrom === Infinity ? 0 : regionFrom,
		to: regionTo === -Infinity ? 0 : regionTo,
		activeLines
	};
}

/**
 * State field that tracks the active editing region.
 *
 * The active region encompasses the cursor's enclosing block node
 * (table, code fence, blockquote, list, heading, paragraph) plus
 * a 1-line buffer. Decorations within this region remain as raw
 * markdown so they never interfere with editing.
 *
 * The field caches its value and only recomputes when the cursor
 * moves outside the current region or the document changes.
 */
export const activeRegionField = StateField.define<ActiveRegion>({
	create(state) {
		return computeActiveRegion(state);
	},
	update(region, tr) {
		if (!tr.selection && !tr.docChanged) return region;

		// Doc changed → region positions may be invalid, recompute
		if (tr.docChanged) {
			return computeActiveRegion(tr.state);
		}

		// Recompute if the cursor line has moved outside the current activeLines
		const mainSel = tr.state.selection.main;
		const cursorLine = tr.state.doc.lineAt(mainSel.head).number;

		if (!region.activeLines.has(cursorLine)) {
			return computeActiveRegion(tr.state);
		}

		return region;
	}
});

/** Read the active editing region from editor state. */
export function getActiveRegion(state: EditorState): ActiveRegion {
	return state.field(activeRegionField);
}
