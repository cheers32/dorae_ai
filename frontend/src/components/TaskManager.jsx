import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { TaskItem, SortableTaskItem } from './TaskItem';
import { Sidebar } from './Sidebar';
import { ChatInterface } from './ChatInterface';
import { Plus, Home as HomeIcon, Tag as TagIcon, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    DndContext,
    closestCenter,
    rectIntersection,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';

export const TaskManager = () => {
    const [tasks, setTasks] = useState([]);
    const [labels, setLabels] = useState([]);
    const [activeTab, setActiveTab] = useState('active');
    const [selectedLabel, setSelectedLabel] = useState(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTags, setShowTags] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const [history, setHistory] = useState([]);

    const navigate = useNavigate();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 2,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Navigation Utils
    const changeView = (tab, label = null, pushToHistory = true) => {
        if (pushToHistory) {
            setHistory(prev => [...prev, { tab: activeTab, label: selectedLabel }]);
        }
        setActiveTab(tab);
        setSelectedLabel(label);
    };

    const handleBack = () => {
        if (history.length === 0) return;
        const lastView = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        setActiveTab(lastView.tab);
        setSelectedLabel(lastView.label);
    };

    const fetchLabels = async () => {
        try {
            const data = await api.getLabels();
            setLabels(data);
        } catch (err) {
            console.error("Failed to fetch labels", err);
        }
    };

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
            let status = 'active';
            if (activeTab === 'closed') status = 'completed';
            if (activeTab === 'trash') status = 'deleted';

            const data = await api.getTasks(status, selectedLabel);
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
        fetchLabels();
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [activeTab, selectedLabel]);

    const customCollisionDetection = (args) => {
        // If dragging a sidebar label, prioritize tasks
        if (args.active.id.toString().startsWith('sidebar-label-')) {
            const taskCollisions = rectIntersection({
                ...args,
                droppableContainers: args.droppableContainers.filter(container =>
                    !container.id.toString().startsWith('sidebar-')
                )
            });
            if (taskCollisions.length > 0) return taskCollisions;
            return closestCenter(args);
        }

        // Standard logic: dragging a task
        // First check for sidebar collisions (regular tabs and labels)
        const sidebarCollisions = rectIntersection({
            ...args,
            droppableContainers: args.droppableContainers.filter(container =>
                container.id.toString().startsWith('sidebar-')
            )
        });

        if (sidebarCollisions.length > 0) {
            return sidebarCollisions;
        }

        return closestCenter(args);
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            const labelsToApply = selectedLabel ? [selectedLabel] : [];
            await api.createTask(newTaskTitle, labelsToApply);
            setNewTaskTitle('');
            fetchTasks();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        const activeId = active.id.toString();
        const overId = over.id.toString();

        // Case 1: Dragging Sidebar Label -> Task
        if (activeId.startsWith('sidebar-label-') && !overId.startsWith('sidebar-')) {
            const labelName = active.data.current.target;
            const taskId = over.id;
            const task = tasks.find(t => t._id === taskId);

            if (task && (!task.labels || !task.labels.includes(labelName))) {
                try {
                    const newLabels = [...(task.labels || []), labelName];
                    await api.updateTask(taskId, { labels: newLabels });
                    fetchTasks();
                } catch (err) {
                    console.error("Failed to tag task from sidebar", err);
                }
            }
            setActiveId(null);
            return;
        }

        // Check if dropped over a label
        if (overId.startsWith('sidebar-label-')) {
            const labelName = over.data.current.target;
            const taskId = active.id;
            const task = tasks.find(t => t._id === taskId);

            if (task && (!task.labels || !task.labels.includes(labelName))) {
                try {
                    const newLabels = [...(task.labels || []), labelName];
                    await api.updateTask(taskId, { labels: newLabels });
                    fetchTasks();
                } catch (err) {
                    console.error("Failed to tag task", err);
                }
            }
            setActiveId(null);
            return;
        }

        // Check if dropped over sidebar tabs
        if (overId.startsWith('sidebar-') && !overId.includes('label-')) {
            const targetTab = over.data.current.target;
            const taskId = active.id;

            let newStatus = null;
            if (targetTab === 'closed') newStatus = 'completed';
            if (targetTab === 'trash') newStatus = 'deleted';
            if (targetTab === 'active') newStatus = 'pending';

            if (newStatus) {
                try {
                    if (newStatus === 'deleted') {
                        await api.deleteTask(taskId);
                    } else {
                        await api.updateTask(taskId, { status: newStatus });
                    }
                    fetchTasks();
                } catch (err) {
                    console.error("Failed to update status through drag", err);
                }
            }
            setActiveId(null);
            return;
        }

        if (active.id !== over.id) {
            setTasks((items) => {
                const oldIndex = items.findIndex((item) => item._id === active.id);
                const newIndex = items.findIndex((item) => item._id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Persist order to backend
                const taskIds = newItems.map(t => t._id);
                api.reorderTasks(taskIds).catch(err => console.error("Failed to save order", err));

                return newItems;
            });
        }
        setActiveId(null);
    };

    const getHeaderTitle = () => {
        if (selectedLabel) return `Label: ${selectedLabel}`;
        switch (activeTab) {
            case 'active': return 'Active Tasks';
            case 'closed': return 'Closed Tasks';
            case 'trash': return 'Trash Bin';
            case 'assistant': return 'AI Assistant';
            default: return 'Tasks';
        }
    }

    const activeTask = activeId ? tasks.find(t => t._id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-screen bg-[#0f1014] text-gray-200 font-sans overflow-hidden">
                <Sidebar
                    activeTab={activeTab}
                    onNavigate={changeView}
                    labels={labels}
                    onLabelsChange={fetchLabels}
                    selectedLabel={selectedLabel}
                />

                <main className="flex-1 flex flex-col min-w-0 bg-[#0f1014] h-full relative">
                    <header className="px-8 py-8 flex justify-between items-center bg-[#0f1014]/80 backdrop-blur-md sticky top-0 z-10 border-b border-white/5">
                        <div className="flex items-center gap-6">
                            <AnimatePresence>
                                {history.length > 0 && (
                                    <motion.button
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        onClick={handleBack}
                                        className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center group"
                                        title="Go Back"
                                    >
                                        <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            <div className="flex items-baseline gap-4">
                                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-200">
                                    {getHeaderTitle()}
                                </h1>
                                <p className="text-gray-500 text-lg border-l border-gray-800 pl-4 py-0.5 leading-none">
                                    {activeTab === 'assistant'
                                        ? 'Chat with your tasks powered by Gemini 3.0'
                                        : ''}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowTags(!showTags)}
                                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${showTags ? 'text-blue-400 bg-blue-400/10' : 'text-gray-500 hover:text-gray-300'}`}
                                title="Toggle Tags Visibility"
                            >
                                <TagIcon size={18} />
                                <span className="text-sm font-medium">{showTags ? 'Hide Tags' : 'Show Tags'}</span>
                            </button>

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
                        </div>
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
                                            <SortableContext
                                                items={tasks.map(t => t._id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <div className="space-y-3">
                                                    {tasks.map(task => (
                                                        <SortableTaskItem key={task._id} id={task._id} task={task} onUpdate={fetchTasks} showTags={showTags} availableLabels={labels} />
                                                    ))}
                                                </div>
                                            </SortableContext>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {createPortal(
                <DragOverlay>
                    {activeId && activeId.toString().startsWith('sidebar-label-') ? (
                        <div className="px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2"
                            style={{
                                backgroundColor: labels.find(l => `sidebar-label-${l.name}` === activeId)?.color || '#3B82F6',
                                color: '#fff'
                            }}>
                            <TagIcon size={14} className="text-white" />
                            {labels.find(l => `sidebar-label-${l.name}` === activeId)?.name}
                        </div>
                    ) : activeTask ? (
                        <TaskItem
                            task={activeTask}
                            showTags={showTags}
                            isOverlay={true}
                            onUpdate={() => { }}
                            availableLabels={labels}
                        />
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
