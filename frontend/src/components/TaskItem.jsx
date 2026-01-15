import { useState, useRef, useEffect, forwardRef } from 'react';
import { format, isToday } from 'date-fns';
import {
    Trash2,
    X,
    GripVertical,
    ChevronUp,
    Pencil,
    Check,
    Sparkles,
    Paperclip,
    Folder,
    Tag
} from 'lucide-react';
import { api } from '../api';
import { UpdatesTimeline } from './UpdatesTimeline';
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


const SortableAttachment = ({ attachment, onDelete, availableLabels, onClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: attachment._id });

    // Determine dot color
    let dotColor = '#3B82F6'; // Default blue
    if (attachment.labels && attachment.labels.length > 0) {
        const labelColor = availableLabels.find(l => l.name === attachment.labels[0])?.color;
        if (labelColor) dotColor = labelColor;
    } else if (attachment.status === 'completed' || attachment.status === 'Closed') {
        dotColor = '#22c55e'; // Green
    }

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 group/chip hover:bg-white/10 transition-colors cursor-pointer active:cursor-grabbing"
            onClick={(e) => {
                if (!isDragging && onClick) {
                    onClick(attachment);
                }
            }}
        >
            <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: dotColor }}
            />
            <span>{attachment.title}</span>
        </div>
    );
};

const LabelPicker = ({ availableLabels, selectedLabels, onToggle, onClose, triggerRef }) => {
    const pickerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const isClickOnTrigger = triggerRef?.current && triggerRef.current.contains(event.target);
            if (pickerRef.current && !pickerRef.current.contains(event.target) && !isClickOnTrigger) {
                onClose();
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, triggerRef]);

    return (
        <div
            ref={pickerRef}
            className="absolute left-0 top-full mt-2 z-[100] bg-[#1a1d24] border border-white/10 rounded-lg shadow-2xl p-2 min-w-[200px] max-h-[300px] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="space-y-0.5">
                {availableLabels.map(label => {
                    const isSelected = selectedLabels.includes(label.name);
                    return (
                        <button
                            key={label._id}
                            onClick={() => onToggle(label.name)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors text-xs text-left ${isSelected ? 'text-white' : 'text-gray-400'}`}
                        >
                            <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: label.color }}
                            />
                            <span className="flex-1 truncate">{label.name}</span>
                            {isSelected && <Check size={12} className="text-blue-500" />}
                        </button>
                    );
                })}
            </div>
            {availableLabels.length === 0 && (
                <div className="px-2 py-4 text-center text-gray-500 text-xs italic">
                    No labels available
                </div>
            )}
        </div>
    );
};

const parseUTCDate = (dateString) => {
    if (!dateString) return new Date();
    // Ensure the date string ends with Z to trigger UTC parsing
    const normalized = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    return new Date(normalized);
};

export const TaskItem = forwardRef(({ task, onUpdate, showTags, showFolders, folders, style, dragHandleProps, isOverlay, availableLabels = [], onSendToWorkarea, onRemoveFromWorkarea, isWorkarea, defaultExpanded, onAttachmentClick, onTaskClick, globalExpanded, showFullTitles, showPreview, showDebugInfo, fontSize }, ref) => {
    const [expanded, setExpanded] = useState(defaultExpanded || false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(task.title);
    const [localLabels, setLocalLabels] = useState(task.labels || []);
    const [localAttachments, setLocalAttachments] = useState(task.attachments || []);
    const [showLabelPicker, setShowLabelPicker] = useState(false);
    const triggerRef = useRef(null);
    const localRef = useRef(null); // Local ref to track the DOM element
    const textareaRef = useRef(null);

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
        setLocalAttachments(task.attachments || []);
    }, [task.attachments]);

    // Auto-expand when defaultExpanded changes to true
    useEffect(() => {
        if (defaultExpanded === true) {
            setExpanded(true);
        }
    }, [defaultExpanded]);

    useEffect(() => {
        if (isEditingTitle && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isEditingTitle, editedTitle]);



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

    const handleAttachmentDragEnd = async (event) => {
        const { active, over } = event;

        // If dropped outside, remove the attachment
        if (!over) {
            const newAttachments = localAttachments.filter(a => a._id !== active.id);
            // Optimistically update UI
            setLocalAttachments(newAttachments);

            try {
                await api.updateTask(task._id, { attachments: newAttachments });
                onUpdate();
            } catch (err) {
                console.error("Failed to unlink attachment", err);
                // Revert on error
                setLocalAttachments(task.attachments || []);
            }
        }
    };



    return (
        <motion.div

            ref={localRef}
            style={baseStyle}
            initial={isOverlay ? false : { opacity: 0 }}
            animate={isOverlay ? false : { opacity: baseStyle.opacity }}
            exit={isOverlay ? false : { opacity: 0 }}
            className={`group hover:bg-white/[0.03] transition-all duration-200 bg-transparent ${expanded || globalExpanded ? `my-2 rounded-xl bg-blue-500/5 border-blue-500/30 border shadow-lg ${showLabelPicker ? 'z-[100]' : 'z-10'}` : 'border-b border-white/5 border-l border-l-transparent'}`}
        >
            <div
                className="flex items-center gap-4 cursor-pointer pr-4 select-none"
                onClick={() => setExpanded(!expanded)}
                {...(expanded || globalExpanded ? {} : dragHandleProps)}
            >
                <div
                    className="px-4 flex items-center gap-4 flex-1 min-w-0"
                    style={{
                        paddingTop: `${Math.max(1, fontSize - 11)}px`,
                        paddingBottom: `${Math.max(1, fontSize - 11)}px`
                    }}
                >
                    <div
                        className={`p-1 text-gray-600 hover:text-gray-400 transition-colors ${expanded ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
                        onClick={(e) => {
                            if (expanded || globalExpanded) {
                                e.stopPropagation();
                                if (globalExpanded) {
                                    // If global is on, individual collapse toggle works on local state
                                    // but UI might stay expanded.
                                    // Actually, if global is on, we should probably just allow local toggle to change local state.
                                }
                                setExpanded(false);
                            }
                        }}
                    >
                        {expanded || globalExpanded ? <ChevronUp size={16} /> : <GripVertical size={16} />}
                    </div>
                    <div className="relative flex items-center justify-center">
                        <div
                            ref={triggerRef}
                            className="p-3 -m-3 cursor-pointer group/dot flex items-center justify-center transition-transform active:scale-95"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowLabelPicker(!showLabelPicker);
                            }}
                        >
                            <div
                                className={`${fontSize < 11 ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full shrink-0 transition-all duration-200 group-hover/dot:scale-125 ${localLabels.length > 0 && availableLabels.find(l => l.name === localLabels[0])?.color
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
                        </div>
                        <AnimatePresence>
                            {showLabelPicker && (
                                <LabelPicker
                                    availableLabels={availableLabels}
                                    selectedLabels={localLabels}
                                    triggerRef={triggerRef}
                                    onToggle={async (labelName) => {
                                        const newLabels = localLabels.includes(labelName)
                                            ? localLabels.filter(l => l !== labelName)
                                            : [...localLabels, labelName];
                                        setLocalLabels(newLabels);
                                        await api.updateTask(task._id, { labels: newLabels });
                                        onUpdate();
                                    }}
                                    onClose={() => setShowLabelPicker(false)}
                                />
                            )}
                        </AnimatePresence>
                    </div>

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
                        <div className="flex-1 min-w-0 flex items-center gap-2 group/title">
                            <h3
                                className={`font-medium text-gray-400 text-left select-text ${expanded || globalExpanded || showFullTitles ? 'break-words whitespace-pre-wrap cursor-text' : 'truncate'} ${(task.status === 'Deleted' || task.status === 'deleted') ? 'line-through opacity-50' : ''}`}
                                style={{ fontSize: `${fontSize}px`, lineHeight: '1.4' }}
                                onClick={(e) => {
                                    if (expanded || globalExpanded || showFullTitles) {
                                        e.stopPropagation();
                                        // If in workarea and onTaskClick is provided, navigate to the task
                                        if (isWorkarea && onTaskClick) {
                                            onTaskClick();
                                        }
                                    }
                                }}
                            >
                                {task.title}
                                {showPreview && !(expanded || globalExpanded) && task.updates && task.updates.length > 0 && (
                                    <span className="text-gray-600 font-normal ml-2" style={{ fontSize: `${Math.max(11, fontSize - 1)}px` }}>
                                        <span className="text-gray-700 mr-1">-</span>
                                        {task.updates[task.updates.length - 1].content}
                                    </span>
                                )}
                            </h3>

                            {/* Labels Display */}
                            {(showTags || (showFolders && task.folderId)) && (
                                <div className="flex flex-wrap gap-1 ml-2 shrink-0 max-w-[60%]">
                                    {/* Folder Chip */}
                                    {showFolders && task.folderId && folders && (
                                        <div
                                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded border uppercase tracking-wider font-semibold text-[10px] group/folder transition-colors bg-white/5 border-white/10 text-gray-400"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Folder size={10} className="text-gray-500" />
                                            {folders.find(f => f._id === task.folderId)?.name || 'Unknown'}
                                        </div>
                                    )}

                                    {showTags && (
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
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {showDebugInfo && (
                        <span className="text-xs text-indigo-400 font-mono font-medium whitespace-nowrap">
                            [{task.status}]
                        </span>
                    )}
                    <span
                        title={format(
                            (task.updates && task.updates.length > 0)
                                ? parseUTCDate(task.updates.reduce((max, u) => new Date(u.timestamp) > new Date(max) ? u.timestamp : max, task.updates[0].timestamp))
                                : parseUTCDate(task.created_at),
                            'MMM d, yyyy, h:mm a'
                        )}
                        className="text-xs text-gray-400 font-mono font-medium whitespace-nowrap"
                    >
                        {(() => {
                            const lastUpdate = task.updates && task.updates.length > 0
                                ? parseUTCDate(task.updates.reduce((max, u) => new Date(u.timestamp) > new Date(max) ? u.timestamp : max, task.updates[0].timestamp))
                                : parseUTCDate(task.created_at);

                            if (expanded || globalExpanded) {
                                return format(lastUpdate, 'MMM d, h:mm a');
                            }

                            if (isToday(lastUpdate)) {
                                return format(lastUpdate, 'h:mm a');
                            }
                            return format(lastUpdate, 'MMM d');
                        })()}
                    </span>

                    {!isOverlay && (expanded || globalExpanded) && (
                        <div className="mt-2.5">
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {(expanded || globalExpanded) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="px-4 pb-4 pt-0 border-t border-white/5 bg-black/20">
                            <div className="py-4 space-y-1">
                                {/* Attachments Chips */}
                                {localAttachments && localAttachments.length > 0 && (
                                    <div className="mb-4 pl-28 pr-4">

                                        <div className="flex flex-wrap gap-2">
                                            <DndContext
                                                sensors={sensors}
                                                collisionDetection={pointerWithinTaskItem} // Use custom strategy to detect drag out of item
                                                onDragEnd={handleAttachmentDragEnd}
                                            >
                                                {localAttachments.map(att => (
                                                    <SortableAttachment
                                                        key={att._id}
                                                        attachment={att}
                                                        availableLabels={availableLabels}
                                                        onClick={onAttachmentClick}
                                                    />
                                                ))}
                                            </DndContext>
                                        </div>
                                    </div>
                                )}

                                <UpdatesTimeline
                                    items={task.updates}
                                    onAdd={async (content) => {
                                        await api.addUpdate(task._id, content);
                                        onUpdate();
                                    }}
                                    onEdit={async (id, content) => {
                                        await api.editUpdate(task._id, id, content);
                                        onUpdate();
                                    }}
                                    onDelete={async (id) => {
                                        await api.deleteUpdate(task._id, id);
                                        onUpdate();
                                    }}
                                    placeholder="Add update..."
                                />
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
                                    {!isOverlay && (
                                        <>
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
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence >
        </motion.div >
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
