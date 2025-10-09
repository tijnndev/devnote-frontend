
import { create } from 'zustand';

const LAST_SELECTION_STORAGE_KEY = 'devnote:last-selection';


interface SelectionState {
  folderId?: string | null;
  pageId?: string;
  setFolder: (id?: string | null) => void;
  selectPage: (folderId: string | null, pageId: string) => void;
  clear: () => void;
}

function getInitialSelection() {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem(LAST_SELECTION_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (
          typeof parsed === 'object' && parsed !== null &&
          ('folderId' in parsed || 'pageId' in parsed)
        ) {
          const folderId = (parsed as { folderId?: string | null }).folderId;
          const pageId = (parsed as { pageId?: string }).pageId;
          return {
            folderId: typeof folderId === 'string' || folderId === null ? folderId : undefined,
            pageId: typeof pageId === 'string' ? pageId : undefined
          };
        }
      } catch {
        // ignore
      }
    }
  }
  return { folderId: undefined, pageId: undefined };
}

export const useSelectionStore = create<SelectionState>((set) => ({
  ...getInitialSelection(),
  setFolder: (folderId?: string | null) => {
    set(() => {
      const newState = { folderId, pageId: undefined };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          LAST_SELECTION_STORAGE_KEY,
          JSON.stringify({ folderId, pageId: undefined })
        );
      }
      return newState;
    });
  },
  selectPage: (folderId: string | null, pageId: string) => {
    set(() => {
      const newState = { folderId, pageId };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          LAST_SELECTION_STORAGE_KEY,
          JSON.stringify({ folderId, pageId })
        );
      }
      return newState;
    });
  },
  clear: () => {
    set(() => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(LAST_SELECTION_STORAGE_KEY);
      }
      return { folderId: undefined, pageId: undefined };
    });
  }
}));
