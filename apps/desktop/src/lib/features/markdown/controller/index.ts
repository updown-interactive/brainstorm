import { invoke } from '@tauri-apps/api/core';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { Compartment, EditorSelection, EditorState, type Extension } from '@codemirror/state';
import { crosshairCursor, drawSelection, dropCursor, EditorView, keymap, rectangularSelection } from '@codemirror/view';
import { GFM } from '@lezer/markdown';
import { writable } from 'svelte/store';
import { activeRegionField, getActiveRegion } from '../engine/active-region';
import { advancedExtensionsPlugin } from '../engine/advanced-extensions';
import { cursorAffinityExtension } from '../engine/cursor-affinity';
import { detectFrontmatter, ensureMarkdownFrontmatter, parseFrontmatter } from '../engine/frontmatter';
import { livePreviewPlugin } from '../engine/live-preview';
import { openAddPropertyPalette, propertiesExtension } from '../engine/properties-extension';
import { listSharedTags, normalizeTagColor, normalizeTagName } from '../data/tag-registry';
import { brainstormHighlightStyleExtension, brainstormTheme, tagAccentTheme } from '../engine/theme';

export interface ContextMenuPosition {
	x: number;
	y: number;
}

export interface MarkdownControllerState {
	view: EditorView | null;
	activeTagColor: string;
	isMarkdown: boolean;
	contextMenu: ContextMenuPosition | null;
	selectedText: string;
}

export interface MarkdownControllerMountTarget {
	editorContainer: HTMLDivElement;
	markdownContainer: HTMLDivElement;
	path: string;
}

export class MarkdownController {
	private readonly state = writable<MarkdownControllerState>({
		view: null,
		activeTagColor: '',
		isMarkdown: false,
		contextMenu: null,
		selectedText: ''
	});

	readonly subscribe = this.state.subscribe;

	private readonly tagAccentCompartment = new Compartment();
	private editorContainer: HTMLDivElement | null = null;
	private markdownContainer: HTMLDivElement | null = null;
	private view: EditorView | null = null;
	private path = '';
	private loadedPath = '';
	private content = '';
	private isApplyingLifecycleFrontmatter = false;
	private tagColorRequest = 0;
	private updateTimeout: ReturnType<typeof setTimeout> | null = null;
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;
	private currentSavePromise: Promise<void> | null = null;
	private loadRequest = 0;

	mount(target: MarkdownControllerMountTarget): void {
		this.editorContainer = target.editorContainer;
		this.markdownContainer = target.markdownContainer;
		this.path = target.path;
		this.view = new EditorView({
			state: EditorState.create({
				doc: '',
				extensions: this.editorExtensions(target.path)
			}),
			parent: target.editorContainer
		});
		this.patchState({ view: this.view, isMarkdown: isMarkdownPath(target.path) });
		this.view.focus();
		void this.loadPath(target.path);
	}

	destroy(): void {
		if (this.updateTimeout) clearTimeout(this.updateTimeout);
		if (this.saveTimeout) clearTimeout(this.saveTimeout);
		this.view?.destroy();
		this.view = null;
		this.editorContainer = null;
		this.markdownContainer = null;
		this.patchState({ view: null, activeTagColor: '', isMarkdown: false });
	}

	setPath(path: string): void {
		if (!path || path === this.path) return;
		this.path = path;
		this.patchState({ isMarkdown: isMarkdownPath(path) });
		void this.loadPath(path);
	}

	private async loadPath(path: string): Promise<void> {
		const requestId = ++this.loadRequest;
		this.loadedPath = '';
		this.content = '';

		try {
			const rawContent = await invoke<string>('read_file', { path });
			if (requestId !== this.loadRequest) return;
			const content = isMarkdownPath(path) && rawContent.trim().length === 0
				? ensureMarkdownFrontmatter(rawContent, path)
				: rawContent;
			this.content = content;
			this.loadedPath = path;
			this.renderLoadedContent(path, content);
			void this.updateTagAccentColor(content);
		} catch (error) {
			console.error('Failed to read file:', error);
		}
	}

	private renderLoadedContent(path: string, content: string): void {
		if (!this.view) return;
		this.view.setState(EditorState.create({
			doc: content,
			extensions: this.editorExtensions(path)
		}));

		const frontmatter = isMarkdownPath(path) ? detectFrontmatter(content) : null;
		const targetPos = frontmatter ? frontmatter.bodyFrom : 0;
		this.view.dispatch({ selection: EditorSelection.cursor(targetPos) });

		if (!isMarkdownPath(path)) {
			this.setActiveTagColor('');
		}
		this.patchState({ view: this.view, isMarkdown: isMarkdownPath(path) });

		const resetScroll = () => {
			if (this.view?.scrollDOM) {
				this.view.scrollDOM.scrollTop = 0;
			}
		};

		resetScroll();
		requestAnimationFrame(() => {
			resetScroll();
			setTimeout(resetScroll, 10);
		});

		this.view.focus();
	}

	private editorExtensions(filePath: string): Extension[] {
		const isMarkdown = isMarkdownPath(filePath);
		const isJson = isJsonPath(filePath);
		return [
			history(),
			drawSelection(),
			dropCursor(),
			rectangularSelection(),
			crosshairCursor(),
			keymap.of([
				...(isMarkdown
					? [
							{ key: 'Mod-p', run: openAddPropertyPalette },
							{
								key: 'Mod-a',
								run: (view: EditorView) => {
									const doc = view.state.doc.toString();
									const fm = detectFrontmatter(doc);
									const startPos = fm ? fm.bodyFrom : 0;
									view.dispatch({
										selection: EditorSelection.single(view.state.doc.length, startPos)
									});
									if (view.scrollDOM) {
										view.scrollDOM.scrollTop = 0;
									}
									return true;
								}
							}
						]
					: []),
				...defaultKeymap,
				...historyKeymap
			]),
			isJson
				? json()
				: markdown({ base: markdownLanguage, codeLanguages: languages, extensions: [GFM] }),
			brainstormTheme,
			brainstormHighlightStyleExtension,
			this.tagAccentCompartment.of(tagAccentTheme(this.snapshot().activeTagColor)),
			isMarkdown ? activeRegionField : [],
			isMarkdown ? cursorAffinityExtension : [],
			isMarkdown ? propertiesExtension : [],
			isMarkdown ? livePreviewPlugin : [],
			isMarkdown ? advancedExtensionsPlugin : [],
			EditorView.domEventHandlers({
				paste: (event, view) => this.handlePaste(event, view, isMarkdown),
				contextmenu: (event, view) => this.handleContextMenu(event, view),
				mousedown: (event, view) => this.handleMouseDown(event, view)
			}),
			EditorView.lineWrapping,
			EditorView.updateListener.of((update) => this.handleEditorUpdate(update, isMarkdown))
		];
	}

	/**
	 * Custom mouse handler — only intercepts quadruple-click for paragraph
	 * selection. Double-click (word) and triple-click (line) are handled by
	 * CM6's native selection engine, which works correctly with the
	 * block-based active region and Decoration.replace() widgets.
	 */
	private handleMouseDown(event: MouseEvent, view: EditorView): boolean {
		if (event.button !== 0 || event.detail < 4) return false;

		const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
		if (pos === null) return false;

		const doc = view.state.doc;
		const line = doc.lineAt(pos);

		// Quadruple-click: Select Paragraph Block
		let paraStartLine = line.number;
		while (paraStartLine > 1) {
			const prevLine = doc.line(paraStartLine - 1);
			if (prevLine.text.trim() === '') break;
			paraStartLine--;
		}

		let paraEndLine = line.number;
		while (paraEndLine < doc.lines) {
			const nextLine = doc.line(paraEndLine + 1);
			if (nextLine.text.trim() === '') break;
			paraEndLine++;
		}

		const paraFrom = doc.line(paraStartLine).from;
		const paraTo = doc.line(paraEndLine).to;

		view.dispatch({
			selection: EditorSelection.single(paraFrom, paraTo),
			scrollIntoView: true
		});
		event.preventDefault();
		return true;
	}

	closeContextMenu(): void {
		this.patchState({ contextMenu: null });
	}

	openContextMenu(x: number, y: number): void {
		if (!this.view) return;
		const { from, to } = this.view.state.selection.main;
		const selectedText = this.view.state.sliceDoc(from, to);
		this.patchState({ contextMenu: { x, y }, selectedText });
	}

	private handleContextMenu(event: MouseEvent, view: EditorView): boolean {
		event.preventDefault();
		const selection = view.state.selection.main;
		const selectedText = view.state.sliceDoc(selection.from, selection.to);
		this.patchState({
			contextMenu: { x: event.clientX, y: event.clientY },
			selectedText
		});
		return true;
	}

	copySelection(): void {
		if (!this.view) return;
		const { from, to } = this.view.state.selection.main;
		const text = this.view.state.sliceDoc(from, to);
		if (text) {
			void navigator.clipboard.writeText(text);
		}
		this.closeContextMenu();
		this.view.focus();
	}

	cutSelection(): void {
		if (!this.view) return;
		const { from, to } = this.view.state.selection.main;
		const text = this.view.state.sliceDoc(from, to);
		if (text) {
			void navigator.clipboard.writeText(text);
			this.view.dispatch({
				changes: { from, to, insert: '' },
				selection: EditorSelection.cursor(from)
			});
		}
		this.closeContextMenu();
		this.view.focus();
	}

	async pasteClipboard(): Promise<void> {
		if (!this.view) return;
		try {
			const text = await navigator.clipboard.readText();
			if (text) {
				const { from, to } = this.view.state.selection.main;
				this.view.dispatch({
					changes: { from, to, insert: text },
					selection: EditorSelection.cursor(from + text.length)
				});
			}
		} catch (error) {
			console.error('Failed to paste:', error);
		}
		this.closeContextMenu();
		this.view.focus();
	}

	deleteSelection(): void {
		if (!this.view) return;
		const { from, to } = this.view.state.selection.main;
		this.view.dispatch({
			changes: { from, to, insert: '' },
			selection: EditorSelection.cursor(from)
		});
		this.closeContextMenu();
		this.view.focus();
	}

	selectAll(): void {
		if (!this.view) return;
		const doc = this.view.state.doc.toString();
		const fm = isMarkdownPath(this.path) ? detectFrontmatter(doc) : null;
		const startPos = fm ? fm.bodyFrom : 0;
		this.view.dispatch({
			selection: EditorSelection.single(this.view.state.doc.length, startPos)
		});
		if (this.view.scrollDOM) {
			this.view.scrollDOM.scrollTop = 0;
		}
		this.closeContextMenu();
		this.view.focus();
	}

	transformCase(type: 'upper' | 'lower' | 'title'): void {
		if (!this.view) return;
		const { from, to } = this.view.state.selection.main;
		const text = this.view.state.sliceDoc(from, to);
		if (!text) {
			this.closeContextMenu();
			return;
		}

		let transformed = text;
		if (type === 'upper') {
			transformed = text.toUpperCase();
		} else if (type === 'lower') {
			transformed = text.toLowerCase();
		} else if (type === 'title') {
			transformed = text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
		}

		this.view.dispatch({
			changes: { from, to, insert: transformed },
			selection: EditorSelection.range(from, from + transformed.length)
		});
		this.closeContextMenu();
		this.view.focus();
	}

	wrapText(before: string, after: string = '', placeholder: string = ''): void {
		if (!this.view) return;
		const { from, to } = this.view.state.selection.main;
		const selectedText = this.view.state.sliceDoc(from, to);
		const textToWrap = selectedText || placeholder;

		this.view.dispatch({
			changes: { from, to, insert: `${before}${textToWrap}${after}` },
			selection: EditorSelection.range(
				from + before.length,
				from + before.length + textToWrap.length
			)
		});
		this.closeContextMenu();
		this.view.focus();
	}

	insertText(text: string): void {
		if (!this.view) return;
		const { from, to } = this.view.state.selection.main;
		this.view.dispatch({
			changes: { from, to, insert: text },
			selection: EditorSelection.cursor(from + text.length)
		});
		this.closeContextMenu();
		this.view.focus();
	}

	triggerAddProperty(): void {
		if (!this.view) return;
		openAddPropertyPalette(this.view);
		this.closeContextMenu();
	}

	private handlePaste(event: ClipboardEvent, view: EditorView, isMarkdown: boolean): boolean {
		const text = event.clipboardData?.getData('text/plain');
		if (!text) return false;

		const normalizedText = isMarkdown ? stripMarkdownPasteFence(text) : text;
		if (normalizedText === text) return false;

		event.preventDefault();
		const changes = view.state.changeByRange((range) => ({
			changes: { from: range.from, to: range.to, insert: normalizedText },
			range: EditorSelection.cursor(range.from + normalizedText.length)
		}));
		view.dispatch(view.state.update(changes, { scrollIntoView: true, userEvent: 'input.paste' }));
		return true;
	}

	private handleEditorUpdate(update: { docChanged: boolean; state: EditorState; view: EditorView }, isMarkdown: boolean): void {
		if (!update.docChanged || this.loadedPath !== this.path) return;
		const content = update.state.doc.toString();

		this.triggerSave(content);
		if (isMarkdown) {
			void this.updateTagAccentColor(content);
		}
	}

	private triggerSave(newContent: string): void {
		if (this.updateTimeout) clearTimeout(this.updateTimeout);
		this.updateTimeout = setTimeout(() => {
			this.content = newContent;
			this.debouncedSave();
		}, 300);
	}

	private debouncedSave(): void {
		if (this.saveTimeout) clearTimeout(this.saveTimeout);
		this.saveTimeout = setTimeout(() => {
			void this.save();
		}, 500);
	}

	private async save(): Promise<void> {
		if (!this.path) return;
		if (this.currentSavePromise) {
			await this.currentSavePromise;
		}

		const path = this.path;
		const content = this.content;
		this.currentSavePromise = (async () => {
			try {
				await invoke('write_file', { path, content });
			} catch (error) {
				console.error('Failed to save file:', error);
			}
		})();

		await this.currentSavePromise;
		this.currentSavePromise = null;
	}

	private async updateTagAccentColor(content: string): Promise<void> {
		if (!isMarkdownPath(this.path)) {
			this.setActiveTagColor('');
			return;
		}

		const parsed = parseFrontmatter(content);
		const rawTags = Array.isArray(parsed.data.tags) ? parsed.data.tags : [];
		const frontmatterTags = rawTags.map((tag) => normalizeTagName(`${tag}`)).filter(Boolean);
		const inlineTags = [...content.matchAll(/(?<!\w)(#[A-Za-z0-9_/-]+)/g)]
			.map((match) => normalizeTagName(match[1]))
			.filter(Boolean);
		const tags = uniqueStrings([...frontmatterTags, ...inlineTags]);
		const requestId = ++this.tagColorRequest;

		if (tags.length === 0) {
			this.setActiveTagColor('');
			return;
		}

		const sharedTags = await listSharedTags();
		if (requestId !== this.tagColorRequest) return;

		const tagSet = new Set(tags.map((tag) => tag.toLocaleLowerCase()));
		const match = sharedTags.find((tag) => tagSet.has(tag.name.toLocaleLowerCase()));
		this.setActiveTagColor(match ? normalizeTagColor(match.color) : '');
	}

	private setActiveTagColor(color: string): void {
		for (const element of [this.markdownContainer, this.editorContainer, this.view?.dom]) {
			if (!element) continue;
			if (color) {
				element.style.setProperty('--colors-primary', color);
			} else {
				element.style.removeProperty('--colors-primary');
			}
		}

		this.view?.dispatch({
			effects: this.tagAccentCompartment.reconfigure(tagAccentTheme(color))
		});
		this.patchState({ activeTagColor: color });
	}

	private patchState(patch: Partial<MarkdownControllerState>): void {
		this.state.update((state) => ({ ...state, ...patch }));
	}

	private snapshot(): MarkdownControllerState {
		let value!: MarkdownControllerState;
		const unsubscribe = this.state.subscribe((state) => {
			value = state;
		});
		unsubscribe();
		return value;
	}
}

export function createMarkdownController(): MarkdownController {
	return new MarkdownController();
}

function isMarkdownPath(filePath: string): boolean {
	if (!filePath) return true;
	if (/\.(json|png|jpg|jpeg|gif|svg|wasm|zip)$/i.test(filePath)) return false;
	return true;
}

function isJsonPath(filePath: string): boolean {
	return /\.json$/i.test(filePath);
}

function stripMarkdownPasteFence(text: string): string {
	const lines = text.replace(/\r\n/g, '\n').split('\n');
	const firstContentLine = lines.findIndex((line) => line.trim().length > 0);
	if (firstContentLine === -1) return text;

	let lastContentLine = lines.length - 1;
	while (lastContentLine >= 0 && lines[lastContentLine].trim().length === 0) {
		lastContentLine -= 1;
	}

	const opening = lines[firstContentLine].trim().match(/^(`{3,}|~{3,})\s*(markdown|md)\s*$/i);
	if (!opening) return text;

	const closingText = lines[lastContentLine]?.trim() ?? '';
	const closing = closingText.match(/^(`{3,}|~{3,})\s*$/);
	if (!closing) return text;
	if (closing[1][0] !== opening[1][0] || closing[1].length < opening[1].length) return text;

	return lines.slice(firstContentLine + 1, lastContentLine).join('\n');
}

function uniqueStrings(values: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const value of values) {
		const normalized = value.toLocaleLowerCase();
		if (seen.has(normalized)) continue;
		seen.add(normalized);
		result.push(value);
	}
	return result;
}
