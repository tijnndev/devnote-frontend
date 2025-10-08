import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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
import { Loader2 } from 'lucide-react';

import { fetchPage, updatePage } from '../../api/notes';
import type { Page } from '../../api/types';
import { queryKeys } from '../../lib/queryKeys';
import { useSelectionStore } from '../../store/selection';
import { Toolbar } from '../toolbar/Toolbar';

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

export function EditorPanel(): JSX.Element {
  const queryClient = useQueryClient();
  const { pageId } = useSelectionStore();
  const [pageState, setPageState] = useState<PageState>(defaultPageState);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTitleRef = useRef<string>(defaultPageState.title);
  const latestContentRef = useRef<{ html: string; text: string; json?: JSONContent }>({
    html: defaultPageState.contentHtml,
    text: defaultPageState.contentText,
    json: defaultPageState.contentJson
  });
  const latestCanvasRef = useRef<CanvasData | null>(defaultPageState.canvasData);
  const initialCanvasDataRef = useRef<ExcalidrawInitialDataState | undefined>(undefined);
  const lastCanvasSnapshotRef = useRef<string>('');
  const surfacePreferencesRef = useRef<Record<string, 'document' | 'canvas'>>({});
  const [activeSurface, setActiveSurface] = useState<'document' | 'canvas'>('document');
  const enabled = Boolean(pageId);
  const pageQueryKey = pageId ? queryKeys.page(pageId) : EMPTY_PAGE_QUERY_KEY;

  const pageQuery = useQuery<Page>({
    queryKey: pageQueryKey,
    queryFn: () => fetchPage(pageId!),
    enabled
  });

  const scheduleSave = () => {
    if (!pageId) return;
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      updatePageMutation.mutate({
        id: pageId,
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
    }, 600);
  };

  const updatePageMutation = useMutation<Page, Error, { id: string; input: Parameters<typeof updatePage>[1] }>({
    mutationFn: ({ id, input }) => updatePage(id, input),
    onMutate: () => {
      setSaving(true);
    },
    onSuccess: (page) => {
  queryClient.setQueryData(queryKeys.page(page.id), page);
  void queryClient.invalidateQueries({ queryKey: queryKeys.workspace });
      setSaving(false);
      setLastSavedAt(new Date());
    },
    onError: () => {
      setSaving(false);
    }
  });

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Highlight,
        Link.configure({ openOnClick: false }),
        Image.configure({ inline: false })
      ],
      content: '',
      editable: enabled,
      onUpdate({ editor: instance }: { editor: Editor }) {
        if (!pageId) return;
        const html = instance.getHTML();
        const text = instance.state.doc.textContent;
        const json = instance.getJSON();

        latestContentRef.current = { html, text, json };
        setPageState((prev) => ({
          ...prev,
          contentHtml: html,
          contentText: text,
          contentJson: json
        }));
        scheduleSave();
      }
    },
    [pageId]
  );

  useEffect(() => {
    if (!pageQuery.data) return;
    const page = pageQuery.data;
    const html = page.content?.html ?? '<p></p>';
    const text = page.content?.text ?? page.title ?? '';
    const json = parseJsonContent(page.content?.json ?? undefined);
    const canvas = parseCanvasData(page.content?.canvasJson);

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

    const preferredSurface =
      surfacePreferencesRef.current[page.id] ?? (canvas?.elements?.length ? 'canvas' : 'document');
    surfacePreferencesRef.current[page.id] = preferredSurface;
    setActiveSurface(preferredSurface);

    if (editor) {
      if (json) {
        editor.commands.setContent(json, false);
      } else {
        editor.commands.setContent(html, false);
      }
    }
  }, [pageQuery.data, editor]);

  useEffect(() => {
    latestTitleRef.current = pageState.title;
  }, [pageState.title]);

  useEffect(() => {
    if (!pageId) {
      setActiveSurface('document');
    }
  }, [pageId]);

  useEffect(() => {
    if (!enabled && editor) {
      editor.commands.clearContent();
      latestContentRef.current = {
        html: defaultPageState.contentHtml,
        text: defaultPageState.contentText,
        json: defaultPageState.contentJson
      };
      latestCanvasRef.current = defaultPageState.canvasData;
      initialCanvasDataRef.current = cloneCanvasForInitialData(defaultPageState.canvasData);
      lastCanvasSnapshotRef.current = snapshotCanvasData(defaultPageState.canvasData);
      setPageState(defaultPageState);
    }
  }, [enabled, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(enabled);
    }
  }, [editor, enabled]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
  const value = event.target.value;
  latestTitleRef.current = value;
  setPageState((prev) => ({ ...prev, title: value }));
  };

  const handleTitleBlur = () => {
    if (!pageId) return;
    updatePageMutation.mutate({
      id: pageId,
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
  };

  const handleSurfaceChange = (surface: 'document' | 'canvas') => {
    if (pageId) {
      surfacePreferencesRef.current[pageId] = surface;
    }

    if (surface === 'canvas') {
      initialCanvasDataRef.current = cloneCanvasForInitialData(latestCanvasRef.current);
    }

    setActiveSurface(surface);
    if (surface === 'document' && editor) {
      editor.commands.focus();
    }
  };

  const handleCanvasChange = (elements: unknown, appState: unknown, files: unknown) => {
    if (!pageId) return;
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
    latestCanvasRef.current = canvasData;
    setPageState((prev) => ({ ...prev, canvasData }));
    scheduleSave();
  };

  const pageLocationLabel = useMemo(() => {
    if (!pageQuery.data) return undefined;
    const folder = pageQuery.data.folder;
    if (folder) return folder.title;
    return 'Root workspace';
  }, [pageQuery.data]);

  const statusText = useMemo(() => {
    if (!enabled) return 'No page selected';
    if (saving) return 'Saving…';
    if (lastSavedAt) return `Saved ${lastSavedAt.toLocaleTimeString()}`;
    return 'All changes saved';
  }, [enabled, saving, lastSavedAt]);

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
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-4">
          <div>
            {pageLocationLabel && (
              <p className="text-xs uppercase tracking-wide text-slate-500">{pageLocationLabel}</p>
            )}
            <input
              className="mt-1 w-full bg-transparent text-2xl font-semibold text-slate-100 outline-none focus:ring-0"
              value={pageState.title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              placeholder="Untitled page"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex rounded-md bg-slate-800 p-0.5 text-xs">
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
            <div className="text-xs text-slate-500">{statusText}</div>
          </div>
        </div>
        {activeSurface === 'document' ? (
          <>
            <Toolbar editor={editor} />
            <div className="flex-1 overflow-auto px-6 pb-24 pt-6">
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
