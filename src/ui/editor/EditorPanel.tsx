import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import type {
  AppState,
  BinaryFileData,
  ExcalidrawInitialDataState
} from '@excalidraw/excalidraw/types/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSONContent } from '@tiptap/core';
import { type Editor, EditorContent, useEditor } from '@tiptap/react';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Loader2 } from 'lucide-react';

import { fetchPage, updatePage } from '../../api/notes';
import type { Page } from '../../api/types';
import { queryKeys } from '../../lib/queryKeys';
import { useSelectionStore } from '../../store/selection';
import { Toolbar } from '../toolbar/Toolbar';

function truncateText(text: string, maxLength: number = 20): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Simple hash function for quick comparison
function simpleHash(obj: unknown): string {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

function parseJsonContent(content?: string | null): JSONContent | undefined {
  if (!content) return undefined;
  try {
    return JSON.parse(content) as JSONContent;
  } catch (error) {
    console.warn('Failed to parse page JSON content', error);
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isExcalidrawElement(value: unknown): value is ExcalidrawElement {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    typeof value.version === 'number'
  );
}

function isBinaryFileData(value: unknown): value is BinaryFileData {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.dataURL === 'string' &&
    typeof value.mimeType === 'string'
  );
}

function serialiseAppState(appState: unknown): Partial<AppState> {
  if (!isRecord(appState)) {
    return {};
  }

  const { collaborators, ...rest } = appState;
  void collaborators;

  return Object.fromEntries(
    Object.entries(rest).filter(
      ([, value]) => value !== undefined && typeof value !== 'function'
    )
  ) as Partial<AppState>;
}

function serialiseFiles(files: unknown): Record<string, BinaryFileData> {
  if (!isRecord(files)) {
    return {};
  }

  const entries = Object.entries(files).filter((entry): entry is [string, BinaryFileData] =>
    isBinaryFileData(entry[1])
  );

  return Object.fromEntries(entries);
}

function parseCanvasData(value?: string | null): CanvasData | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed)) {
      return {
        elements: [],
        appState: {},
        files: {}
      };
    }

    const rawElements = parsed.elements;
    const elements = Array.isArray(rawElements)
      ? (rawElements.filter(isExcalidrawElement) as readonly ExcalidrawElement[])
      : [];

    return {
      elements,
      appState: serialiseAppState(parsed.appState),
      files: serialiseFiles(parsed.files)
    };
  } catch (error) {
    console.warn('Failed to parse canvas JSON content', error);
    return null;
  }
}

type CanvasData = {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: Record<string, BinaryFileData>;
};

function cloneCanvasForInitialData(canvas?: CanvasData | null): ExcalidrawInitialDataState | undefined {
  if (!canvas) return undefined;
  const elements = canvas.elements.map((element) => ({ ...element }));
  const appState: Partial<AppState> = {
    ...canvas.appState,
    viewBackgroundColor: 'rgb(2 6 23 / 1)'
  };
  const files = Object.fromEntries(
    Object.entries(canvas.files).map(([key, value]) => [key, { ...value }])
  );

  return {
    elements,
    appState,
    files
  };
}

function snapshotCanvasData(canvas?: CanvasData | null): string {
  if (!canvas) return '';
  return JSON.stringify({
    elements: canvas.elements,
    appState: canvas.appState,
    files: canvas.files
  });
}

type PageState = {
  title: string;
  contentHtml: string;
  contentText: string;
  contentJson?: JSONContent;
  canvasData: CanvasData | null;
};

const defaultPageState: PageState = {
  title: '',
  contentHtml: '',
  contentText: '',
  contentJson: undefined,
  canvasData: {
    elements: [],
    appState: { viewBackgroundColor: 'rgb(2 6 23 / 1)' },
    files: {}
  }
};

const EMPTY_PAGE_QUERY_KEY = ['page', 'empty'] as const;
const AUTO_SAVE_STORAGE_KEY = 'devnote:auto-save-enabled';

export function EditorPanel(): JSX.Element {
  const queryClient = useQueryClient();
  const { pageId } = useSelectionStore();
  const [pageState, setPageState] = useState<PageState>(defaultPageState);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = window.localStorage.getItem(AUTO_SAVE_STORAGE_KEY);
      if (stored === null) {
        window.localStorage.setItem(AUTO_SAVE_STORAGE_KEY, 'true');
        return true;
      }
      return stored === 'true';
    } catch {
      return true;
    }
  });
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTitleRef = useRef<string>(defaultPageState.title);
  const latestContentRef = useRef<{ html: string; text: string; json?: JSONContent }>({
    html: defaultPageState.contentHtml,
    text: defaultPageState.contentText,
    json: defaultPageState.contentJson
  });
  const lastJsonHashRef = useRef<string>('');
  const latestCanvasRef = useRef<CanvasData | null>(defaultPageState.canvasData);
  const initialCanvasDataRef = useRef<ExcalidrawInitialDataState | undefined>(undefined);
  const lastCanvasSnapshotRef = useRef<string>('');
  const surfacePreferencesRef = useRef<Record<string, 'document' | 'canvas'>>({});
  const activePageIdRef = useRef<string | null>(null);
  const autoSaveEnabledRef = useRef(autoSaveEnabled);
  const hasPendingChangesRef = useRef(false);
  const skipAutoSaveEffectRef = useRef(true);
  const [activeSurface, setActiveSurface] = useState<'document' | 'canvas'>('document');
  const enabled = Boolean(pageId);
  const pageQueryKey = pageId ? queryKeys.page(pageId) : EMPTY_PAGE_QUERY_KEY;

  const pageQuery = useQuery<Page>({
    queryKey: pageQueryKey,
    queryFn: () => fetchPage(pageId!),
    enabled
  });

  const updatePageMutation = useMutation<Page, Error, { id: string; input: Parameters<typeof updatePage>[1] }>(
    {
      mutationFn: ({ id, input }) => updatePage(id, input),
      onMutate: () => {
        setSaving(true);
      },
      onSuccess: (page) => {
        queryClient.setQueryData(queryKeys.page(page.id), page);
        // Only invalidate workspace if title or folder changed (which affects navigation)
        // Don't invalidate on content-only updates for better performance
        setSaving(false);
        setLastSavedAt(new Date());
        hasPendingChangesRef.current = false;
        setHasPendingChanges(false);
      },
      onError: () => {
        setSaving(false);
      }
    }
  );

  const clearPendingSave = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  const persistPage = useCallback(
    (options?: { force?: boolean }) => {
      const targetPageId = activePageIdRef.current;
      if (!targetPageId) return;
      if (!options?.force && !hasPendingChangesRef.current) return;
      
      // Skip if another save is in progress (will be saved on next schedule)
      if (updatePageMutation.isPending) return;

      clearPendingSave();
      updatePageMutation.mutate({
        id: targetPageId,
        input: {
          title: latestTitleRef.current,
          content: {
            html: latestContentRef.current.html,
            text: latestContentRef.current.text,
            json: latestContentRef.current.json,
            canvas: latestCanvasRef.current
          }
        }
      });
    },
    [clearPendingSave, updatePageMutation]
  );

  const scheduleSave = useCallback(() => {
    if (!autoSaveEnabledRef.current) return;
    if (!activePageIdRef.current) return;

    clearPendingSave();
    // Increased debounce from 600ms to 1500ms to reduce save frequency
    debounceTimer.current = setTimeout(() => {
      persistPage();
    }, 1500);
  }, [clearPendingSave, persistPage]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          bulletList: {
            keepMarks: true,
            keepAttributes: false,
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: false,
          },
        }),
        Highlight,
        Link.configure({ openOnClick: false }),
        Image.configure({ inline: false }),
        TaskList,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        TaskItem.configure({
          nested: true,
        }),
      ],
      content: '',
      editable: enabled,
      onUpdate({ editor: instance }: { editor: Editor }) {
        if (!activePageIdRef.current) return;
        const html = instance.getHTML();
        const text = instance.state.doc.textContent;
        const json = instance.getJSON();

        // Use hash for faster comparison instead of deep JSON stringify
        const jsonHash = simpleHash(json);
        const prev = latestContentRef.current;
        const isSame =
          prev.html === html &&
          prev.text === text &&
          lastJsonHashRef.current === jsonHash;
        
        if (isSame) return;

        lastJsonHashRef.current = jsonHash;
        latestContentRef.current = { html, text, json };
        setPageState((prev) => ({
          ...prev,
          contentHtml: html,
          contentText: text,
          contentJson: json
        }));
        hasPendingChangesRef.current = true;
        setHasPendingChanges(true);
        scheduleSave();
      }
    },
    [pageId]
  );

  // initial auto-save state is read synchronously in the useState initializer above

  useEffect(() => {
    if (skipAutoSaveEffectRef.current) {
      skipAutoSaveEffectRef.current = false;
      autoSaveEnabledRef.current = autoSaveEnabled;
      return;
    }

    autoSaveEnabledRef.current = autoSaveEnabled;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(AUTO_SAVE_STORAGE_KEY, autoSaveEnabled ? 'true' : 'false');
      } catch {
        // ignore
      }
    }

    if (!autoSaveEnabled) {
      clearPendingSave();
    } else if (hasPendingChangesRef.current) {
      scheduleSave();
    }
  }, [autoSaveEnabled, clearPendingSave, scheduleSave]);

  useEffect(() => {
    if (!pageQuery.data) return;
    const page = pageQuery.data;
    const content = page.content?.[0]; // Take the first content item
    
    // Debug logging
    console.log('[EditorPanel] Loading page:', page.id);
    console.log('[EditorPanel] Content array:', page.content);
    console.log('[EditorPanel] First content item:', content);
    
    const html = content?.html ?? '<p></p>';
    const text = content?.text ?? page.title ?? '';
    const json = parseJsonContent(content?.json ?? undefined);
    const canvas = parseCanvasData(content?.canvasJson);
    
    console.log('[EditorPanel] Parsed - html:', html?.substring(0, 100));
    console.log('[EditorPanel] Parsed - text:', text?.substring(0, 100));
    console.log('[EditorPanel] Parsed - json:', json);

    setPageState({
      title: page.title,
      contentHtml: html,
      contentText: text,
      contentJson: json,
      canvasData: canvas
    });
    latestContentRef.current = { html, text, json };
    latestCanvasRef.current = canvas;
    latestTitleRef.current = page.title;
    initialCanvasDataRef.current = cloneCanvasForInitialData(canvas);
    lastCanvasSnapshotRef.current = snapshotCanvasData(canvas);
  clearPendingSave();
    activePageIdRef.current = page.id;
    hasPendingChangesRef.current = false;
    setHasPendingChanges(false);
    const preferredSurface =
      surfacePreferencesRef.current[page.id] ??
      (
      (text && text.length > 0) || (canvas?.elements && canvas.elements.length <= 0)
        ? 'document'
        : 'canvas');
    surfacePreferencesRef.current[page.id] = preferredSurface;
    setActiveSurface(preferredSurface);
    
    console.log('[EditorPanel] Setting surface to:', preferredSurface);
    console.log('[EditorPanel] Editor instance:', editor);

    if (editor) {
      if (json) {
        console.log('[EditorPanel] Setting JSON content');
        editor.commands.setContent(json, false);
      } else {
        console.log('[EditorPanel] Setting HTML content');
        editor.commands.setContent(html, false);
      }
      console.log('[EditorPanel] Content set successfully');
    } else {
      console.warn('[EditorPanel] Editor not initialized yet!');
    }
  }, [pageQuery.data, editor, clearPendingSave]);

  useEffect(() => {
    latestTitleRef.current = pageState.title;
  }, [pageState.title]);

  useEffect(() => {
    if (!pageId) {
      setActiveSurface('document');
    }
  }, [pageId]);

  useEffect(() => {
    if (!pageId) {
      activePageIdRef.current = null;
      clearPendingSave();
    } else if (activePageIdRef.current !== pageId) {
      activePageIdRef.current = null;
      clearPendingSave();
    }
  }, [pageId, clearPendingSave]);

  useEffect(() => {
    if (!enabled) {
      clearPendingSave();
      if (editor) {
        editor.commands.clearContent();
      }
      latestContentRef.current = {
        html: defaultPageState.contentHtml,
        text: defaultPageState.contentText,
        json: defaultPageState.contentJson
      };
      latestCanvasRef.current = defaultPageState.canvasData;
      initialCanvasDataRef.current = cloneCanvasForInitialData(defaultPageState.canvasData);
      lastCanvasSnapshotRef.current = snapshotCanvasData(defaultPageState.canvasData);
      setPageState(defaultPageState);
      activePageIdRef.current = null;
      hasPendingChangesRef.current = false;
      setHasPendingChanges(false);
    }
  }, [enabled, editor, clearPendingSave]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(enabled);
    }
  }, [editor, enabled]);

  useEffect(() => {
    return () => {
      clearPendingSave();
    };
  }, [clearPendingSave]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Save (Ctrl+S / Cmd+S)
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (!activePageIdRef.current) return;
        persistPage({ force: true });
      }
      // List indent (Ctrl+])
      if ((event.ctrlKey || event.metaKey) && event.key === ']') {
        if (editor && editor.isActive('bulletList') || editor && editor.isActive('orderedList')) {
          event.preventDefault();
          editor.chain().focus().sinkListItem('listItem').run();
        }
      }
      // List outdent (Ctrl+[)
      if (editor && (event.ctrlKey || event.metaKey) && event.key === '[') {
        if (editor && editor.isActive('bulletList') || editor.isActive('orderedList')) {
          event.preventDefault();
          editor.chain().focus().liftListItem('listItem').run();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [persistPage, editor]);

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!activePageIdRef.current) return;
    const value = event.target.value;
    const previousTitle = latestTitleRef.current;
    latestTitleRef.current = value;
    setPageState((prev) => ({ ...prev, title: value }));
    hasPendingChangesRef.current = true;
    setHasPendingChanges(true);
    
    // Store if title changed for workspace invalidation later
    if (previousTitle !== value) {
      (window as { __titleChanged?: boolean }).__titleChanged = true;
    }
    
    scheduleSave();
  };

  const handleTitleBlur = () => {
    if (!autoSaveEnabledRef.current) return;
    
    // If title changed, invalidate workspace after save
    if ((window as { __titleChanged?: boolean }).__titleChanged) {
      persistPage();
      // Invalidate workspace to update navigation
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace });
      (window as { __titleChanged?: boolean }).__titleChanged = false;
    } else {
      persistPage();
    }
  };

  const handleToggleAutoSave = () => {
    setAutoSaveEnabled((prev) => !prev);
  };

  const handleSurfaceChange = (surface: 'document' | 'canvas') => {
    const currentPageId = activePageIdRef.current;
    if (currentPageId) {
      surfacePreferencesRef.current[currentPageId] = surface;
    }

    if (surface === 'canvas') {
      initialCanvasDataRef.current = cloneCanvasForInitialData(latestCanvasRef.current);
    }

    setActiveSurface(surface);
    if (surface === 'document' && editor) {
      editor.commands.focus();
    }
    // If switching to the document surface, make sure any pending canvas changes
    // (including clearing the canvas) are persisted immediately so a reload
    // doesn't restore the old canvas state from the server.
    if (surface === 'document') {
      // If the latest canvas appears empty, ensure we persist an empty canvas
      // representation to the server. This avoids the server returning an
      // older non-empty canvas on reload.
      const latestCanvas = latestCanvasRef.current;
      const isCanvasEmpty = !latestCanvas || (Array.isArray(latestCanvas.elements) && latestCanvas.elements.length === 0);
      if (isCanvasEmpty) {
        // normalize to the default empty canvas representation
        latestCanvasRef.current = defaultPageState.canvasData;
        lastCanvasSnapshotRef.current = snapshotCanvasData(defaultPageState.canvasData);
        hasPendingChangesRef.current = true;
        setHasPendingChanges(true);
        persistPage({ force: true });
      } else if (hasPendingChangesRef.current) {
        // non-empty but changed: persist current changes
        persistPage({ force: true });
      }
    }
  };

  const handleCanvasChange = (elements: unknown, appState: unknown, files: unknown) => {
    if (!activePageIdRef.current) return;
    const resolvedElements = Array.isArray(elements)
      ? (elements.filter(isExcalidrawElement) as readonly ExcalidrawElement[])
      : [];
    const canvasData: CanvasData = {
      elements: resolvedElements,
      appState: serialiseAppState(appState),
      files: serialiseFiles(files)
    };
    const snapshot = snapshotCanvasData(canvasData);
    if (snapshot === lastCanvasSnapshotRef.current) {
      return;
    }

    lastCanvasSnapshotRef.current = snapshot;
    initialCanvasDataRef.current = cloneCanvasForInitialData(canvasData);
    latestCanvasRef.current = canvasData;
    setPageState((prev) => ({ ...prev, canvasData }));
    hasPendingChangesRef.current = true;
    setHasPendingChanges(true);
    scheduleSave();
  };

  const pageLocationLabel = useMemo(() => {
    if (!pageQuery.data) return undefined;
    const folder = pageQuery.data.folder;
    if (folder) return truncateText(folder.title, 30);
    return 'Root workspace';
  }, [pageQuery.data]);

  const statusText = useMemo(() => {
    if (!enabled) return 'No page selected';
    if (!autoSaveEnabled) {
      if (saving) return 'Saving…';
      if (hasPendingChanges) return 'Unsaved changes · Ctrl+S';
      if(!lastSavedAt) return 'No changes yet';
      return `Saved ${lastSavedAt.toLocaleTimeString()}`;
    }
    if (saving) return 'Saving…';
    if (hasPendingChanges) return 'Pending auto-save…';
    if (lastSavedAt) return `Saved ${lastSavedAt.toLocaleTimeString()}`;
    return 'All changes saved';
  }, [autoSaveEnabled, enabled, hasPendingChanges, lastSavedAt, saving]);

  let body: ReactNode = null;

  if (!pageId) {
    body = (
      <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
        <p className="text-lg font-semibold">Select or create a page to start building</p>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Use the workspace tree to choose a folder or the root, then add a page. Switch between the
          Document and Canvas modes to type notes, sketch diagrams, and drop shapes anywhere.
        </p>
      </div>
    );
  } else if (pageQuery.isLoading || !pageQuery.data || !editor) {
    body = (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading page…
      </div>
    );
  } else {
    body = (
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-4 border-b border-slate-800 bg-slate-900/80 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="w-full md:max-w-xl">
            {pageLocationLabel && (
              <p className="text-xs uppercase tracking-wide text-slate-500">{pageLocationLabel}</p>
            )}
            <input
              className="mt-1 w-full bg-transparent text-xl font-semibold text-slate-100 outline-none focus:ring-0 sm:text-2xl"
              value={pageState.title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              placeholder="Untitled page"
            />
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end md:gap-4">
            <div className="flex rounded-md bg-slate-800 p-0.5 text-xs shadow">
              <button
                type="button"
                onClick={() => handleSurfaceChange('document')}
                className={`rounded px-2 py-1 font-medium transition ${
                  activeSurface === 'document'
                    ? 'bg-slate-200 text-slate-900'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                Document
              </button>
              <button
                type="button"
                onClick={() => handleSurfaceChange('canvas')}
                className={`rounded px-2 py-1 font-medium transition ${
                  activeSurface === 'canvas'
                    ? 'bg-slate-200 text-slate-900'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                Canvas
              </button>
            </div>
            <button
              type="button"
              onClick={handleToggleAutoSave}
              aria-pressed={autoSaveEnabled}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                autoSaveEnabled
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span
                className={`relative inline-flex h-4 w-8 items-center rounded-full ${
                  autoSaveEnabled ? 'bg-emerald-500/70' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform transform ${
                    autoSaveEnabled ? 'translate-x-4' : 'translate-x-1'
                  }`}
                />
              </span>
              {autoSaveEnabled ? 'Auto-save on' : 'Auto-save off'}
            </button>
            <div className="text-xs text-slate-500 md:text-right">{statusText}</div>
          </div>
        </div>
        {activeSurface === 'document' ? (
          <>
            <Toolbar editor={editor} pageTitle={pageState.title} />
            <div className="flex-1 overflow-auto px-6 pb-24 pt-6" style={{ maxHeight: "76vh"}}>
              <EditorContent editor={editor} className="prose prose-invert max-w-none" />
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0">
            <Excalidraw
              key={pageId}
              initialData={initialCanvasDataRef.current}
              onChange={(elements, appState, files) => handleCanvasChange(elements, appState, files)}
              theme="light"
              viewModeEnabled={!enabled}
              UIOptions={{
                canvasActions: {
                  changeViewBackgroundColor: false,
                  loadScene: false,
                  toggleTheme: false
                }
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return <section className="flex flex-1 flex-col bg-slate-950">{body}</section>;
}
