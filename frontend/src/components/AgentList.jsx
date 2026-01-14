import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentItem } from './AgentItem';
import { api } from '../api';
import { Plus, Search, Sparkles } from 'lucide-react';

export const AgentList = ({ onFocusAgent, focusedAgentId }) => {
    const [agents, setAgents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
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
            {/* Header */}
            <div className="flex-none p-8 pb-4">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                        My Agents
                    </h1>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={18} />
                        Hire Agent
                    </button>
                </div>
                <p className="text-gray-400">Manage your team of AI assistants</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">

                {/* Creation Form */}
                <AnimatePresence>
                    {isCreating && (
                        <motion.form
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-8"
                            onSubmit={handleCreateAgent}
                        >
                            <div className="bg-gray-900/50 border border-blue-500/30 rounded-2xl p-4 flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                                    <Sparkles size={24} />
                                </div>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newAgentName}
                                    onChange={(e) => setNewAgentName(e.target.value)}
                                    placeholder="Name your new agent..."
                                    className="flex-1 bg-transparent border-none text-xl font-medium placeholder-gray-600 focus:ring-0 text-white"
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                {/* Grid */}
                <div className="grid grid-cols-1 gap-4">
                    {agents
                        .filter(agent => agent._id !== focusedAgentId)
                        .map(agent => (
                            <AgentItem
                                key={agent._id}
                                agent={agent}
                                isFocused={focusedAgentId === agent._id}
                                onFocus={onFocusAgent}
                                onDelete={() => handleDeleteAgent(agent._id)}
                            />
                        ))}

                    {/* Empty State */}
                    {!isLoading && agents.length === 0 && !isCreating && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500">
                            <div className="p-6 bg-white/5 rounded-full mb-6">
                                <Sparkles size={48} className="opacity-50" />
                            </div>
                            <h3 className="text-xl font-medium text-white mb-2">No active agents</h3>
                            <p className="max-w-md text-center">
                                Start by hiring your first AI agent to help manage your tasks and workflow specific needs.
                            </p>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="mt-8 text-blue-400 hover:text-blue-300 transition-colors font-medium flex items-center gap-2"
                            >
                                <Plus size={18} />
                                Create First Agent
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
