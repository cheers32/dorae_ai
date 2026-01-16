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
    ChevronDown,
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
const DraggableTaskChip = ({ task, labelColor }) => {
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
            className="border px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
            style={{
                ...style,
                backgroundColor: `${labelColor}1a`,
                borderColor: `${labelColor}33`,
                color: labelColor
            }}
        >
            <span
                className="w-1.5 h-1.5 rounded-full shadow-sm"
                style={{
                    backgroundColor: labelColor,
                    boxShadow: `0 0 8px ${labelColor}80`
                }}
            ></span>
            <span className="truncate max-w-[150px] text-gray-300">{task.title}</span>
        </div>
    );
};

export const AgentItem = ({ agent, onFocus, onDelete, isFocused, availableLabels }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `agent-${agent._id}`,
        data: { type: 'agent', agent }
    });

    const [expanded, setExpanded] = useState(false);
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

    const [showNotes, setShowNotes] = useState(false);
    const [showSkills, setShowSkills] = useState(false);
    const chatEndRef = React.useRef(null);

    // Sync local state when agent prop changes
    React.useEffect(() => {
        setLocalName(agent.name);
        setEditedName(agent.name);
        setEditedRole(agent.role);
        setEditedDescription(agent.description || '');
    }, [agent.name, agent.role, agent.description]);

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
                    : 'border-b border-white/5 border-l-4 border-l-transparent hover:bg-white/[0.03]'
                }
                ${isOver ? 'ring-2 ring-blue-400 bg-blue-500/20' : ''}
            `}
        >
            {/* Header / Row */}
            <div
                className="flex items-center gap-4 cursor-pointer px-4 py-3 select-none"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Expand Icon */}
                <div className={`p-1 text-gray-600 hover:text-gray-400 transition-colors`}>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {/* Agent Icon */}
                <div className={`
                    p-1.5 rounded-lg flex items-center justify-center shrink-0
                    ${isFocused ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-gray-500 group-hover:bg-white/10 group-hover:text-gray-300'}
                `}>
                    <Brain size={18} />
                </div>

                {/* Name & Role */}
                <div className="flex-1 min-w-0 flex items-center gap-3">
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
                                className="bg-black/40 border border-blue-500/50 rounded px-2 py-0.5 text-gray-400 text-xs focus:outline-none flex-1"
                                placeholder="Role"
                            />
                        </div>
                    ) : (
                        <div className="flex items-baseline gap-3 truncate">
                            <h3 className="text-sm font-medium text-gray-200">{localName}</h3>
                            <span className="text-xs text-gray-500">{agent.role}</span>
                        </div>
                    )}
                </div>

                {/* Status/Badge */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-white/5 text-gray-500">
                        <Zap size={10} />
                        <span>{agent.skills?.length || 0} Skills</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        {isDeleting ? (
                            <div className="flex items-center gap-1">
                                <button className="p-1 text-gray-500 hover:text-gray-300 transition-colors" onClick={() => setIsDeleting(false)}>
                                    <X size={14} />
                                </button>
                                <button className="p-1 text-green-400 hover:text-green-300 transition-colors" onClick={confirmDelete}>
                                    <Check size={14} />
                                </button>
                            </div>
                        ) : isEditing ? (
                            <div className="flex items-center gap-1">
                                <button className="p-1 text-gray-500 hover:text-gray-300 transition-colors" onClick={() => { setIsEditing(false); setEditedName(localName); }}>
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
                                        p-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors
                                        ${isFocused
                                            ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                                        }
                                    `}
                                >
                                    {isFocused ? 'Unfocus' : 'Focus'}
                                </button>
                                <button onClick={() => setIsEditing(true)} className="p-1 text-gray-500 hover:text-blue-400 transition-colors">
                                    <Pencil size={14} />
                                </button>
                                <button onClick={() => setIsDeleting(true)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                                    <Trash2 size={14} />
                                </button>
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
                        <div className="px-4 pb-4 pt-0 border-t border-white/5 bg-black/20">
                            {/* Description / Instructions */}
                            <div className="py-4">
                                {isEditing ? (
                                    <textarea
                                        value={editedDescription}
                                        onChange={(e) => setEditedDescription(e.target.value)}
                                        placeholder="System instructions..."
                                        rows={3}
                                        className="w-full bg-black/40 border border-blue-500/50 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-400 italic">
                                        {agent.description || "No system instructions set."}
                                    </p>
                                )}
                            </div>

                            {/* Assigned Tasks */}
                            {agent.active_tasks && agent.active_tasks.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assigned Tasks</h4>
                                    <DndContext sensors={sensors} onDragEnd={handleTaskChipDragEnd}>
                                        <div className="flex flex-wrap gap-2">
                                            {agent.active_tasks.map(task => {
                                                const labelColor = availableLabels?.find(l => l.name === task.labels?.[0])?.color || '#3B82F6';
                                                return <DraggableTaskChip key={task._id} task={task} labelColor={labelColor} />;
                                            })}
                                        </div>
                                    </DndContext>
                                </div>
                            )}

                            {/* Tools / Features Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                {/* Chat */}
                                <div className="border border-white/5 rounded-lg bg-black/20 overflow-hidden flex flex-col h-[300px]">
                                    <div className="p-3 border-b border-white/5 flex items-center gap-2 bg-white/5">
                                        <MessageSquare size={14} className="text-purple-400" />
                                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Chat</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                        {chatMessages.map((msg, i) => (
                                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`
                                                    max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed
                                                    ${msg.role === 'user'
                                                        ? 'bg-blue-500/20 text-blue-100 border border-blue-500/20'
                                                        : 'bg-white/5 text-gray-300 border border-white/5'
                                                    }
                                                `}>
                                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                                </div>
                                            </div>
                                        ))}
                                        {isChatLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                                                    <span className="animate-pulse text-gray-500 text-xs">Thinking...</span>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>
                                    <form onSubmit={handleSendMessage} className="p-2 border-t border-white/5 bg-black/20">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            placeholder="Message agent..."
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                                        />
                                    </form>
                                </div>

                                {/* Skills & Notes */}
                                <div className="space-y-4">
                                    {/* Skills */}
                                    <div className="border border-white/5 rounded-lg bg-black/20 overflow-hidden">
                                        <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
                                            <div className="flex items-center gap-2">
                                                <Cpu size={14} className="text-green-400" />
                                                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Skills</span>
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
                                                            ${isEnabled ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <skill.icon size={14} className={isEnabled ? 'text-green-400' : 'text-gray-500'} />
                                                            <span className={`text-xs ${isEnabled ? 'text-green-100' : 'text-gray-400'}`}>{skill.name}</span>
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
                                    <div className="border border-white/5 rounded-lg bg-black/20 overflow-hidden flex flex-col h-[150px]">
                                        <div className="p-3 border-b border-white/5 flex items-center gap-2 bg-white/5">
                                            <Pencil size={14} className="text-yellow-400" />
                                            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Memory / Notes</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                            <UpdatesTimeline
                                                items={agent.notes || []}
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
