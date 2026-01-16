import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentItem } from './AgentItem';
import { api } from '../api';
import { Plus, Search, Sparkles } from 'lucide-react';

export const AgentList = ({ onFocusAgent, focusedAgentId, availableLabels, isCreating, setIsCreating, timelineLimit, agents, onAgentsUpdate }) => {
    const [newAgentName, setNewAgentName] = useState('');

    const handleCreateAgent = async (e) => {
        e.preventDefault();
        try {
            await api.createAgent(
                newAgentName || "New Assistant",
                "General helper",
                "I can help you with your tasks."
            );
            onAgentsUpdate();
            setIsCreating(false);
            setNewAgentName('');
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteAgent = async (id) => {
        try {
            await api.deleteAgent(id);
            onAgentsUpdate();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="px-6 pb-20">
            {isCreating && (
                <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-xl p-4 animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleCreateAgent} className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                autoFocus
                                type="text"
                                value={newAgentName}
                                onChange={(e) => setNewAgentName(e.target.value)}
                                placeholder="Name your new assistant..."
                                className="w-full bg-black/40 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <Sparkles size={16} />
                                Create Agent
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {agents.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">No AI assistants found.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {agents.map(agent => (
                        <AgentItem
                            key={agent._id}
                            agent={agent}
                            onFocus={onFocusAgent}
                            onDelete={() => handleDeleteAgent(agent._id)}
                            isFocused={focusedAgentId === agent._id}
                            availableLabels={availableLabels}
                            timelineLimit={timelineLimit}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
