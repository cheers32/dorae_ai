import { useState, useRef, useEffect, forwardRef } from 'react';
import { format } from 'date-fns';
import {
    Trash2,
    X,
    GripVertical,
    ChevronUp,
    Pencil,
    Check,
    Sparkles,
    Paperclip
} from 'lucide-react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { useSortable, SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';



const SortableLabel = ({ labelName, color, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: labelName });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        backgroundColor: `${color}1a`, // 10% opacity
        color: color,
        borderColor: `${color}33`, // 20% opacity
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab'
    };

    return (


        <span
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded border uppercase tracking-wider font-semibold text-[10px] group/label transition-colors"
            style={style}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
                if (listeners && listeners.onPointerDown) {
                    listeners.onPointerDown(e);
                }
                e.preventDefault();
                e.stopPropagation();
            }}
        >
            {labelName}
        </span>
    );
};

const parseUTCDate = (dateString) => {
    if (!dateString) return new Date();
    // Ensure the date string ends with Z to trigger UTC parsing
    const normalized = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    return new Date(normalized);
};

export const TaskItem = forwardRef(({ task, onUpdate, showTags, style, dragHandleProps, isOverlay, availableLabels = [], onSendToWorkarea, onRemoveFromWorkarea, isWorkarea, defaultExpanded }, ref) => {
    const [expanded, setExpanded] = useState(defaultExpanded || false);
    const [newDetail, setNewDetail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(task.title);
    const [localLabels, setLocalLabels] = useState(task.labels || []);
    const [deletingUpdateId, setDeletingUpdateId] = useState(null);
    const localRef = useRef(null); // Local ref to track the DOM element
    const textareaRef = useRef(null);
    const updateTextareaRef = useRef(null);
    const newUpdateTextareaRef = useRef(null);

    // Sync refs
    useEffect(() => {
        if (ref) {
            if (typeof ref === 'function') ref(localRef.current);
            else ref.current = localRef.current;
        }
    }, [ref]);

    useEffect(() => {
        setLocalLabels(task.labels || []);
    }, [task.labels]);

    useEffect(() => {
        if (isEditingTitle && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isEditingTitle, editedTitle]);

    useEffect(() => {
        if (editingId && updateTextareaRef.current) {
            updateTextareaRef.current.style.height = 'auto';
            updateTextareaRef.current.style.height = `${updateTextareaRef.current.scrollHeight}px`;
        }
    }, [editingId, editContent]);

    useEffect(() => {
        if (newUpdateTextareaRef.current) {
            newUpdateTextareaRef.current.style.height = 'auto';
            newUpdateTextareaRef.current.style.height = `${newUpdateTextareaRef.current.scrollHeight}px`;
        }
    }, [newDetail]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 }
        })
    );

    const pointerWithinTaskItem = (args) => {
        const { pointerCoordinates } = args;
        if (!pointerCoordinates || !localRef.current) return [];

        const rect = localRef.current.getBoundingClientRect();
        const isInside =
            pointerCoordinates.x >= rect.left &&
            pointerCoordinates.x <= rect.right &&
            pointerCoordinates.y >= rect.top &&
            pointerCoordinates.y <= rect.bottom;

        if (isInside) {
            return closestCenter(args);
        }
        return []; // No collisions if outside -> over will be null
    };

    const handleLabelDragEnd = async (event) => {
        const { active, over } = event;

        // If dropped outside, remove the label
        if (!over) {
            const labelToRemove = active.id;
            const newLabels = localLabels.filter(l => l !== labelToRemove);
            setLocalLabels(newLabels);
            await api.updateTask(task._id, { labels: newLabels });
            onUpdate();
            return;
        }

        if (active.id !== over.id) {
            setLocalLabels((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                const newLabels = arrayMove(items, oldIndex, newIndex);

                // Persist immediately
                api.updateTask(task._id, { labels: newLabels }).then(onUpdate).catch(console.error);

                return newLabels;
            });
        }
    };

    const baseStyle = {
        ...style,
        position: 'relative',
        zIndex: isOverlay ? 50 : undefined,
        opacity: style?.opacity !== undefined ? style.opacity : 1,
        scale: isOverlay ? 1.05 : 1,
        boxShadow: isOverlay ? '0 0 0 1px rgba(59, 130, 246, 0.5), 0 10px 20px -5px rgba(0, 0, 0, 0.5)' : 'none',
        backgroundColor: isOverlay ? '#13161c' : undefined,
        cursor: isOverlay ? 'grabbing' : undefined,
    };

    const handleSaveTitle = async () => {
        if (!editedTitle.trim() || editedTitle === task.title) {
            setIsEditingTitle(false);
            return;
        }
        try {
            await api.updateTask(task._id, { title: editedTitle });
            setIsEditingTitle(false);
            onUpdate();
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddDetail = async (e) => {
        e.preventDefault();
        if (!newDetail.trim()) return;

        setIsSubmitting(true);
        try {
            await api.addUpdate(task._id, newDetail);
            onUpdate();
            setNewDetail('');
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveEdit = async (updateId) => {
        try {
            await api.editUpdate(task._id, updateId, editContent);
            setEditingId(null);
            onUpdate();
        } catch (err) {
            console.error(err);
        }
    };

    const handleAnalyzeTask = async () => {
        setIsSubmitting(true);
        try {
            await api.analyzeTask(task._id);
            onUpdate();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const [isDeleting, setIsDeleting] = useState(false);

    const confirmDelete = async (e) => {
        e.stopPropagation();
        setIsSubmitting(true);
        try {
            await api.deleteTask(task._id);
            onUpdate();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
            setIsDeleting(false);
        }
    };

    // Deprecated in favor of inline isDeleting state
    // Kept if needed for other contexts, but UI now uses setIsDeleting(true)
    const handleDeleteTask = (e) => {
        e.stopPropagation();
        setIsDeleting(true);
    };

    const handleDeleteUpdate = async (updateId) => {
        setDeletingUpdateId(updateId);
    };

    const confirmDeleteUpdate = async (updateId) => {
        try {
            await api.deleteUpdate(task._id, updateId);
            onUpdate();
        } catch (err) {
            console.error(err);
        } finally {
            setDeletingUpdateId(null);
        }
    };


    const handleUnlinkAttachment = async (attachmentId) => {
        const currentAttachments = task.attachments || [];
        const newAttachments = currentAttachments.filter(a => a._id !== attachmentId);

        try {
            await api.updateTask(task._id, { attachments: newAttachments });
            onUpdate();
        } catch (err) {
            console.error("Failed to unlink attachment", err);
        }
    };



    return (
        <motion.div

            ref={localRef}
            style={baseStyle}
            initial={isOverlay ? false : { opacity: 0 }}
            animate={isOverlay ? false : { opacity: baseStyle.opacity }}
            exit={isOverlay ? false : { opacity: 0 }}
            className={`group hover:bg-white/[0.04] transition-colors border-b border-white/5 bg-transparent ${expanded ? 'bg-white/[0.02]' : ''}`}
        >
            <div
                className="flex items-start gap-4 cursor-pointer pr-4"
                onClick={() => setExpanded(!expanded)}
                {...(expanded ? {} : dragHandleProps)}
            >
                <div className="py-2 px-4 flex items-start gap-4 flex-1 min-w-0">
                    <div
                        className={`p-1 mt-0.5 text-gray-600 hover:text-gray-400 transition-colors ${expanded ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
                        onClick={(e) => {
                            if (expanded) {
                                e.stopPropagation();
                                setExpanded(false);
                            }
                        }}
                    >
                        {expanded ? <ChevronUp size={16} /> : <GripVertical size={16} />}
                    </div>
                    <div
                        className={`w-3 h-3 mt-1.5 rounded-full shrink-0 transition-colors ${localLabels.length > 0 && availableLabels.find(l => l.name === localLabels[0])?.color
                            ? ''
                            : `shadow-[0_0_10px_rgba(59,130,246,0.3)] ${task.status === 'completed' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' :
                                task.status === 'in_progress' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' :
                                    'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                            }`
                            }`}
                        style={
                            localLabels.length > 0
                                ? {
                                    backgroundColor: availableLabels.find(l => l.name === localLabels[0])?.color || '#3B82F6',
                                    boxShadow: `0 0 10px ${availableLabels.find(l => l.name === localLabels[0])?.color || '#3B82F6'}4d`
                                }
                                : {}
                        }
                    />

                    {isEditingTitle ? (
                        <textarea
                            ref={textareaRef}
                            autoFocus
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onBlur={handleSaveTitle}
                            className="flex-1 bg-black/40 border border-blue-500/50 rounded px-2 py-0.5 text-gray-200 focus:outline-none resize-none overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveTitle();
                                }
                                if (e.key === 'Escape') setIsEditingTitle(false);
                            }}
                            rows={1}
                        />
                    ) : (
                        <div className="flex-1 min-w-0 flex items-start gap-2 group/title">
                            <h3
                                className={`font-medium text-gray-200 text-left ${expanded ? 'break-words whitespace-pre-wrap cursor-text' : 'truncate'} ${(task.status === 'Deleted' || task.status === 'deleted') ? 'line-through opacity-50' : ''}`}
                                onClick={(e) => expanded && e.stopPropagation()}
                            >
                                {task.title}
                            </h3>

                            {/* Labels Display */}
                            {showTags && (
                                <div className="flex flex-wrap gap-1 ml-2 shrink-0 max-w-[60%]">
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={pointerWithinTaskItem}
                                        onDragEnd={handleLabelDragEnd}
                                    >
                                        <SortableContext
                                            items={localLabels}
                                            strategy={horizontalListSortingStrategy}
                                        >
                                            {localLabels.map(labelName => {
                                                const labelColor = availableLabels.find(l => l.name === labelName)?.color || '#3B82F6';
                                                return (
                                                    <SortableLabel
                                                        key={labelName}
                                                        labelName={labelName}
                                                        color={labelColor}
                                                        onDelete={async () => {
                                                            const newLabels = localLabels.filter(l => l !== labelName);
                                                            setLocalLabels(newLabels);
                                                            await api.updateTask(task._id, { labels: newLabels });
                                                            onUpdate();
                                                        }}
                                                    />
                                                );
                                            })}
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400 font-mono mt-3">
                        {(() => {
                            const lastUpdate = task.updates && task.updates.length > 0
                                ? parseUTCDate(task.updates.reduce((max, u) => new Date(u.timestamp) > new Date(max) ? u.timestamp : max, task.updates[0].timestamp))
                                : parseUTCDate(task.created_at);
                            return format(lastUpdate, 'MMM d, HH:mm');
                        })()}
                    </span>

                    {/* [NEW] Send/Remove Workarea Button */}
                    {!isOverlay && expanded && (
                        <div className="mt-2.5">
                            {isWorkarea ? (
                                <button
                                    className="p-1 px-2 text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded border border-red-500/20 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onRemoveFromWorkarea) onRemoveFromWorkarea();
                                    }}
                                    title="Remove from Focus"
                                >
                                    Unfocus
                                </button>
                            ) : (
                                <button
                                    className="p-1 px-2 text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded border border-blue-500/20 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onSendToWorkarea) onSendToWorkarea();
                                    }}
                                    title="Set as Current Focus"
                                >
                                    Focus
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="px-4 pb-4 pt-0 border-t border-white/5 bg-black/20">
                            <div className="py-4 space-y-1">
                                {/* Attachments Chips */}
                                {task.attachments && task.attachments.length > 0 && (
                                    <div className="mb-4 pl-28 pr-4">
                                        <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Attached Tasks</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {task.attachments.map(att => (
                                                <div key={att._id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 group/chip hover:bg-white/10 transition-colors">
                                                    <Paperclip size={12} className="text-blue-400" />
                                                    <span>{att.title}</span>
                                                    <button
                                                        onClick={() => handleUnlinkAttachment(att._id)}
                                                        className="ml-1 p-0.5 text-gray-500 hover:text-red-400 opacity-0 group-hover/chip:opacity-100 transition-opacity"
                                                        title="Unlink Attachment"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {task.updates.map((update) => (
                                    <div key={update.id} className="flex gap-4 group/item text-sm">
                                        <div className="w-24 text-xs text-gray-400 text-right pt-0.5 font-mono shrink-0">
                                            {format(parseUTCDate(update.timestamp), 'MMM d, HH:mm')}
                                        </div>
                                        <div className="relative border-l-2 border-white/5 pl-4 pb-1 flex-1">
                                            <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-gray-700 ring-4 ring-[#13161c]" />
                                            {editingId === update.id ? (
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
                                                                handleSaveEdit(update.id);
                                                            }
                                                            if (e.key === 'Escape') setEditingId(null);
                                                        }}
                                                        rows={1}
                                                    />
                                                    <button
                                                        className="text-green-400 hover:text-green-300 p-1 bg-green-400/10 rounded"
                                                        onClick={() => handleSaveEdit(update.id)}
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
                                                update.type === 'ai_analysis' ? (
                                                    <div className="mt-1 mb-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 w-full relative group/ai shadow-sm">
                                                        <div className="flex items-start gap-2">
                                                            <Sparkles size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                                            <p className="text-sm text-blue-200/80 italic leading-relaxed">
                                                                {update.content.replace('AI Plan: ', '')}
                                                            </p>
                                                        </div>
                                                        <button
                                                            className="absolute top-2 right-2 p-1 text-blue-400/50 hover:text-red-400 opacity-0 group-hover/ai:opacity-100 transition-all"
                                                            onClick={() => handleDeleteUpdate(update.id)}
                                                            title="Delete Analysis"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="group/content flex items-start gap-2">
                                                        <p className={`text-left whitespace-pre-wrap ${['creation', 'status_change', 'property_change', 'deletion'].includes(update.type) ? 'text-gray-400 italic' : 'text-gray-300'}`}>
                                                            {update.content}
                                                        </p>
                                                        {!['status_change', 'creation', 'property_change', 'deletion'].includes(update.type) && (
                                                            <div className={`flex gap-1 pt-0.5 ${deletingUpdateId === update.id ? 'opacity-100' : 'opacity-0 group-hover/content:opacity-100'}`}>
                                                                {deletingUpdateId === update.id ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            className="text-green-400 hover:text-green-300 transition-all bg-green-400/10 rounded p-0.5"
                                                                            onClick={() => confirmDeleteUpdate(update.id)}
                                                                            title="Confirm Delete"
                                                                        >
                                                                            <Check size={14} />
                                                                        </button>
                                                                        <button
                                                                            className="text-gray-500 hover:text-gray-300 transition-all p-0.5"
                                                                            onClick={() => setDeletingUpdateId(null)}
                                                                            title="Cancel"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            className="text-gray-600 hover:text-blue-400 transition-all"
                                                                            onClick={() => { setEditingId(update.id); setEditContent(update.content); }}
                                                                            title="Edit"
                                                                        >
                                                                            <Pencil size={14} />
                                                                        </button>
                                                                        <button
                                                                            className="text-gray-600 hover:text-red-400 transition-all"
                                                                            onClick={() => handleDeleteUpdate(update.id)}
                                                                            title="Delete Update"
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
                                        <form onSubmit={handleAddDetail} className="relative">
                                            <textarea
                                                ref={newUpdateTextareaRef}
                                                placeholder="Add update..."
                                                value={newDetail}
                                                onChange={(e) => setNewDetail(e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-0 transition-all placeholder:text-gray-600 resize-none overflow-hidden"
                                                rows={1}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleAddDetail(e);
                                                    }
                                                }}
                                            />
                                        </form>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center gap-2 pt-2 border-t border-white/5 mx-[-16px] px-4 bg-black/40 pb-2 mb-[-16px]">
                                {isDeleting ? (
                                    <div className="flex items-center gap-1">
                                        <button
                                            className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); setIsDeleting(false); }}
                                            title="Cancel"
                                        >
                                            <X size={14} />
                                        </button>
                                        <button
                                            className="p-1.5 text-green-400 hover:text-green-300 transition-colors bg-green-400/10 rounded"
                                            onClick={confirmDelete}
                                            title="Confirm Delete"
                                        >
                                            <Check size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                        onClick={(e) => { e.stopPropagation(); setIsDeleting(true); }}
                                        title="Delete Task"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                                <div className="flex items-center gap-2">
                                    <button
                                        className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsEditingTitle(true);
                                            setEditedTitle(task.title);
                                        }}
                                        title="Edit Title"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-400/10 transition-colors"
                                        onClick={handleAnalyzeTask}
                                        disabled={isSubmitting}
                                    >
                                        <Sparkles size={14} />
                                        {isSubmitting ? 'Analyzing...' : 'AI Analyze'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});

export function SortableTaskItem(props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <TaskItem
            ref={setNodeRef}
            style={style}
            dragHandleProps={{ ...attributes, ...listeners }}
            isOverlay={false}
            {...props}
        />
    );
}
