import {
  type ChangeEvent,
  type ReactNode,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  useSortable,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  createFolder,
  createPage,
  deleteFolder,
  deletePage,
  fetchPage,
  fetchWorkspaceTree,
  searchPages,
  updateFolder,
  updatePage,
} from "../../api/notes";
import type {
  FolderNode,
  Page,
  SearchResult,
  WorkspaceTree,
} from "../../api/types";
import { queryKeys } from "../../lib/queryKeys";
import { useSelectionStore } from "../../store/selection";

function sortPages(pages: Page[]) {
  return [...pages].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function sortFolders(folders: FolderNode[]) {
  return [...folders].sort((a, b) => {
    // Sort alphabetically by title
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });
}

type DragItem = {
  id: string;
  type: 'folder' | 'page';
  parentId: string | null;
  title?: string;
};

function truncateText(text: string, maxLength: number = 20): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function calculateMaxCharsForWidth(width: number, hasButtons: boolean = true, parentDepth: number = 0): number {
  // Account for padding and spacing
  const padding = 16; // px-2 = 8px * 2
  const iconWidth = 16; // h-4 w-4 icon
  const gap = 8; // gap-2

  // Indentation per level: ml-3 (12px) + pl-2 (8px) = 20px
  // Each level of nesting adds margin-left and padding-left, which reduces available text space
  const indentationPerLevel = 20;
  const totalIndentation = parentDepth * indentationPerLevel;

  // Button space: "+ Folder" + "+ Page" + Delete icon + gaps
  // More reasonable estimate: ~150px total
  const buttonsWidth = hasButtons ? 108 : 0;

  // Available width for tex
  // The indentation (ml-3 + pl-2) is applied to the container, reducing available space
  const availableWidth = width - padding - iconWidth - gap - buttonsWidth - totalIndentation;

  // If width is too small, be very aggressive with truncation
  if (availableWidth <= 16) {
    return 1; // Show minimal characters
  }

  // Estimate character width (average 8px per character for most fonts)
  const charWidth = 8;

  // Calculate max characters with more conservative approach
  const maxChars = Math.floor(availableWidth / charWidth);

  return Math.max(1, maxChars);
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
  sidebarWidth: number;
  depth?: number;
  isDragging?: boolean;
};

type DraggablePageProps = {
  page: Page;
  folderId: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPrefetch: () => void;
};

function RootDropZone({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'root-drop-zone',
    data: {
      type: 'root',
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "min-h-[200px] h-full flex-1",
        isOver && "bg-blue-500/10 ring-2 ring-blue-500 ring-inset"
      )}
    >
      {children}
    </div>
  );
}

function DraggablePage({
  page,
  folderId,
  isSelected,
  onSelect,
  onDelete,
  onPrefetch,
}: DraggablePageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `page-${page.id}`,
    data: {
      type: 'page',
      id: page.id,
      parentId: folderId,
      title: page.title,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={`flex items-center justify-between rounded px-2 py-1 hover:bg-slate-800 ${isSelected ? "bg-slate-800 text-white" : ""
          }`}
        {...attributes}
      >
        <span
          className="flex-1 truncate text-left cursor-grab active:cursor-grabbing"
          {...listeners}
          onClick={onSelect}
          onMouseEnter={onPrefetch}
          onFocus={onPrefetch}
        >
          {page.title}
        </span>
        <button
          type="button"
          className="ml-2 shrink-0 rounded px-1 py-0.5 text-red-300 hover:bg-red-500/20"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

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
  prefetchPage,
  sidebarWidth,
  depth = 0,
}: FolderTreeProps) {
  const isExpanded = expanded.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const maxChars = calculateMaxCharsForWidth(sidebarWidth, true, depth);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isFolderDragging,
    isOver,
  } = useSortable({
    id: `folder-${folder.id}`,
    data: {
      type: 'folder',
      id: folder.id,
      parentId: folder.parentId,
      title: folder.title,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isFolderDragging ? 0.5 : 1,
  };

  const handleToggle = () => {
    const wasExpanded = expanded.has(folder.id);
    toggle(folder.id);

    if (!wasExpanded) {
      onSelectFolder(folder.id);
    }
  };

  return (
    <li ref={setNodeRef} style={style} key={folder.id} className="rounded">
      <div
        className={clsx(
          "flex items-center justify-between rounded px-2 py-1 text-slate-200 hover:bg-slate-800",
          isSelected && "bg-slate-800 text-white",
          isOver && "ring-2 ring-blue-500"
        )}
        {...attributes}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className="flex flex-1 items-center gap-2 text-left cursor-grab active:cursor-grabbing"
          {...listeners}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="truncate font-medium">{truncateText(folder.title, maxChars)}</span>
        </button>
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            className="rounded px-1 py-0.5 hover:bg-slate-700 flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onCreateFolder(folder.id);
            }}
            aria-label="Add folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded px-1 py-0.5 hover:bg-slate-700"
            onClick={(e) => {
              e.stopPropagation();
              onCreatePage(folder.id);
            }}
          >
            <FilePlus2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded px-1 py-0.5 text-red-300 hover:bg-red-500/20"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFolder(folder.id);
            }}
            aria-label="Delete folder"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {isExpanded ? (
        <div className="ml-3 border-l border-slate-800 pl-2">
          {folder.pages.length > 0 ? (
            <SortableContext
              items={folder.pages.map((p) => `page-${p.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="mt-1 space-y-1 text-sm text-slate-300">
                {sortPages(folder.pages).map((page) => (
                  <DraggablePage
                    key={page.id}
                    page={page}
                    folderId={folder.id}
                    isSelected={selectedPageId === page.id}
                    onSelect={() => onSelectPage(folder.id, page)}
                    onDelete={() => onDeletePage(page.id)}
                    onPrefetch={() => prefetchPage(page.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          ) : null}
          {folder.children.length > 0 ? (
            <SortableContext
              items={folder.children.map((f) => `folder-${f.id}`)}
              strategy={verticalListSortingStrategy}
            >
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
                    sidebarWidth={sidebarWidth}
                    depth={depth + 1}
                  />
                ))}
              </ul>
            </SortableContext>
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

function PanelHeader({
  onCreateRootFolder,
  onCreateRootPage,
  searchTerm,
  onSearchChange,
}: PanelHeaderProps) {
  return (
    <div className="space-y-2 border-b border-slate-800 px-3 py-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Workspace
        </h2>
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

function findFolderPath(
  tree: WorkspaceTree | undefined,
  targetId: string
): string[] | null {
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

function findFolderById(
  tree: WorkspaceTree | undefined,
  targetId: string | null
): FolderNode | null {
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
  width?: number;
};

export function NavigationPanel({ className, onClose, width = 320 }: NavigationPanelProps) {
  const queryClient = useQueryClient();
  const { folderId, pageId, setFolder, selectPage, clear } =
    useSelectionStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [drilldownPath, setDrilldownPath] = useState<string[]>([]);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileView(event.matches);
    };

    setIsMobileView(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);
    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  const deferredSearch = useDeferredValue(searchTerm);
  const normalizedSearch = useMemo(
    () => deferredSearch.trim(),
    [deferredSearch]
  );
  const searchEnabled = normalizedSearch.length >= 2;

  const {
    data: tree,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.workspace,
    queryFn: fetchWorkspaceTree,
  });

  const searchQuery = useQuery({
    queryKey: queryKeys.search(normalizedSearch || "_"),
    queryFn: () => searchPages(normalizedSearch),
    enabled: searchEnabled,
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
    },
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
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: deleteFolder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace });
      clear();
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: deletePage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace });
      clear();
    },
  });

  const moveFolderMutation = useMutation({
    mutationFn: ({ folderId, parentId }: { folderId: string; parentId: string | null }) =>
      updateFolder(folderId, { parentId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace });
    },
  });

  const movePageMutation = useMutation({
    mutationFn: ({ pageId, folderId }: { pageId: string; folderId: string | null }) =>
      updatePage(pageId, { folderId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace });
    },
  });

  const [activeDragItem, setActiveDragItem] = useState<DragItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current as DragItem);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeData = active.data.current as DragItem;
    const overData = over.data.current as DragItem | { type: 'root' } | undefined;

    if (!activeData) return;

    // Handle dropping to root (when overData is undefined or explicitly root drop zone)
    if (!overData || (overData && 'type' in overData && overData.type === 'root')) {
      if (activeData.type === 'folder') {
        // Move folder to root
        void moveFolderMutation.mutate({
          folderId: activeData.id,
          parentId: null,
        });
      } else if (activeData.type === 'page') {
        // Move page to root
        void movePageMutation.mutate({
          pageId: activeData.id,
          folderId: null,
        });
      }
      return;
    }

    // Handle folder being dropped
    if (activeData.type === 'folder') {
      if (overData.type === 'folder') {
        // Moving folder into another folder or reordering
        const activeFolderId = activeData.id;
        const targetFolderId = overData.id;

        // Prevent moving a folder into itself
        if (activeFolderId === targetFolderId) return;

        void moveFolderMutation.mutate({
          folderId: activeFolderId,
          parentId: targetFolderId,
        });
      }
    }
    // Handle page being dropped
    else if (activeData.type === 'page') {
      if (overData.type === 'folder') {
        // Moving page into a folder
        void movePageMutation.mutate({
          pageId: activeData.id,
          folderId: overData.id,
        });
      } else if (overData.type === 'page') {
        // Reordering pages at same level - move to same folder as target
        if (activeData.parentId !== overData.parentId) {
          void movePageMutation.mutate({
            pageId: activeData.id,
            folderId: overData.parentId,
          });
        }
      }
    }
  };

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
      path.length === drilldownPath.length &&
      path.every((id, index) => drilldownPath[index] === id);

    if (!isSamePath) {
      setDrilldownPath(path);
    }
  }, [drilldownPath, folderId, isMobileView, tree]);

  const currentFolderId = drilldownPath.length
    ? drilldownPath[drilldownPath.length - 1]
    : null;

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
      staleTime: 60_000,
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

  const ensureFolderExpanded = (targetFolderId: string | null | undefined) => {
    if (!targetFolderId || !tree) {
      return;
    }
    const path = findFolderPath(tree, targetFolderId);
    if (!path) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of path) {
        if (next.has(id)) continue
        next.add(id);
      }
      return next;
    });
  };

  const handleCreateFolder = (parentId?: string | null) => {
    const title = window.prompt("Folder name", "Untitled folder");
    if (!title) return;
    void createFolderMutation.mutate({ title, parentId: parentId ?? null });
    if (parentId) {
      ensureFolderExpanded(parentId);
    }
  };

  const handleCreatePage = (parentId?: string | null) => {
    const title = window.prompt("Page title", "Untitled page");
    if (!title) return;
    void createPageMutation.mutate({ title, folderId: parentId ?? null });
    ensureFolderExpanded(parentId ?? null);
  };

  const handleDeleteFolder = (id: string) => {
    if (
      !window.confirm(
        "Delete folder and all nested content? This cannot be undone."
      )
    )
      return;
    void deleteFolderMutation.mutate(id);
  };

  const handleDeletePage = (id: string) => {
    if (!window.confirm("Delete page? This cannot be undone.")) return;
    void deletePageMutation.mutate(id);
  };

  const handleDrillIntoFolder = (folder: FolderNode) => {
    ensureFolderExpanded(folder.id);
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
    ensureFolderExpanded(id ?? null);

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
    ensureFolderExpanded(folderIdValue);
    onClose?.();
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleSearchSelect = (result: SearchResult) => {
    ensureFolderExpanded(result.folderId);
    selectPage(result.folderId, result.id);
    setSearchTerm("");
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
      searchContent = (
        <div className="px-3 py-2 text-xs text-slate-400">Searching…</div>
      );
    } else if (searchQuery.isError) {
      searchContent = (
        <div className="px-3 py-2 text-xs text-red-300">
          Search failed. Try again.
        </div>
      );
    } else {
      const results = searchQuery.data ?? [];
      searchContent = results.length ? (
        <div className="border-b border-slate-800 px-2 py-2 text-xs text-slate-300">
          <p className="px-1 pb-2 text-[0.65rem] uppercase tracking-wide text-slate-500">
            Search results
          </p>
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
                  <p className="truncate text-sm font-medium text-slate-100">
                    {result.title}
                  </p>
                  <p className="truncate text-[0.65rem] text-slate-500">
                    {result.folderTitle ?? "Root"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[0.7rem] text-slate-400">
                    {result.snippet}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="px-3 py-2 text-xs text-slate-500">
          No notes matched “{normalizedSearch}”.
        </div>
      );
    }
  }

  let content: ReactNode = null;

  if (isLoading) {
    content = (
      <div className="p-4 text-sm text-slate-400">Loading workspace…</div>
    );
  } else if (isError || !tree) {
    content = (
      <div className="p-4 text-sm text-red-300">Failed to load workspace.</div>
    );
  } else if (tree.folders.length === 0 && tree.pages.length === 0) {
    content = (
      <div className="p-4 text-sm text-slate-400">
        No notes yet. Use the buttons above to add your first page or folder.
      </div>
    );
  } else if (isMobileView) {
    const isRootView = drilldownPath.length === 0;
    const foldersToDisplay = sortFolders(
      currentFolder ? currentFolder.children : tree.folders
    );
    const pagesToDisplay = sortPages(
      currentFolder ? currentFolder.pages : tree.pages
    );
    const hasItems = foldersToDisplay.length > 0 || pagesToDisplay.length > 0;

    content = (
      <div className="flex h-full flex-col text-sm">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-400">
          {isRootView ? (
            <span className="text-xs font-medium text-slate-300">
              Workspace
            </span>
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
            {currentFolder ? truncateText(currentFolder.title, calculateMaxCharsForWidth(width, false, 0)) : "All notes"}
          </p>
          <button
            type="button"
            onClick={handleResetToRoot}
            disabled={isRootView}
            className={clsx(
              "rounded px-2 py-1 transition",
              isRootView
                ? "cursor-default text-slate-600"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
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
              <span
                key={folder.id}
                className="flex items-center gap-1 text-slate-500"
              >
                <span>/</span>
                <button
                  type="button"
                  onClick={() => handleSelectFolder(folder.id)}
                  className={clsx(
                    "rounded px-1 py-0.5 transition",
                    index === breadcrumbFolders.length - 1
                      ? "font-semibold text-slate-200"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  )}
                >
                  {truncateText(folder.title, Math.max(3, Math.floor(calculateMaxCharsForWidth(width, false, 0) * 0.3)))}
                </button>
              </span>
            ))}
          </div>
        ) : null}
        {currentFolder ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-3 py-2 text-[0.7rem] text-slate-300">
            <span className="font-medium text-slate-200">
              Add to {truncateText(currentFolder.title, calculateMaxCharsForWidth(width, false, 0))}
            </span>
            <button
              type="button"
              onClick={() => handleCreatePage(currentFolder.id)}
              className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
            >
              <FilePlus2 className="h-3.5 w-3.5 inline-block" />
            </button>
            <button
              type="button"
              onClick={() => handleCreateFolder(currentFolder.id)}
              className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
            >
              <FolderPlus className="h-3.5 w-3.5 inline-block" />
            </button>
          </div>
        ) : null}
        <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {hasItems ? (
            <>
              {foldersToDisplay.length > 0 ? (
                <div>
                  <p className="px-1 text-[0.65rem] uppercase tracking-wide text-slate-500">
                    Folders
                  </p>
                  <ul className="mt-2 space-y-2">
                    {foldersToDisplay.map((folder) => (
                      <li key={folder.id}>
                        <button
                          type="button"
                          onClick={() => handleDrillIntoFolder(folder)}
                          className={clsx(
                            "flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left transition hover:border-slate-700 hover:bg-slate-800",
                            folderId === folder.id
                              ? "border-slate-600 bg-slate-800/80 text-slate-100"
                              : "text-slate-200"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <Folder className="h-4 w-4 text-slate-400" />
                            <span className="truncate font-medium">
                              {truncateText(folder.title, calculateMaxCharsForWidth(width, false, 0))}
                            </span>
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
                  <p className="px-1 text-[0.65rem] uppercase tracking-wide text-slate-500">
                    Pages
                  </p>
                  <ul className="mt-2 space-y-2">
                    {pagesToDisplay.map((page) => {
                      const scopedFolderId = currentFolder
                        ? currentFolder.id
                        : null;
                      const isSelected =
                        pageId === page.id &&
                        (folderId ?? null) === scopedFolderId;
                      return (
                        <li key={page.id}>
                          <button
                            type="button"
                            className={clsx(
                              "flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left transition hover:border-slate-700 hover:bg-slate-800",
                              isSelected
                                ? "border-slate-600 bg-slate-800/80 text-slate-100"
                                : "text-slate-200"
                            )}
                            onClick={() =>
                              handleSelectPage(scopedFolderId, page)
                            }
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
    const allFolderIds = tree.folders.map((f) => `folder-${f.id}`);
    const allPageIds = tree.pages.map((p) => `page-${p.id}`);

    content = (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <RootDropZone>
          <div className="px-2 py-2 text-sm">
            {tree.pages.length > 0 ? (
              <SortableContext
                items={allPageIds}
                strategy={verticalListSortingStrategy}
              >
                <ul className="mb-2 space-y-1">
                  {sortPages(tree.pages).map((page) => {
                    const isSelected =
                      pageId === page.id && (folderId ?? null) === null;
                    return (
                      <DraggablePage
                        key={page.id}
                        page={page}
                        folderId={page.folderId ?? ''}
                        isSelected={isSelected}
                        onSelect={() => handleSelectPage(null, page)}
                        onDelete={() => handleDeletePage(page.id)}
                        onPrefetch={() => prefetchPage(page.id)}
                      />
                    );
                  })}
                </ul>
              </SortableContext>
            ) : null}
            <SortableContext
              items={allFolderIds}
              strategy={verticalListSortingStrategy}
            >
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
                    sidebarWidth={width}
                  />
                ))}
              </ul>
            </SortableContext>
          </div>
        </RootDropZone>
        <DragOverlay>
          {activeDragItem ? (
            <div className="flex items-center gap-2 rounded bg-slate-800 px-3 py-2 text-slate-200 shadow-lg ring-2 ring-blue-500">
              {activeDragItem.type === 'folder' ? (
                <Folder className="h-4 w-4 text-slate-400" />
              ) : (
                <FileText className="h-4 w-4 text-slate-400" />
              )}
              <span className="font-medium">{activeDragItem.title || 'Untitled'}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }

  return (
    <aside
      className={clsx(
        "flex h-full flex-col border-r border-slate-900 bg-slate-950 text-slate-100",
        className
      )}
      style={{ width: `${width}px` }}
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
