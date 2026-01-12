import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { TaskItem } from './TaskItem';
import { Sidebar } from './Sidebar';
import { ChatInterface } from './ChatInterface';
import { Plus, Home as HomeIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const TaskManager = () => {
    const [tasks, setTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'closed' | 'assistant'
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userProfile');
        navigate('/login');
    };

    const fetchTasks = async () => {
        if (activeTab === 'assistant') {
            setLoading(false);
            return;
        }

        try {
            setError(null);
            const data = await api.getTasks(activeTab === 'active' ? 'pending' : 'completed');
            if (data.error) throw new Error(data.error);
            setTasks(data);
        } catch (err) {
            console.error("Failed to fetch tasks", err);
            setError("Unable to load tasks. The server might be down or misconfigured (DB connection).");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [activeTab]);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            await api.createTask(newTaskTitle);
            setNewTaskTitle('');
            fetchTasks();
        } catch (err) {
            console.error(err);
        }
    };

    const getHeaderTitle = () => {
        switch (activeTab) {
            case 'active': return 'Active Tasks';
            case 'closed': return 'Closed Tasks';
            case 'assistant': return 'AI Assistant';
            default: return 'Tasks';
        }
    }

    return (
        <div className="flex h-screen bg-[#0f1014] text-gray-200 font-sans overflow-hidden">
            {/* Back to Home Button Overlay or Integrated into Sidebar */}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Extra floating home button for navigation */}


            <main className="flex-1 flex flex-col min-w-0 bg-[#0f1014] h-full relative">
                <header className="px-8 py-8 flex justify-between items-center">
                    <div className="flex items-baseline gap-4">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-200">
                            {getHeaderTitle()}
                        </h1>
                        <p className="text-gray-500 text-lg border-l border-gray-800 pl-4 py-0.5 leading-none">
                            {activeTab === 'assistant'
                                ? 'Chat with your tasks powered by Gemini 3.0'
                                : 'Manage your daily goals and track progress.'}
                        </p>
                    </div>
                    {localStorage.getItem('userProfile') && (
                        <div className="flex items-center gap-3 bg-gray-900/50 px-4 py-2 rounded-full border border-gray-800">
                            <img
                                src={JSON.parse(localStorage.getItem('userProfile')).picture}
                                alt="Profile"
                                className="w-8 h-8 rounded-full border border-gray-700"
                            />
                            <span className="text-sm font-medium text-gray-300">
                                {JSON.parse(localStorage.getItem('userProfile')).name}
                            </span>
                        </div>
                    )}
                </header>

                {activeTab === 'assistant' ? (
                    <div className="flex-1 overflow-hidden px-8 pb-8">
                        <ChatInterface />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col px-8 pb-8 overflow-hidden">
                        {error ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <div className="bg-red-500/10 text-red-400 p-6 rounded-2xl border border-red-500/20 max-w-md">
                                    <h3 className="text-xl font-semibold mb-2">Unavailable</h3>
                                    <p className="mb-6 text-sm opacity-80">{error}</p>
                                    <button
                                        onClick={fetchTasks}
                                        className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors"
                                    >
                                        Retry Connection
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'active' && (
                                    <form className="flex gap-4 mb-8" onSubmit={handleCreateTask}>
                                        <input
                                            type="text"
                                            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 text-base focus:outline-none focus:border-blue-500 focus:ring-0 transition-all placeholder:text-gray-600"
                                            placeholder="What needs to be done?"
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newTaskTitle.trim()}
                                            className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white px-8 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <Plus size={20} /> Create
                                        </button>
                                    </form>
                                )}

                                <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                                    {loading ? (
                                        <div className="text-center py-12 text-gray-500 animate-pulse">Loading tasks...</div>
                                    ) : tasks.length === 0 ? (
                                        <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800/50 border-dashed">
                                            <p className="text-gray-500 text-lg">No {activeTab} tasks found.</p>
                                        </div>
                                    ) : (
                                        <AnimatePresence mode='popLayout'>
                                            {tasks.map(task => (
                                                <TaskItem key={task._id} task={task} onUpdate={fetchTasks} />
                                            ))}
                                        </AnimatePresence>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
