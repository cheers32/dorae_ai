import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Cpu, MessageSquare, Zap, Target, Layers } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';

export const AgentItem = ({ agent, onFocus, onEdit, onDelete, isFocused }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `agent-${agent._id}`,
        data: { type: 'agent', agent }
    });

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
                            px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                            ${isFocused
                                ? 'bg-blue-500 text-white shadow-lg'
                                : 'bg-white/5 text-gray-400 hover:bg-blue-500 hover:text-white'
                            }
                        `}
                    >
                        {isFocused ? 'Focused' : 'Focus'}
                    </button>
                    {/* Placeholder for future actions */}
                </div>
            </div>

            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                {agent.description || "Ready to assist with your tasks. Drag tasks here to assign."}
            </p>

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
                    {/* Skills Placeholder */}
                    <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                        <MessageSquare size={14} className="text-purple-400" />
                        <span className="text-xs text-gray-300">Context Chat</span>
                    </div>
                    <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                        <Target size={14} className="text-green-400" />
                        <span className="text-xs text-gray-300">Task Planning</span>
                    </div>
                    {/* "Add Skill" Placeholder */}
                    <div className="col-span-2 border border-dashed border-white/10 rounded-lg p-2 flex items-center justify-center gap-2 text-gray-600 hover:text-gray-400 hover:border-white/20 transition-colors cursor-pointer group/skill">
                        <Cpu size={14} />
                        <span className="text-xs">Add Skill Pack</span>
                    </div>
                </div>
            </div>

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
