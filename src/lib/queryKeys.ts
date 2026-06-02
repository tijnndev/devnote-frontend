export const queryKeys = {
  workspace: ['workspace', 'tree'] as const,
  folder: (id: string) => ['folder', id] as const,
  page: (id: string) => ['page', id] as const,
  search: (query: string) => ['search', query] as const,
  revisions: (pageId: string) => ['page', pageId, 'revisions'] as const,
  todos: ['todos'] as const,
};
