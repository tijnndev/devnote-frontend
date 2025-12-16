export type PageContent = {
  id: string;
  pageId: string;
  html: string;
  json?: string | null;
  text: string;
  canvasJson?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Page = {
  id: string;
  title: string;
  slug?: string | null;
  position: number;
  searchText: string;
  isPinned: boolean;
  isArchived: boolean;
  folderId: string | null;
  content?: PageContent[] | null;
  createdAt: string;
  updatedAt: string;
  folder?: {
    id: string;
    title: string;
    parentId: string | null;
  } | null;
};

export type FolderNode = {
  id: string;
  title: string;
  description?: string | null;
  color?: string | null;
  position: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  pages: Page[];
  children: FolderNode[];
};

export type WorkspaceTree = {
  folders: FolderNode[];
  pages: Page[];
};

export type PageRevision = {
  id: string;
  pageId: string;
  snapshot: string;
  createdAt: string;
};

export type SearchResult = {
  id: string;
  title: string;
  snippet: string;
  folderId: string | null;
  folderTitle: string | null;
};

export type ChangeLogEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  payload: string;
  createdAt: string;
};
