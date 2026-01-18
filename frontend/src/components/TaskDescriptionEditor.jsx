
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Unlink } from 'lucide-react';
import { useEffect } from 'react';

const MenuBar = ({ editor }) => {
    if (!editor) {
        return null;
    }

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        if (url === null) {
            return;
        }

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <div className="flex items-center gap-1 border-b border-[var(--border)] p-1 mb-2">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={`p-1 rounded hover:bg-[var(--bg-hover)] transition-colors ${editor.isActive('bold') ? 'bg-[var(--bg-hover)] text-blue-500' : 'text-[var(--text-muted)]'}`}
                title="Bold"
            >
                <Bold size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={`p-1 rounded hover:bg-[var(--bg-hover)] transition-colors ${editor.isActive('italic') ? 'bg-[var(--bg-hover)] text-blue-500' : 'text-[var(--text-muted)]'}`}
                title="Italic"
            >
                <Italic size={14} />
            </button>
            <div className="w-px h-4 bg-[var(--border)] mx-1" />
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1 rounded hover:bg-[var(--bg-hover)] transition-colors ${editor.isActive('bulletList') ? 'bg-[var(--bg-hover)] text-blue-500' : 'text-[var(--text-muted)]'}`}
                title="Bullet List"
            >
                <List size={14} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1 rounded hover:bg-[var(--bg-hover)] transition-colors ${editor.isActive('orderedList') ? 'bg-[var(--bg-hover)] text-blue-500' : 'text-[var(--text-muted)]'}`}
                title="Ordered List"
            >
                <ListOrdered size={14} />
            </button>
            <div className="w-px h-4 bg-[var(--border)] mx-1" />
            <button
                onClick={setLink}
                className={`p-1 rounded hover:bg-[var(--bg-hover)] transition-colors ${editor.isActive('link') ? 'bg-[var(--bg-hover)] text-blue-500' : 'text-[var(--text-muted)]'}`}
                title="Link"
            >
                <LinkIcon size={14} />
            </button>
            {editor.isActive('link') && (
                <button
                    onClick={() => editor.chain().focus().unsetLink().run()}
                    className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-muted)]"
                    title="Unlink"
                >
                    <Unlink size={14} />
                </button>
            )}
        </div>
    );
};

export const TaskDescriptionEditor = ({ initialContent, onSave, isEditable = true }) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-500 hover:underline cursor-pointer',
                },
            }),
            Placeholder.configure({
                placeholder: 'Add a description...',
                emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-[var(--text-muted)] before:float-left before:pointer-events-none before:h-0',
            })
        ],
        content: initialContent || '',
        editable: isEditable,
        editorProps: {
            attributes: {
                class: 'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[100px] text-[var(--text-main)]',
            },
        },
        onBlur: ({ editor }) => {
            if (onSave) {
                onSave(editor.getHTML());
            }
        },
    });

    useEffect(() => {
        if (editor && initialContent !== editor.getHTML()) {
            // Only update if content is significantly different to avoid cursor jumps?
            // Actually, for initial load, this is fine. 
            // Ideally we don't want to re-set content every render if we are editing.
            // So we depend on initialContent only mounting or explicit resets.
            // But if parent updates description from elsewhere (unlikely while editing), we might want to sync.
            // For now, let's assume initialContent is stable.
        }
    }, [initialContent, editor]);

    // Safety check if editor is destroyed
    if (!editor) {
        return null;
    }

    return (
        <div className="task-description-editor bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-2">
            {isEditable && <MenuBar editor={editor} />}
            <EditorContent editor={editor} />
        </div>
    );
};
