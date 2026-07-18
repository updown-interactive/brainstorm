import { writable } from 'svelte/store';

export interface EditorTab {
  id: string; // usually the file path
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
    tabs: []
  };
}

function createTab(path: string, name: string, pin: boolean): EditorTab {
  return {
    id: path,
    path,
    name,
    isPinned: pin,
    isModified: false
  };
}

function syncLegacyState(state: Omit<EditorState, 'activeTabId' | 'tabs'>): EditorState {
  const activePane = state.panes.find((pane) => pane.id === state.activePaneId) ?? state.panes[0];
  return {
    ...state,
    activePaneId: activePane?.id ?? initialPaneId,
    activeTabId: activePane?.activeTabId ?? null,
    tabs: activePane?.tabs ?? []
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

  if (!pin) {
    const previewIndex = pane.tabs.findIndex((tab) => !tab.isPinned);
    if (previewIndex !== -1) {
      const tabs = [...pane.tabs];
      tabs[previewIndex] = createTab(path, name, false);
      return { ...pane, tabs, activeTabId: path };
    }
  }

  return {
    ...pane,
    tabs: [...pane.tabs, createTab(path, name, pin)],
    activeTabId: path
  };
}

function makePaneId() {
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
      update(s => {
        const targetPaneId = paneId ?? s.activePaneId;
        const panes = s.panes.map((pane) => (
          pane.id === targetPaneId ? openFileInPane(pane, path, name, pin) : pane
        ));
        return syncLegacyState({ ...s, panes, activePaneId: targetPaneId });
      });
    },

    closeFile(path: string, paneId?: string) {
      update(s => {
        const targetPaneId = paneId ?? s.activePaneId;
        const panes = s.panes.map((pane) => {
          if (pane.id !== targetPaneId) return pane;

          const remainingTabs = pane.tabs.filter((tab) => tab.id !== path);
          const activeTabId = pane.activeTabId === path
            ? remainingTabs.at(-1)?.id ?? null
            : pane.activeTabId;
          return { ...pane, tabs: remainingTabs, activeTabId };
        });

        return syncLegacyState({ ...s, panes });
      });
    },

    closePath(path: string) {
      update(s => {
        const panes = s.panes.map((pane) => {
          const remainingTabs = pane.tabs.filter((tab) => tab.path !== path && !tab.path.startsWith(`${path}/`));
          const activeTabStillExists = remainingTabs.some((tab) => tab.id === pane.activeTabId);
          const activeTabId = activeTabStillExists ? pane.activeTabId : remainingTabs.at(-1)?.id ?? null;
          return { ...pane, tabs: remainingTabs, activeTabId };
        });

        return syncLegacyState({ ...s, panes });
      });
    },

    setActivePane(paneId: string) {
      update(s => syncLegacyState({ ...s, activePaneId: paneId }));
    },

    splitPane(sourcePaneId?: string) {
      update(s => {
        const sourcePane = s.panes.find((pane) => pane.id === (sourcePaneId ?? s.activePaneId)) ?? s.panes[0];
        const newPaneId = makePaneId();
        const activeTab = sourcePane?.tabs.find((tab) => tab.id === sourcePane.activeTabId);
        const newPane: EditorPane = activeTab
          ? {
              id: newPaneId,
              activeTabId: activeTab.id,
              tabs: [{ ...activeTab, isPinned: true }]
            }
          : createPane(newPaneId);

        return syncLegacyState({
          ...s,
          panes: [...s.panes, newPane],
          activePaneId: newPaneId
        });
      });
    },

    closePane(paneId: string) {
      update(s => {
        if (s.panes.length <= 1) {
          const pane = createPane(initialPaneId);
          return syncLegacyState({ ...s, panes: [pane], activePaneId: pane.id });
        }

        const remainingPanes = s.panes.filter((pane) => pane.id !== paneId);
        const activePaneId = s.activePaneId === paneId
          ? remainingPanes.at(-1)?.id ?? initialPaneId
          : s.activePaneId;

        return syncLegacyState({ ...s, panes: remainingPanes, activePaneId });
      });
    }
  };
}

export const editorState = createEditorStore();
