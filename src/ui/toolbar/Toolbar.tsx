/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useEffect, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import type { Editor } from '@tiptap/react';
import '@tiptap/extension-highlight';
import {
  Bold,
  FileDown,
  Heading2,
  Highlighter,
  Italic,
  ListOrdered,
  ListTree,
  Loader2,
  Quote,
  Redo2,
  Strikethrough,
  Undo2
} from 'lucide-react';

const toolbarButton =
  'flex h-9 w-9 items-center justify-center rounded-md text-slate-200 hover:bg-slate-800 aria-pressed:bg-slate-700';

type ToolbarProps = {
  editor: Editor | null;
  pageTitle?: string;
  onRecordRevision?: () => void;
};

export function Toolbar({ editor, onRecordRevision, pageTitle }: ToolbarProps) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'txt' | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!exportMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!exportMenuRef.current) return;
      if (!exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [exportMenuOpen]);

  const getFileBaseName = () => {
    const fallback = pageTitle?.trim() || 'Untitled note';
    const normalised = fallback
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');
    return normalised || 'note';
  };

  const downloadBlob = (data: BlobPart, type: string, filename: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: 'pdf' | 'txt') => {
    if (!editor) return;
    setExportMenuOpen(false);
    setExportingFormat(format);

    const titleLine = pageTitle?.trim() || 'Untitled note';
    const baseName = getFileBaseName();
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${baseName}-${timestamp}.${format}`;

    try {
      if (format === 'txt') {
        const textContent = editor.getText();
        const exportText = `${textContent}`.trimEnd() || `${titleLine}\n`;
        downloadBlob(exportText, 'text/plain;charset=utf-8', filename);
        return;
      }

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 48;
      const maxLineWidth = pageWidth - margin * 2;
      const textContent = editor.getText().trim() || '(No content)';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(titleLine, margin, margin);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(textContent, maxLineWidth);
      doc.text(lines, margin, margin + 28);

      doc.save(filename);
    } catch (error) {
      console.error('Failed to export note', error);
    } finally {
      setExportingFormat(null);
    }
  };

  if (!editor) {
    return null;
  }

  const controls = [
    {
      label: 'Bold',
      icon: <Bold className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive('bold')
    },
    {
      label: 'Italic',
      icon: <Italic className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive('italic')
    },
    {
      label: 'Strike',
      icon: <Strikethrough className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive('strike')
    },
    {
      label: 'Heading',
      icon: <Heading2 className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive('heading', { level: 2 })
    },
    {
      label: 'Bullet List',
      icon: <ListTree className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList')
    },
    {
      label: 'Ordered List',
      icon: <ListOrdered className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList')
    },
    {
      label: 'Blockquote',
      icon: <Quote className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive('blockquote')
    },
    {
      label: 'Highlight',
      icon: <Highlighter className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleHighlight().run(),
      active: editor.isActive('highlight')
    }
  ];

  return (
    <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/70 px-3 py-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={toolbarButton}
          onClick={() => editor.chain().focus().undo().run()}
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarButton}
          onClick={() => editor.chain().focus().redo().run()}
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>
      <div className="h-6 w-px bg-slate-800" />
      <div className="flex items-center gap-1">
        {controls.map((control) => (
          <button
            key={control.label}
            type="button"
            aria-label={control.label}
            aria-pressed={control.active}
            className={`${toolbarButton} ${control.active ? 'bg-slate-800' : ''}`}
            onClick={control.action}
          >
            {control.icon}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative" ref={exportMenuRef}>
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
          <button
            type="button"
            onClick={onRecordRevision}
            className="rounded-md bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-200 hover:bg-slate-700"
          >
            Save snapshot
          </button>
        )}
      </div>
    </div>
  );
}
