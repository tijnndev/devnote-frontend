/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useEffect, useRef, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
const SHORTCUTS = [
  { label: 'Bold', keys: 'Ctrl+B' },
  { label: 'Italic', keys: 'Ctrl+I' },
  { label: 'Strikethrough', keys: 'Ctrl+Shift+S' },
  { label: 'Heading', keys: 'Ctrl+Alt+2' },
  { label: 'Bullet List', keys: 'Ctrl+Shift+8' },
  { label: 'Ordered List', keys: 'Ctrl+Shift+7' },
  { label: 'Blockquote', keys: 'Ctrl+Shift+9' },
  { label: 'Highlight', keys: 'Ctrl+Shift+H' },
  { label: 'Undo', keys: 'Ctrl+Z' },
  { label: 'Redo', keys: 'Ctrl+Y' },
  { label: 'Indent List', keys: 'Ctrl+]' },
  { label: 'Outdent List', keys: 'Ctrl+[' },
  { label: 'Show Shortcuts', keys: 'Ctrl+/' },
  { label: 'Export', keys: '' },
];

// All logic and the Toolbar function body should follow here, not above.

export function Toolbar({ editor, onRecordRevision, pageTitle }: ToolbarProps) {
  // ...existing hooks and logic...

  // controls array and all editor logic should only be inside the Toolbar function body, not at the top level.

  // ...rest of Toolbar function...
}
import { jsPDF } from 'jspdf';
import type { Editor } from '@tiptap/react';
import '@tiptap/extension-highlight';
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  ListTree,
  ListOrdered,
  ];
  import { jsPDF } from 'jspdf';
  import type { Editor } from '@tiptap/react';
  import '@tiptap/extension-highlight';
  import {
    Bold,
    Italic,
    Strikethrough,
    Heading2,
    ListTree,
    ListOrdered,
    Quote,
    Highlighter,
    Undo2,
    Redo2,
    FileDown,
    Loader2
  } from 'lucide-react';
      active: editor.isActive('bold'),
      shortcut: 'Ctrl+B',
    },
    {
      label: 'Italic',
      icon: <Italic className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive('italic'),
      shortcut: 'Ctrl+I',
    },
    {
      label: 'Strike',
      icon: <Strikethrough className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive('strike'),
      shortcut: 'Ctrl+Shift+S',
    },
    {
      label: 'Heading',
      icon: <Heading2 className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive('heading', { level: 2 }),
      shortcut: 'Ctrl+Alt+2',
    },
    {
      label: 'Bullet List',
      icon: <ListTree className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList'),
      shortcut: 'Ctrl+Shift+8',
    },
    {
      label: 'Ordered List',
      icon: <ListOrdered className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList'),
      shortcut: 'Ctrl+Shift+7',
    },
    {
      label: 'Blockquote',
      icon: <Quote className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive('blockquote'),
      shortcut: 'Ctrl+Shift+9',
    },
    {
      label: 'Highlight',
      icon: <Highlighter className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleHighlight().run(),
      active: editor.isActive('highlight'),
      shortcut: 'Ctrl+Shift+H',
    }
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/70 px-3 py-2 md:flex-nowrap">
        <div className="flex items-center gap-1">
          <Tooltip.Root delayDuration={200}><Tooltip.Trigger asChild>
            <button
              type="button"
              className={toolbarButton}
              onClick={() => editor.chain().focus().undo().run()}
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content side="bottom" className="z-50 rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 shadow">
            Undo <span className="ml-2 text-slate-400">Ctrl+Z</span>
          </Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root delayDuration={200}><Tooltip.Trigger asChild>
            <button
              type="button"
              className={toolbarButton}
              onClick={() => editor.chain().focus().redo().run()}
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content side="bottom" className="z-50 rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 shadow">
            Redo <span className="ml-2 text-slate-400">Ctrl+Y</span>
          </Tooltip.Content>
          </Tooltip.Root>
        </div>
        <div className="hidden h-6 w-px bg-slate-800 sm:block" />
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {controls.map((control) => (
            <Tooltip.Root key={control.label} delayDuration={200}>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  aria-label={control.label}
                  aria-pressed={control.active}
                  className={`${toolbarButton} ${control.active ? 'bg-slate-800' : ''}`}
                  onClick={control.action}
                >
                  {control.icon}
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom" className="z-50 rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 shadow">
                {control.label}
                {control.shortcut && (
                  <span className="ml-2 text-slate-400">{control.shortcut}</span>
                )}
              </Tooltip.Content>
            </Tooltip.Root>
          ))}
          <div className="ml-2 hidden flex-col items-start justify-center lg:flex">
            <span className="text-[10px] text-slate-500 select-none">
              Indent/outdent list: <kbd className="px-1">Ctrl+[</kbd> / <kbd className="px-1">Ctrl+]</kbd>
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:ml-0 sm:gap-3 md:ml-auto">
          <div className="relative" ref={exportMenuRef}>
            <Tooltip.Root delayDuration={200}>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-200 transition hover:bg-slate-700"
                  onClick={() => setExportMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={exportMenuOpen}
                  disabled={Boolean(exportingFormat)}
                >
                  {exportingFormat ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  Export
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom" className="z-50 rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 shadow">
                Export note
              </Tooltip.Content>
            </Tooltip.Root>
            {exportMenuOpen && !exportingFormat && (
              <div className="absolute right-0 z-20 mt-2 w-36 overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-lg">
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-800"
                >
                  PDF
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">.pdf</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('txt')}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-800"
                >
                  Text
                  <span className="text-[10px] uppercase tracking-wide text-slate-500">.txt</span>
                </button>
              </div>
            )}
          </div>
          {onRecordRevision && (
            <Tooltip.Root delayDuration={200}>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  onClick={onRecordRevision}
                  className="rounded-md bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-200 hover:bg-slate-700"
                >
                  Save snapshot
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom" className="z-50 rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 shadow">
                Save a snapshot of this note
              </Tooltip.Content>
            </Tooltip.Root>
          )}
          <Tooltip.Root delayDuration={200}>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                className="ml-2 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
                onClick={() => setShowShortcuts(true)}
                aria-label="Show shortcuts"
              >
                <span>?</span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" className="z-50 rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 shadow">
              Show keyboard shortcuts <span className="ml-2 text-slate-400">Ctrl+/</span>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
      </div>
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-lg bg-slate-900 p-6 shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100">Keyboard Shortcuts</h2>
              <button className="text-slate-400 hover:text-slate-200" onClick={() => setShowShortcuts(false)}>&times;</button>
            </div>
            <ul className="space-y-2">
              {SHORTCUTS.map((s) => (
                <li key={s.label} className="flex items-center justify-between text-slate-200">
                  <span>{s.label}</span>
                  <span className="ml-4 font-mono text-xs text-slate-400">{s.keys}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 text-right">
              <button className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-600" onClick={() => setShowShortcuts(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
