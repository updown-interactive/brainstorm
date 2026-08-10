import { writable } from 'svelte/store';

export interface EditorTab {
	id: string;
	path: string;
	name: string;
	isPinned: boolean;
	isModified: boolean;
}

export interface EditorPane {
	id: string;
	activeTabId: string | null;
	tabs: EditorTab[];
}

export interface EditorState {
	activePaneId: string;
	panes: EditorPane[];
	activeTabId: string | null;
	tabs: EditorTab[];
}

const initialPaneId = 'pane-1';

function createPane(id: string): EditorPane {
	return {
		id,
		activeTabId: null,
		tabs: [],
	};
}

function createTab(path: string, name: string, pin: boolean): EditorTab {
	return {
		id: path,
		path,
		name,
		isPinned: pin,
		isModified: false,
	};
}

function syncLegacyState(state: Omit<EditorState, 'activeTabId' | 'tabs'>): EditorState {
	const activePane = state.panes.find((pane) => pane.id === state.activePaneId) ?? state.panes[0];
	return {
		...state,
		activePaneId: activePane?.id ?? initialPaneId,
		activeTabId: activePane?.activeTabId ?? null,
		tabs: activePane?.tabs ?? [],
	};
}

function openFileInPane(pane: EditorPane, path: string, name: string, pin: boolean): EditorPane {
	const existingIndex = pane.tabs.findIndex((tab) => tab.id === path);

	if (existingIndex !== -1) {
		const tabs = [...pane.tabs];
		if (pin) {
			tabs[existingIndex] = { ...tabs[existingIndex], isPinned: true };
		}
		return { ...pane, tabs, activeTabId: path };
	}

	return {
		...pane,
		tabs: [...pane.tabs, createTab(path, name, pin)],
		activeTabId: path,
	};
}

function findPaneWithPath(panes: EditorPane[], path: string): EditorPane | undefined {
	return panes.find((pane) => pane.tabs.some((tab) => tab.path === path));
}

function findEmptyPane(panes: EditorPane[]): EditorPane | undefined {
	return panes.find((pane) => pane.tabs.length === 0);
}

function makePaneId(): string {
	return `pane-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEditorStore() {
	const { subscribe, set, update } = writable<EditorState>({
		activePaneId: initialPaneId,
		panes: [createPane(initialPaneId)],
		activeTabId: null,
		tabs: [],
	});

	return {
		subscribe,
		set,
		update,

		openFile(path: string, name: string, pin: boolean = false, paneId?: string) {
			update((s) => {
				const existingPane = paneId ? undefined : findPaneWithPath(s.panes, path);
				const emptyPane = paneId || existingPane ? undefined : findEmptyPane(s.panes);
				const targetPaneId = paneId ?? existingPane?.id ?? emptyPane?.id ?? s.activePaneId;
				const panes = s.panes.map((pane) =>
					pane.id === targetPaneId ? openFileInPane(pane, path, name, pin) : pane
				);
				return syncLegacyState({ ...s, panes, activePaneId: targetPaneId });
			});
		},

		setActiveTab(path: string, paneId?: string) {
			update((s) => {
				const targetPaneId = paneId ?? s.activePaneId;
				const panes = s.panes.map((pane) => {
					if (pane.id !== targetPaneId) return pane;
					const tabExists = pane.tabs.some((tab) => tab.id === path);
					return tabExists ? { ...pane, activeTabId: path } : pane;
				});

				return syncLegacyState({ ...s, panes, activePaneId: targetPaneId });
			});
		},

		closeFile(path: string, paneId?: string) {
			update((s) => {
				const targetPaneId = paneId ?? s.activePaneId;
				const panes = s.panes.map((pane) => {
					if (pane.id !== targetPaneId) return pane;

					const closingIndex = pane.tabs.findIndex((tab) => tab.id === path);
					if (closingIndex === -1) return pane;

					const remainingTabs = pane.tabs.filter((tab) => tab.id !== path);
					let activeTabId = pane.activeTabId;

					if (pane.activeTabId === path) {
						if (remainingTabs.length === 0) {
							activeTabId = null;
						} else if (closingIndex < remainingTabs.length) {
							activeTabId = remainingTabs[closingIndex].id;
						} else {
							activeTabId = remainingTabs[remainingTabs.length - 1].id;
						}
					}

					return { ...pane, tabs: remainingTabs, activeTabId };
				});

				return syncLegacyState({ ...s, panes });
			});
		},

		closePath(path: string) {
			update((s) => {
				const panes = s.panes.map((pane) => {
					const remainingTabs = pane.tabs.filter(
						(tab) => tab.path !== path && !tab.path.startsWith(`${path}/`)
					);
					const activeTabStillExists = remainingTabs.some((tab) => tab.id === pane.activeTabId);
					const activeTabId = activeTabStillExists ? pane.activeTabId : remainingTabs.at(-1)?.id ?? null;
					return { ...pane, tabs: remainingTabs, activeTabId };
				});

				return syncLegacyState({ ...s, panes });
			});
		},

		setActivePane(paneId: string) {
			update((s) => syncLegacyState({ ...s, activePaneId: paneId }));
		},

		splitPane(sourcePaneId?: string) {
			update((s) => {
				const sourcePane = s.panes.find((pane) => pane.id === (sourcePaneId ?? s.activePaneId)) ?? s.panes.at(-1);
				const newPaneId = makePaneId();
				const sourceIndex = sourcePane ? s.panes.findIndex((pane) => pane.id === sourcePane.id) : s.panes.length - 1;
				const insertIndex = sourceIndex === -1 ? s.panes.length : sourceIndex + 1;
				const panes = [...s.panes];
				panes.splice(insertIndex, 0, createPane(newPaneId));

				return syncLegacyState({
					...s,
					panes,
					activePaneId: newPaneId,
				});
			});
		},

		closePane(paneId: string) {
			update((s) => {
				if (s.panes.length <= 1) {
					const pane = createPane(initialPaneId);
					return syncLegacyState({ ...s, panes: [pane], activePaneId: pane.id });
				}

				const remainingPanes = s.panes.filter((pane) => pane.id !== paneId);
				const activePaneId =
					s.activePaneId === paneId
						? remainingPanes.at(-1)?.id ?? initialPaneId
						: s.activePaneId;

				return syncLegacyState({ ...s, panes: remainingPanes, activePaneId });
			});
		},

		updateFilePath(oldPath: string, newPath: string, newName: string) {
			update((s) => {
				const panes = s.panes.map((pane) => {
					const tabs = pane.tabs.map((tab) => {
						if (tab.path === oldPath) {
							return { ...tab, id: newPath, path: newPath, name: newName };
						}
						return tab;
					});
					const activeTabId = pane.activeTabId === oldPath ? newPath : pane.activeTabId;
					return { ...pane, tabs, activeTabId };
				});
				return syncLegacyState({ ...s, panes });
			});
		},

		restoreState(savedState: { activePaneId: string; panes: EditorPane[] }) {
			set(syncLegacyState({ ...savedState }));
		},

		reset() {
			const initialPane = createPane(initialPaneId);
			set(syncLegacyState({ activePaneId: initialPane.id, panes: [initialPane] }));
		},
	};
}

export const editorState = createEditorStore();
