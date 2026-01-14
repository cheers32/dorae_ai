import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import {
    Check,
    X,
    Pencil,
    Sparkles,
    Trash2
} from 'lucide-react';

const parseUTCDate = (dateString) => {
    if (!dateString) return new Date();
    // Ensure the date string ends with Z to trigger UTC parsing
    const normalized = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    return new Date(normalized);
};

export const UpdatesTimeline = ({
    items = [],
    onAdd,
    onEdit,
    onDelete,
    placeholder = "Add update...",
    className = ""
}) => {
    const [newDetail, setNewDetail] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    const newUpdateTextareaRef = useRef(null);
    const updateTextareaRef = useRef(null);

    // Auto-resize edit textarea
    useEffect(() => {
        if (editingId && updateTextareaRef.current) {
            updateTextareaRef.current.style.height = 'auto';
            updateTextareaRef.current.style.height = `${updateTextareaRef.current.scrollHeight}px`;
        }
    }, [editingId, editContent]);

    // Auto-resize new update textarea
    useEffect(() => {
        if (newUpdateTextareaRef.current) {
            newUpdateTextareaRef.current.style.height = 'auto';
            newUpdateTextareaRef.current.style.height = `${newUpdateTextareaRef.current.scrollHeight}px`;
        }
    }, [newDetail]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newDetail.trim()) return;

        try {
            await onAdd(newDetail);
            setNewDetail('');
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveEdit = async (id) => {
        try {
            await onEdit(id, editContent);
            setEditingId(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        try {
            await onDelete(id);
            setDeletingId(null);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className={`space-y-1 ${className}`}>
            {items.map((item) => (
                <div key={item.id} className="flex gap-4 group/item text-sm">
                    <div className="w-24 text-xs text-gray-400 text-right pt-0.5 font-mono shrink-0">
                        {format(parseUTCDate(item.timestamp), 'MMM d, HH:mm')}
                    </div>
                    <div className="relative border-l-2 border-white/5 pl-4 pb-1 flex-1">
                        <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-gray-700 ring-4 ring-[#13161c]" />

                        {editingId === item.id ? (
                            <div className="flex items-center gap-2 w-full">
                                <textarea
                                    ref={updateTextareaRef}
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="flex-1 bg-gray-900 border border-gray-800 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-600 resize-none overflow-hidden"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSaveEdit(item.id);
                                        }
                                        if (e.key === 'Escape') setEditingId(null);
                                    }}
                                    rows={1}
                                />
                                <button
                                    className="text-green-400 hover:text-green-300 p-1 bg-green-400/10 rounded"
                                    onClick={() => handleSaveEdit(item.id)}
                                    title="Save (Enter)"
                                >
                                    <Check size={14} />
                                </button>
                                <button
                                    className="text-gray-500 hover:text-gray-300 p-1 hover:bg-white/5 rounded"
                                    onClick={() => setEditingId(null)}
                                    title="Cancel (Esc)"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            item.type === 'ai_analysis' ? (
                                <div className="mt-1 mb-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 w-full relative group/ai shadow-sm">
                                    <div className="flex items-start gap-2">
                                        <Sparkles size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                        <p className="text-sm text-blue-200/80 italic leading-relaxed">
                                            {item.content.replace('AI Plan: ', '')}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="group/content flex items-start gap-2">
                                    <p className={`text-left whitespace-pre-wrap ${['creation', 'status_change', 'property_change', 'deletion'].includes(item.type) ? 'text-gray-400 italic' : 'text-gray-300'}`}>
                                        {item.content}
                                    </p>
                                    {!['status_change', 'creation', 'property_change', 'deletion'].includes(item.type) && (
                                        <div className={`flex gap-1 pt-0.5 ${deletingId === item.id ? 'opacity-100' : 'opacity-0 group-hover/content:opacity-100'}`}>
                                            {deletingId === item.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        className="text-green-400 hover:text-green-300 transition-all bg-green-400/10 rounded p-0.5"
                                                        onClick={() => handleDelete(item.id)}
                                                        title="Confirm Delete"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        className="text-gray-500 hover:text-gray-300 transition-all p-0.5"
                                                        onClick={() => setDeletingId(null)}
                                                        title="Cancel"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        className="text-gray-600 hover:text-blue-400 transition-all"
                                                        onClick={() => { setEditingId(item.id); setEditContent(item.content); }}
                                                        title="Edit"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        className="text-gray-600 hover:text-red-400 transition-all"
                                                        onClick={() => setDeletingId(item.id)}
                                                        title="Delete"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>
            ))}

            <div className="flex gap-4 group/add mt-2">
                <div className="w-24 text-xs text-gray-400 text-right pt-2 font-mono shrink-0">Now</div>
                <div className="relative border-l-2 border-white/5 pl-4 pb-2 flex-1">
                    <div className="absolute -left-[5px] top-2.5 w-2 h-2 rounded-full border border-gray-600 bg-[#13161c]" />
                    <form onSubmit={handleAdd} className="relative">
                        <textarea
                            ref={newUpdateTextareaRef}
                            placeholder={placeholder}
                            value={newDetail}
                            onChange={(e) => setNewDetail(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-0 transition-all placeholder:text-gray-600 resize-none overflow-hidden"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAdd(e);
                                }
                            }}
                        />
                    </form>
                </div>
            </div>
        </div>
    );
};
