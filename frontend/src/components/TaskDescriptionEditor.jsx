
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
        const titleHtml = `<h1>${title || ''}</h1>`;
        // If initialContent is empty, just title
        // If initialContent exists, append it
        return titleHtml + (initialContent || '<p></p>');
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
                    newTitle = firstNode.content.map(c => c.text).join('');
                } else {
                    // Empty title
                    newTitle = '';
                }

                // Rest is Description
                // We need to convert the rest of the nodes back to HTML
                // This is a bit tricky without a serializer instance, but we can assume the editor can do it if we slice?
                // Actually, easier to get HTML then perform regex? No, risky.
                // Best way: Use editor.view.state to serialize a slice?
                // Or just: Remove first node from JSON and stringify?
                // But we need HTML specifically for the backend 'description' field.

                // Let's try to reconstruct HTML from the remaining JSON nodes?
                // Or simpler: Just save the raw HTML of everything AFTER the first closing tag of the first element?
                // No, that's brittle.

                // Better approach for stability: 
                // Don't modify the data model yet. Just keep the title in the editor as a visual.
                // But the user expects the title to update.

                // Let's use the JSON approach since Tiptap is good at it.
                // But we need to return HTML for description.
                // We can clone the editor content, delete range 0..firstNodeSize, then getHTML()?
                // Too heavy.

                // Hacky but effective: 
                // Get full HTML. 
                // Regex replace the first Header? <h1>...</h1>
                // <h1 ...>Title</h1>Description...
                const html = editor.getHTML();
                const match = html.match(/^<h1.*?>(.*?)<\/h1>(.*)/s);
                let newDescription = '';
                if (match) {
                    // match[1] is title html (might contain inner tags if user bolded title), match[2] is rest
                    // But we want plain text for Title.
                    // So rely on JSON for Title.
                    newDescription = match[2];
                } else {
                    // Fallback if user deleted H1 or changed it to P
                    // If no H1, maybe the first paragraph is title? 
                    // Let's stick to JSON for title extraction, and maybe html for description removal.
                    // Actually, if the structure changes (user deleted H1), we accept "Untitled" or first line?
                    // Let's relax: Title = firstNode.text. Description = full HTML.
                    // But then we duplicate title in description view.

                    // Okay, let's use a temporary DOM parser
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    const firstEl = tempDiv.firstElementChild;
                    if (firstEl) {
                        tempDiv.removeChild(firstEl);
                        newDescription = tempDiv.innerHTML;
                    } else {
                        newDescription = '';
                    }
                }

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
