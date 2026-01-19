
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Unlink, X, Check } from 'lucide-react';
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

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

export const TaskDescriptionEditor = forwardRef(({ title, initialContent, onSave, onCancel, isEditable = true }, ref) => {
    // Merge title and content for initial editor state
    // Title becomes the first block (heading)
    const getCombinedContent = () => {
        // [FIX] Convert newlines to <br> for Tiptap to recognize them as HardBreaks in H1
        const titleSafe = (title || '').replace(/\n/g, '<br>');
        const titleHtml = `<h1>${titleSafe}</h1>`;

        let content = initialContent || '';
        if (!content) return titleHtml + '<p></p>';

        // [FIX] Robust Plain Text Detection using DOMParser
        // If content looks like HTML but parses to only text nodes (no element tags), treat as plain text
        // This handles cases where user types "<something>" which might look like HTML but is text.

        const isLikelyHtml = /<[a-z][\s\S]*>/i.test(content);
        let treatedAsHtml = false;

        if (isLikelyHtml) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, 'text/html');
                // If it has immediate child elements that are not just <br>, treated as HTML
                const childNodes = Array.from(doc.body.childNodes);
                const hasElements = childNodes.some(node => node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR');
                if (hasElements) {
                    treatedAsHtml = true;
                }
            } catch (e) {
                // Fallback to plain text if parsing fails
                treatedAsHtml = false;
            }
        }

        if (!treatedAsHtml) {
            // Convert newlines to paragraphs for Tiptap
            // Preserve leading whitespace by using &nbsp; or css is easier? 
            // We rely on 'whitespace-pre-wrap' css class, but Tiptap parses HTML. 
            // For plain text load, we wrap lines in <p>.
            content = content.split('\n').map(line => {
                // Escape HTML chars to prevent them being interpreted as tags
                const encoded = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return `<p>${encoded || '<br>'}</p>`;
            }).join('');
        }

        // If initialContent exists, append it
        return titleHtml + content;
    };

    const isCancellingRef = useRef(false);

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
                // [FIX] Add whitespace-pre-wrap to preserve leading spaces/multiple spaces
                class: 'prose prose-sm prose-invert max-w-none focus:outline-none text-[var(--text-main)] [&>h1]:mt-0 [&>h1]:mb-4 whitespace-pre-wrap',
            },
            handleKeyDown: (view, event) => {
                if (event.key === 'Escape' || ((event.metaKey || event.ctrlKey) && event.key === '[')) {
                    event.preventDefault(); // Prevent default browser behavior
                    if (onCancel) onCancel();
                    return true;
                }
                return false;
            }
        },
        onBlur: ({ editor }) => {
            // [FIX] If cancelling (ESC pressed), do not save
            if (isCancellingRef.current) {
                isCancellingRef.current = false; // Reset for next time if component remounts/persists
                return;
            }

            saveContent(editor);
        },
    });

    const saveContent = (currentEditor) => {
        if (!currentEditor) return;

        if (onSave) {
            // Parse content to separate Title and Description
            const json = currentEditor.getJSON();
            if (!json.content || json.content.length === 0) {
                onSave({ title: '', description: '' });
                return;
            }

            let newTitle = '';
            let startIndex = 0;

            // [FIX] Safer logic: Check if first node is actually a Heading (Title)
            const firstNode = json.content[0];
            if (firstNode.type === 'heading') {
                if (firstNode.content && firstNode.content.length > 0) {
                    newTitle = firstNode.content.map(c => {
                        if (c.type === 'text') return c.text;
                        if (c.type === 'hardBreak') return '\n';
                        return '';
                    }).join('');
                } else {
                    newTitle = '';
                }
                startIndex = 1; // Content starts after title
            } else {
                // First node is NOT a heading? 
                // That means the user might have deleted the Title H1. 
                // In this case, we should probably keep the existing title (as it's partial update safest) 
                // OR we accept that title is now empty?
                // Actually, if we just extract everything as description, the existing title on backend won't be overwritten 
                // unless we explicitly pass it.
                // However, the prop `onSave` expects `{title, description}`.
                // If we return title: undefined, the parent might not update it.
                // Let's assume title is what it was, and the editor content is purely description now.
                newTitle = title; // Use the prop 'title' passed to us
                startIndex = 0; // Content starts at 0
            }


            // Extract Description using DOM logic for robustness
            const html = currentEditor.getHTML();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            // Remove the first element ONLY IF it was the H1 Title we identified
            if (startIndex === 1 && tempDiv.firstElementChild && tempDiv.firstElementChild.tagName === 'H1') {
                tempDiv.removeChild(tempDiv.firstElementChild);
            }

            // The rest is the description
            // trim() to remove leading newlines/whitespace caused by the split
            let newDescription = tempDiv.innerHTML.trim();

            onSave({ title: newTitle, description: newDescription });
        }
    };

    useImperativeHandle(ref, () => ({
        save: () => {
            // Trigger save manually
            saveContent(editor);
        },
        cancel: () => {
            isCancellingRef.current = true;
            if (onCancel) onCancel();
        }
    }));

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
});

TaskDescriptionEditor.displayName = 'TaskDescriptionEditor';
