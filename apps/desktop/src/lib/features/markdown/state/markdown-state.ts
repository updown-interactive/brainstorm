import { writable, get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import type { MarkdownState } from '../types';

function createMarkdownStore() {
	const { subscribe, set, update } = writable<MarkdownState>({
		content: '',
		isSaving: false,
		lastSavedAt: null,
		path: null
	});

	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let currentSavePromise: Promise<void> | null = null;

	return {
		subscribe,

		loadFile: async (path: string) => {
			set({
				content: '',
				isSaving: false,
				lastSavedAt: null,
				path: null
			});

			try {
				const rawContent = await invoke<string>('read_file', { path });
				const content = isMarkdownPath(path) && rawContent.trim().length === 0
					? await ensureMarkdownFrontmatter(rawContent, path)
					: rawContent;
				set({
					content,
					isSaving: false,
					lastSavedAt: null,
					path
				});
			} catch (err) {
				console.error('Failed to read file:', err);
			}
		},

		updateContent: (newContent: string) => {
			update(s => ({ ...s, content: newContent }));
			debouncedSave();
		},

		markAsSaved: () => {
			update(s => ({ ...s, isSaving: false, lastSavedAt: Date.now() }));
		},

		setSaving: (saving: boolean) => {
			update(s => ({ ...s, isSaving: saving }));
		}
	};

	function debouncedSave() {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
		}
		saveTimeout = setTimeout(() => {
			void save();
		}, 500);
	}

	async function save() {
		let state: MarkdownState | undefined;
		const unsubscribe = subscribe((value) => { state = value; });
		unsubscribe();
		if (!state?.path) return;

		if (currentSavePromise) {
			await currentSavePromise;
		}

		update(st => ({ ...st, isSaving: true }));

		currentSavePromise = (async () => {
			try {
				await invoke('write_file', { path: state.path, content: state.content });
				update(st => ({ ...st, isSaving: false, lastSavedAt: Date.now() }));
			} catch (err) {
				console.error('Failed to save file:', err);
				update(st => ({ ...st, isSaving: false }));
			}
		})();

		await currentSavePromise;
	}

	function isMarkdownPath(path: string) {
		return /\.md(?:x)?$/i.test(path);
	}

	async function ensureMarkdownFrontmatter(content: string, path: string) {
		const { parseFrontmatter, defaultFrontmatter, serializeFrontmatter, todayString, nameFromPath } = await import('../engine/frontmatter');
		const parsed = parseFrontmatter(content);
		const date = todayString();

		if (!parsed.range) {
			const frontmatter = defaultFrontmatter(path, date);
			const body = content.length > 0 ? `\n${content.replace(/^\n+/, '')}` : '';
			return `${frontmatter}${body}`;
		}

		const data = {
			...parsed.data,
			name: parsed.data.name || nameFromPath(path),
			created: parsed.data.created || date,
			updated: date
		};

		const frontmatter = serializeFrontmatter(data);
		return `${frontmatter}${content.slice(parsed.range.bodyFrom)}`;
	}
}

export const markdownStore = createMarkdownStore();

function todayString(date = new Date()) {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function nameFromPath(path: string | null | undefined) {
	if (!path) return 'Untitled';
	const fileName = path.split('/').pop() || 'Untitled';
	return fileName.replace(/\.[^.]+$/, '') || 'Untitled';
}
