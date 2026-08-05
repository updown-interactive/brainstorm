import { keymap } from '@codemirror/view';
import type { KeyBinding } from '@codemirror/view';

/**
 * Cursor affinity extension for natural cursor movement around
 * decorated markdown regions.
 *
 * CodeMirror 6 already handles cursor navigation through
 * `Decoration.replace()` ranges — the cursor automatically skips
 * over replaced content when using arrow keys, Home/End, etc.
 *
 * This extension provides an extension point for additional
 * keybindings if testing reveals edge cases where CM6's native
 * handling is insufficient (e.g. special backspace behavior at
 * widget boundaries, or Home snapping to visible content start).
 */
const cursorAffinityBindings: KeyBinding[] = [];

export const cursorAffinityExtension = keymap.of(cursorAffinityBindings);
