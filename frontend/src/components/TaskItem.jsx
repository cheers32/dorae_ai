import { useState, useRef, useEffect, forwardRef } from 'react';
import { format } from 'date-fns';
import {
    ChevronDown,
    ChevronUp,
    Trash2,
    Clock,
    AlertCircle,
    MoreVertical,
    Plus,
    X,
    GripVertical,
    Pencil,
    Check,
    Sparkles
} from 'lucide-react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { useSortable, SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

// Helper Dropdown Component
const Dropdown = ({ options, value, onChange, className, renderOption, triggerClassName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className={triggerClassName}
            >
                {value}
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-[#1a1f2e] border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[120px]">
                    {options.map((opt) => (
                        <div
                            key={opt}
                            className="px-3 py-2 text-xs text-gray-300 hover:bg-white/5 cursor-pointer flex items-center gap-2 capitalize"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(opt);
                                setIsOpen(false);
                            }}
                        >
                            {renderOption ? renderOption(opt) : opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

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

export const TaskItem = forwardRef(({ task, onUpdate, showTags, style, dragHandleProps, isOverlay, availableLabels = [] }, ref) => {
    const [expanded, setExpanded] = useState(false);
    const [newDetail, setNewDetail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(task.title);
    const [localLabels, setLocalLabels] = useState(task.labels || []);
    const localRef = useRef(null); // Local ref to track the DOM element

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

    const handleDeleteTask = (e) => {
        // Deprecated in favor of inline isDeleting state
        // Kept if needed for other contexts, but UI now uses setIsDeleting(true)
        e.stopPropagation();
        setIsDeleting(true);
    };

    const handleDeleteUpdate = async (updateId) => {
        if (!confirm('Delete this update?')) return;
        try {
            await api.deleteUpdate(task._id, updateId);
            onUpdate();
        } catch (err) {
            console.error(err);
        }
    };

    const updateField = async (field, value) => {
        try {
            await api.updateTask(task._id, { [field]: value });
            onUpdate();
        } catch (err) {
            console.error(err);
        }
    };

    const priorities = ['low', 'medium', 'high', 'urgent'];

    const statuses = ['pending', 'in_progress', 'completed'];



    const getStatusStyle = (s) => {
        switch (s) {
            case 'completed': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'in_progress': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
        }
    };

    const formatStatus = (s) => {
        if (!s) return 'Pending';
        return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    return (
        <motion.div

            ref={localRef}
            style={baseStyle}
            initial={isOverlay ? false : { opacity: 0 }}
            animate={isOverlay ? false : { opacity: baseStyle.opacity }}
            exit={isOverlay ? false : { opacity: 0 }}
            className={`group hover:bg-white/[0.02] transition-colors rounded-xl border border-white/5 bg-[#1a1f2e]/50 mb-3 ${expanded ? 'ring-1 ring-blue-500/20' : ''}`}
        >
            <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="p-4 flex items-center gap-4 flex-1 min-w-0">
                    <div
                        className="p-1 text-gray-600 hover:text-gray-400 transition-colors cursor-grab active:cursor-grabbing"
                        {...dragHandleProps}
                    >
                        <GripVertical size={16} />
                    </div>
                    <div
                        className={`w-3 h-3 rounded-full shrink-0 transition-colors ${localLabels.length > 0 && availableLabels.find(l => l.name === localLabels[0])?.color
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
                        <input
                            autoFocus
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onBlur={handleSaveTitle}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle();
                                if (e.key === 'Escape') setIsEditingTitle(false);
                            }}
                            className="flex-1 bg-black/40 border border-blue-500/50 rounded px-2 py-0.5 text-gray-200 focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <div className="flex-1 min-w-0 flex items-center gap-2 group/title">
                            <h3
                                className={`font-medium text-gray-200 text-left truncate ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                            >
                                {task.title}
                            </h3>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditingTitle(true);
                                    setEditedTitle(task.title);
                                }}
                                className="opacity-0 group-hover/title:opacity-100 p-1 text-gray-500 hover:text-blue-400 transition-all hover:bg-white/5 rounded"
                                title="Edit title"
                            >
                                <Pencil size={12} />
                            </button>

                            {/* Labels Display */}
                            {showTags && (
                                <div className="flex flex-wrap gap-1 ml-2">
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

                <div className={`flex items-center gap-2 pr-4 transition-opacity ${showTags ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={e => e.stopPropagation()}>
                    <Dropdown
                        options={statuses}
                        value={formatStatus(task.status)}
                        onChange={(val) => updateField('status', val)}
                        triggerClassName={`text-[10px] px-2 py-1 rounded border uppercase tracking-wider font-semibold transition-colors ${getStatusStyle(task.status)}`}
                        renderOption={(opt) => (
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${opt === 'completed' ? 'bg-green-500' : opt === 'in_progress' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                                {formatStatus(opt)}
                            </div>
                        )}
                    />





                    {isDeleting ? (
                        <div className="flex items-center gap-1">
                            <button
                                className="p-1.5 text-green-400 hover:text-green-300 transition-colors bg-green-400/10 rounded"
                                onClick={confirmDelete}
                                title="Confirm Delete"
                            >
                                <Check size={14} />
                            </button>
                            <button
                                className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                                onClick={(e) => { e.stopPropagation(); setIsDeleting(false); }}
                                title="Cancel"
                            >
                                <X size={14} />
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

                    <div className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''} text-gray-500`}>
                        <ChevronDown size={18} />
                    </div>
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
                                {task.updates.map((update) => (
                                    <div key={update.id} className="flex gap-4 group/item text-sm">
                                        <div className="w-24 text-xs text-gray-500 text-right pt-0.5 font-mono shrink-0">
                                            {format(new Date(update.timestamp), 'MMM d, HH:mm')}
                                        </div>
                                        <div className="relative border-l-2 border-white/5 pl-4 pb-1 flex-1">
                                            <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-gray-700 ring-4 ring-[#13161c]" />
                                            {editingId === update.id ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-blue-500/50"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleSaveEdit(update.id)} className="text-green-400"><Check size={14} /></button>
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
                                                        <p className={`text-gray-400 ${['creation', 'status_change', 'property_change', 'deletion'].includes(update.type) ? 'italic opacity-60' : ''}`}>
                                                            {update.content}
                                                        </p>
                                                        {!['status_change', 'creation', 'property_change', 'deletion'].includes(update.type) && (
                                                            <div className="opacity-0 group-hover/content:opacity-100 flex gap-1 pt-0.5">
                                                                <button
                                                                    className="text-gray-600 hover:text-blue-400 transition-all"
                                                                    onClick={() => { setEditingId(update.id); setEditContent(update.content); }}
                                                                    title="Edit"
                                                                >
                                                                    <Pencil size={10} />
                                                                </button>
                                                                <button
                                                                    className="text-gray-600 hover:text-red-400 transition-all"
                                                                    onClick={() => handleDeleteUpdate(update.id)}
                                                                    title="Delete Update"
                                                                >
                                                                    <X size={10} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ))}

                                <div className="flex gap-4 group/add mt-2">
                                    <div className="w-24 text-xs text-gray-600 text-right pt-2 font-mono shrink-0">Now</div>
                                    <div className="relative border-l-2 border-white/5 pl-4 pb-2 flex-1">
                                        <div className="absolute -left-[5px] top-2.5 w-2 h-2 rounded-full border border-gray-600 bg-[#13161c]" />
                                        <form onSubmit={handleAddDetail} className="relative">
                                            <input
                                                type="text"
                                                placeholder="Add update..."
                                                value={newDetail}
                                                onChange={(e) => setNewDetail(e.target.value)}
                                                className="w-full bg-transparent border-none text-gray-300 placeholder-gray-600 focus:ring-0 p-0 py-1 text-sm"
                                            />
                                        </form>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-white/5 mx-[-16px] px-4 bg-black/40 pb-2 mb-[-16px]">
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
