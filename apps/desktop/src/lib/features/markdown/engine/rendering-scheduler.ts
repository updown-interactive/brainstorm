import type { EditorView } from '@codemirror/view';

/**
 * Manages debounced decoration rebuilds for a CodeMirror ViewPlugin.
 *
 * After a document change the plugin should:
 *   1. Map existing decorations through changes (instant, positionally correct)
 *   2. Call `scheduleRebuild(view)` to queue a full rebuild after an idle period
 *
 * The scheduler waits for the configured delay (default 300 ms) then sets a
 * pending flag and dispatches an empty transaction so the ViewPlugin's
 * `update()` runs. The plugin should call `consumeRebuild()` at the top
 * of `update()` to detect and handle the scheduled rebuild.
 */
export class RenderingScheduler {
	private timer: ReturnType<typeof setTimeout> | null = null;
	private pending = false;

	constructor(private readonly delayMs: number = 300) {}

	/**
	 * Returns `true` exactly once after a scheduled rebuild fires.
	 * Call this at the top of `ViewPlugin.update()`.
	 */
	consumeRebuild(): boolean {
		if (this.pending) {
			this.pending = false;
			return true;
		}
		return false;
	}

	/** Schedule a debounced decoration rebuild. Resets any previous timer. */
	scheduleRebuild(view: EditorView): void {
		this.cancel();
		this.timer = setTimeout(() => {
			this.timer = null;
			this.pending = true;
			// Empty dispatch triggers the ViewPlugin update cycle
			view.dispatch({});
		}, this.delayMs);
	}

	/** Cancel any pending rebuild timer. */
	cancel(): void {
		if (this.timer !== null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	/** Clean up on plugin destroy. */
	destroy(): void {
		this.cancel();
	}
}
