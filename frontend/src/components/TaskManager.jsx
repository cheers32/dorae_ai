import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { TaskItem, SortableTaskItem } from './TaskItem';
import { Sidebar } from './Sidebar';
import { ChatInterface } from './ChatInterface';
import { Plus, Home as HomeIcon, Tag as TagIcon, ArrowLeft, Trash2 } from 'lucide-react';
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
    pointerWithin,
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
    const [folders, setFolders] = useState([]);
    const [activeTab, setActiveTab] = useState('active');
    const [selectedLabel, setSelectedLabel] = useState(null);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTags, setShowTags] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const [history, setHistory] = useState([]);
    // Sidebar Order State
    const [sidebarItems, setSidebarItems] = useState([]);
    const [stats, setStats] = useState({
        active: 0,
        closed: 0,
        trash: 0,
        folders: {},
        labels: {}
    });

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
    const changeView = (tab, label = null, folder = null, pushToHistory = true) => {
        // Prevent re-clicking the same view from clearing tasks
        if (activeTab === tab && selectedLabel === label && selectedFolder === folder) {
            return;
        }

        if (pushToHistory) {
            setHistory(prev => [...prev, { tab: activeTab, label: selectedLabel, folder: selectedFolder }]);
        }
        // Immediate UI reset to prevent jitter
        setLoading(true);
        setTasks([]);
        setActiveTab(tab);
        setSelectedLabel(label);
        setSelectedFolder(folder);
    };

    const handleBack = () => {
        if (history.length === 0) return;
        const lastView = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));

        // Immediate UI reset
        setLoading(true);
        setTasks([]);
        setActiveTab(lastView.tab);
        setSelectedLabel(lastView.label);
        setSelectedFolder(lastView.folder);
    };

    const fetchFolders = async () => {
        try {
            const data = await api.getFolders();
            setFolders(data);
        } catch (err) {
            console.error("Failed to fetch folders", err);
        }
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

    const fetchStats = async () => {
        try {
            const data = await api.getStats();
            setStats(data);
        } catch (err) {
            console.error("Failed to fetch stats", err);
        }
    };

    const fetchRequestId = useRef(0);
    const fetchTasks = async (useLoading = true) => {
        const requestId = ++fetchRequestId.current;
        if (activeTab === 'assistant') {
            setLoading(false);
            return;
        }

        if (useLoading) setLoading(true);

        try {
            setError(null);
            let status = 'Active';
            if (activeTab === 'closed') status = 'Closed';
            if (activeTab === 'trash') status = 'Deleted';
            if (activeTab === 'folder') status = null;

            let queryFolderId = selectedFolder;
            // Exclusive visibility: If in 'Active' tab and no folder selected, only show unfiled tasks
            if (activeTab === 'active' && !selectedLabel && !selectedFolder) {
                queryFolderId = 'null';
            }

            const data = await api.getTasks(status, selectedLabel, queryFolderId);

            // Race condition check: Only update if this is still the latest request
            if (requestId === fetchRequestId.current) {
                if (data.error) throw new Error(data.error);
                setTasks(data);
            }
        } catch (err) {
            if (requestId === fetchRequestId.current) {
                console.error("Failed to fetch tasks", err);
                setError("Unable to load tasks. The server might be down or misconfigured (DB connection).");
            }
        } finally {
            if (requestId === fetchRequestId.current) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchLabels();
        fetchFolders();
        fetchStats();
    }, []);

    // Sync folders with sidebarItems
    useEffect(() => {
        const systemItems = ['active', 'closed', 'assistant', 'trash'];
        const folderIds = folders.map(f => `folder-${f._id}`);

        // Load saved order
        const savedOrder = JSON.parse(localStorage.getItem('sidebarOrder') || '[]');

        // Filter out items that no longer exist (deleted folders) and ensure system items exist
        const validSavedItems = savedOrder.filter(id =>
            systemItems.includes(id) || folderIds.includes(id)
        );

        // Find items that are missing from saved order (new folders or system items)
        const missingItems = [
            ...systemItems.filter(id => !validSavedItems.includes(id)),
            ...folderIds.filter(id => !validSavedItems.includes(id))
        ];

        // Combine valid saved items + missing items (appended to end)
        const newOrder = [...validSavedItems, ...missingItems];

        // Only update if order changed
        if (JSON.stringify(newOrder) !== JSON.stringify(sidebarItems)) {
            setSidebarItems(newOrder);
        }
    }, [folders]);

    // Save order whenever it changes
    useEffect(() => {
        if (sidebarItems.length > 0) {
            localStorage.setItem('sidebarOrder', JSON.stringify(sidebarItems));
        }
    }, [sidebarItems]);

    useEffect(() => {
        fetchTasks(true);
        fetchStats();
    }, [activeTab, selectedLabel, selectedFolder]);

    const [dropAnimation, setDropAnimation] = useState(null); // null by default, or undefined

    const handleDragOver = (event) => {
        const { over } = event;
        // If over a sidebar item (folder, label, trash, etc.), disable drop animation (snap-back)
        if (over && over.id.toString().startsWith('sidebar-')) {
            setDropAnimation(null);
        } else {
            setDropAnimation(undefined); // undefined triggers default animation
        }
    };

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
        // Use pointerWithin to ensure the mouse cursor is physically over the sidebar item
        const sidebarCollisions = pointerWithin({
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
            fetchTasks(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleEmptyTrash = async () => {
        if (window.confirm("Are you sure you want to permanently delete all items in the trash? This action cannot be undone.")) {
            try {
                await api.emptyTrash();
                fetchTasks(false);
            } catch (err) {
                console.error("Failed to empty trash", err);
            }
        }
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
                    fetchTasks(false);
                    setShowTags(true);
                } catch (err) {
                    console.error("Failed to tag task from sidebar", err);
                }
            }
            setActiveId(null);
            return;
        }

        // Check if dropped over a label (Tagging Task -> Label)
        if (overId.startsWith('sidebar-label-') && !activeId.startsWith('sidebar-label-')) {
            const labelName = over.data.current.target;
            const taskId = active.id;
            const task = tasks.find(t => t._id === taskId);

            if (task && (!task.labels || !task.labels.includes(labelName))) {
                try {
                    const newLabels = [...(task.labels || []), labelName];
                    await api.updateTask(taskId, { labels: newLabels });
                    fetchTasks(false);
                    setShowTags(true);
                } catch (err) {
                    console.error("Failed to tag task", err);
                }
            }
            setActiveId(null);
            return;
        }

        // Check if dropped over sidebar tabs
        if (overId.startsWith('sidebar-') && !overId.includes('label-') && !overId.includes('folder-')) {
            const targetTab = over.data.current.target;
            const taskId = active.id;

            let newStatus = null;
            if (targetTab === 'closed') newStatus = 'Closed';
            if (targetTab === 'trash') newStatus = 'Deleted';
            if (targetTab === 'active') newStatus = 'Active';

            if (newStatus) {
                try {
                    if (newStatus === 'Deleted') {
                        await api.deleteTask(taskId);
                    } else {
                        // If moving to 'active', also clear folderId
                        const updates = { status: newStatus };
                        if (newStatus === 'Active') {
                            updates.folderId = null;
                        }
                        await api.updateTask(taskId, updates);
                    }
                    fetchTasks(false);
                } catch (err) {
                    console.error("Failed to update status through drag", err);
                }
            }
        }

        // Check if dropped over a folder
        if (overId.startsWith('sidebar-folder-') && !activeId.startsWith('sidebar-')) {
            const folderId = over.data.current.folderId;
            const taskId = active.id;

            try {
                // Find folder name to add as label
                const folderName = folders.find(f => f._id === folderId)?.name;
                const task = tasks.find(t => t._id === taskId);

                const updates = {
                    folderId: folderId,
                    status: 'Active'
                };

                // Add label if folder name exists and task doesn't already have it
                if (folderName && task) {
                    const currentLabels = task.labels || [];
                    if (!currentLabels.includes(folderName)) {
                        updates.labels = [...currentLabels, folderName];
                    }
                }

                await api.updateTask(taskId, updates);
                fetchTasks(false);
            } catch (err) {
                console.error("Failed to move task to folder", err);
            }
            setActiveId(null);
            return;
        }

        if (active.id !== over.id) {
            // Check if reordering sidebar items
            if (activeId.startsWith('sidebar-') && overId.startsWith('sidebar-')) {
                // Check if reordering labels
                if (activeId.startsWith('sidebar-label-') && overId.startsWith('sidebar-label-')) {
                    setLabels(items => {
                        const oldIndex = items.findIndex(l => `sidebar-label-${l.name}` === activeId);
                        const newIndex = items.findIndex(l => `sidebar-label-${l.name}` === overId);
                        const newItems = arrayMove(items, oldIndex, newIndex);

                        // Persist order
                        const labelIds = newItems.map(l => l._id);
                        api.reorderLabels(labelIds).catch(err => console.error("Failed to save label order", err));

                        return newItems;
                    });
                } else {
                    // Reordering main sidebar items
                    const oldIndex = sidebarItems.indexOf(activeId.replace('sidebar-', ''));
                    const newIndex = sidebarItems.indexOf(overId.replace('sidebar-', ''));

                    if (oldIndex !== -1 && newIndex !== -1) {
                        setSidebarItems(items => {
                            const newItems = arrayMove(items, oldIndex, newIndex);

                            // Extract folder IDs in order and persist
                            const folderIds = newItems
                                .filter(id => id.startsWith('folder-'))
                                .map(id => id.replace('folder-', ''));

                            if (folderIds.length > 0) {
                                api.reorderFolders(folderIds).catch(err => console.error("Failed to save folder order", err));
                            }

                            return newItems;
                        });
                    }
                }
            } else {
                // Reordering tasks
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
        }
        setActiveId(null);
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
        const task = tasks.find(t => t._id === event.active.id);
        if (task) {
            setDropAnimation(undefined);
        }
    };

    const getHeaderTitle = () => {
        if (selectedLabel) return `Label: ${selectedLabel}`;
        if (selectedFolder) return `Folder: ${folders.find(f => f._id === selectedFolder)?.name || 'Unknown'}`;
        switch (activeTab) {
            case 'active': return 'Active Tasks';
            case 'closed': return 'Closed Tasks';
            case 'trash': return 'Deleted Tasks';
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
            onDragOver={handleDragOver}
        >
            <div className="flex h-screen bg-[#0f1014] text-gray-200 font-sans overflow-hidden gap-8">
                <Sidebar
                    activeTab={activeTab}
                    onNavigate={changeView}
                    labels={labels}
                    folders={folders}
                    onLabelsChange={fetchLabels}
                    onFoldersChange={fetchFolders}
                    selectedLabel={selectedLabel}
                    selectedFolder={selectedFolder}
                    sidebarItems={sidebarItems}
                    stats={stats}
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
                                    <span className="text-lg text-gray-500 font-normal ml-2">
                                        ({activeTab === 'active' && !selectedLabel && !selectedFolder ? stats.active :
                                            activeTab === 'closed' ? stats.closed :
                                                activeTab === 'trash' ? stats.trash :
                                                    activeTab === 'folder' && selectedFolder ? (stats.folders[selectedFolder] || 0) :
                                                        selectedLabel ? (stats.labels[selectedLabel] || 0) :
                                                            tasks.length})
                                    </span>
                                </h1>
                                <p className="text-gray-500 text-lg border-l border-gray-800 pl-4 py-0.5 leading-none">
                                    {activeTab === 'assistant'
                                        ? 'Chat with your tasks powered by Gemini 3.0'
                                        : ''}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {activeTab === 'trash' && tasks.length > 0 && (
                                <button
                                    onClick={handleEmptyTrash}
                                    className="px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-red-400 bg-red-400/10 hover:bg-red-400/20"
                                    title="Empty Trash"
                                >
                                    <Trash2 size={18} />
                                    <span className="text-sm font-medium">Empty Trash</span>
                                </button>
                            )}
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
                                            onClick={() => fetchTasks(true)}
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
                                            null
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
                                                        <SortableTaskItem key={task._id} id={task._id} task={task} onUpdate={() => fetchTasks(false)} showTags={showTags} availableLabels={labels} />
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
                <DragOverlay dropAnimation={dropAnimation}>
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

