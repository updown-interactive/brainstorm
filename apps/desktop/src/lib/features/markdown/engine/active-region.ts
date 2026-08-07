import { StateField } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';

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

	for (const range of state.selection.ranges) {
		const fromPos = Math.min(range.from, range.to);
		const toPos = Math.max(range.from, range.to);
		const startLine = state.doc.lineAt(fromPos);
		const endLine = state.doc.lineAt(toPos);
		const from = startLine.from;
		const to = endLine.to;

		regionFrom = Math.min(regionFrom, from);
		regionTo = Math.max(regionTo, to);

		for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
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
 * The active region tracks only the currently selected/cursor lines.
 * Decorations within these lines remain as raw markdown so editing feels
 * Obsidian-like while every other line stays rendered.
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

		return computeActiveRegion(tr.state);
	}
});

/** Read the active editing region from editor state. */
export function getActiveRegion(state: EditorState): ActiveRegion {
	return state.field(activeRegionField);
}
