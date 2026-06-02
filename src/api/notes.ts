import { api } from './client';
import type { FolderNode, Page, PageRevision, PageTodos, SearchResult, WorkspaceTree } from './types';

type FolderInput = {
  title: string;
  description?: string | null;
  color?: string | null;
  parentId?: string | null;
  position?: number;
};

type FolderUpdateInput = Partial<FolderInput>;

type PageInput = {
  title: string;
  slug?: string | null;
  position?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  folderId?: string | null;
  content?: {
    html?: string;
    text?: string;
    json?: unknown;
    canvas?: unknown;
  };
};

type PageUpdateInput = Partial<PageInput>;

type RevisionInput = {
  snapshot: unknown;
};

export async function fetchWorkspaceTree() {
  const response = await api.get<{ tree: WorkspaceTree }>('/api/workspace/tree');
  return response.data.tree;
}

export async function fetchFolder(folderId: string) {
  const response = await api.get<{ folder: FolderNode }>(`/api/workspace/folders/${folderId}`);
  return response.data.folder;
}

export async function createFolder(input: FolderInput) {
  const response = await api.post<{ folder: FolderNode }>('/api/folders', input);
  return response.data.folder;
}

export async function updateFolder(folderId: string, input: FolderUpdateInput) {
  const response = await api.patch<{ folder: FolderNode }>(`/api/folders/${folderId}`, input);
  return response.data.folder;
}

export async function deleteFolder(folderId: string) {
  await api.delete(`/api/folders/${folderId}`);
}

export async function createPage(input: PageInput) {
  const response = await api.post<{ page: Page }>('/api/pages', input);
  return response.data.page;
}

export async function fetchPage(pageId: string) {
  const response = await api.get<{ page: Page }>(`/api/pages/${pageId}`);
  return response.data.page;
}

export async function updatePage(pageId: string, input: PageUpdateInput) {
  const response = await api.patch<{ page: Page }>(`/api/pages/${pageId}`, input);
  return response.data.page;
}

export async function deletePage(pageId: string) {
  await api.delete(`/api/pages/${pageId}`);
}

export async function recordRevision(pageId: string, input: RevisionInput) {
  const response = await api.post<{ revision: PageRevision }>(`/api/pages/${pageId}/revisions`, input);
  return response.data.revision;
}

export async function listRevisions(pageId: string, limit = 10) {
  const response = await api.get<{ revisions: PageRevision[] }>(`/api/pages/${pageId}/revisions`, {
    params: { limit }
  });
  return response.data.revisions;
}

export async function searchPages(query: string, limit = 20) {
  const response = await api.get<{ results: SearchResult[] }>('/api/search', {
    params: { query, limit }
  });
  return response.data.results;
}

export async function fetchTodos() {
  const response = await api.get<{ todos: PageTodos[] }>('/api/todos');
  return response.data.todos;
}
