import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { TaskItem, SortableTaskItem } from './TaskItem';
import { Sidebar } from './Sidebar';
import { ChatInterface } from './ChatInterface';
import { Plus, Home as HomeIcon, Tag as TagIcon, ArrowLeft, Trash2, X } from 'lucide-react';
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
    const [isCreating, setIsCreating] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const [history, setHistory] = useState([]);
    const [workareaTasks, setWorkareaTasks] = useState([]); // [NEW] Workarea logic
    const [autoExpandTaskId, setAutoExpandTaskId] = useState(null); // ID of task to auto-expand after navigation

    // Filter out workarea tasks from main list
    const visibleTasks = tasks.filter(t => !workareaTasks.find(wt => wt._id === t._id));

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

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Command + [ for back navigation
            if ((event.metaKey || event.ctrlKey) && event.key === '[') {
                if (history.length > 0) {
                    event.preventDefault();
                    handleBack();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history, handleBack]);

    useEffect(() => {
        fetchTasks(true);
        fetchStats();
    }, [activeTab, selectedLabel, selectedFolder]);

    // Reset autoExpandTaskId after tasks are rendered
    useEffect(() => {
        if (autoExpandTaskId && tasks.some(t => t._id === autoExpandTaskId)) {
            // Clear after a short delay to allow the expansion to take effect
            const timer = setTimeout(() => {
                setAutoExpandTaskId(null);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [tasks, autoExpandTaskId]);

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

        // [NEW] Check if dragging a workarea task
        const isWorkareaTask = args.active.id.toString().startsWith('workarea-');

        // If dragging a workarea task, strictly constrain to workarea container or other workarea tasks
        if (isWorkareaTask) {
            const workareaCollisions = rectIntersection({
                ...args,
                droppableContainers: args.droppableContainers.filter(container =>
                    container.id.toString().startsWith('workarea-')
                )
            });
            return workareaCollisions.length > 0 ? workareaCollisions : closestCenter(args);
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
            // If checking 'activeTab' === 'folder' logic or 'selectedFolder' logic from backend
            let folderId = null;
            if (activeTab === 'folder' && selectedFolder) {
                folderId = selectedFolder;

                // [REMOVED] Folder-as-Label feature logic was here
            } else if (activeTab === 'active' && !selectedLabel && !selectedFolder) {
                // If strictly "Active" tab with no selection, maybe don't enforce folder unless UNFILED logic desires it
                // But generally, api.createTask might need update to support folderId
            }

            // We need to update api.createTask signature or payload if we want to support folders
            // Checking api usage: api.createTask(title, labels)
            // Need to see if we can pass folderId?
            // Assuming we can pass it as 3rd arg or object: check api.js? 
            // Since tool access is limited to files I know... I should check API if possible?
            // User said "backend/app.py", but frontend `api.js` is the clearer contract.
            // Let's assume I can pass an object or update `api` calls. 
            // Wait, I can't check `api.js` easily without a tool call.
            // But let's assume I need to pass it.
            // Standardizing: createTask(title, labels, folderId)
            await api.createTask(newTaskTitle, labelsToApply, folderId);

            setNewTaskTitle('');
            setIsCreating(false); // Close form after creation? User might want multiple. 
            // Actually, let's keep it open if user wants to add more? 
            // "when a task is created, just apply..." implies one by one.
            // Let's keep it open based on previous comment. 

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



    const handleSendToWorkarea = (task) => {
        // [MODIFIED] Single-item focus: Replace existing item
        setWorkareaTasks([{ ...task, _forceExpanded: true }]);
    };

    const handleRemoveFromWorkarea = (taskId) => {
        setWorkareaTasks(prev => prev.filter(t => t._id !== taskId));
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        const activeId = active.id.toString();
        const overId = over.id.toString();

        // Helper to get task regardless of where it is (Main list or Workarea)
        const getTaskAndList = (rawId) => {
            const isWorkarea = rawId.startsWith('workarea-task-');
            const realId = isWorkarea ? rawId.replace('workarea-task-', '') : rawId;
            // Search in workarea first if it looks like a workarea task, otherwise main list
            // But actually we should search both because a task implies presence.
            const taskInWorkarea = workareaTasks.find(t => t._id === realId);
            const taskInMain = tasks.find(t => t._id === realId);

            return {
                task: taskInWorkarea || taskInMain,
                isWorkarea,
                realId
            };
        };

        // Case 1: Dragging Sidebar Label -> Task
        if (activeId.startsWith('sidebar-label-') && !overId.startsWith('sidebar-')) {
            const labelName = active.data.current.target;
            const { task, realId } = getTaskAndList(overId);

            if (task && (!task.labels || !task.labels.includes(labelName))) {
                try {
                    const newLabels = [...(task.labels || []), labelName];
                    await api.updateTask(realId, { labels: newLabels });

                    // Update local states to reflect changes immediately
                    setTasks(prev => prev.map(t => t._id === realId ? { ...t, labels: newLabels } : t));
                    setWorkareaTasks(prev => prev.map(t => t._id === realId ? { ...t, labels: newLabels } : t));

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
            const { task, realId } = getTaskAndList(activeId);

            if (task && (!task.labels || !task.labels.includes(labelName))) {
                try {
                    const newLabels = [...(task.labels || []), labelName];
                    await api.updateTask(realId, { labels: newLabels });

                    // Update local states
                    setTasks(prev => prev.map(t => t._id === realId ? { ...t, labels: newLabels } : t));
                    setWorkareaTasks(prev => prev.map(t => t._id === realId ? { ...t, labels: newLabels } : t));

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
            const { realId } = getTaskAndList(activeId);

            let newStatus = null;
            if (targetTab === 'closed') newStatus = 'Closed';
            if (targetTab === 'trash') newStatus = 'Deleted';
            if (targetTab === 'active') newStatus = 'Active';

            if (newStatus) {
                try {
                    if (newStatus === 'Deleted') {
                        await api.deleteTask(realId);
                    } else {
                        // If moving to 'active', also clear folderId
                        const updates = { status: newStatus };
                        if (newStatus === 'Active') {
                            updates.folderId = null;
                        }
                        await api.updateTask(realId, updates);
                    }
                    // Remove from workarea if deleted or status changed? 
                    // Maybe keep it if status changed but still valid for workarea?
                    // If deleted/closed, typically we might want to refresh.
                    fetchTasks(false);
                } catch (err) {
                    console.error("Failed to update status through drag", err);
                }
            }
        }

        // Check if dropped over a folder
        if (overId.startsWith('sidebar-folder-') && !activeId.startsWith('sidebar-')) {
            const folderId = over.data.current.folderId;
            const { task, realId } = getTaskAndList(activeId);

            try {
                // Find folder name to add as label
                const folderName = folders.find(f => f._id === folderId)?.name;

                const updates = {
                    folderId: folderId,
                    status: 'Active'
                };

                // [REMOVED] Auto-tagging with folder name logic

                await api.updateTask(realId, updates);

                // Update local states if labels changed
                if (updates.labels) {
                    setTasks(prev => prev.map(t => t._id === realId ? { ...t, labels: updates.labels } : t));
                    setWorkareaTasks(prev => prev.map(t => t._id === realId ? { ...t, labels: updates.labels } : t));
                }

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
                const activeIsWorkarea = activeId.startsWith('workarea-task-');
                const overIsWorkarea = overId.startsWith('workarea-task-');

                if (activeIsWorkarea && overIsWorkarea) {
                    // Reordering within Workarea -> No real effect with 1 item, but keeps logic clean
                    setWorkareaTasks((items) => {
                        const oldIndex = items.findIndex((item) => `workarea-task-${item._id}` === active.id);
                        const newIndex = items.findIndex((item) => `workarea-task-${item._id}` === over.id);
                        return arrayMove(items, oldIndex, newIndex);
                    });
                } else if (!activeIsWorkarea && overIsWorkarea) {
                    // [NEW] Dragging from Main List -> Workarea (Current Focus)
                    const { task } = getTaskAndList(activeId);

                    if (task) {
                        // Check if Workarea already has a focused item
                        if (workareaTasks.length > 0) {
                            const focusedTask = workareaTasks[0];
                            // "Attach" logic: Link dragged task to focused task
                            const newAttachment = {
                                _id: task._id,
                                title: task.title,
                                folderId: task.folderId,
                                status: task.status,
                                labels: task.labels
                            };

                            const currentAttachments = focusedTask.attachments || [];
                            // Avoid duplicates
                            if (!currentAttachments.find(a => a._id === task._id)) {
                                const newAttachments = [...currentAttachments, newAttachment];

                                // Update focused task with new attachments list
                                api.updateTask(focusedTask._id, { attachments: newAttachments })
                                    .then(() => {
                                        // Update local state for immediate feedback
                                        setWorkareaTasks(prev => prev.map(t =>
                                            t._id === focusedTask._id
                                                ? { ...t, attachments: newAttachments }
                                                : t
                                        ));
                                    })
                                    .catch(console.error);
                            }
                        } else {
                            // Empty Focus: Standard pin logic
                            setWorkareaTasks([{ ...task, _forceExpanded: true }]);
                        }
                    }
                } else if (!activeIsWorkarea && !overIsWorkarea) {
                    // Reordering standard list
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
        if (selectedLabel) return selectedLabel;
        if (selectedFolder) return folders.find(f => f._id === selectedFolder)?.name || 'Unknown';
        switch (activeTab) {
            case 'active': return 'Active Tasks';
            case 'closed': return 'Closed Tasks';
            case 'trash': return 'Deleted Tasks';
            case 'assistant': return 'AI Assistant';
            default: return 'Tasks';
        }
    }

    const activeTask = activeId ? tasks.find(t => t._id === activeId) : null;

    const handleNavigateToTask = (attachment) => {
        // Check if the task is already visible in the current list
        const isTaskCurrentlyVisible = tasks.some(t => t._id === attachment._id);

        if (isTaskCurrentlyVisible) {
            // If task is already in current list, reset then expand it
            // This ensures the expansion works even when clicking multiple chips in the same folder
            setAutoExpandTaskId(null);
            setTimeout(() => {
                setAutoExpandTaskId(attachment._id);
            }, 50);
            return;
        }

        // If not currently visible, navigate to the appropriate view
        if (attachment.folderId) {
            // If it has a folderId, navigate to that folder
            changeView('folder', null, attachment.folderId);
        } else {
            // If no folderId, assume it's an 'active' task (unfiled)
            changeView('active', null, null);
        }

        // Set the task to auto-expand after navigation and fetch
        setAutoExpandTaskId(attachment._id);
    };

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
                                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-200 text-left leading-tight">
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

                            {((activeTab === 'active' || activeTab === 'folder' || activeTab === 'label') || (selectedLabel)) && (
                                <button
                                    onClick={() => {
                                        setIsCreating(!isCreating);
                                    }}
                                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${isCreating ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}`}
                                >
                                    {isCreating ? <X size={18} /> : <Plus size={18} />}
                                    <span className="text-sm font-medium">{isCreating ? 'Cancel' : 'New Task'}</span>
                                </button>
                            )}

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
                                    {/* [NEW] Workarea Section (Pinned to Top) */}
                                    <AnimatePresence>
                                        {workareaTasks.length > 0 && (
                                            <>
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="bg-white/[0.03] border-b border-white/5 relative flex flex-col shrink-0"
                                                >
                                                    <div className="px-8 py-3 bg-white/[0.02] backdrop-blur border-white/5 flex items-center justify-between sticky top-0 z-10">
                                                        <h2 className="text-sm font-bold uppercase tracking-widest text-blue-400">Current Focus</h2>
                                                    </div>
                                                    <div className="px-8 py-4">
                                                        {workareaTasks.map(task => (
                                                            <SortableTaskItem
                                                                key={`workarea-${task._id}`}
                                                                id={`workarea-task-${task._id}`}
                                                                task={task}
                                                                onUpdate={() => fetchTasks(false)}
                                                                showTags={true}
                                                                availableLabels={labels}
                                                                isWorkarea={true}
                                                                defaultExpanded={task._forceExpanded}
                                                                onRemoveFromWorkarea={() => handleRemoveFromWorkarea(task._id)}
                                                                onAttachmentClick={handleNavigateToTask}
                                                                onTaskClick={() => handleNavigateToTask(task)}
                                                            />
                                                        ))}
                                                    </div>
                                                </motion.div>

                                                <div className="h-px bg-white/5 my-6 mx-8"></div>
                                            </>
                                        )}
                                    </AnimatePresence>


                                    <AnimatePresence>
                                        {isCreating && (
                                            <motion.form
                                                initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                                                animate={{ height: 'auto', opacity: 1, marginBottom: 32 }}
                                                exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                                                className="flex gap-4 overflow-hidden"
                                                onSubmit={(e) => {
                                                    handleCreateTask(e);
                                                }}
                                            >
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 text-base focus:outline-none focus:border-blue-500 focus:ring-0 transition-all placeholder:text-gray-600"
                                                    placeholder={selectedFolder ? `Add task to ${stats.folders[selectedFolder] ? folders.find(f => f._id === selectedFolder)?.name : 'folder'}...` : selectedLabel ? `Add task to ${selectedLabel}...` : "What needs to be done?"}
                                                    value={newTaskTitle}
                                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Escape') setIsCreating(false);
                                                    }}
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={!newTaskTitle.trim()}
                                                    className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white px-8 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    <Plus size={20} /> Create
                                                </button>
                                            </motion.form>
                                        )}
                                    </AnimatePresence>

                                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                                        {loading ? (
                                            null
                                        ) : tasks.length === 0 ? (
                                            <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800/50 border-dashed">
                                                <p className="text-gray-500 text-lg">No {activeTab} tasks found.</p>
                                            </div>
                                        ) : (
                                            <SortableContext
                                                items={visibleTasks.map(t => t._id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <div className="space-y-3">
                                                    {visibleTasks.map(task => (
                                                        <SortableTaskItem
                                                            key={task._id}
                                                            id={task._id}
                                                            task={task}
                                                            onUpdate={() => fetchTasks(false)}
                                                            showTags={showTags}
                                                            availableLabels={labels}
                                                            onSendToWorkarea={() => handleSendToWorkarea(task)}
                                                            isWorkarea={false}
                                                            defaultExpanded={autoExpandTaskId === task._id}
                                                            onAttachmentClick={handleNavigateToTask}
                                                        />
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
            </div >

            {
                createPortal(
                    <DragOverlay dropAnimation={dropAnimation} >
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
                        ) : (activeId && activeId.toString().startsWith('workarea-task-')) ? (
                            <TaskItem
                                task={workareaTasks.find(t => `workarea-task-${t._id}` === activeId)}
                                showTags={true}
                                isOverlay={true}
                                onUpdate={() => { }}
                                availableLabels={labels}
                                isWorkarea={true}
                            />
                        ) : null}
                    </DragOverlay >,
                    document.body
                )}
        </DndContext >
    );
}

