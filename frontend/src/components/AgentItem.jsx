import React, { useState } from 'react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Cpu, MessageSquare, Zap, Target, Layers } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';




export const AgentItem = ({ agent, onFocus, onEdit, onDelete, isFocused }) => {
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
    const chatEndRef = React.useRef(null);

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
            // Using the global chat API for now
            const data = await api.chatWithAI(userMsg);
            setChatMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
        } catch (err) {
            console.error(err);
            setChatMessages(prev => [...prev, { role: 'ai', text: "I'm having trouble connecting right now." }]);
        } finally {
            setIsChatLoading(false);
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
                bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10
                ${isOver ? 'ring-2 ring-blue-400 bg-blue-500/20 scale-[1.02]' : ''}
            `}
        >
            {/* Chromo Hover Effect for Focused Agent */}
            {isFocused && (
                <>
                    <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                    <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-50 blur-sm transition-opacity duration-500 -z-10" />
                </>
            )}

            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className={`
                        p-3 rounded-xl flex items-center justify-center
                        bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-blue-300
                    `}>
                        <Brain size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">{agent.name}</h3>
                        <p className="text-sm text-gray-400 font-medium">{agent.role}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    {/* Placeholder for future actions */}
                </div>
            </div>

            {(!agent.active_tasks || agent.active_tasks.length === 0) && (
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                    {agent.description || "Ready to assist with your tasks. Drag tasks here to assign."}
                </p>
            )}

            {/* Assigned Tasks Chips */}
            {agent.active_tasks && agent.active_tasks.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {agent.active_tasks.map(task => (
                        <div key={task._id} className="bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]"></span>
                            <span className="truncate max-w-[150px]">{task.title}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-500 font-medium uppercase tracking-widest">
                    <span>Active Skills</span>
                    <span className="flex items-center gap-1 text-blue-400">
                        <Zap size={12} />
                        {agent.skills?.length || 0} Enabled
                    </span>
                </div>

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

                    {/* "Add Skill" Placeholder (Spans remaining) */}
                    <div className="col-span-1 border border-dashed border-white/10 rounded-lg p-2 flex items-center justify-center gap-2 text-gray-600 hover:text-gray-400 hover:border-white/20 transition-colors cursor-pointer group/skill">
                        <Cpu size={14} />
                        <span className="text-xs">Add Skill Pack</span>
                    </div>
                </div>
            </div>

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
                                    `}>
                                        {msg.text}
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
