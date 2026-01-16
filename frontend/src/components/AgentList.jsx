import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentItem } from './AgentItem';
import { api } from '../api';
import { Plus, Search, Sparkles } from 'lucide-react';

export const AgentList = ({ onFocusAgent, focusedAgentId, availableLabels, isCreating, setIsCreating }) => {
    const [agents, setAgents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newAgentName, setNewAgentName] = useState('');


    useEffect(() => {
        fetchAgents();

        // Listen for updates (assignments)
        const handleAgentUpdate = () => fetchAgents();
        window.addEventListener('agent-updated', handleAgentUpdate);

        return () => {
            window.removeEventListener('agent-updated', handleAgentUpdate);
        };
    }, []);

    const fetchAgents = async () => {
        try {
            const data = await api.getAgents();
            setAgents(data);
        } catch (error) {
            console.error("Failed to fetch agents", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateAgent = async (e) => {
        e.preventDefault();
        if (!newAgentName.trim()) return;

        try {
            const newAgent = await api.createAgent(newAgentName, 'Assistant');
            setAgents([newAgent, ...agents]);
            setNewAgentName('');
            setIsCreating(false);
        } catch (error) {
            console.error("Failed to create agent", error);
        }
    };

    const handleDeleteAgent = async (id) => {
        try {
            await api.deleteAgent(id);
            setAgents(agents.filter(a => a._id !== id));
        } catch (error) {
            console.error("Failed to delete agent", error);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0f111a] text-white overflow-hidden">
            {/* Header Removed - Managed by TaskManager */}
            {agents.length === 0 && (
                <div className="flex-none px-8 py-4">
                    <p className="text-gray-400">Manage your team of AI assistants</p>
                </div>
            )}

            {/* Content */}
            <div className="p-4">

                {/* Creation Form */}
                <AnimatePresence>
                    {isCreating && (
                        <motion.form
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-4"
                            onSubmit={handleCreateAgent}
                        >
                            <div className="bg-gray-900/50 border border-blue-500/30 rounded-xl p-3 flex items-center gap-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                    <Sparkles size={18} />
                                </div>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newAgentName}
                                    onChange={(e) => setNewAgentName(e.target.value)}
                                    placeholder="Name your new agent..."
                                    className="flex-1 bg-transparent border-none text-base font-medium placeholder-gray-600 focus:ring-0 text-white"
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                {/* List - Using flex-col instead of grid */}
                <div className="flex flex-col">
                    {agents
                        .filter(agent => agent._id !== focusedAgentId)
                        .map(agent => (
                            <AgentItem
                                key={agent._id}
                                agent={agent}
                                isFocused={focusedAgentId === agent._id}
                                onFocus={onFocusAgent}
                                onDelete={() => handleDeleteAgent(agent._id)}
                                availableLabels={availableLabels}
                            />
                        ))}

                    {/* Empty State - Simplified */}
                    {!isLoading && agents.length === 0 && !isCreating && (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-500 opacity-50">
                            <Sparkles size={32} className="mb-4 text-gray-600" />
                            <p className="text-sm">No active agents</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
