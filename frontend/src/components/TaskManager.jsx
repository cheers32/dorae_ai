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
            const data = await api.getTasks(activeTab === 'active' ? 'pending' : 'completed');
            setTasks(data);
        } catch (err) {
            console.error("Failed to fetch tasks", err);
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
            <div className="fixed bottom-4 left-4 z-50 flex gap-2">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition border border-gray-700"
                    title="Back to Landing Page"
                >
                    <HomeIcon size={20} className="text-gray-400" />
                </button>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-900/30 border border-red-900/50 rounded-full hover:bg-red-900/50 transition text-red-400 text-sm font-medium"
                    title="Logout"
                >
                    Logout
                </button>
            </div>

            <main className="flex-1 flex flex-col min-w-0 bg-[#0f1014] h-full relative">
                <header className="px-8 py-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
                            {getHeaderTitle()}
                        </h1>
                        <p className="text-gray-500 text-lg">
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
                        {activeTab === 'active' && (
                            <form className="flex gap-4 mb-8" onSubmit={handleCreateTask}>
                                <input
                                    type="text"
                                    className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                                    placeholder="What needs to be done?"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!newTaskTitle.trim()}
                                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white px-8 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                    </div>
                )}
            </main>
        </div>
    );
}
