import type { Editor } from '@tiptap/react';
import '@tiptap/extension-highlight';
import {
  Bold,
  Heading2,
  Highlighter,
  Italic,
  ListOrdered,
  ListTree,
  Quote,
  Redo2,
  Strikethrough,
  Undo2
} from 'lucide-react';

const toolbarButton =
  'flex h-9 w-9 items-center justify-center rounded-md text-slate-200 hover:bg-slate-800 aria-pressed:bg-slate-700';

type ToolbarProps = {
  editor: Editor | null;
  onRecordRevision?: () => void;
};

export function Toolbar({ editor, onRecordRevision }: ToolbarProps) {
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
