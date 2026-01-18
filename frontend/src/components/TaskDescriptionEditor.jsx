
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
        <div className="flex items-center gap-1 border-t border-[var(--border)] p-1 mt-2">
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

export const TaskDescriptionEditor = ({ title, initialContent, onSave, isEditable = true }) => {
    // Merge title and content for initial editor state
    // Title becomes the first block (heading)
    const getCombinedContent = () => {
        // [FIX] Convert newlines to <br> for Tiptap to recognize them as HardBreaks in H1
        const titleSafe = (title || '').replace(/\n/g, '<br>');
        const titleHtml = `<h1>${titleSafe}</h1>`;
        let content = initialContent || '<p></p>';

        // [FIX] Detect plain text and convert to HTML to preserve newlines
        // If it doesn't contain HTML tags, treat as plain text
        if (content && !/<[a-z][\s\S]*>/i.test(content)) {
            content = content.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');
        }

        // If initialContent exists, append it
        return titleHtml + content;
    };

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
                placeholder: ({ node }) => {
                    if (node.type.name === 'heading') {
                        return 'Title';
                    }
                    return 'Start writing...';
                },
                emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-[var(--text-muted)] before:float-left before:pointer-events-none before:h-0',
            })
        ],
        content: getCombinedContent(),
        editable: isEditable,
        editorProps: {
            attributes: {
                class: 'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[150px] text-[var(--text-main)] [&>h1]:mt-0 [&>h1]:mb-4',
            },
        },
        onBlur: ({ editor }) => {
            if (onSave) {
                // Parse content to separate Title and Description
                const json = editor.getJSON();
                if (!json.content || json.content.length === 0) {
                    onSave({ title: '', description: '' });
                    return;
                }

                // First node is Title
                const firstNode = json.content[0];
                let newTitle = '';
                if (firstNode.content && firstNode.content.length > 0) {
                    newTitle = firstNode.content.map(c => {
                        if (c.type === 'text') return c.text;
                        if (c.type === 'hardBreak') return '\n';
                        return '';
                    }).join('');
                } else {
                    // Empty title
                    newTitle = '';
                }

                // Extract Description using DOM logic for robustness
                // We want everything AFTER the first element (Title H1)
                const html = editor.getHTML();
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;

                // Remove the first element (which corresponds to the Title H1)
                // Note: Tiptap ensures block structure, so first child is the H1.
                if (tempDiv.firstElementChild) {
                    tempDiv.removeChild(tempDiv.firstElementChild);
                }

                // The rest is the description
                // trim() to remove leading newlines/whitespace caused by the split
                let newDescription = tempDiv.innerHTML.trim();

                // [Case] If description is empty string/br only, clear it?
                // But user might want just a break? Let's keep it as is.

                onSave({ title: newTitle, description: newDescription });
            }
        },
    });

    useEffect(() => {
        // Handle external updates?
        // If we receive new title/content from props while NOT focusing, we might update?
        // But for now, let's just initialize once.
    }, []);

    // Safety check if editor is destroyed
    if (!editor) {
        return null;
    }

    return (
        <div className="task-description-editor bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-4">
            {/* No MenuBar on top, it is below now */}
            <EditorContent editor={editor} />
            {isEditable && <MenuBar editor={editor} />}
        </div>
    );
};
