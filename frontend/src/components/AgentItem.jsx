import React, { useState } from 'react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Cpu, MessageSquare, Zap, Target, Layers, Pencil, Trash2, Check, X, Clock, Plus } from 'lucide-react';
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
const DraggableTaskChip = ({ task, labelColor, onUnassign }) => {
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

export const AgentItem = ({ agent, onFocus, onEdit, onDelete, isFocused, availableLabels }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `agent-${agent._id}`,
        data: { type: 'agent', agent }
    });

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

    const [showNotes, setShowNotes] = useState(false); // [NEW]
    const [showSkills, setShowSkills] = useState(false); // Skill management modal
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
            // Pass agent ID to filter tasks, but use default Gemini persona
            const data = await api.chatWithAI(userMsg, agent._id);
            setChatMessages(prev => [...prev, { role: 'ai', text: data.reply }]);

            // If a task was created, refresh the task list and agent data
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
            // Trigger refresh in parent
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

        // If dropped outside (no over target), unassign the task
        if (!over && active.data.current?.type === 'agent-task-chip') {
            const task = active.data.current.task;
            try {
                await api.updateTask(task._id, { assigned_agent_id: null });
                await api.addUpdate(task._id, `Unassigned from agent: ${agent.name}`, 'execution');
                // Trigger refresh
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`
                relative p-5 rounded-2xl border transition-all duration-300 group
                ${isFocused
                    ? 'bg-white/[0.03] border-white/5 shadow-inner'
                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                }
                ${isOver ? 'ring-2 ring-blue-400 bg-blue-500/20 scale-[1.02]' : ''}
            `}
        >


            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className={`
                        p-3 rounded-xl flex items-center justify-center
                        bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-blue-300
                    `}>
                        <Brain size={24} />
                    </div>
                    <div>
                        <div>
                            {isEditing ? (
                                <div className="flex flex-col gap-2 min-w-[200px]">
                                    <input
                                        type="text"
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        className="text-lg font-bold text-white tracking-tight bg-white/5 border border-blue-500/50 rounded px-2 py-1 focus:outline-none focus:border-blue-500 w-full"
                                        placeholder="Agent Name"
                                    />
                                    <input
                                        type="text"
                                        value={editedRole}
                                        onChange={(e) => setEditedRole(e.target.value)}
                                        className="text-sm font-medium text-gray-400 bg-white/5 border border-blue-500/50 rounded px-2 py-1 focus:outline-none focus:border-blue-500 w-full"
                                        placeholder="Agent Role"
                                    />
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-lg font-bold text-white tracking-tight">{localName}</h3>
                                    <p className="text-sm text-gray-400 font-medium">{agent.role}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3">
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
                            isEditing ? (
                                <div className="flex items-center gap-1">
                                    <button
                                        className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                                        onClick={() => { setIsEditing(false); setEditedName(localName); }}
                                        title="Cancel"
                                    >
                                        <X size={14} />
                                    </button>
                                    <button
                                        className="p-1.5 text-green-400 hover:text-green-300 transition-colors bg-green-400/10 rounded"
                                        onClick={handleSaveProfile}
                                        title="Save Profile"
                                    >
                                        <Check size={14} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors"
                                        title="Edit Profile"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsDeleting(true); }}
                                        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                        title="Delete Agent"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            )
                        )}
                        <button
                            onClick={() => onFocus(agent)}
                            className={`
                                px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border
                                ${isFocused
                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20'
                                    : 'bg-white/5 text-gray-400 hover:bg-blue-500 hover:text-white border-transparent'
                                }
                            `}
                        >
                            {isFocused ? 'Unfocus' : 'Focus'}
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-medium uppercase tracking-widest text-gray-400">
                        <span>Active Skills</span>
                        <span className="w-px h-3 bg-white/10 mx-0.5"></span>
                        <span className="flex items-center gap-1 text-blue-400">
                            <Zap size={10} />
                            {agent.skills?.length || 0}
                        </span>
                    </div>
                </div>
            </div>

            {isEditing ? (
                <div className="mb-6">
                    <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        placeholder="Enter system instructions / description for this agent..."
                        rows={3}
                        className="w-full bg-white/5 border border-blue-500/50 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 leading-relaxed custom-scrollbar"
                    />
                </div>
            ) : (
                (!agent.active_tasks || agent.active_tasks.length === 0) && (
                    <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                        {agent.description || "Ready to assist with your tasks. Drag tasks here to assign."}
                    </p>
                )
            )}

            {/* Assigned Tasks Chips */}
            {agent.active_tasks && agent.active_tasks.length > 0 && (
                <DndContext sensors={sensors} onDragEnd={handleTaskChipDragEnd}>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {agent.active_tasks.map(task => {
                            const labelColor = availableLabels?.find(l => l.name === task.labels?.[0])?.color || '#3B82F6';
                            return (
                                <DraggableTaskChip
                                    key={task._id}
                                    task={task}
                                    labelColor={labelColor}
                                />
                            );
                        })}
                    </div>
                </DndContext>
            )}

            <div className="space-y-3">

                <div className="grid grid-cols-2 gap-2">
                    {/* Context Chat Toggle */}
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={`
                            p-2 rounded-lg border flex items-center gap-2 transition-all
                            ${showChat
                                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                : 'bg-black/20 border-white/5 text-gray-300 hover:bg-white/5 hover:border-white/10'
                            }
                        `}
                    >
                        <MessageSquare size={14} className={showChat ? "text-purple-300" : "text-purple-400"} />
                        <span className="text-xs">Context Chat</span>
                    </button>

                    {/* Notes Toggle */}
                    <button
                        onClick={() => setShowNotes(!showNotes)}
                        className={`
                            p-2 rounded-lg border flex items-center gap-2 transition-all
                            ${showNotes
                                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                                : 'bg-black/20 border-white/5 text-gray-300 hover:bg-white/5 hover:border-white/10'
                            }
                        `}
                    >
                        <Pencil size={14} className={showNotes ? "text-yellow-300" : "text-yellow-400"} />
                        <span className="text-xs">Notes ({agent.notes?.length || 0})</span>
                    </button>

                    <button
                        onClick={() => setShowSkills(!showSkills)}
                        className={`
                            col-span-2 border rounded-lg p-2 flex items-center justify-center gap-2 transition-all
                            ${showSkills
                                ? 'border-green-500/50 bg-green-500/20 text-green-300'
                                : 'border-dashed border-white/10 text-gray-600 hover:text-gray-400 hover:border-white/20 cursor-pointer group/skill'
                            }
                        `}
                    >
                        <Cpu size={14} />
                        <span className="text-xs">{showSkills ? 'Close Skills' : 'Add AI Skill'}</span>
                    </button>
                </div>
            </div>

            {/* Inline Notes Window */}
            <AnimatePresence>
                {showNotes && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="bg-black/40 rounded-xl border border-white/10 overflow-hidden"
                    >
                        <div className="p-4 custom-scrollbar">
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
                                placeholder="Add a persistent instruction or memory..."
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI Skills Management Modal */}
            <AnimatePresence>
                {showSkills && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="bg-black/40 rounded-xl border border-white/10 overflow-hidden"
                    >
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Zap size={14} className="text-yellow-400" />
                                    Available AI Skills
                                </h4>
                                <span className="text-xs text-gray-500">
                                    {agent.skills?.length || 0} enabled
                                </span>
                            </div>

                            <div className="space-y-2">
                                {AVAILABLE_SKILLS.map(skill => {
                                    const isEnabled = agent.skills?.includes(skill.id);
                                    const IconComponent = skill.icon;

                                    return (
                                        <button
                                            key={skill.id}
                                            onClick={() => handleToggleSkill(skill.id)}
                                            className={`
                                                w-full p-3 rounded-lg border transition-all text-left
                                                ${isEnabled
                                                    ? `bg-${skill.color}-500/20 border-${skill.color}-500/50 hover:bg-${skill.color}-500/30`
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                                }
                                            `}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className={`
                                                        p-2 rounded-lg
                                                        ${isEnabled
                                                            ? `bg-${skill.color}-500/30 text-${skill.color}-300`
                                                            : 'bg-white/10 text-gray-400'
                                                        }
                                                    `}>
                                                        <IconComponent size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`
                                                                text-sm font-bold
                                                                ${isEnabled ? 'text-white' : 'text-gray-300'}
                                                            `}>
                                                                {skill.name}
                                                            </span>
                                                            {isEnabled && (
                                                                <span className={`
                                                                    px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                                                                    bg-${skill.color}-500/30 text-${skill.color}-300
                                                                `}>
                                                                    Active
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {skill.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className={`
                                                    w-10 h-5 rounded-full transition-all border
                                                    ${isEnabled
                                                        ? `bg-${skill.color}-500 border-${skill.color}-400`
                                                        : 'bg-gray-700 border-gray-600'
                                                    }
                                                    relative
                                                `}>
                                                    <div className={`
                                                        absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-lg transition-all
                                                        ${isEnabled ? 'right-0.5' : 'left-0.5'}
                                                    `} />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <p className="text-xs text-blue-300 flex items-start gap-2">
                                    <Zap size={12} className="mt-0.5 flex-shrink-0" />
                                    <span>
                                        Toggle skills to unlock new capabilities for this agent. Each skill adds API endpoints and autonomous actions.
                                    </span>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Inline Chat Window */}
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="bg-black/40 rounded-xl border border-white/10 overflow-hidden"
                    >
                        <div className="h-48 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`
                                        max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed
                                        ${msg.role === 'user'
                                            ? 'bg-blue-500/20 text-blue-100 border border-blue-500/20'
                                            : 'bg-white/5 text-gray-300 border border-white/5'
                                        }
                                        prose prose-invert prose-xs max-w-none
                                        [&_p]:mb-1 [&_p:last-child]:mb-0
                                        [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-1
                                        [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-1
                                        [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded
                                        [&_strong]:text-white [&_strong]:font-bold
                                    `}>
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            {isChatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                                        <div className="flex gap-1">
                                            <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={handleSendMessage} className="p-2 border-t border-white/10 bg-black/20">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Type a message..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-gray-600"
                            />
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Drag Target Indicator */}
            {isOver && (
                <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center z-50 animate-pulse">
                    <div className="bg-black/80 px-4 py-2 rounded-full border border-blue-500 text-blue-400 font-bold shadow-xl">
                        Drop to Assign
                    </div>
                </div>
            )}
        </motion.div>
    );
};
