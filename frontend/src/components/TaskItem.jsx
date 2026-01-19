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
    Tag,
    CheckCircle,
    Bot,
    Plus,
    ChevronsRight,
    ChevronRight,
    Star,
    RotateCw
} from 'lucide-react';
import { api } from '../api';
import { UpdatesTimeline } from './UpdatesTimeline';
import { TaskDescriptionEditor } from './TaskDescriptionEditor';
import { motion, AnimatePresence } from 'framer-motion';
import { useSortable, SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';



const SortableLabel = ({ labelName, color, onDelete, onSearch }) => {
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
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded border uppercase tracking-wider font-semibold text-[10px] group/label transition-colors hover:opacity-80 cursor-pointer"
            style={style}
            onClick={(e) => {
                e.stopPropagation();
                if (onSearch) onSearch(labelName);
            }}
            onPointerDown={(e) => {
                if (listeners && listeners.onPointerDown) {
                    listeners.onPointerDown(e);
                }
                // e.preventDefault(); // allow click
                // e.stopPropagation();
            }}
        >
            {labelName}
        </span>
    );
};


const SortableAttachment = ({ attachment, onDelete, availableLabels, onClick, onSearch }) => {
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
            className="flex items-center gap-2 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-2 pl-3 py-1.5 text-xs text-[var(--text-main)] group/chip hover:bg-[var(--card-hover)] transition-colors cursor-pointer active:cursor-grabbing pr-1.5"
            onClick={(e) => {
                if (onSearch) {
                    onSearch(attachment.title);
                } else if (!isDragging && onClick) {
                    onClick(attachment);
                }
            }}
        >
            <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: dotColor }}
            />
            <span className="truncate max-w-[150px]">{attachment.title}</span>
            {onDelete && (
                <button
                    className="ml-0.5 p-0.5 rounded-full hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-white transition-colors opacity-0 group-hover/chip:opacity-100"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
                >
                    <X size={10} />
                </button>
            )}
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
            className="absolute left-0 top-full mt-2 z-[100] bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl p-2 min-w-[200px]"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="space-y-0.5">
                {availableLabels.map(label => {
                    const isSelected = selectedLabels.includes(label.name);
                    return (
                        <button
                            key={label._id}
                            onClick={() => onToggle(label.name)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--input-bg)] transition-colors text-xs text-left ${isSelected ? 'text-white' : 'text-[var(--text-muted)]'}`}
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
                <div className="px-2 py-4 text-center text-[var(--text-muted)] text-xs italic">
                    No labels available
                </div>
            )}
        </div>
    );
};

const AgentPicker = ({ availableAgents, selectedAgentIds, onToggle, onClose, triggerRef }) => {
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
            className="absolute left-0 top-full mt-2 z-[100] bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-2xl p-2 min-w-[200px] max-h-[300px] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="space-y-0.5">
                {availableAgents.map(agent => {
                    const isSelected = selectedAgentIds.includes(agent._id);
                    return (
                        <button
                            key={agent._id}
                            onClick={() => onToggle(agent._id)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--input-bg)] transition-colors text-xs text-left ${isSelected ? 'text-white' : 'text-[var(--text-muted)]'}`}
                        >
                            <Bot size={14} className="text-[var(--text-muted)]" />
                            <span className="flex-1 truncate">{agent.name}</span>
                            {isSelected && <Check size={12} className="text-blue-500" />}
                        </button>
                    );
                })}
            </div>
            {availableAgents.length === 0 && (
                <div className="px-2 py-4 text-center text-[var(--text-muted)] text-xs italic">
                    No agents available
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

export const TaskItem = forwardRef(({ task, onUpdate, showTags, showFolders, folders, style, dragHandleProps, isOverlay, availableLabels = [], onSendToWorkarea, onRemoveFromWorkarea, isWorkarea, defaultExpanded, onAttachmentClick, onTaskClick, globalExpanded, showFullTitles, showPreview, showDebugInfo,
    fontSize = 12,
    textBrightness = 1,
    textColor = '#9ca3af',
    timelineLimit = 3,
    attachmentLimit = 5,
    showCounts = false,
    agents = [],
    onToggleExpand, // [NEW] Callback for expansion tracking
    onSearch, // [NEW] Callback for chip search
    showPulse, // [NEW] Pulse preference
    isSelected, // [NEW] Selection state
    onToggleSelect, // [NEW] Selection toggle callback
    sortBy, // [NEW] Current sort mode
    rowColor, // [NEW] Row background color preference
}, ref) => {
    const [expanded, setExpanded] = useState(defaultExpanded || false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isConfirmingClose, setIsConfirmingClose] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(task.title);
    const [localLabels, setLocalLabels] = useState(task.labels || []);
    const [localAttachments, setLocalAttachments] = useState(task.attachments || []);
    // Initial assigned_agent_ids might be null if old record, default to empty
    // Also support backward compatibility if assigned_agent_id (singular) exists
    const [localAssignedAgentIds, setLocalAssignedAgentIds] = useState(() => {
        if (task.assigned_agent_ids) return task.assigned_agent_ids;
        if (task.assigned_agent_id) return [task.assigned_agent_id];
        return [];
    });

    const [showLabelPicker, setShowLabelPicker] = useState(false);
    const [showAgentPicker, setShowAgentPicker] = useState(false);
    const triggerRef = useRef(null);
    const agentTriggerRef = useRef(null);
    const localRef = useRef(null); // Local ref to track the DOM element
    const textareaRef = useRef(null);
    const editorRef = useRef(null);

    // [NEW] Heuristic for light mode
    const isLightMode = textColor === '#1a1a1a' || textColor === '#111827';

    // [NEW] Apply row color if provided
    const itemStyle = {
        ...style,
        backgroundColor: rowColor || style?.backgroundColor,
        // Add subtle border if row color is light to maintain separation
        borderColor: rowColor && rowColor !== 'rgba(31, 41, 55, 0.4)' ? 'var(--border)' : undefined
    };

    useEffect(() => {
        setLocalLabels(task.labels || []);
        setLocalAttachments(task.attachments || []);
        if (task.assigned_agent_ids) {
            setLocalAssignedAgentIds(task.assigned_agent_ids);
        } else if (task.assigned_agent_id) {
            setLocalAssignedAgentIds([task.assigned_agent_id]);
        } else {
            setLocalAssignedAgentIds([]);
        }
    }, [task]);
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
        // [MODIFIED] Respect external control for both true/false if needed, 
        // but primarily ensuring we sync if parent says "expand this".
        if (defaultExpanded !== undefined) {
            setExpanded(defaultExpanded);
        }
    }, [defaultExpanded]);

    useEffect(() => {
        if (isEditingTitle && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isEditingTitle, editedTitle]);

    // [NEW] Global ESC handler for expanded state
    useEffect(() => {
        // Only active if expanded
        if (!(expanded || globalExpanded)) return;

        const handleGlobalKeyDown = (e) => {
            if (e.key === 'Escape' || ((e.metaKey || e.ctrlKey) && e.key === '[')) {
                if (e.key === '[') {
                    e.preventDefault();
                }
                if (isDeleting) {
                    setIsDeleting(false);
                    return;
                }
                if (isConfirmingClose) {
                    setIsConfirmingClose(false);
                    return;
                }
                // Ignore if sub-components are active/open that should handle ESC themselves
                // or if the event was already handled (prevented) by a focused input/editor
                if (showLabelPicker || showAgentPicker || isEditingTitle || e.defaultPrevented) {
                    return;
                }

                // Create a synthetic save and exit effect
                if (editorRef.current) {
                    editorRef.current.save();
                }
                if (onToggleExpand) onToggleExpand(task._id, false);
                setExpanded(false);
            }

            if (e.key === 'Enter') {
                if (isDeleting) {
                    e.preventDefault();
                    confirmDelete(e);
                    return;
                }
                if (isConfirmingClose) {
                    e.preventDefault();
                    handleComplete(e);
                    return;
                }
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Only trigger if not already deleting and not typing in title/editor
                if (!isDeleting && !isConfirmingClose && !isEditingTitle && !showLabelPicker && !showAgentPicker && !e.defaultPrevented) {
                    // Check if focused element is a contenteditable or input
                    const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;
                    if (!isTyping) {
                        e.preventDefault();
                        setIsDeleting(true);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [expanded, globalExpanded, showLabelPicker, showAgentPicker, isEditingTitle, isDeleting, isConfirmingClose, task._id, onToggleExpand]);



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



    const confirmDelete = async (e) => {
        e.stopPropagation();
        if (onToggleExpand) onToggleExpand(task._id, false);
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

    const handleComplete = async (e) => {
        if (e) e.stopPropagation();
        if (onToggleExpand) onToggleExpand(task._id, false);
        setIsCompleting(true);
        try {
            if (task.status === 'Closed') {
                // Reopen the task
                const newLabels = localLabels.filter(l => l !== 'Completed');
                setLocalLabels(newLabels);
                await api.updateTask(task._id, { status: 'Active', labels: newLabels });
            } else {
                // Close the task
                if (!localLabels.includes('Completed')) {
                    const newLabels = [...localLabels, 'Completed'];
                    setLocalLabels(newLabels);
                    // Optimistically update UI
                    await api.updateTask(task._id, { labels: newLabels });
                }
                await api.updateTask(task._id, { status: 'Closed' });
            }
            onUpdate();
        } catch (err) {
            console.error("Failed to toggle task", err);
        } finally {
            setIsCompleting(false);
            setIsConfirmingClose(false);
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
            style={itemStyle}
            initial={isOverlay ? false : { opacity: 0 }}
            animate={isOverlay ? false : { opacity: baseStyle.opacity }}
            exit={isOverlay ? false : { opacity: 0 }}
            className={`group ${isLightMode ? 'hover:bg-slate-100' : 'hover:bg-white/[0.03]'} transition-all duration-200 bg-transparent ${expanded || globalExpanded ? `bg-blue-500/5 border-y border-blue-500/30 shadow-lg ${showLabelPicker ? 'z-[100]' : 'z-10'} overflow-hidden relative` : 'border-b border-[var(--border)] border-l border-l-transparent hover:shadow-[inset_1px_0_0_#3b82f6,0_1px_3px_rgba(0,0,0,0.1),0_4px_12px_-4px_rgba(0,0,0,0.1)] hover:z-10 hover:relative'}`}
        >
            <div
                className={`flex items-center gap-4 cursor-pointer pr-4 select-none transition-colors duration-200 ${(expanded || globalExpanded)
                        ? (isLightMode ? 'bg-black/5 shadow-sm' : 'bg-black/40 shadow-sm')
                        : ''
                    }`}
                onClick={() => {
                    const newState = !expanded;
                    setExpanded(newState);
                    if (onToggleExpand) onToggleExpand(task._id, newState);
                }}
                {...(expanded || globalExpanded ? {} : dragHandleProps)}
            >
                <div
                    className={`px-4 flex items-center gap-4 flex-1 min-w-0 ${expanded || globalExpanded ? 'mobile-expanded-container' : ''}`}
                    style={{
                        paddingTop: `${Math.max(1, fontSize - 11)}px`,
                        paddingBottom: `${Math.max(1, fontSize - 11)}px`
                    }}
                >
                    <div className="flex items-center gap-1 mobile-control-group">
                        {sortBy === 'manual' && !expanded && !globalExpanded && (
                            <div className="mr-1.5 opacity-30 group-hover:opacity-100 transition-opacity cursor-grab shrink-0">
                                <GripVertical size={12} className="text-[var(--text-muted)]" />
                            </div>
                        )}
                        {/* [NEW] Selection Checkbox */}
                        {/* [NEW] Selection Checkbox */}
                        <div
                            className={`w-4 h-4 rounded-sm border flex items-center justify-center cursor-pointer mr-2 transition-all ${isSelected
                                ? 'bg-blue-500 border-blue-500 opacity-100'
                                : 'border-gray-600 hover:border-blue-500 opacity-50 hover:opacity-100' // Visible but fainter by default
                                }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onToggleSelect) onToggleSelect();
                            }}
                        >
                            {isSelected && <Check size={10} className="text-white" strokeWidth={4} />}
                        </div>

                        {/* [NEW] Star Toggle - Gmail Style Multi-Color */}
                        <div
                            className="cursor-pointer mr-1 relative group/star shrink-0"
                            onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                    // Cycle: null -> yellow -> red -> green -> blue -> null
                                    const colors = [null, 'yellow', 'red', 'green', 'blue'];
                                    const currentColor = task.star_color || (task.is_starred ? 'yellow' : null); // Fallback for migration
                                    const currentIndex = colors.indexOf(currentColor);
                                    const nextColor = colors[(currentIndex + 1) % colors.length];

                                    await api.updateTask(task._id, { star_color: nextColor });
                                    onUpdate();
                                } catch (err) {
                                    console.error("Failed to toggle star", err);
                                }
                            }}
                        >
                            <Star
                                size={18}
                                className={`transition-all duration-200 ${task.star_color === 'red' ? 'text-red-500 drop-shadow-[0_0_2px_rgba(239,68,68,0.5)]' :
                                    task.star_color === 'green' ? 'text-green-500 drop-shadow-[0_0_2px_rgba(34,197,94,0.5)]' :
                                        task.star_color === 'blue' ? 'text-blue-500 drop-shadow-[0_0_2px_rgba(59,130,246,0.5)]' :
                                            (task.star_color === 'yellow' || task.is_starred) ? 'text-yellow-400 drop-shadow-[0_0_2px_rgba(250,204,21,0.5)]' :
                                                'text-gray-400 hover:text-gray-300 opacity-40 hover:opacity-100'
                                    }`}
                                fill={task.star_color || task.is_starred ? "currentColor" : "transparent"}
                                strokeWidth={task.star_color || task.is_starred ? 0 : 2}
                            />
                        </div>

                        {/* Gmail-style Importance Marker */}
                        {localLabels.includes('Important') ? (
                            <div
                                className="text-yellow-500 shrink-0"
                                title="Important"
                            >
                                <ChevronsRight size={16} strokeWidth={3} />
                            </div>
                        ) : localLabels.includes('Notable') ? (
                            <div
                                className="text-amber-300 shrink-0"
                                title="Notable"
                            >
                                <ChevronRight size={16} strokeWidth={3} />
                            </div>
                        ) : null}

                        {/* Priority Top Marker */}
                        {localLabels.includes('Priority') && (
                            <div className={`text-red-500 font-bold text-[10px] uppercase tracking-wider shrink-0 ${showPulse ? 'animate-pulse' : ''}`}>
                                Top
                            </div>
                        )}

                        {(expanded || globalExpanded) && (
                            <div
                                className="drag-handle-btn p-1 text-gray-600 hover:text-[var(--text-muted)] transition-colors cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setExpanded(false);
                                    if (onToggleExpand) onToggleExpand(task._id, false);
                                }}
                            >
                                <ChevronUp size={16} />
                            </div>
                        )}
                    </div>


                    <div className="relative flex items-center justify-center mobile-dot-group">
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
                            className="flex-1 bg-black/40 border border-blue-500/50 rounded px-2 py-0.5 text-[var(--text-main)] focus:outline-none resize-none overflow-hidden"
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
                        <div className="flex-1 min-w-0 flex items-center gap-2 group/title mobile-title-group">
                            {/* Hide title in expanded mode because it's in the editor */}
                            {!(expanded || globalExpanded) && (
                                <h3
                                    className={`font-medium text-left select-text ${expanded || globalExpanded || showFullTitles ? 'break-words whitespace-pre-wrap cursor-text' : 'truncate'} ${(task.status === 'Deleted' || task.status === 'deleted') ? 'line-through opacity-50' : ''}`}
                                    style={{
                                        fontSize: `${fontSize}px`,
                                        lineHeight: '1.4',
                                        color: textColor,
                                        filter: textBrightness > 1 ? `brightness(${1 + (textBrightness - 1) * 0.15}) contrast(${1 + (textBrightness - 1) * 0.1})` : 'none',
                                        textShadow: textBrightness > 1 ? `0 0 ${(textBrightness - 1) * 2}px rgba(255, 255, 255, ${(textBrightness - 1) * 0.15})` : 'none'
                                    }}
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
                            )}

                            {/* Labels Display */}
                            {(showTags || (expanded || globalExpanded) || (showFolders && task.folderId)) && (
                                <div className="flex flex-wrap gap-1 ml-2 shrink-0 max-w-[60%]">
                                    {/* Folder Chip */}
                                    {showFolders && task.folderId && folders && (
                                        <div
                                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded border uppercase tracking-wider font-semibold text-[10px] group/folder transition-colors bg-[var(--input-bg)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card-hover)] cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const folderName = folders.find(f => f._id === task.folderId)?.name;
                                                if (folderName && onSearch) onSearch(folderName);
                                            }}
                                        >
                                            <Folder size={10} className="text-[var(--text-muted)]" />
                                            {folders.find(f => f._id === task.folderId)?.name || 'Unknown'}
                                        </div>
                                    )}

                                    {(showTags || (expanded || globalExpanded)) && (
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
                                                        // onSearch={onSearch} // Disabled per user request
                                                        />
                                                    );
                                                })}
                                            </SortableContext>
                                        </DndContext>
                                    )}

                                    {/* Assigned Agents Chips & Picker */}
                                    {(expanded || isWorkarea) && (
                                        <div className="flex items-center gap-1">
                                            {localAssignedAgentIds.map(agentId => {
                                                const agent = agents.find(a => a._id === agentId);
                                                if (!agent) return null;
                                                return (
                                                    <div
                                                        key={agentId}
                                                        className="group/chip inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 text-[10px] font-medium pr-1.5 cursor-pointer hover:bg-blue-500/20 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onSearch) onSearch(agent.name);
                                                        }}
                                                    >
                                                        <Bot size={10} />
                                                        {agent.name}
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const newIds = localAssignedAgentIds.filter(id => id !== agentId);
                                                                setLocalAssignedAgentIds(newIds);
                                                                await api.updateTask(task._id, { assigned_agent_ids: newIds });
                                                                window.dispatchEvent(new CustomEvent('agent-updated'));
                                                                onUpdate();
                                                            }}
                                                            className="ml-0.5 p-0.5 rounded-full hover:bg-blue-500/20 text-blue-400/70 hover:text-blue-400 transition-colors opacity-0 group-hover/chip:opacity-100"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                );
                                            })}


                                        </div>
                                    )}
                                </div>
                            )}

                            {/* [NEW] Show Counts */}
                            {showCounts && !expanded && !globalExpanded && (
                                <div className="flex items-center gap-3 ml-3 shrink-0">
                                    {task.updates && task.updates.length > 0 && (
                                        <div className={`flex items-center gap-1 ${isLightMode ? 'text-gray-600' : 'text-[var(--text-muted)]'}`} title={`${task.updates.length} updates`}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" />
                                                <polyline points="12 6 12 12 16 14" />
                                            </svg>
                                            <span className="text-[10px] font-medium">{task.updates.length}</span>
                                        </div>
                                    )}
                                    {localAttachments && localAttachments.length > 0 && (
                                        <div className={`flex items-center gap-1 ${isLightMode ? 'text-gray-600' : 'text-[var(--text-muted)]'}`} title={`${localAttachments.length} attachments`}>
                                            <Paperclip size={10} />
                                            <span className="text-[10px] font-medium">{localAttachments.length}</span>
                                        </div>
                                    )}
                                    {localAssignedAgentIds && localAssignedAgentIds.length > 0 && (
                                        <div className={`flex items-center gap-1 ${isLightMode ? 'text-purple-600' : 'text-[var(--text-muted)]'}`} title={`${localAssignedAgentIds.length} agents assigned`}>
                                            <Bot size={10} />
                                            <span className="text-[10px] font-medium">{localAssignedAgentIds.length}</span>
                                        </div>
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
                        className={`text-xs font-mono font-medium whitespace-nowrap ${isLightMode ? 'text-gray-600' : 'text-[var(--text-muted)]'}`}
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
                        isWorkarea ? (
                            <button
                                className="p-1 px-2 text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded border border-red-500/20 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onRemoveFromWorkarea) onRemoveFromWorkarea();
                                    if (onToggleExpand) onToggleExpand(task._id, false);
                                    setExpanded(false);
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
                                    if (onToggleExpand) onToggleExpand(task._id, false);
                                    if (onSendToWorkarea) onSendToWorkarea();
                                    setExpanded(false);
                                }}
                                title="Set as Current Focus"
                            >
                                Focus
                            </button>
                        )
                    )}
                </div>
            </div >

            <AnimatePresence>
                {(expanded || globalExpanded) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative"
                    >
                        <div className="px-4 pb-4 pt-0 border-t border-[var(--border)]/30 bg-black/10">
                            <div className="py-4 space-y-4">
                                {/* Task Description Editor */}
                                <div className="px-4">
                                    <TaskDescriptionEditor
                                        ref={editorRef}
                                        title={task.title}
                                        initialContent={task.description}
                                        onSave={async ({ title, description }) => {
                                            // Only update if changed
                                            const updates = {};
                                            if (title !== undefined && title !== task.title) updates.title = title;
                                            if (description !== undefined && description !== task.description) updates.description = description;

                                            if (Object.keys(updates).length > 0) {
                                                await api.updateTask(task._id, updates);
                                                // We might need to optimistically update local state here?
                                                // onUpdate should handle it
                                                onUpdate();
                                            }
                                        }}
                                        onCancel={() => {
                                            if (onToggleExpand) onToggleExpand(task._id, false);
                                            setExpanded(false);
                                        }}
                                    />
                                </div>
                                {/* Attachments Chips */}
                                {localAttachments && localAttachments.length > 0 && (
                                    <div className="mb-4 pl-28 pr-4">
                                        <div className="flex flex-wrap gap-2">
                                            <DndContext
                                                sensors={sensors}
                                                collisionDetection={pointerWithinTaskItem}
                                                onDragEnd={handleAttachmentDragEnd}
                                            >
                                                {localAttachments.slice(0, attachmentLimit || 5).map(att => (
                                                    <SortableAttachment
                                                        key={att._id}
                                                        attachment={att}
                                                        availableLabels={availableLabels}
                                                        onClick={onAttachmentClick}
                                                        onDelete={() => handleUnlinkAttachment(att._id)}
                                                        onSearch={onSearch}
                                                    />
                                                ))}
                                            </DndContext>

                                            {localAttachments.length > (attachmentLimit || 5) && (
                                                <div
                                                    className="inline-flex items-center justify-center px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[10px] text-[var(--text-muted)] font-medium cursor-pointer hover:bg-[var(--card-hover)] transition-colors"
                                                    title="Show all attachments"
                                                // In a real implementation, this would toggle a 'showAllAttachments' state.
                                                // For now, let's just show the count. Or we can implement the toggle.
                                                // Since we didn't add state for it yet, let's just make it a static indicator or add simple local state?
                                                // Let's rely on the user increasing the preference if they want more permanently, OR
                                                // we add a simple local toggle. Let's add a local toggle.
                                                >
                                                    +{localAttachments.length - (attachmentLimit || 5)} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <UpdatesTimeline
                                    items={task.updates}
                                    limit={timelineLimit}
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

                            <div className="flex justify-between items-center gap-2 pt-2 border-t border-[var(--border)] mx-[-16px] px-4 bg-black/40 pb-2 mb-[-16px] rounded-b-xl">
                                {isDeleting ? (
                                    <div className="flex items-center gap-1">
                                        <button
                                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
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
                                    <div className="flex items-center gap-1">
                                        {isConfirmingClose ? (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); setIsConfirmingClose(false); }}
                                                    title="Cancel"
                                                >
                                                    <X size={14} />
                                                </button>
                                                <button
                                                    className="p-1.5 text-green-400 hover:text-green-300 transition-colors bg-green-400/10 rounded"
                                                    onClick={handleComplete}
                                                    disabled={isCompleting}
                                                    title={task.status === 'Closed' ? "Confirm Reopen" : "Confirm Close"}
                                                >
                                                    {isCompleting ? <span className="text-[10px]">...</span> : <Check size={14} />}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                className="p-1.5 text-[var(--text-muted)] hover:text-blue-400 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsConfirmingClose(true);
                                                }}
                                                disabled={isCompleting}
                                                title={task.status === 'Closed' ? "Reopen Task" : "Mark as Completed & Close"}
                                            >
                                                {task.status === 'Closed' ? <RotateCw size={14} /> : <CheckCircle size={14} />}
                                            </button>
                                        )}
                                        <button
                                            className="p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); setIsDeleting(true); }}
                                            title="Delete Task"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <div className="relative">
                                            <button
                                                ref={agentTriggerRef}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowAgentPicker(!showAgentPicker);
                                                }}
                                                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                                                title="Assign Agent"
                                            >
                                                <Bot size={14} />
                                            </button>
                                            <AnimatePresence>
                                                {showAgentPicker && (
                                                    <AgentPicker
                                                        availableAgents={agents}
                                                        selectedAgentIds={localAssignedAgentIds}
                                                        triggerRef={agentTriggerRef}
                                                        onToggle={async (agentId) => {
                                                            const newIds = localAssignedAgentIds.includes(agentId)
                                                                ? localAssignedAgentIds.filter(id => id !== agentId)
                                                                : [...localAssignedAgentIds, agentId];
                                                            setLocalAssignedAgentIds(newIds);
                                                            await api.updateTask(task._id, { assigned_agent_ids: newIds });
                                                            window.dispatchEvent(new CustomEvent('agent-updated'));
                                                            onUpdate();
                                                        }}
                                                        onClose={() => setShowAgentPicker(false)}
                                                    />
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <button
                                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                editorRef.current?.cancel();
                                            }}
                                            title="Exit (Cancel)"
                                        >
                                            <X size={14} />
                                        </button>
                                        <button
                                            className="p-1.5 text-[var(--text-muted)] hover:text-blue-500 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                editorRef.current?.save();
                                                if (onToggleExpand) onToggleExpand(task._id, false);
                                                setExpanded(false);
                                            }}
                                            title="Save & Exit"
                                        >
                                            <Check size={14} />
                                        </button>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">

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
