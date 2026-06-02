import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckSquare, Square, X, Loader2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

import { fetchTodos } from '../../api/notes';
import type { PageTodos } from '../../api/types';
import { queryKeys } from '../../lib/queryKeys';
import { useSelectionStore } from '../../store/selection';

type Props = {
  onClose: () => void;
  onSelectPage: (folderId: string | null, pageId: string) => void;
};

type Filter = 'all' | 'unchecked' | 'checked';

function groupByFolder(pages: PageTodos[]): Map<string | null, PageTodos[]> {
  const map = new Map<string | null, PageTodos[]>();
  for (const page of pages) {
    const key = page.folderId;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(page);
  }
  return map;
}

export function TodoPanel({ onClose, onSelectPage }: Props) {
  const { pageId: selectedPageId } = useSelectionStore();
  const [filter, setFilter] = useState<Filter>('unchecked');

  const todosQuery = useQuery({
    queryKey: queryKeys.todos,
    queryFn: fetchTodos,
    staleTime: 30_000,
  });

  const filteredPages = useMemo(() => {
    if (!todosQuery.data) return [];
    return todosQuery.data
      .map((page) => ({
        ...page,
        todos: page.todos.filter((t) => {
          if (filter === 'unchecked') return !t.checked;
          if (filter === 'checked') return t.checked;
          return true;
        }),
      }))
      .filter((page) => page.todos.length > 0);
  }, [todosQuery.data, filter]);

  const grouped = useMemo(() => groupByFolder(filteredPages), [filteredPages]);

  const totalUnchecked = useMemo(
    () =>
      todosQuery.data?.reduce(
        (sum, p) => sum + p.todos.filter((t) => !t.checked).length,
        0
      ) ?? 0,
    [todosQuery.data]
  );

  // Sort groups: null (root) last, others alphabetically
  const sortedGroups = useMemo(() => {
    const entries = [...grouped.entries()];
    return entries.sort(([aKey, aPages], [bKey, bPages]) => {
      if (aKey === null) return 1;
      if (bKey === null) return -1;
      const aTitle = aPages[0]?.folderTitle ?? '';
      const bTitle = bPages[0]?.folderTitle ?? '';
      return aTitle.localeCompare(bTitle, undefined, { sensitivity: 'base' });
    });
  }, [grouped]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 backdrop-blur-sm pt-16 px-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[75vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-100">Todo Overview</h2>
            {totalUnchecked > 0 && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
                {totalUnchecked} open
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void todosQuery.refetch()}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Refresh"
              disabled={todosQuery.isFetching}
            >
              <RefreshCw className={clsx('h-3.5 w-3.5', todosQuery.isFetching && 'animate-spin')} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-2">
          {(['unchecked', 'all', 'checked'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={clsx(
                'rounded px-2 py-1 text-xs font-medium capitalize transition',
                filter === f
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              )}
            >
              {f === 'unchecked' ? 'Open' : f === 'checked' ? 'Done' : 'All'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {todosQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading todos…
            </div>
          ) : todosQuery.isError ? (
            <div className="py-8 text-center text-sm text-red-300">
              Failed to load todos. Try refreshing.
            </div>
          ) : sortedGroups.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              {filter === 'unchecked'
                ? 'No open todos — nice work!'
                : filter === 'checked'
                ? 'No completed todos yet.'
                : 'No task list items found across your notes.'}
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {sortedGroups.map(([folderId, pages]) => {
                const folderTitle = pages[0]?.folderTitle ?? null;
                return (
                  <div key={folderId ?? '__root__'}>
                    <p className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                      {folderTitle ?? 'Root workspace'}
                    </p>
                    <div className="space-y-2">
                      {pages.map((page) => (
                        <div
                          key={page.pageId}
                          className={clsx(
                            'rounded-lg border border-slate-800 bg-slate-900/60',
                            selectedPageId === page.pageId && 'border-slate-600'
                          )}
                        >
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/60 rounded-t-lg transition"
                            onClick={() => onSelectPage(page.folderId, page.pageId)}
                          >
                            <span className="flex-1 truncate text-sm font-medium text-slate-200">
                              {page.pageTitle}
                            </span>
                            <span className="shrink-0 text-[0.65rem] text-slate-500">
                              {page.todos.filter((t) => !t.checked).length} open ·{' '}
                              {page.todos.length} total
                            </span>
                          </button>
                          <ul className="border-t border-slate-800 px-3 py-1.5 space-y-1">
                            {page.todos.map((todo, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 py-0.5"
                              >
                                {todo.checked ? (
                                  <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                ) : (
                                  <Square className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                                )}
                                <span
                                  className={clsx(
                                    'text-xs leading-relaxed',
                                    todo.checked
                                      ? 'text-slate-500 line-through'
                                      : 'text-slate-300'
                                  )}
                                >
                                  {todo.text || '(empty)'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
