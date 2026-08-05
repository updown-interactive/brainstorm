<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { EditorView } from '@codemirror/view';
	import type { MarkdownController, ContextMenuPosition } from '../controller';
	import LiquidGlassPanel from '$lib/shared/ui/LiquidGlassPanel.svelte';
	import {
		Scissors, Copy, Clipboard, Trash2, CheckCheck,
		Bold, Italic, Strikethrough, Highlighter, Underline, Code, Link, Image,
		Heading1, Heading2, Heading3, Quote, CheckSquare, FileCode, Table, GitMerge,
		Type, Plus
	} from 'lucide-svelte';

	export let controller: MarkdownController;
	export let view: EditorView;
	export let position: ContextMenuPosition;
	export let onClose: () => void;

	let menuEl: HTMLDivElement;

	const selection = view.state.selection.main;
	const hasSelection = !selection.empty;

	let posX = position.x;
	let posY = position.y;

	onMount(() => {
		clampPosition();
		window.addEventListener('pointerdown', handleOutsideClick, true);
		window.addEventListener('keydown', handleKeyDown, true);
		window.addEventListener('resize', clampPosition);
	});

	onDestroy(() => {
		window.removeEventListener('pointerdown', handleOutsideClick, true);
		window.removeEventListener('keydown', handleKeyDown, true);
		window.removeEventListener('resize', clampPosition);
	});

	function clampPosition() {
		if (!menuEl) return;
		const rect = menuEl.getBoundingClientRect();
		const pad = 12;
		let x = position.x;
		let y = position.y;

		if (x + rect.width > window.innerWidth - pad) {
			x = window.innerWidth - rect.width - pad;
		}
		if (y + rect.height > window.innerHeight - pad) {
			y = window.innerHeight - rect.height - pad;
		}
		posX = Math.max(pad, x);
		posY = Math.max(pad, y);
	}

	function handleOutsideClick(e: PointerEvent) {
		if (menuEl && !menuEl.contains(e.target as Node)) {
			onClose();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		}
	}

	function handleAction(fn: () => void) {
		return (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			fn();
		};
	}
</script>

<div
	bind:this={menuEl}
	class="cm-context-menu-container"
	style="left: {posX}px; top: {posY}px;"
	role="menu"
	tabindex="-1"
>
	<LiquidGlassPanel class="cm-context-panel">
		<!-- Quick Clipboard Strip -->
		<div class="quick-strip">
			<button
				class="strip-btn"
				disabled={!hasSelection}
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.cutSelection())}
				title="Cut (Cmd+X)"
			>
				<Scissors size={14} />
				<span>Cut</span>
			</button>

			<button
				class="strip-btn"
				disabled={!hasSelection}
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.copySelection())}
				title="Copy (Cmd+C)"
			>
				<Copy size={14} />
				<span>Copy</span>
			</button>

			<button
				class="strip-btn"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => void controller.pasteClipboard())}
				title="Paste (Cmd+V)"
			>
				<Clipboard size={14} />
				<span>Paste</span>
			</button>

			<button
				class="strip-btn danger"
				disabled={!hasSelection}
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.deleteSelection())}
				title="Delete"
			>
				<Trash2 size={14} />
				<span>Delete</span>
			</button>
		</div>

		<div class="panel-divider"></div>

		<!-- Text Formatting Section -->
		<div class="panel-label">Formatting</div>
		<div class="menu-grid">
			<button
				class="grid-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.wrapText('**', '**', 'bold text'))}
				title="Bold"
			>
				<Bold size={14} />
				<span>Bold</span>
				<kbd>⌘B</kbd>
			</button>

			<button
				class="grid-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.wrapText('*', '*', 'italic text'))}
				title="Italic"
			>
				<Italic size={14} />
				<span>Italic</span>
				<kbd>⌘I</kbd>
			</button>

			<button
				class="grid-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.wrapText('~~', '~~', 'strikethrough'))}
				title="Strikethrough"
			>
				<Strikethrough size={14} />
				<span>Strike</span>
			</button>

			<button
				class="grid-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.wrapText('==', '==', 'highlighted'))}
				title="Highlight"
			>
				<Highlighter size={14} />
				<span>Highlight</span>
			</button>

			<button
				class="grid-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.wrapText('<u>', '</u>', 'underlined'))}
				title="Underline"
			>
				<Underline size={14} />
				<span>Underline</span>
				<kbd>⌘U</kbd>
			</button>

			<button
				class="grid-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.wrapText('`', '`', 'code'))}
				title="Inline Code"
			>
				<Code size={14} />
				<span>Inline Code</span>
			</button>

			<button
				class="grid-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.wrapText('[', '](url)', 'Link Text'))}
				title="Link"
			>
				<Link size={14} />
				<span>Link</span>
				<kbd>⌘K</kbd>
			</button>

			<button
				class="grid-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.wrapText('![', '](url)', 'Alt Text'))}
				title="Image"
			>
				<Image size={14} />
				<span>Image</span>
			</button>
		</div>

		<div class="panel-divider"></div>

		<!-- Structure Section -->
		<div class="panel-label">Structure</div>
		<div class="menu-list">
			<div class="list-row">
				<button
					class="list-pill"
					onmousedown={(e) => e.preventDefault()}
					onclick={handleAction(() => controller.wrapText('# ', '', 'Heading 1'))}
				>
					<Heading1 size={14} /> H1
				</button>
				<button
					class="list-pill"
					onmousedown={(e) => e.preventDefault()}
					onclick={handleAction(() => controller.wrapText('## ', '', 'Heading 2'))}
				>
					<Heading2 size={14} /> H2
				</button>
				<button
					class="list-pill"
					onmousedown={(e) => e.preventDefault()}
					onclick={handleAction(() => controller.wrapText('### ', '', 'Heading 3'))}
				>
					<Heading3 size={14} /> H3
				</button>
			</div>

			<button
				class="panel-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.wrapText('> ', '', 'Quote'))}
			>
				<Quote size={14} class="panel-icon" />
				<span>Blockquote</span>
			</button>

			<button
				class="panel-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.insertText('- [ ] '))}
			>
				<CheckSquare size={14} class="panel-icon" />
				<span>Task Checkbox</span>
			</button>

			<button
				class="panel-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.wrapText('```\n', '\n```', 'code block'))}
			>
				<FileCode size={14} class="panel-icon" />
				<span>Code Block</span>
			</button>

			<button
				class="panel-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.insertText('\n| Column 1 | Column 2 |\n|----------|----------|\n| Data     | Data     |\n'))}
			>
				<Table size={14} class="panel-icon" />
				<span>Markdown Table</span>
			</button>

			<button
				class="panel-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.insertText('\n```mermaid\ngraph TD\n    A[Start] --> B[Stop]\n```\n'))}
			>
				<GitMerge size={14} class="panel-icon" />
				<span>Mermaid Diagram</span>
			</button>
		</div>

		<!-- Text Transformations -->
		{#if hasSelection}
			<div class="panel-divider"></div>
			<div class="panel-label">Transform Selection</div>
			<div class="menu-list">
				<div class="list-row">
					<button
						class="list-pill"
						onmousedown={(e) => e.preventDefault()}
						onclick={handleAction(() => controller.transformCase('upper'))}
					>
						<Type size={12} /> UPPER
					</button>
					<button
						class="list-pill"
						onmousedown={(e) => e.preventDefault()}
						onclick={handleAction(() => controller.transformCase('lower'))}
					>
						<Type size={12} /> lower
					</button>
					<button
						class="list-pill"
						onmousedown={(e) => e.preventDefault()}
						onclick={handleAction(() => controller.transformCase('title'))}
					>
						<Type size={12} /> Title
					</button>
				</div>
			</div>
		{/if}

		<div class="panel-divider"></div>

		<!-- Document & Property utilities -->
		<div class="menu-list">
			<button
				class="panel-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.triggerAddProperty())}
			>
				<Plus size={14} class="panel-icon" />
				<span>Add Frontmatter Property</span>
				<kbd class="right-kbd">⌘P</kbd>
			</button>

			<button
				class="panel-item"
				onmousedown={(e) => e.preventDefault()}
				onclick={handleAction(() => controller.selectAll())}
			>
				<CheckCheck size={14} class="panel-icon" />
				<span>Select All Text</span>
				<kbd class="right-kbd">⌘A</kbd>
			</button>
		</div>
	</LiquidGlassPanel>
</div>

<style>
	.cm-context-menu-container {
		position: fixed;
		z-index: 9999;
		width: 260px;
		animation: cm-context-fade 0.14s cubic-bezier(0.16, 1, 0.3, 1);
		user-select: none;
	}

	@keyframes cm-context-fade {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(-4px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	:global(.cm-context-panel) {
		padding: 6px !important;
		border-radius: 14px !important;
	}

	.quick-strip {
		display: flex;
		align-items: center;
		gap: 3px;
		padding: 2px;
	}

	.strip-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		padding: 6px 4px;
		border: none;
		background: transparent;
		color: var(--colors-text);
		border-radius: 8px;
		font-size: 11px;
		cursor: pointer;
		transition: background 0.12s ease, color 0.12s ease;
	}

	.strip-btn:hover:not(:disabled) {
		background: color-mix(in srgb, var(--colors-primary) 18%, transparent);
		color: var(--colors-primary);
	}

	.strip-btn.danger:hover:not(:disabled) {
		background: color-mix(in srgb, var(--colors-error, #ff3b30) 18%, transparent);
		color: var(--colors-error, #ff3b30);
	}

	.strip-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.menu-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 3px;
		padding: 2px;
	}

	.grid-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border: none;
		background: transparent;
		color: var(--colors-text);
		border-radius: 6px;
		font-size: 12px;
		text-align: left;
		cursor: pointer;
		transition: background 0.12s ease, color 0.12s ease;
	}

	.grid-item:hover {
		background: color-mix(in srgb, var(--colors-hover, var(--colors-text)) 12%, transparent);
		color: var(--colors-primary);
	}

	.grid-item kbd {
		margin-left: auto;
		font-size: 10px;
		color: var(--colors-textMuted);
		font-family: var(--font-mono, monospace);
	}

	.menu-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.list-row {
		display: flex;
		gap: 4px;
		padding: 2px 4px;
	}

	.list-pill {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding: 5px 6px;
		border: 1px solid color-mix(in srgb, var(--colors-border) 60%, transparent);
		background: color-mix(in srgb, var(--colors-surface) 60%, transparent);
		color: var(--colors-text);
		border-radius: 6px;
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.list-pill:hover {
		border-color: var(--colors-primary);
		color: var(--colors-primary);
		background: color-mix(in srgb, var(--colors-primary) 12%, transparent);
	}

	.right-kbd {
		margin-left: auto;
		font-size: 10px;
		color: var(--colors-textMuted);
		font-family: var(--font-mono, monospace);
	}
</style>
