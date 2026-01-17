import React, { useState } from 'react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    Cpu,
    MessageSquare,
    Zap,
    Pencil,
    Trash2,
    Check,
    X,
    Clock,
    Plus,
    ChevronUp,
    GripVertical,
    ListTodo,
    Bot,
    Folder
} from 'lucide-react';
import { useDroppable, useDraggable, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { UpdatesTimeline } from './UpdatesTimeline';
import ReactMarkdown from 'react-markdown';

// Available AI Skills
const AVAILABLE_SKILLS = [
    {
        id: 'timer',
        name: 'Timer',
        description: 'Schedule periodic actions on tasks',
        icon: Clock,
        color: 'blue'
    },
    {
        id: 'add_task',
        name: 'Add Task',
        description: 'Create tasks programmatically via API',
        icon: Plus,
        color: 'green'
    }
];

// Draggable Task Chip Component
const DraggableTaskChip = ({ task, labelColor, onRemove, onSearch }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `agent-task-${task._id}`,
        data: { task, type: 'agent-task-chip' }
    });

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab'
    };

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className="border px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors group/chip cursor-pointer"
            style={{
                ...style,
                color: labelColor
            }}
            onClick={(e) => {
                if (onSearch) {
                    onSearch(task.title);
                }
            }}
        >
            <span
                className="w-1.5 h-1.5 rounded-full shadow-sm"
                style={{
                    backgroundColor: labelColor,
                    boxShadow: `0 0 8px ${labelColor}80`
                }}
            ></span>
            <span className="truncate max-w-[150px] text-[var(--text-main)]">{task.title}</span>
            {onRemove && (
                <button
                    className="ml-0.5 p-0.5 rounded-full hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-white transition-colors opacity-0 group-hover/chip:opacity-100"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
                >
                    <X size={10} />
                </button>
            )}
        </div>
    );
};

export const AgentItem = ({ agent, onFocus, onDelete, isFocused, availableLabels, timelineLimit = 3, attachmentLimit = 5, defaultExpanded, onToggleExpand, onSearch }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `agent-${agent._id}`,
        data: { type: 'agent', agent }
    });

    const [expanded, setExpanded] = useState(defaultExpanded || false);
    const [showChat, setShowChat] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState([
        { role: 'ai', text: `Hi! I'm ${agent.name}. How can I help with your tasks?` }
    ]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(agent.name);
    const [editedRole, setEditedRole] = useState(agent.role);
    const [editedDescription, setEditedDescription] = useState(agent.description || '');
    const [localName, setLocalName] = useState(agent.name);
    const [isDeleting, setIsDeleting] = useState(false);

    const matchTaskItemPadding = { paddingTop: '5px', paddingBottom: '5px' }; // Approximate match to TaskItem's dynamic padding

    const chatEndRef = React.useRef(null);

    // Sync local state when agent prop changes
    React.useEffect(() => {
        setLocalName(agent.name);
        setEditedName(agent.name);
        setEditedRole(agent.role);
        setEditedDescription(agent.description || '');
    }, [agent.name, agent.role, agent.description]);

    // [NEW] Sync expanded state if defaultExpanded changes explicitly
    React.useEffect(() => {
        if (defaultExpanded !== undefined) {
            setExpanded(defaultExpanded);
        }
    }, [defaultExpanded]);

    React.useEffect(() => {
        if (showChat && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatMessages, showChat]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || isChatLoading) return;

        const userMsg = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsChatLoading(true);

        try {
            const data = await api.chatWithAI(userMsg, agent._id);
            setChatMessages(prev => [...prev, { role: 'ai', text: data.reply }]);

            if (data.task_created) {
                window.dispatchEvent(new CustomEvent('task-created'));
                window.dispatchEvent(new CustomEvent('agent-updated'));
            }
        } catch (err) {
            console.error(err);
            setChatMessages(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting right now." }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            await api.updateAgent(agent._id, {
                name: editedName,
                role: editedRole,
                description: editedDescription
            });
            setLocalName(editedName);
            setIsEditing(false);
            window.dispatchEvent(new CustomEvent('agent-updated'));
        } catch (err) {
            console.error(err);
        }
    };

    const confirmDelete = async (e) => {
        e.stopPropagation();
        try {
            await onDelete();
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleSkill = async (skillId) => {
        try {
            const currentSkills = agent.skills || [];
            const hasSkill = currentSkills.includes(skillId);

            const updatedSkills = hasSkill
                ? currentSkills.filter(s => s !== skillId)
                : [...currentSkills, skillId];

            await api.updateAgent(agent._id, { skills: updatedSkills });
            window.dispatchEvent(new CustomEvent('agent-updated'));
        } catch (err) {
            console.error('Failed to toggle skill:', err);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 }
        })
    );

    const handleTaskChipDragEnd = async (event) => {
        const { active, over } = event;
        if (!over && active.data.current?.type === 'agent-task-chip') {
            const task = active.data.current.task;
            try {
                await api.updateTask(task._id, { assigned_agent_id: null });
                await api.addUpdate(task._id, `Unassigned from agent: ${agent.name}`, 'execution');
                window.dispatchEvent(new CustomEvent('agent-updated'));
            } catch (err) {
                console.error('Failed to unassign task:', err);
            }
        }
    };

    return (
        <motion.div
            layout
            ref={setNodeRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`
                group transition-all duration-200 bg-transparent
                ${expanded
                    ? 'mb-4 rounded-xl bg-blue-500/5 border-blue-500/30 border shadow-lg'
                    : 'border-b border-[var(--border)] border-l border-l-transparent hover:bg-white/[0.03]'
                }
                ${isOver ? 'ring-2 ring-blue-400 bg-blue-500/20' : ''}
            `}
        >
            {/* Header / Row */}
            <div
                className="flex items-center gap-4 cursor-pointer pr-4 select-none"
                onClick={() => {
                    const newState = !expanded;
                    setExpanded(newState);
                    if (onToggleExpand) onToggleExpand(agent._id, newState);
                }}
            >
                <div
                    className="px-4 flex items-center gap-4 flex-1 min-w-0"
                    style={matchTaskItemPadding}
                >
                    {/* Grip/Expand Icon */}
                    <div className={`p-1 text-gray-600 hover:text-[var(--text-muted)] transition-colors ${expanded ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}>
                        {expanded ? <ChevronUp size={16} /> : <GripVertical size={16} />}
                    </div>

                    {/* Agent Icon (Analogous to Status Dot) */}
                    <div className="relative flex items-center justify-center">
                        <div className={`
                            p-1.5 rounded-lg flex items-center justify-center shrink-0 transition-transform active:scale-95
                            ${isFocused
                                ? 'bg-blue-500/20 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                : 'bg-[var(--input-bg)] text-[var(--text-muted)] group-hover:bg-[var(--card-hover)] group-hover/text-[var(--text-main)]'
                            }
                        `}>
                            <Brain size={14} />
                        </div>
                    </div>

                    {/* Name & Role */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                        {isEditing ? (
                            <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    className="bg-black/40 border border-blue-500/50 rounded px-2 py-0.5 text-white text-sm font-medium focus:outline-none w-32"
                                    placeholder="Name"
                                />
                                <input
                                    type="text"
                                    value={editedRole}
                                    onChange={(e) => setEditedRole(e.target.value)}
                                    className="bg-black/40 border border-blue-500/50 rounded px-2 py-0.5 text-[var(--text-muted)] text-xs focus:outline-none flex-1"
                                    placeholder="Role"
                                />
                            </div>
                        ) : (
                            <h3 className={`font-medium text-left truncate ${expanded ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`} style={{ fontSize: '12px', lineHeight: '1.4' }}>
                                {localName}
                                <span className="text-gray-600 font-normal ml-2 text-[11px]">
                                    <span className="text-gray-700 mr-1">-</span>
                                    {agent.role}
                                </span>
                            </h3>
                        )}

                        {/* Status/Badge */}
                        {!expanded && (
                            <div className="flex items-center gap-3 ml-2">
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider text-gray-600 bg-[var(--input-bg)]">
                                    <Zap size={10} />
                                    <span>{agent.skills?.length || 0}</span>
                                </div>
                                {agent.active_tasks?.length > 0 && (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider text-blue-500/70 bg-blue-500/5">
                                        <ListTodo size={10} />
                                        <span>{agent.active_tasks.length}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                    {/* Actions */}
                    <div className={`flex items-center gap-2 transition-opacity ${expanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={e => e.stopPropagation()}>
                        {isDeleting ? (
                            <div className="flex items-center gap-1">
                                <button className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors" onClick={() => setIsDeleting(false)}>
                                    <X size={14} />
                                </button>
                                <button className="p-1 text-green-400 hover:text-green-300 transition-colors" onClick={confirmDelete}>
                                    <Check size={14} />
                                </button>
                            </div>
                        ) : isEditing ? (
                            <div className="flex items-center gap-1">
                                <button className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors" onClick={() => { setIsEditing(false); setEditedName(localName); }}>
                                    <X size={14} />
                                </button>
                                <button className="p-1 text-green-400 hover:text-green-300 transition-colors" onClick={handleSaveProfile}>
                                    <Check size={14} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => onFocus(agent)}
                                    className={`
                                        p-1 px-2 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors
                                        ${isFocused
                                            ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                                        }
                                    `}
                                >
                                    {isFocused ? 'Unfocus' : 'Focus'}
                                </button>
                                {expanded && (
                                    <>
                                        <button onClick={() => setIsEditing(true)} className="p-1 text-[var(--text-muted)] hover:text-blue-400 transition-colors">
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => setIsDeleting(true)} className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <div className="px-4 pb-4 pt-0 border-t border-[var(--border)] bg-black/20">
                            {/* Description / Instructions */}
                            <div className="py-4">
                                {isEditing ? (
                                    <textarea
                                        value={editedDescription}
                                        onChange={(e) => setEditedDescription(e.target.value)}
                                        placeholder="System instructions..."
                                        rows={3}
                                        className="w-full bg-black/40 border border-blue-500/50 rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none"
                                    />
                                ) : (
                                    <p className="text-sm text-[var(--text-muted)] italic">
                                        {agent.description || "No system instructions set."}
                                    </p>
                                )}
                            </div>


                            {/* [NEW] Assigned Folders */}
                            {agent.assigned_folders && agent.assigned_folders.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Assigned Folders</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {agent.assigned_folders.map(folder => (
                                            <div
                                                key={folder._id}
                                                className="border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm text-blue-200 group/chip"
                                            >
                                                <Folder size={12} className="text-blue-400" />
                                                <span className="truncate max-w-[150px]">{folder.name}</span>
                                                <button
                                                    className="ml-0.5 p-0.5 rounded-full hover:bg-[var(--card-hover)] text-blue-400 hover:text-white transition-colors opacity-0 group-hover/chip:opacity-100"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            await api.unassignFolderFromAgent(folder._id, agent._id);
                                                            window.dispatchEvent(new CustomEvent('agent-updated'));
                                                        } catch (err) {
                                                            console.error("Failed to unassign folder", err);
                                                        }
                                                    }}
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Assigned Tasks */}
                            {agent.active_tasks && agent.active_tasks.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Assigned Tasks</h4>
                                    <DndContext sensors={sensors} onDragEnd={handleTaskChipDragEnd}>
                                        <div className="flex flex-wrap gap-2">
                                            {agent.active_tasks.slice(0, attachmentLimit || 5).map(task => {
                                                const labelColor = availableLabels?.find(l => l.name === task.labels?.[0])?.color || '#3B82F6';
                                                return (
                                                    <DraggableTaskChip
                                                        key={task._id}
                                                        task={task}
                                                        labelColor={labelColor}
                                                        onRemove={async () => {
                                                            // Unassign logic
                                                            let currentIds = task.assigned_agent_ids || [];
                                                            if (currentIds.length === 0 && task.assigned_agent_id) {
                                                                currentIds = [task.assigned_agent_id];
                                                            }
                                                            const newIds = currentIds.filter(id => String(id) !== String(agent._id));

                                                            await api.updateTask(task._id, { assigned_agent_ids: newIds });
                                                            window.dispatchEvent(new CustomEvent('agent-updated'));
                                                            window.dispatchEvent(new CustomEvent('task-created')); // Trigger task list refresh
                                                        }}
                                                        onSearch={onSearch}
                                                    />
                                                );
                                            })}
                                            {agent.active_tasks.length > (attachmentLimit || 5) && (
                                                <div
                                                    className="inline-flex items-center justify-center px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[10px] text-[var(--text-muted)] font-medium cursor-pointer hover:bg-[var(--card-hover)] transition-colors"
                                                    title="Show all assigned tasks"
                                                >
                                                    +{agent.active_tasks.length - (attachmentLimit || 5)} more
                                                </div>
                                            )}
                                        </div>
                                    </DndContext>
                                </div>
                            )}

                            {/* Tools / Features Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                {/* Chat */}
                                <div className="border border-[var(--border)] rounded-lg bg-black/20 overflow-hidden flex flex-col h-[300px]">
                                    <div className="p-3 border-b border-[var(--border)] flex items-center gap-2 bg-[var(--input-bg)]">
                                        <MessageSquare size={14} className="text-purple-400" />
                                        <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Chat</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                        {chatMessages.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`
                                                    max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed
                                                    ${msg.role === 'user'
                                                        ? 'bg-blue-500/20 text-blue-100 border border-blue-500/20'
                                                        : 'bg-[var(--input-bg)] text-[var(--text-main)] border border-[var(--border)]'
                                                    }
                                                `}>
                                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                        {isChatLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-[var(--input-bg)] rounded-lg px-3 py-2 border border-[var(--border)]">
                                                    <span className="animate-pulse text-[var(--text-muted)] text-xs">Thinking...</span>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>
                                    <form onSubmit={handleSendMessage} className="p-2 border-t border-[var(--border)] bg-black/20">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            placeholder="Message agent..."
                                            className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                                        />
                                    </form>
                                </div>

                                {/* Skills & Notes */}
                                <div className="space-y-4">
                                    {/* Skills */}
                                    <div className="border border-[var(--border)] rounded-lg bg-black/20 overflow-hidden">
                                        <div className="p-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--input-bg)]">
                                            <div className="flex items-center gap-2">
                                                <Cpu size={14} className="text-green-400" />
                                                <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Skills</span>
                                            </div>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {AVAILABLE_SKILLS.map(skill => {
                                                const isEnabled = agent.skills?.includes(skill.id);
                                                return (
                                                    <div key={skill.id}
                                                        onClick={() => handleToggleSkill(skill.id)}
                                                        className={`
                                                            flex items-center justify-between p-2 rounded cursor-pointer transition-colors border
                                                            ${isEnabled ? 'bg-green-500/10 border-green-500/20' : 'bg-[var(--input-bg)] border-[var(--border)] hover:bg-[var(--card-hover)]'}
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <skill.icon size={14} className={isEnabled ? 'text-green-400' : 'text-[var(--text-muted)]'} />
                                                            <span className={`text-xs ${isEnabled ? 'text-green-100' : 'text-[var(--text-muted)]'}`}>{skill.name}</span>
                                                        </div>
                                                        <div className={`
                                                            w-6 h-3 rounded-full relative transition-colors
                                                            ${isEnabled ? 'bg-green-500' : 'bg-gray-700'}
                                                        `}>
                                                            <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${isEnabled ? 'right-0.5' : 'left-0.5'}`} />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="border border-[var(--border)] rounded-lg bg-black/20 overflow-hidden flex flex-col h-[150px]">
                                        <div className="p-3 border-b border-[var(--border)] flex items-center gap-2 bg-[var(--input-bg)]">
                                            <Pencil size={14} className="text-yellow-400" />
                                            <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Memory / Notes</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                            <UpdatesTimeline
                                                items={agent.notes || []}
                                                limit={timelineLimit}
                                                onAdd={async (content) => {
                                                    await api.addAgentNote(agent._id, content);
                                                    window.dispatchEvent(new CustomEvent('agent-updated'));
                                                }}
                                                onEdit={async (id, content) => {
                                                    await api.updateAgentNote(agent._id, id, content);
                                                    window.dispatchEvent(new CustomEvent('agent-updated'));
                                                }}
                                                onDelete={async (id) => {
                                                    await api.deleteAgentNote(agent._id, id);
                                                    window.dispatchEvent(new CustomEvent('agent-updated'));
                                                }}
                                                placeholder="Add memory..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Drag Overlay */}
            {isOver && (
                <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-50 pointer-events-none border-2 border-blue-500 border-dashed">
                </div>
            )}
        </motion.div>
    );
};
