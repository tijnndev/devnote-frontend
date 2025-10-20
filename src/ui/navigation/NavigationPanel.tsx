import {
  type ChangeEvent,
  type ReactNode,
  useDeferredValue,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  Trash2
} from 'lucide-react';
import clsx from 'clsx';

import {
  createFolder,
  createPage,
  deleteFolder,
  deletePage,
  fetchPage,
  fetchWorkspaceTree,
  searchPages
} from '../../api/notes';
import type { FolderNode, Page, SearchResult, WorkspaceTree } from '../../api/types';
import { queryKeys } from '../../lib/queryKeys';
import { useSelectionStore } from '../../store/selection';

function sortPages(pages: Page[]) {
  return [...pages].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function sortFolders(folders: FolderNode[]) {
  return [...folders].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

type FolderTreeProps = {
  folder: FolderNode;
  expanded: Set<string>;
  toggle: (id: string) => void;
  onCreateFolder: (parentId: string) => void;
  onCreatePage: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeletePage: (pageId: string) => void;
  onSelectFolder: (folderId: string) => void;
  onSelectPage: (folderId: string | null, page: Page) => void;
  selectedFolderId?: string | null;
  selectedPageId?: string;
  prefetchPage: (pageId: string) => void;
};

function FolderTreeItem({
  folder,
  expanded,
  toggle,
  onCreateFolder,
  onCreatePage,
  onDeleteFolder,
  onDeletePage,
  onSelectFolder,
  onSelectPage,
  selectedFolderId,
  selectedPageId,
  prefetchPage
}: FolderTreeProps) {
  const isExpanded = expanded.has(folder.id);
  const isSelected = selectedFolderId === folder.id;

  const handleToggle = () => {
    toggle(folder.id);
    onSelectFolder(folder.id);
  };

  return (
    <li key={folder.id} className="rounded">
      <div
        className={`flex items-center justify-between rounded px-2 py-1 text-slate-200 hover:bg-slate-800 ${
          isSelected ? 'bg-slate-800 text-white' : ''
        }`}
      >
        <button
          type="button"
          onClick={handleToggle}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="truncate font-medium">{folder.title}</span>
        </button>
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            className="rounded px-1 py-0.5 hover:bg-slate-700"
            onClick={() => onCreateFolder(folder.id)}
          >
            + Folder
          </button>
          <button
            type="button"
            className="rounded px-1 py-0.5 hover:bg-slate-700"
            onClick={() => onCreatePage(folder.id)}
          >
            + Page
          </button>
          <button
            type="button"
            className="rounded px-1 py-0.5 text-red-300 hover:bg-red-500/20"
            onClick={() => onDeleteFolder(folder.id)}
            aria-label="Delete folder"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {isExpanded ? (
        <div className="ml-3 border-l border-slate-800 pl-2">
          {folder.pages.length > 0 ? (
            <ul className="mt-1 space-y-1 text-sm text-slate-300">
              {sortPages(folder.pages).map((page) => {
                const isPageSelected = selectedPageId === page.id;
                return (
                  <li key={page.id}>
                    <div
                      className={`flex items-center justify-between rounded px-2 py-1 hover:bg-slate-800 ${
                        isPageSelected ? 'bg-slate-800 text-white' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="flex-1 truncate text-left"
                        onClick={() => onSelectPage(folder.id, page)}
                        onMouseEnter={() => prefetchPage(page.id)}
                        onFocus={() => prefetchPage(page.id)}
                      >
                        {page.title}
                      </button>
                      <button
                        type="button"
                        className="ml-2 shrink-0 rounded px-1 py-0.5 text-red-300 hover:bg-red-500/20"
                        onClick={() => onDeletePage(page.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {folder.children.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {sortFolders(folder.children).map((child) => (
                <FolderTreeItem
                  key={child.id}
                  folder={child}
                  expanded={expanded}
                  toggle={toggle}
                  onCreateFolder={onCreateFolder}
                  onCreatePage={onCreatePage}
                  onDeleteFolder={onDeleteFolder}
                  onDeletePage={onDeletePage}
                  onSelectFolder={onSelectFolder}
                  onSelectPage={onSelectPage}
                  selectedFolderId={selectedFolderId}
                  selectedPageId={selectedPageId}
                  prefetchPage={prefetchPage}
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

type PanelHeaderProps = {
  onCreateRootFolder: () => void;
  onCreateRootPage: () => void;
  searchTerm: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function PanelHeader({ onCreateRootFolder, onCreateRootPage, searchTerm, onSearchChange }: PanelHeaderProps) {
  return (
    <div className="space-y-2 border-b border-slate-800 px-3 py-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Workspace</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCreateRootPage}
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
            aria-label="Create new page"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Page
          </button>
          <button
            type="button"
            onClick={onCreateRootFolder}
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
            aria-label="Create new folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Folder
          </button>
        </div>
      </div>
      <input
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="Search notes..."
        className="w-full rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600"
        aria-label="Search notes"
      />
    </div>
  );
}

function findFolderPath(tree: WorkspaceTree | undefined, targetId: string): string[] | null {
  if (!tree) return null;

  const stack: Array<{ node: FolderNode; path: string[] }> = [];
  for (const folder of tree.folders) {
    stack.push({ node: folder, path: [folder.id] });
  }

  while (stack.length > 0) {
    const { node, path } = stack.pop()!;
    if (node.id === targetId) {
      return path;
    }
    for (const child of node.children) {
      stack.push({ node: child, path: [...path, child.id] });
    }
  }

  return null;
}

function findFolderById(tree: WorkspaceTree | undefined, targetId: string | null): FolderNode | null {
  if (!tree || !targetId) return null;

  const stack: FolderNode[] = [...tree.folders];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.id === targetId) {
      return node;
    }
    stack.push(...node.children);
  }

  return null;
}

type NavigationPanelProps = {
  className?: string;
  onClose?: () => void;
};

export function NavigationPanel({ className, onClose }: NavigationPanelProps) {
  const queryClient = useQueryClient();
  const { folderId, pageId, setFolder, selectPage, clear } = useSelectionStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [drilldownPath, setDrilldownPath] = useState<string[]>([]);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileView(event.matches);
    };

    setIsMobileView(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    mediaQuery.addListener(handleChange);
    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  const deferredSearch = useDeferredValue(searchTerm);
  const normalizedSearch = useMemo(() => deferredSearch.trim(), [deferredSearch]);
  const searchEnabled = normalizedSearch.length >= 2;

  const { data: tree, isLoading, isError } = useQuery({
    queryKey: queryKeys.workspace,
    queryFn: fetchWorkspaceTree
  });

  const searchQuery = useQuery({
    queryKey: queryKeys.search(normalizedSearch || '_'),
    queryFn: () => searchPages(normalizedSearch),
    enabled: searchEnabled
  });

  const createFolderMutation = useMutation({
    mutationFn: createFolder,
    onSuccess: (folder) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace });
      setFolder(folder.id);
      setExpanded((prev) => {
        const next = new Set(prev);
        if (folder.parentId) {
          next.add(folder.parentId);
        }
        next.add(folder.id);
        return next;
      });
    }
  });

  const createPageMutation = useMutation({
    mutationFn: createPage,
    onSuccess: (page) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace });
      selectPage(page.folderId ?? null, page.id);
      if (page.folderId) {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.add(page.folderId!);
          return next;
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.page(page.id) });
    }
  });

  const deleteFolderMutation = useMutation({
    mutationFn: deleteFolder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace });
      clear();
    }
  });

  const deletePageMutation = useMutation({
    mutationFn: deletePage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace });
      clear();
    }
  });

  useEffect(() => {
    if (!isMobileView) {
      if (drilldownPath.length > 0) {
        setDrilldownPath([]);
      }
      return;
    }

    if (!tree) return;

    if (!folderId) {
      if (drilldownPath.length > 0) {
        setDrilldownPath([]);
      }
      return;
    }

    const path = findFolderPath(tree, folderId) ?? [];
    const isSamePath =
      path.length === drilldownPath.length && path.every((id, index) => drilldownPath[index] === id);

    if (!isSamePath) {
      setDrilldownPath(path);
    }
  }, [drilldownPath, folderId, isMobileView, tree]);

  const currentFolderId = drilldownPath.length ? drilldownPath[drilldownPath.length - 1] : null;

  const currentFolder = useMemo(() => {
    if (!tree || !currentFolderId) return null;
    return findFolderById(tree, currentFolderId);
  }, [currentFolderId, tree]);

  const breadcrumbFolders = useMemo(() => {
    if (!tree || drilldownPath.length === 0) return [];
    return drilldownPath
      .map((id) => findFolderById(tree, id))
      .filter((folder): folder is FolderNode => Boolean(folder));
  }, [drilldownPath, tree]);

  const prefetchPage = (id: string) => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.page(id),
      queryFn: () => fetchPage(id),
      staleTime: 60_000
    });
  };

  const toggleFolder = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleFolderExpanded = (targetFolderId: string | null | undefined) => {
    if (!targetFolderId || !tree) return
    const path = findFolderPath(tree, targetFolderId)
    if (!path) return
    setExpanded(prev => {
      const next = new Set(prev)
      for (const id of path) {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }


  const handleCreateFolder = (parentId?: string | null) => {
    const title = window.prompt('Folder name', 'Untitled folder');
    if (!title) return;
    void createFolderMutation.mutate({ title, parentId: parentId ?? null });
    if (parentId) {
      toggleFolderExpanded(parentId);
    }
  };

  const handleCreatePage = (parentId?: string | null) => {
    const title = window.prompt('Page title', 'Untitled page');
    if (!title) return;
    void createPageMutation.mutate({ title, folderId: parentId ?? null });
    toggleFolderExpanded(parentId ?? null);
  };

  const handleDeleteFolder = (id: string) => {
    if (!window.confirm('Delete folder and all nested content? This cannot be undone.')) return;
    void deleteFolderMutation.mutate(id);
  };

  const handleDeletePage = (id: string) => {
    if (!window.confirm('Delete page? This cannot be undone.')) return;
    void deletePageMutation.mutate(id);
  };

  const handleDrillIntoFolder = (folder: FolderNode) => {
    toggleFolderExpanded(folder.id);
    setFolder(folder.id);
    setDrilldownPath((prev) => {
      if (prev[prev.length - 1] === folder.id) {
        return prev;
      }
      return [...prev, folder.id];
    });
  };

  const handleNavigateBack = () => {
    if (drilldownPath.length === 0) {
      setFolder(null);
      return;
    }

    const nextPath = drilldownPath.slice(0, -1);
    setDrilldownPath(nextPath);
    const parentId = nextPath[nextPath.length - 1] ?? null;
    setFolder(parentId ?? null);
  };

  const handleResetToRoot = () => {
    if (drilldownPath.length > 0) {
      setDrilldownPath([]);
    }
    setFolder(null);
  };

  const handleSelectFolder = (id: string | null) => {
    setFolder(id);
    toggleFolderExpanded(id ?? null);

    if (isMobileView) {
      if (!id) {
        if (drilldownPath.length > 0) {
          setDrilldownPath([]);
        }
        return;
      }

      if (tree) {
        const path = findFolderPath(tree, id) ?? [];
        const isSamePath =
          path.length === drilldownPath.length &&
          path.every((value, index) => drilldownPath[index] === value);
        if (!isSamePath) {
          setDrilldownPath(path);
        }
      }
    }
  };

  const handleSelectPage = (folderIdValue: string | null, page: Page) => {
    selectPage(folderIdValue, page.id);
    toggleFolderExpanded(folderIdValue);
    onClose?.();
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSearchSelect = (result: SearchResult) => {
    toggleFolderExpanded(result.folderId);
    selectPage(result.folderId, result.id);
    setSearchTerm('');
    if (isMobileView) {
      if (result.folderId && tree) {
        const path = findFolderPath(tree, result.folderId) ?? [];
        setDrilldownPath(path);
      } else {
        setDrilldownPath([]);
      }
    }
    onClose?.();
  };

  let searchContent: ReactNode = null;

  if (searchEnabled) {
    if (searchQuery.isLoading) {
      searchContent = <div className="px-3 py-2 text-xs text-slate-400">Searching…</div>;
    } else if (searchQuery.isError) {
      searchContent = <div className="px-3 py-2 text-xs text-red-300">Search failed. Try again.</div>;
    } else {
      const results = searchQuery.data ?? [];
      searchContent = results.length ? (
        <div className="border-b border-slate-800 px-2 py-2 text-xs text-slate-300">
          <p className="px-1 pb-2 text-[0.65rem] uppercase tracking-wide text-slate-500">Search results</p>
          <ul className="max-h-48 space-y-1 overflow-y-auto pr-1">
            {results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => handleSearchSelect(result)}
                  onFocus={() => prefetchPage(result.id)}
                  onMouseEnter={() => prefetchPage(result.id)}
                  className="w-full rounded-md px-2 py-2 text-left hover:bg-slate-800"
                >
                  <p className="truncate text-sm font-medium text-slate-100">{result.title}</p>
                  <p className="truncate text-[0.65rem] text-slate-500">
                    {result.folderTitle ?? 'Root'}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[0.7rem] text-slate-400">{result.snippet}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="px-3 py-2 text-xs text-slate-500">No notes matched “{normalizedSearch}”.</div>
      );
    }
  }

  let content: ReactNode = null;

  if (isLoading) {
    content = <div className="p-4 text-sm text-slate-400">Loading workspace…</div>;
  } else if (isError || !tree) {
    content = <div className="p-4 text-sm text-red-300">Failed to load workspace.</div>;
  } else if (tree.folders.length === 0 && tree.pages.length === 0) {
    content = (
      <div className="p-4 text-sm text-slate-400">
        No notes yet. Use the buttons above to add your first page or folder.
      </div>
    );
  } else if (isMobileView) {
    const isRootView = drilldownPath.length === 0;
    const foldersToDisplay = sortFolders(currentFolder ? currentFolder.children : tree.folders);
    const pagesToDisplay = sortPages(currentFolder ? currentFolder.pages : tree.pages);
    const hasItems = foldersToDisplay.length > 0 || pagesToDisplay.length > 0;

    content = (
      <div className="flex h-full flex-col text-sm">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-400">
          {isRootView ? (
            <span className="text-xs font-medium text-slate-300">Workspace</span>
          ) : (
            <button
              type="button"
              onClick={handleNavigateBack}
              className="rounded px-2 py-1 text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
            >
              Back
            </button>
          )}
          <p className="flex-1 px-2 text-center text-sm font-semibold text-slate-100">
            {currentFolder ? currentFolder.title : 'All notes'}
          </p>
          <button
            type="button"
            onClick={handleResetToRoot}
            disabled={isRootView}
            className={clsx(
              'rounded px-2 py-1 transition',
              isRootView
                ? 'cursor-default text-slate-600'
                : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
            )}
          >
            Root
          </button>
        </div>
        {breadcrumbFolders.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 bg-slate-900/60 px-3 py-2 text-[0.7rem] text-slate-400">
            <button
              type="button"
              onClick={handleResetToRoot}
              className="rounded px-1 py-0.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
            >
              Root
            </button>
            {breadcrumbFolders.map((folder, index) => (
              <span key={folder.id} className="flex items-center gap-1 text-slate-500">
                <span>/</span>
                <button
                  type="button"
                  onClick={() => handleSelectFolder(folder.id)}
                  className={clsx(
                    'rounded px-1 py-0.5 transition',
                    index === breadcrumbFolders.length - 1
                      ? 'font-semibold text-slate-200'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  )}
                >
                  {folder.title}
                </button>
              </span>
            ))}
          </div>
        ) : null}
        {currentFolder ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-3 py-2 text-[0.7rem] text-slate-300">
            <span className="font-medium text-slate-200">Add to {currentFolder.title}</span>
            <button
              type="button"
              onClick={() => handleCreatePage(currentFolder.id)}
              className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
            >
              + Page
            </button>
            <button
              type="button"
              onClick={() => handleCreateFolder(currentFolder.id)}
              className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
            >
              + Folder
            </button>
          </div>
        ) : null}
        <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {hasItems ? (
            <>
              {foldersToDisplay.length > 0 ? (
                <div>
                  <p className="px-1 text-[0.65rem] uppercase tracking-wide text-slate-500">Folders</p>
                  <ul className="mt-2 space-y-2">
                    {foldersToDisplay.map((folder) => (
                      <li key={folder.id}>
                        <button
                          type="button"
                          onClick={() => handleDrillIntoFolder(folder)}
                          className={clsx(
                            'flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left transition hover:border-slate-700 hover:bg-slate-800',
                            folderId === folder.id
                              ? 'border-slate-600 bg-slate-800/80 text-slate-100'
                              : 'text-slate-200'
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <Folder className="h-4 w-4 text-slate-400" />
                            <span className="truncate font-medium">{folder.title}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {pagesToDisplay.length > 0 ? (
                <div>
                  <p className="px-1 text-[0.65rem] uppercase tracking-wide text-slate-500">Pages</p>
                  <ul className="mt-2 space-y-2">
                    {pagesToDisplay.map((page) => {
                      const scopedFolderId = currentFolder ? currentFolder.id : null;
                      const isSelected = pageId === page.id && (folderId ?? null) === scopedFolderId;
                      return (
                        <li key={page.id}>
                          <button
                            type="button"
                            className={clsx(
                              'flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left transition hover:border-slate-700 hover:bg-slate-800',
                              isSelected ? 'border-slate-600 bg-slate-800/80 text-slate-100' : 'text-slate-200'
                            )}
                            onClick={() => handleSelectPage(scopedFolderId, page)}
                            onMouseEnter={() => prefetchPage(page.id)}
                            onFocus={() => prefetchPage(page.id)}
                          >
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="truncate">{page.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-md border border-dashed border-slate-800 bg-slate-900/40 px-3 py-6 text-center text-sm text-slate-400">
              This folder is empty.
            </div>
          )}
        </div>
      </div>
    );
  } else {
    content = (
      <div className="px-2 py-2 text-sm">
        {tree.pages.length > 0 ? (
          <ul className="mb-2 space-y-1">
            {sortPages(tree.pages).map((page) => {
              const isSelected = pageId === page.id && (folderId ?? null) === null;
              return (
                <li key={page.id}>
                  <div
                    className={`flex items-center justify-between rounded px-2 py-1 hover:bg-slate-800 ${
                      isSelected ? 'bg-slate-800 text-white' : 'text-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      className="flex-1 truncate text-left"
                      onClick={() => handleSelectPage(null, page)}
                      onMouseEnter={() => prefetchPage(page.id)}
                      onFocus={() => prefetchPage(page.id)}
                    >
                      {page.title}
                    </button>
                    <button
                      type="button"
                      className="ml-2 shrink-0 rounded px-1 py-0.5 text-red-300 hover:bg-red-500/20"
                      onClick={() => handleDeletePage(page.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
        <ul className="space-y-1 text-sm">
          {sortFolders(tree.folders).map((folder) => (
            <FolderTreeItem
              key={folder.id}
              folder={folder}
              expanded={expanded}
              toggle={toggleFolder}
              onCreateFolder={handleCreateFolder}
              onCreatePage={handleCreatePage}
              onDeleteFolder={handleDeleteFolder}
              onDeletePage={handleDeletePage}
              onSelectFolder={(id) => handleSelectFolder(id)}
              onSelectPage={handleSelectPage}
              selectedFolderId={folderId}
              selectedPageId={pageId}
              prefetchPage={prefetchPage}
            />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <aside
      className={clsx(
        'flex h-full w-80 flex-col border-r border-slate-900 bg-slate-950 text-slate-100',
        className
      )}
    >
      <PanelHeader
        onCreateRootFolder={() => handleCreateFolder(null)}
        onCreateRootPage={() => handleCreatePage(null)}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
      />
      {searchContent}
      <div className="flex-1 overflow-y-auto">{content}</div>
    </aside>
  );
}
