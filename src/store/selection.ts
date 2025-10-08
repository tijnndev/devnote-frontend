import { create } from 'zustand';

interface SelectionState {
  folderId?: string | null;
  pageId?: string;
  setFolder: (id?: string | null) => void;
  selectPage: (folderId: string | null, pageId: string) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  folderId: undefined,
  pageId: undefined,
  setFolder: (folderId?: string | null) => set({ folderId, pageId: undefined }),
  selectPage: (folderId: string | null, pageId: string) => set({ folderId, pageId }),
  clear: () => set({ folderId: undefined, pageId: undefined })
}));
