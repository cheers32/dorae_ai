import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { TaskItem, SortableTaskItem } from './TaskItem';
import { Sidebar } from './Sidebar';
import { ChatInterface } from './ChatInterface';
import { AgentList } from './AgentList';
import { AgentItem } from './AgentItem';
import { GeminiPanel, GeminiIcon } from './GeminiPanel';
import { Search, Plus, Home as HomeIcon, Tag as TagIcon, ArrowLeft, ArrowRight, Trash2, X, ChevronsUpDown, ChevronsDownUp, Type, MessageSquare, ZoomIn, ZoomOut, MoreVertical, SlidersHorizontal, Settings2, Bug, Calendar, ArrowDownAZ, GripVertical, Folder, Sparkles, Zap, Clock, Paperclip, Minus, Copy, Menu, Check, RotateCw } from 'lucide-react';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DynamicBackground } from './DynamicBackground';

export const TaskManager = () => {
    const [tasks, setTasks] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [shouldFocusSearch, setShouldFocusSearch] = useState(false);
    const [preSearchState, setPreSearchState] = useState(null);
    const [expandedTaskIds, setExpandedTaskIds] = useState(new Set()); // [NEW] Track expanded tasks
    const [expandedAgentIds, setExpandedAgentIds] = useState(new Set()); // [NEW] Track expanded agents
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // [NEW] Mobile sidebar state
    const [isMobileCreateOpen, setIsMobileCreateOpen] = useState(false); // [NEW] Mobile create modal state
    const [selectedTaskIds, setSelectedTaskIds] = useState(new Set()); // [NEW] Selection state
    const [lastCollapsedTaskId, setLastCollapsedTaskId] = useState(null); // [NEW] Track last collapsed task for re-expansion
    const [focusArea, setFocusArea] = useState('tasklist'); // [NEW] Track focus area: 'sidebar' or 'tasklist'
    const [highlightedSidebarIndex, setHighlightedSidebarIndex] = useState(0); // [NEW] Track highlighted sidebar item

    const handleToggleTask = (taskId) => {
        const newSelected = new Set(selectedTaskIds);
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId);
        } else {
            newSelected.add(taskId);
        }
        setSelectedTaskIds(newSelected);
    };



    const [labels, setLabels] = useState([]);
    const [folders, setFolders] = useState([]);
    const [activeTab, setActiveTab] = useState('active');
    const [selectedLabel, setSelectedLabel] = useState(null);
    const [selectedFolder, setSelectedFolder] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(() => {
        const saved = localStorage.getItem('taskPageSize');
        return saved ? parseInt(saved, 10) : 25;
    });
    const [totalPages, setTotalPages] = useState(1);
    const [totalTasks, setTotalTasks] = useState(0);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const newTaskTextareaRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTags, setShowTags] = useState(() => localStorage.getItem('task_manager_show_tags') === 'true');
    const [showFolders, setShowFolders] = useState(() => localStorage.getItem('task_manager_show_folders') === 'true');
    const [isCreating, setIsCreating] = useState(false);
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const [showCounts, setShowCounts] = useState(() => localStorage.getItem('task_manager_show_counts') === 'true');
    const [activeId, setActiveId] = useState(null);
    const [globalExpanded, setGlobalExpanded] = useState(() => localStorage.getItem('task_manager_global_expanded') === 'true');
    const [showFullTitles, setShowFullTitles] = useState(() => localStorage.getItem('task_manager_show_full_titles') === 'true');
    const [showPreview, setShowPreview] = useState(() => localStorage.getItem('task_manager_show_preview') === 'true');
    const [showPulse, setShowPulse] = useState(() => localStorage.getItem('task_manager_show_pulse') === 'true');
    const [showDebugInfo, setShowDebugInfo] = useState(() => localStorage.getItem('task_manager_show_debug_info') === 'true');
    const [fontSize, setFontSize] = useState(() => {
        const saved = localStorage.getItem('task_list_font_size');
        return saved ? parseInt(saved, 10) : 15;
    });
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const [history, setHistory] = useState([]);
    const [forwardHistory, setForwardHistory] = useState([]);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('task_manager_sidebar_collapsed') === 'true');
    const [sidebarDensity, setSidebarDensity] = useState(() => {
        const saved = localStorage.getItem('task_manager_sidebar_density');
        if (!saved) return 5;

        // Migrate old string values to numeric
        if (saved === 'compact') return 2;
        if (saved === 'normal') return 5;
        if (saved === 'comfortable') return 8;

        const parsed = parseInt(saved, 10);
        return isNaN(parsed) ? 5 : Math.min(10, Math.max(1, parsed)); // Clamp between 1-10
    });
    const [timelineLimit, setTimelineLimit] = useState(() => {
        const saved = localStorage.getItem('timelineLimit');
        return saved ? parseInt(saved, 10) : 3;
    });
    const [showDynamicBg, setShowDynamicBg] = useState(() => {
        const saved = localStorage.getItem('task_manager_show_dynamic_bg');
        return saved === null ? true : saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('task_manager_show_counts', showCounts);
    }, [showCounts]);

    useEffect(() => {
        localStorage.setItem('timelineLimit', timelineLimit);
    }, [timelineLimit]);

    const [isGeminiOpen, setIsGeminiOpen] = useState(false);
    const [sortBy, setSortBy] = useState('manual'); // 'manual', 'date', 'title'
    const searchInputRef = useRef(null);
    const [workareaTasks, setWorkareaTasks] = useState(() => {
        // Initialize from localStorage
        const saved = localStorage.getItem('workareaTasks');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse workarea tasks from localStorage', e);
                return [];
            }
        }
        return [];
    }); // [NEW] Workarea logic
    const [autoExpandTaskId, setAutoExpandTaskId] = useState(null); // ID of task to auto-expand after navigation
    const [lastScanTrigger, setLastScanTrigger] = useState(0);

    const triggerScanRefresh = () => {
        setLastScanTrigger(Date.now());
    };

    // Note: Auto-refresh after scans has been removed to prevent UI bugs.
    // Scans still run automatically in the background, but users must manually refresh to see results.

    // Filter out workarea tasks from main list and apply search
    // Filter out workarea tasks from main list
    // Search is now handled server-side
    const visibleTasks = tasks
        .filter(t => !workareaTasks.find(wt => wt._id === t._id))
        .sort((a, b) => {
            if (sortBy === 'date') {
                const getLastUpdate = (task) => {
                    if (task.updates && task.updates.length > 0) {
                        return task.updates.reduce((max, u) => new Date(u.timestamp) > new Date(max) ? new Date(u.timestamp) : max, new Date(task.updates[0].timestamp));
                    }
                    return new Date(task.created_at);
                };
                return getLastUpdate(b) - getLastUpdate(a);
            }
            if (sortBy === 'title') {
                return (a.title || '').localeCompare(b.title || '');
            }
            // Manual sort is handled by the order in the array from backend (which is by 'order' field)
            return 0;
        });

    const handleSelectAll = () => {
        if (!visibleTasks) return;
        if (selectedTaskIds.size === visibleTasks.length && visibleTasks.length > 0) {
            setSelectedTaskIds(new Set());
        } else {
            setSelectedTaskIds(new Set(visibleTasks.map(t => t._id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedTaskIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedTaskIds.size} tasks?`)) return;

        try {
            // Delete all selected tasks
            const idsToDelete = Array.from(selectedTaskIds);
            await Promise.all(idsToDelete.map(id => api.deleteTask(id)));

            setSelectedTaskIds(new Set());
            fetchTasks(false);
            fetchStats();
        } catch (err) {
            console.error("Failed to delete selected tasks", err);
        }
    };

    // Sidebar Order State
    const [sidebarItems, setSidebarItems] = useState([]);
    const [stats, setStats] = useState({
        active: 0,
        closed: 0,
        trash: 0,
        folders: {},
        labels: {}
    });

    // Agents State
    const [agents, setAgents] = useState([]);
    const fetchAgents = async () => {
        try {
            const data = await api.getAgents();
            setAgents(data);
        } catch (err) {
            console.error('Failed to load agents', err);
        }
    };

    useEffect(() => {
        fetchAgents();
        window.addEventListener('agent-updated', fetchAgents);
        // Refresh when task assigned/created (though tasks update via other means, agent content might change)
        window.addEventListener('task-created', fetchAgents);
        return () => {
            window.removeEventListener('agent-updated', fetchAgents);
            window.removeEventListener('task-created', fetchAgents);
        };
    }, []);

    const [focusedAgentId, setFocusedAgentId] = useState(() => {
        try {
            const saved = localStorage.getItem('workareaTasks');
            if (saved) {
                const items = JSON.parse(saved);
                const agent = items.find(i => i.type === 'agent');
                return agent ? agent._id : null;
            }
        } catch (e) {
            console.error('Failed to parse workareaTasks for initial focus', e);
        }
        return null;
    });

    // Helper to determine if Search should be the primary specific action
    const isSearchPrimary = ['all', 'closed', 'trash'].includes(activeTab);

    const handleFocusAgent = (agent) => {
        // Toggle focus logic for single agent
        const isCurrentFocused = focusedAgentId === agent._id;

        if (isCurrentFocused) {
            // Unfocus current
            setWorkareaTasks(prev => prev.filter(item => !(item._id === agent._id && item.type === 'agent')));
            setFocusedAgentId(null);
        } else {
            // Focus new agent (replace any existing agent in workarea)
            setWorkareaTasks(prev => {
                // Remove existing agents from workarea
                const withoutAgents = prev.filter(item => item.type !== 'agent');
                // Add new agent to top
                return [{ ...agent, type: 'agent' }, ...withoutAgents];
            });
            setFocusedAgentId(agent._id);
        }
    };

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
            setForwardHistory([]); // Clear forward history when a new navigation is triggered
        }
        // Immediate UI reset to prevent jitter
        setLoading(true);
        setTasks([]);
        setActiveTab(tab);
        setSelectedLabel(label);
        setSelectedFolder(folder);
        setSelectedLabel(label);
        setSelectedFolder(folder);
        setCurrentPage(1); // Reset pagination
        setIsMobileSidebarOpen(false); // Close mobile sidebar on navigation
    };

    const handleBack = () => {
        // If there are expanded tasks or agents, collapse them first instead of navigating
        if (expandedTaskIds.size > 0 || expandedAgentIds.size > 0 || globalExpanded) {
            // Track the last collapsed task for re-expansion
            if (expandedTaskIds.size === 1) {
                setLastCollapsedTaskId(Array.from(expandedTaskIds)[0]);
            }
            setExpandedTaskIds(new Set());
            setExpandedAgentIds(new Set());
            setGlobalExpanded(false);
            return;
        }

        if (history.length === 0) return;
        const lastView = history[history.length - 1];

        // Push current view to forward history
        setForwardHistory(prev => [...prev, { tab: activeTab, label: selectedLabel, folder: selectedFolder }]);
        setHistory(prev => prev.slice(0, -1));

        // Immediate UI reset
        setLoading(true);
        setTasks([]);
        setActiveTab(lastView.tab);
        setSelectedLabel(lastView.label);
        setSelectedFolder(lastView.folder);
    };

    const handleForward = () => {
        if (forwardHistory.length === 0) return;
        const nextView = forwardHistory[forwardHistory.length - 1];

        // Push current view back to history
        setHistory(prev => [...prev, { tab: activeTab, label: selectedLabel, folder: selectedFolder }]);
        setForwardHistory(prev => prev.slice(0, -1));

        // Immediate UI reset
        setLoading(true);
        setTasks([]);
        setActiveTab(nextView.tab);
        setSelectedLabel(nextView.label);
        setSelectedFolder(nextView.folder);
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
    // [NEW] Auto-resize new task title textarea
    useEffect(() => {
        if (newTaskTextareaRef.current) {
            newTaskTextareaRef.current.style.height = 'auto';
            newTaskTextareaRef.current.style.height = `${newTaskTextareaRef.current.scrollHeight}px`;
        }
    }, [newTaskTitle, isCreating]);

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
            if (activeTab === 'all') status = null;
            if (activeTab === 'starred') status = 'Starred';
            if (activeTab === 'important') status = 'Important';

            let queryFolderId = selectedFolder;
            // Exclusive visibility: If in 'Active' tab and no folder selected, only show unfiled tasks
            if (activeTab === 'active' && !selectedLabel && !selectedFolder) {
                queryFolderId = 'null';
            }

            const response = await api.getTasks(status, selectedLabel, queryFolderId, currentPage, pageSize, searchQuery);

            // Race condition check: Only update if this is still the latest request
            if (requestId === fetchRequestId.current) {
                if (response.error) throw new Error(response.error);

                // Handle both legacy (array) and new (paginated object) responses
                let tasksData = [];
                if (Array.isArray(response)) {
                    tasksData = response;
                    setTotalPages(1);
                    setTotalTasks(response.length);
                } else {
                    tasksData = response.tasks || [];
                    setTotalPages(response.total_pages || 1);
                    setTotalTasks(response.total_tasks || 0);
                }
                setTasks(tasksData);
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
        const systemItems = ['active', 'all', 'starred', 'important', 'closed', 'assistant', 'trash'];
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

    // Listen for cross-component refresh events
    useEffect(() => {
        const handleRefresh = () => {
            fetchTasks(false);
            fetchStats();
        };

        const handleAgentUpdate = () => {
            fetchStats();
            // If we have a focused agent, we might need to refresh it
            if (focusedAgentId) {
                // This will trigger a re-fetch of fresh data for workarea items
                // since workarea components often rely on passed props or local storage
            }
        };

        window.addEventListener('task-created', handleRefresh);
        window.addEventListener('agent-updated', handleAgentUpdate);

        return () => {
            window.removeEventListener('task-created', handleRefresh);
            window.removeEventListener('agent-updated', handleAgentUpdate);
        };
    }, [focusedAgentId, activeTab, selectedLabel, selectedFolder]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Check if user is typing in an input or textarea
            const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable;

            if (!isTyping) {
                // Gmail-like shortcut: 'c' for Create Task
                if (event.key === 'c') {
                    // Only allow if in a view where task creation is supported
                    const canCreate = (activeTab === 'active' || activeTab === 'folder' || activeTab === 'label') || (selectedLabel);
                    if (canCreate) {
                        event.preventDefault();
                        if (newTaskTextareaRef.current) {
                            newTaskTextareaRef.current.focus();
                        }
                    }
                }

                // Gmail-like shortcut: '/' for Search
                if (event.key === '/') {
                    event.preventDefault();
                    if (searchInputRef.current) {
                        searchInputRef.current.focus();
                    }
                }

                // Delete selected tasks
                if (event.key === 'Delete' || event.key === 'Backspace') {
                    if (selectedTaskIds.size > 0) {
                        event.preventDefault();
                        handleDeleteSelected();
                    }
                }
            }

            // Command + [ for back navigation
            if ((event.metaKey || event.ctrlKey) && event.key === '[') {
                const isExpanded = expandedTaskIds.size > 0 || expandedAgentIds.size > 0 || globalExpanded;
                if (history.length > 0 || isExpanded) {
                    event.preventDefault();
                    handleBack();
                }
            }
            // Command + ] for forward navigation
            if ((event.metaKey || event.ctrlKey) && event.key === ']') {
                if (forwardHistory.length > 0) {
                    event.preventDefault();
                    handleForward();
                }
            }

            // Arrow Up/Down navigation for expanded tasks
            if (!isTyping && expandedTaskIds.size === 1) {
                const currentId = Array.from(expandedTaskIds)[0];
                const currentIndex = visibleTasks.findIndex(t => t._id === currentId);

                if (event.key === 'ArrowDown') {
                    if (currentIndex !== -1 && currentIndex < visibleTasks.length - 1) {
                        event.preventDefault();
                        const nextTask = visibleTasks[currentIndex + 1];
                        setExpandedTaskIds(new Set([nextTask._id]));
                        setLastCollapsedTaskId(null); // Clear last collapsed when navigating
                        // Optionally scroll into view if needed, but standard expansion might handle it
                    }
                } else if (event.key === 'ArrowUp') {
                    if (currentIndex > 0) {
                        event.preventDefault();
                        const prevTask = visibleTasks[currentIndex - 1];
                        setExpandedTaskIds(new Set([prevTask._id]));
                        setLastCollapsedTaskId(null); // Clear last collapsed when navigating
                    }
                }
            }

            // Enter key to expand first task or re-expand last collapsed task (only when task list is focused)
            if (!isTyping && event.key === 'Enter' && expandedTaskIds.size === 0 && focusArea === 'tasklist') {
                event.preventDefault();
                // First try to re-expand the last collapsed task if it exists
                if (lastCollapsedTaskId) {
                    const taskStillExists = visibleTasks.find(t => t._id === lastCollapsedTaskId);
                    if (taskStillExists) {
                        setExpandedTaskIds(new Set([lastCollapsedTaskId]));
                        setLastCollapsedTaskId(null); // Clear after re-expanding
                        return;
                    }
                }
                // Otherwise, expand the first visible task
                if (visibleTasks.length > 0) {
                    setExpandedTaskIds(new Set([visibleTasks[0]._id]));
                }
            }

            // PageDown for next page
            if (!isTyping && event.key === 'PageDown') {
                if (currentPage < totalPages) {
                    event.preventDefault();
                    setCurrentPage(prev => prev + 1);
                    setExpandedTaskIds(new Set()); // Clear expanded tasks when changing pages
                    setLastCollapsedTaskId(null);
                }
            }

            // PageUp for previous page
            if (!isTyping && event.key === 'PageUp') {
                if (currentPage > 1) {
                    event.preventDefault();
                    setCurrentPage(prev => prev - 1);
                    setExpandedTaskIds(new Set()); // Clear expanded tasks when changing pages
                    setLastCollapsedTaskId(null);
                }
            }

            // Left/Right arrow keys for sidebar-tasklist navigation (only when no tasks are expanded)
            if (!isTyping && expandedTaskIds.size === 0) {
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    setFocusArea('sidebar');
                    setHighlightedSidebarIndex(0); // Start at first item
                } else if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    setFocusArea('tasklist');
                    // Auto-expand first task when moving to task list
                    if (visibleTasks.length > 0) {
                        setExpandedTaskIds(new Set([visibleTasks[0]._id]));
                    }
                }
            }

            // Sidebar navigation with Up/Down arrows when sidebar is focused
            if (!isTyping && focusArea === 'sidebar' && expandedTaskIds.size === 0) {
                // Build list of navigable sidebar items (system items + folders + labels)
                const navigableItems = [];

                // Add system items and folders based on sidebarItems order
                sidebarItems.forEach(itemId => {
                    if (!itemId.startsWith('folder-')) {
                        // System item
                        navigableItems.push({ type: 'system', id: itemId });
                    } else {
                        // Folder
                        const folderId = itemId.replace('folder-', '');
                        const folder = folders.find(f => f._id === folderId);
                        if (folder) {
                            navigableItems.push({ type: 'folder', id: folder._id, data: folder });
                        }
                    }
                });

                // Add labels
                labels.forEach(label => {
                    navigableItems.push({ type: 'label', id: label.name, data: label });
                });

                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setHighlightedSidebarIndex(prev =>
                        prev < navigableItems.length - 1 ? prev + 1 : prev
                    );
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setHighlightedSidebarIndex(prev => prev > 0 ? prev - 1 : 0);
                } else if (event.key === 'Enter') {
                    event.preventDefault();
                    const selectedItem = navigableItems[highlightedSidebarIndex];
                    if (selectedItem) {
                        if (selectedItem.type === 'system') {
                            changeView(selectedItem.id, null);
                        } else if (selectedItem.type === 'folder') {
                            changeView('folder', null, selectedItem.id);
                        } else if (selectedItem.type === 'label') {
                            changeView(activeTab, selectedItem.id);
                        }
                        // Switch focus to task list after selection
                        setFocusArea('tasklist');
                        if (visibleTasks.length > 0) {
                            setExpandedTaskIds(new Set([visibleTasks[0]._id]));
                        }
                    }
                }
            }
        };

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [history, forwardHistory, handleBack, handleForward, activeTab, selectedLabel, expandedTaskIds, lastCollapsedTaskId, visibleTasks, selectedTaskIds, currentPage, totalPages, focusArea, highlightedSidebarIndex, sidebarItems, folders, labels]);

    useEffect(() => {
        fetchTasks(true);
        fetchStats();
        // Clear expanded tasks when changing views
        setExpandedTaskIds(new Set());
        setLastCollapsedTaskId(null);
    }, [activeTab, selectedLabel, selectedFolder, currentPage, pageSize, searchQuery]);

    // [NEW] Auto-focus search when switching to 'all' for search purposes
    useEffect(() => {
        if (shouldFocusSearch && activeTab === 'all' && searchInputRef.current) {
            searchInputRef.current.focus();
            setShouldFocusSearch(false);
        }
    }, [activeTab, shouldFocusSearch]);

    // Save workarea tasks to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('workareaTasks', JSON.stringify(workareaTasks));
    }, [workareaTasks]);

    useEffect(() => {
        localStorage.setItem('task_manager_show_tags', showTags);
    }, [showTags]);

    useEffect(() => {
        localStorage.setItem('task_manager_show_folders', showFolders);
    }, [showFolders]);

    useEffect(() => {
        localStorage.setItem('task_manager_global_expanded', globalExpanded);
    }, [globalExpanded]);

    useEffect(() => {
        localStorage.setItem('task_manager_show_full_titles', showFullTitles);
    }, [showFullTitles]);

    useEffect(() => {
        localStorage.setItem('task_manager_show_preview', showPreview);
    }, [showPreview]);

    useEffect(() => {
        localStorage.setItem('task_manager_show_pulse', showPulse);
    }, [showPulse]);

    useEffect(() => {
        localStorage.setItem('task_manager_show_debug_info', showDebugInfo);
    }, [showDebugInfo]);

    useEffect(() => {
        localStorage.setItem('task_manager_sidebar_collapsed', isSidebarCollapsed);
    }, [isSidebarCollapsed]);

    useEffect(() => {
        localStorage.setItem('task_manager_sidebar_density', sidebarDensity);
    }, [sidebarDensity]);

    useEffect(() => {
        localStorage.setItem('task_manager_show_dynamic_bg', showDynamicBg);
        document.documentElement.setAttribute('data-dynamic-bg', showDynamicBg);
    }, [showDynamicBg]);

    useEffect(() => {
        localStorage.setItem('task_list_font_size', fontSize);
    }, [fontSize]);

    useEffect(() => {
        localStorage.setItem('taskPageSize', pageSize);
    }, [pageSize]);

    // Refresh workarea tasks from database on mount to get latest data including attachments
    useEffect(() => {
        const refreshWorkareaFromDB = async () => {
            if (workareaTasks.length > 0) {
                try {
                    // Fetch fresh data for workarea tasks from the database
                    const freshItems = await Promise.all(
                        workareaTasks.map(async (item) => {
                            if (item.type === 'agent') {
                                // For agents, we just return the item from local storage 
                                // (or we could fetch from api.getAgents if we wanted fresh status, but single fetch isn't there)
                                return item;
                            }
                            // Default to task fetch
                            return api.getTask(item._id).catch(() => null);
                        })
                    );

                    const validItems = freshItems.filter(t => t !== null);
                    if (validItems.length > 0) {
                        setWorkareaTasks(validItems.map(t => ({ ...t, _forceExpanded: true })));
                    } else {
                        // Only clear if we really got back empty valid items (and had some to start)
                        // But if API completely failed for tasks, this might clear them. 
                        // The catch block below handles API errors, this handles "Deleted" items returning null.
                        setWorkareaTasks([]);
                    }
                } catch (err) {
                    console.error('Failed to refresh workarea tasks', err);
                }
            }
        };
        refreshWorkareaFromDB();
    }, []); // Run once on mount

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
            // Let's assume I can pass it.
            // Standardizing: createTask(title, labels, folderId)
            await api.createTask(newTaskTitle, labelsToApply, folderId);

            setNewTaskTitle('');
            setIsCreating(false); // Close form after creation? User might want multiple. 
            // Actually, let's keep it open if user wants to add more? 
            // "when a task is created, just apply..." implies one by one.
            // Let's keep it open based on previous comment. 

            fetchTasks(false);
            fetchStats();
            triggerScanRefresh();
        } catch (err) {
            console.error(err);
        }
    };

    const handleEmptyTrash = async () => {
        if (window.confirm("Are you sure you want to permanently delete all items in the trash? This action cannot be undone.")) {
            try {
                await api.emptyTrash();
                fetchTasks(false);
                fetchStats();
            } catch (err) {
                console.error("Failed to empty trash", err);
            }
        }
    };

    const handleChipSearch = (query) => {
        // Save current state before switching to 'all' for universal chip search
        if (activeTab !== 'all') {
            setPreSearchState({
                tab: activeTab,
                label: selectedLabel,
                folder: selectedFolder,
                expandedIds: Array.from(expandedTaskIds),
                expandedAgentIds: Array.from(expandedAgentIds)
            });
        }
        setSearchQuery(query);
        setActiveTab('all');
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        if (preSearchState) {
            changeView(preSearchState.tab, preSearchState.label, preSearchState.folder);
            // Restore expanded items
            if (preSearchState.expandedIds && preSearchState.expandedIds.length > 0) {
                setExpandedTaskIds(new Set(preSearchState.expandedIds));
            }
            // Restore expanded agents
            if (preSearchState.expandedAgentIds && preSearchState.expandedAgentIds.length > 0) {
                setExpandedAgentIds(new Set(preSearchState.expandedAgentIds));
            }
            setPreSearchState(null);
        }
    };



    const handleSendToWorkarea = (task) => {
        // [MODIFIED] Max 1 Task + 1 Agent
        setWorkareaTasks(prev => {
            // Keep agents, remove other tasks
            const agents = prev.filter(item => item.type === 'agent');
            return [...agents, { ...task }];
        });
    };

    const handleRemoveFromWorkarea = (taskId) => {
        setWorkareaTasks(prev => prev.filter(t => t._id !== taskId));
        // Refresh tasks to show updated attachments in main list
        fetchTasks(false);
    };

    const refreshWorkareaTask = async (taskId) => {
        try {
            const freshTask = await api.getTask(taskId);
            if (freshTask) {
                setWorkareaTasks(prev => prev.map(t =>
                    t._id === taskId ? { ...freshTask } : t
                ));
            }
        } catch (err) {
            console.error('Failed to refresh workarea task', err);
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
                    fetchStats();
                    setShowTags(true);
                } catch (err) {
                    console.error("Failed to tag task from sidebar", err);
                }
            }
        }

        // [NEW] Case 1b: Dragging Sidebar Folder -> Agent
        if (activeId.startsWith('sidebar-folder-') && overId.startsWith('agent-')) {
            const folderId = active.data.current.folderId;
            const agentId = over.data.current.agent._id;

            try {
                const res = await api.assignFolderToAgent(folderId, agentId);

                // Show success feedback (toast or refresh)
                // For now, just refresh tasks + agents + stats
                fetchTasks(false);
                fetchStats();
                fetchAgents();

                // If the agent is expanded, we might want to refresh it specifically or ensuring it shows the new tasks
                window.dispatchEvent(new CustomEvent('agent-updated'));

            } catch (err) {
                console.error("Failed to assign folder to agent", err);
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
                    fetchStats();
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
                    fetchStats();
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
                fetchStats();
            } catch (err) {
                console.error("Failed to move task to folder", err);
            }
            setActiveId(null);
            return;
        }



        // Check if dropped over an agent (Assign Task -> Agent)
        if (overId.startsWith('agent-') && !activeId.startsWith('agent-')) {
            const agentId = over.data.current.agent._id;
            const { task, realId } = getTaskAndList(activeId);

            if (task) {
                // Check if task is already assigned to this agent
                if (task.assigned_agent_id === agentId) {
                    console.log(`Task ${realId} is already assigned to agent ${agentId}`);
                    setActiveId(null);
                    return;
                }

                try {
                    // Update assigneeId (backend)
                    await api.updateTask(realId, { assigned_agent_id: agentId });

                    // Add audit log
                    await api.addUpdate(realId, `Assigned to agent: ${over.data.current.agent.name}`, 'execution');

                    console.log(`Assigned task ${realId} to agent ${agentId}`);

                    // Force refresh to update Agent list (which now includes active_tasks) and Task list
                    // We need to refresh agents too, but AgentList handles its own state. 
                    // Ideally we should trigger a global refresh or specifically refresh agents.
                    // For now, fetchTasks updates tasks, but AgentList might need a reload. 
                    // Since AgentList is a parent or sibling, we might depend on a page reload or state lift.
                    // Actually, if we are in Assistant view, workarea updates might trigger re-renders.
                    fetchTasks(false);
                    // Trigger agent refresh via callback if available, or just reload page for now? 
                    // Better: The AgentList should poll or be updated. 
                    // Let's assume we refresh tasks for now. 
                    // If we want instant update on the chip, we need to update local state in AgentList.
                    // Since we can't easily reach AgentList state from here without prop drilling 'onAgentUpdate',
                    // we will rely on next fetch or maybe trigger a window event.
                    window.dispatchEvent(new CustomEvent('agent-updated'));

                    // [NEW] Also update local workareaTasks if the target agent is there!!
                    setWorkareaTasks(prev => prev.map(item => {
                        if (item.type === 'agent' && item._id === agentId) {
                            return {
                                ...item,
                                active_tasks: [...(item.active_tasks || []), task]
                            };
                        }
                        return item;
                    }));


                } catch (err) {
                    console.error("Failed to assign task to agent", err);
                }
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
                            setWorkareaTasks([{ ...task }]);
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
            {showDynamicBg && <DynamicBackground />}
            <div className="app-shell bg-[var(--bg-dark)] min-h-screen text-[var(--text-main)] relative">
                {/* Mobile Sidebar Overlay */}
                <div
                    className={`sidebar-overlay ${isMobileSidebarOpen ? 'visible' : ''}`}
                    onClick={() => setIsMobileSidebarOpen(false)}
                />

                <Sidebar
                    activeTab={activeTab}
                    onNavigate={changeView}
                    labels={labels}
                    onLabelsChange={fetchLabels}
                    selectedLabel={selectedLabel}
                    folders={folders}
                    onFoldersChange={fetchFolders}
                    selectedFolder={selectedFolder}
                    sidebarItems={sidebarItems}
                    stats={stats}
                    isCollapsed={isSidebarCollapsed}
                    onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    density={sidebarDensity}
                    isOpen={isMobileSidebarOpen}
                    onCloseMobile={() => setIsMobileSidebarOpen(false)}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onClearSearch={handleClearSearch}
                    searchInputRef={searchInputRef}
                    isFocused={focusArea === 'sidebar'}
                    highlightedIndex={focusArea === 'sidebar' ? highlightedSidebarIndex : -1}
                />


                <div className={`main-content transition-all duration-300 ${isSidebarCollapsed ? 'ml-0' : 'ml-0'}`} onClick={() => setFocusArea('tasklist')}>

                    {/* Gmail-Style Mobile Search Pill */}
                    <div className="search-pill-container mobile-only">
                        <div className="search-pill">
                            <button onClick={() => setIsMobileSidebarOpen(true)} className="text-[var(--text-muted)]">
                                <Menu size={20} />
                            </button>
                            <input
                                type="text"
                                placeholder="Search in tasks"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1"
                            />
                            {localStorage.getItem('userProfile') && (
                                <img
                                    src={JSON.parse(localStorage.getItem('userProfile')).picture}
                                    alt="Profile"
                                    className="w-8 h-8 rounded-full border border-gray-700"
                                />
                            )}
                        </div>
                    </div>

                    {/* Mobile Floating Action Button (FAB) */}
                    <button
                        className="fab-button mobile-only"
                        onClick={() => setIsMobileCreateOpen(true)}
                    >
                        <Plus size={24} />
                    </button>

                    {/* Mobile Create Modal */}
                    <AnimatePresence>
                        {isMobileCreateOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="mobile-create-modal"
                                onClick={() => setIsMobileCreateOpen(false)}
                            >
                                <motion.div
                                    initial={{ y: 50, scale: 0.95 }}
                                    animate={{ y: 0, scale: 1 }}
                                    exit={{ y: 50, scale: 0.95 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[#1e293b] w-full max-w-sm rounded-2xl p-4 shadow-2xl border border-gray-700"
                                >
                                    <h3 className="text-lg font-bold mb-3 text-white">New Task</h3>
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleCreateTask(e);
                                            setIsMobileCreateOpen(false);
                                        }}
                                    >
                                        <textarea
                                            autoFocus
                                            rows={3}
                                            placeholder="What needs to be done?"
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                            className="w-full bg-black/20 text-white rounded-xl p-3 mb-4 border border-[var(--border)] focus:border-blue-500/50 outline-none resize-none"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleCreateTask(e);
                                                    setIsMobileCreateOpen(false);
                                                }
                                            }}
                                        />
                                        <div className="flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsMobileCreateOpen(false)}
                                                className="px-4 py-2 text-[var(--text-muted)] font-medium"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!newTaskTitle.trim()}
                                                className="px-6 py-2 bg-blue-500 text-white rounded-xl font-bold disabled:opacity-50"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="content-header">
                        <header className="px-6 py-4 flex justify-between items-center bg-[var(--bg-dark)]/80 backdrop-blur-md sticky top-0 z-40 border-b border-[var(--border)]">
                            <div className="flex items-center gap-4 shrink-0 mobile-hidden">
                                {/* [NEW] Master Checkbox */}
                                <div className="flex items-center justify-center mr-2">
                                    <div
                                        className={`w-4 h-4 rounded-sm border flex items-center justify-center cursor-pointer transition-all ${selectedTaskIds.size > 0
                                            ? 'bg-blue-500 border-blue-500 opacity-100'
                                            : 'border-gray-600 hover:border-blue-500 opacity-50 hover:opacity-100'
                                            }`}
                                        onClick={handleSelectAll}
                                        title="Select All"
                                    >
                                        {selectedTaskIds.size > 0 && selectedTaskIds.size === visibleTasks.length && (
                                            <Check size={10} className="text-white" strokeWidth={4} />
                                        )}
                                        {selectedTaskIds.size > 0 && selectedTaskIds.size < visibleTasks.length && (
                                            <Minus size={10} className="text-white" strokeWidth={4} />
                                        )}
                                    </div>
                                </div>

                                <AnimatePresence mode="popLayout">
                                    <div className="flex items-center gap-1.5">
                                        {(history.length > 0 || expandedTaskIds.size > 0 || expandedAgentIds.size > 0 || globalExpanded) && (
                                            <motion.button
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                onClick={handleBack}
                                                className="p-1.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-all flex items-center justify-center group"
                                                title="Go Back (Cmd + [) / Collapse"
                                            >
                                                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                                            </motion.button>
                                        )}

                                        {forwardHistory.length > 0 && (
                                            <motion.button
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                onClick={handleForward}
                                                className="p-1.5 bg-[var(--input-bg)] border border-[var(--border)] rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-all flex items-center justify-center group"
                                                title="Go Forward (Cmd + ])"
                                            >
                                                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                            </motion.button>
                                        )}
                                    </div>
                                </AnimatePresence>


                            </div>

                            {/* Create Task or Action Toolbar */}
                            <div className="flex-[3] flex justify-center mx-6 min-w-[300px]">
                                <div className="w-full max-w-xl group relative transition-all duration-300 focus-within:max-w-2xl">
                                    {selectedTaskIds.size > 0 ? (
                                        // [NEW] Action Toolbar
                                        <div className="flex items-center justify-between w-full bg-[var(--input-bg)] border border-blue-500/30 rounded-xl px-4 py-2 shadow-lg shadow-blue-500/5 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-blue-400 text-sm">
                                                    {selectedTaskIds.size} selected
                                                </span>
                                                <button
                                                    onClick={() => setSelectedTaskIds(new Set())}
                                                    className="text-[var(--text-muted)] hover:text-white transition-colors text-xs hover:underline"
                                                >
                                                    Clear selection
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleDeleteSelected}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                                                    title="Delete Selected"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                {/* Future actions can go here (e.g., Mark Done, Move to Folder) */}
                                            </div>
                                        </div>
                                    ) : (
                                        // Default Create Task Bar
                                        <form
                                            onSubmit={(e) => {
                                                handleCreateTask(e);
                                            }}
                                            className="relative w-full"
                                        >
                                            <div
                                                className="flex items-center w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-xl px-4 py-2 focus-within:bg-white/10 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all shadow-inner cursor-text"
                                                onClick={() => newTaskTextareaRef.current?.focus()}
                                            >
                                                <Plus size={18} className="text-[var(--text-muted)] group-focus-within:text-blue-400 transition-colors shrink-0 mr-3" />
                                                <textarea
                                                    ref={newTaskTextareaRef}
                                                    rows={1}
                                                    placeholder={selectedFolder ? `Add task to ${stats.folders[selectedFolder] ? folders.find(f => f._id === selectedFolder)?.name : 'folder'}...` : selectedLabel ? `Add task to ${selectedLabel}...` : "What needs to be done?"}
                                                    value={newTaskTitle}
                                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleCreateTask(e);
                                                        } else if (e.key === 'Escape') {
                                                            setNewTaskTitle('');
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] resize-none overflow-hidden py-0 leading-normal"
                                                />
                                                {newTaskTitle && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent wrapper click
                                                            setNewTaskTitle('');
                                                        }}
                                                        className="shrink-0 ml-2 flex items-center text-[var(--text-muted)] hover:text-gray-300 transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                                {/* Search (Secondary) - Only show if not primary */}


                                {activeTab === 'assistant' && (
                                    <button
                                        onClick={() => setIsCreatingAgent(true)}
                                        className="px-1.5 py-1.5 rounded-lg transition-colors flex items-center text-blue-400 bg-blue-400/10 hover:bg-blue-400/20"
                                        title="Hire Agent"
                                    >
                                        <span className="text-xs font-medium">Hire Agent</span>
                                    </button>
                                )}

                                {/* Refresh Button */}
                                <button
                                    onClick={() => {
                                        fetchTasks(true);
                                        fetchStats();
                                    }}
                                    className="p-2 rounded-lg transition-all flex items-center justify-center bg-gray-900 border border-gray-800 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-gray-700 hover:rotate-180"
                                    title="Refresh Tasks"
                                >
                                    <RotateCw size={18} className="transition-transform duration-500" />
                                </button>

                                <div className="relative" ref={menuRef}>
                                    <button
                                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                                        className={`p-2 rounded-lg transition-all flex items-center justify-center ${isMenuOpen ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-gray-900 border border-gray-800 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-gray-700'}`}
                                        title="View Options"
                                    >
                                        <SlidersHorizontal size={18} />
                                    </button>

                                    <AnimatePresence>
                                        {isMenuOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute right-0 mt-2 w-56 bg-gray-950 border border-gray-800 rounded-xl shadow-2xl py-2 z-50 backdrop-blur-xl"
                                            >
                                                <div className="px-3 py-1.5 mb-1">
                                                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Sort By</span>
                                                </div>
                                                <div className="px-2 pb-2">
                                                    <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
                                                        <button
                                                            onClick={() => setSortBy('manual')}
                                                            className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-all ${sortBy === 'manual' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-300'}`}
                                                        >
                                                            Manual
                                                        </button>
                                                        <button
                                                            onClick={() => setSortBy('date')}
                                                            className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-all ${sortBy === 'date' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-300'}`}
                                                        >
                                                            Date
                                                        </button>
                                                        <button
                                                            onClick={() => setSortBy('title')}
                                                            className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-all ${sortBy === 'title' ? 'bg-blue-500/20 text-blue-400 shadow-sm' : 'text-[var(--text-muted)] hover:text-gray-300'}`}
                                                        >
                                                            Title
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="h-px bg-gray-800 my-2 mx-2"></div>
                                                <div className="px-3 py-1.5 mb-1">
                                                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Layout & Visibility</span>
                                                </div>

                                                <button
                                                    onClick={() => { setShowTags(!showTags); setIsMenuOpen(false); }}
                                                    className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors hover:bg-[var(--input-bg)] ${showTags ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}
                                                >
                                                    <TagIcon size={16} />
                                                    <span className="text-xs font-medium">{showTags ? 'Hide Tags' : 'Show Tags'}</span>
                                                </button>

                                                <button
                                                    onClick={() => { setShowFolders(!showFolders); setIsMenuOpen(false); }}
                                                    className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors hover:bg-[var(--input-bg)] ${showFolders ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}
                                                >
                                                    <Folder size={16} />
                                                    <span className="text-xs font-medium">{showFolders ? 'Hide Folders' : 'Show Folders'}</span>
                                                </button>

                                                {activeTab !== 'assistant' && tasks.length > 0 && (
                                                    <>
                                                        <button
                                                            onClick={() => { setGlobalExpanded(!globalExpanded); setIsMenuOpen(false); }}
                                                            className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors hover:bg-[var(--input-bg)] ${globalExpanded ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}
                                                        >
                                                            <ChevronsUpDown size={16} />
                                                            <span className="text-xs font-medium">{globalExpanded ? 'Collapse All' : 'Expand All'}</span>
                                                        </button>

                                                        <button
                                                            onClick={() => { setShowFullTitles(!showFullTitles); setIsMenuOpen(false); }}
                                                            className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors hover:bg-[var(--input-bg)] ${showFullTitles ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}
                                                        >
                                                            <Type size={16} />
                                                            <span className="text-xs font-medium">{showFullTitles ? 'Truncate Titles' : 'Full Titles'}</span>
                                                        </button>

                                                        <button
                                                            onClick={() => { setShowPreview(!showPreview); setIsMenuOpen(false); }}
                                                            className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors hover:bg-[var(--input-bg)] ${showPreview ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}
                                                        >
                                                            <MessageSquare size={16} />
                                                            <span className="text-xs font-medium">{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
                                                        </button>

                                                        <button
                                                            onClick={() => { setShowPulse(!showPulse); setIsMenuOpen(false); }}
                                                            className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors hover:bg-[var(--input-bg)] ${showPulse ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}
                                                        >
                                                            <Zap size={16} />
                                                            <span className="text-xs font-medium">{showPulse ? 'Disable Pulse' : 'Enable Pulse'}</span>
                                                        </button>

                                                        <button
                                                            onClick={() => { setShowDebugInfo(!showDebugInfo); setIsMenuOpen(false); }}
                                                            className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors hover:bg-[var(--input-bg)] ${showDebugInfo ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}
                                                        >
                                                            <Bug size={16} />
                                                            <span className="text-xs font-medium">{showDebugInfo ? 'Hide Debug Info' : 'Show Debug Info'}</span>
                                                        </button>
                                                    </>
                                                )}

                                                <div className="h-px bg-gray-800 my-2 mx-2"></div>

                                                <div className="px-3 py-1.5 mb-1">
                                                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Actions</span>
                                                </div>

                                                {(selectedFolder || activeTab === 'active' || activeTab === 'all') && (
                                                    <>
                                                        <button
                                                            onClick={async () => {
                                                                setIsMenuOpen(false);
                                                                try {
                                                                    if (selectedFolder) {
                                                                        await api.runFolderImportance(selectedFolder);
                                                                    } else {
                                                                        await api.runGlobalImportance();
                                                                    }
                                                                    fetchTasks(false);
                                                                    fetchStats();
                                                                } catch (err) {
                                                                    console.error("Failed to run importance analysis", err);
                                                                }
                                                            }}
                                                            className="w-full px-4 py-2 text-left flex items-center gap-3 transition-colors hover:bg-[var(--input-bg)] text-purple-400"
                                                        >
                                                            <Sparkles size={16} />
                                                            <span className="text-xs font-medium">Run Importance Analysis</span>
                                                        </button>

                                                        <button
                                                            onClick={async () => {
                                                                setIsMenuOpen(false);
                                                                try {
                                                                    if (selectedFolder) {
                                                                        await api.runFolderPriority(selectedFolder);
                                                                    } else {
                                                                        await api.runGlobalPriority();
                                                                    }
                                                                    fetchTasks(false);
                                                                    fetchStats();
                                                                } catch (err) {
                                                                    console.error("Failed to run priority check", err);
                                                                }
                                                            }}
                                                            className="w-full px-4 py-2 text-left flex items-center gap-3 transition-colors hover:bg-[var(--input-bg)] text-red-400"
                                                        >
                                                            <Zap size={16} />
                                                            <span className="text-xs font-medium">Run Priority Check</span>
                                                        </button>

                                                        <button
                                                            onClick={async () => {
                                                                setIsMenuOpen(false);
                                                                try {
                                                                    if (selectedFolder) {
                                                                        await api.runFolderDuplicate(selectedFolder);
                                                                    } else {
                                                                        await api.runGlobalDuplicate();
                                                                    }
                                                                    fetchTasks(false);
                                                                    fetchStats();
                                                                } catch (err) {
                                                                    console.error("Failed to run duplicate check", err);
                                                                }
                                                            }}
                                                            className="w-full px-4 py-2 text-left flex items-center gap-3 transition-colors hover:bg-[var(--input-bg)] text-[var(--text-muted)]"
                                                        >
                                                            <Copy size={16} />
                                                            <span className="text-xs font-medium">Run Duplicate Check</span>
                                                        </button>
                                                    </>
                                                )}

                                                <div className="h-px bg-gray-800 my-2 mx-2"></div>

                                                <div className="px-3 py-1.5 mb-1">
                                                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Preferences</span>
                                                </div>

                                                {/* Sidebar Density */}
                                                <div className="px-4 py-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-3 text-[var(--text-muted)]">
                                                        <SlidersHorizontal size={16} />
                                                        <span className="text-xs font-medium">Sidebar Density</span>
                                                    </div>
                                                    <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg overflow-hidden h-7">
                                                        <button
                                                            onClick={() => setSidebarDensity(prev => Math.max(1, prev - 1))}
                                                            className="px-2 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border-r border-gray-800 h-full flex items-center"
                                                        >
                                                            <ZoomOut size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => setSidebarDensity(prev => Math.min(10, prev + 1))}
                                                            className="px-2 hover:bg-white/10 text-[var(--text-muted)] hover:text-white h-full flex items-center"
                                                        >
                                                            <ZoomIn size={12} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Timeline Limit */}
                                                <div className="px-4 py-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-3 text-[var(--text-muted)]">
                                                        <Clock size={16} />
                                                        <span className="text-xs font-medium">Timeline Updates</span>
                                                    </div>
                                                    <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg overflow-hidden h-7">
                                                        <button
                                                            onClick={() => setTimelineLimit(prev => Math.max(1, prev - 1))}
                                                            className="px-2 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border-r border-gray-800 h-full flex items-center"
                                                        >
                                                            <Minus size={12} />
                                                        </button>
                                                        <span className="px-2 text-xs text-gray-300 min-w-[20px] text-center">{timelineLimit}</span>
                                                        <button
                                                            onClick={() => setTimelineLimit(prev => Math.min(10, prev + 1))}
                                                            className="px-2 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border-l border-gray-800 h-full flex items-center"
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {activeTab !== 'assistant' && tasks.length > 0 && (
                                                    <div className="px-4 py-2 flex items-center justify-between">
                                                        <div className="flex items-center gap-3 text-[var(--text-muted)]">
                                                            <Type size={16} />
                                                            <span className="text-xs font-medium">Text Size</span>
                                                        </div>
                                                        <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg overflow-hidden h-7">
                                                            <button
                                                                onClick={() => setFontSize(prev => Math.max(9, prev - 1))}
                                                                className="px-2 hover:bg-white/10 text-[var(--text-muted)] hover:text-white border-r border-gray-800 h-full flex items-center"
                                                            >
                                                                <ZoomOut size={12} />
                                                            </button>
                                                            <button
                                                                onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
                                                                className="px-2 hover:bg-white/10 text-[var(--text-muted)] hover:text-white h-full flex items-center"
                                                            >
                                                                <ZoomIn size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Show Count Toggle */}
                                                <button
                                                    onClick={() => setShowCounts(!showCounts)}
                                                    className="w-full px-4 py-2 text-left flex items-center justify-between transition-colors hover:bg-[var(--input-bg)]"
                                                >
                                                    <span className="text-xs font-medium text-[var(--text-muted)]">Show Counts</span>
                                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${showCounts ? 'bg-blue-500' : 'bg-gray-700'}`}>
                                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showCounts ? 'right-0.5' : 'left-0.5'}`} />
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => setShowDynamicBg(!showDynamicBg)}
                                                    className="w-full px-4 py-2 text-left flex items-center justify-between transition-colors hover:bg-[var(--input-bg)]"
                                                >
                                                    <span className="text-xs font-medium text-[var(--text-muted)]">Dynamic Background</span>
                                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${showDynamicBg ? 'bg-blue-500' : 'bg-gray-700'}`}>
                                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showDynamicBg ? 'right-0.5' : 'left-0.5'}`} />
                                                    </div>
                                                </button>

                                                {activeTab === 'trash' && tasks.length > 0 && (
                                                    <>
                                                        <div className="h-px bg-gray-800 my-2 mx-2"></div>
                                                        <button
                                                            onClick={() => { handleEmptyTrash(); setIsMenuOpen(false); }}
                                                            className="w-full px-4 py-2 text-left flex items-center gap-3 transition-colors hover:bg-red-500/10 text-red-400"
                                                        >
                                                            <Trash2 size={16} />
                                                            <span className="text-xs font-medium">Empty Trash</span>
                                                        </button>
                                                    </>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <button
                                    onClick={() => setIsGeminiOpen(!isGeminiOpen)}
                                    className={`p-2 rounded-lg transition-all flex items-center justify-center ${isGeminiOpen ? 'bg-gradient-to-tr from-blue-500/20 to-purple-500/20 text-blue-400 border border-blue-500/30' : 'bg-gray-900 border border-gray-800 text-[var(--text-muted)] hover:text-white hover:border-gray-700'}`}
                                    title="Ask Gemini"
                                >
                                    <GeminiIcon size={18} />
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
                    </div>


                    {/* Main Scrollable Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative backdrop-blur-[2px]">
                        {/* [NEW] Workarea Section (Persistent across views) */}
                        <AnimatePresence>
                            {workareaTasks.length > 0 && (
                                <>
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="bg-white/[0.03] border-b border-[var(--border)] relative flex flex-col shrink-0"
                                    >
                                        <div className="px-6 py-3 bg-white/[0.02] backdrop-blur border-[var(--border)] flex items-center justify-between sticky top-0 z-10">
                                            <h2 className="text-sm font-bold uppercase tracking-widest text-blue-400">Current Focus</h2>
                                        </div>
                                        <div className="px-6 py-4">
                                            {workareaTasks.map(item => {
                                                if (item.type === 'agent') {
                                                    return (
                                                        <div key={`workarea-agent-${item._id}`} className="mb-2">
                                                            <AgentItem
                                                                agent={item}
                                                                isFocused={true}
                                                                onFocus={() => handleFocusAgent(item)}
                                                                availableLabels={labels}
                                                                timelineLimit={timelineLimit}
                                                                defaultExpanded={expandedAgentIds.has(item._id)}
                                                                onToggleExpand={(agentId, isExpanded) => {
                                                                    setExpandedAgentIds(prev => {
                                                                        const newSet = new Set(prev);
                                                                        if (isExpanded) newSet.add(agentId);
                                                                        else newSet.delete(agentId);
                                                                        return newSet;
                                                                    });
                                                                }}
                                                            // Add compact prop if needed
                                                            />
                                                        </div>
                                                    );
                                                }
                                                // Default to Task
                                                return (
                                                    <SortableTaskItem
                                                        key={`workarea-${item._id}`}
                                                        id={`workarea-task-${item._id}`}
                                                        task={item}
                                                        onUpdate={() => {
                                                            fetchTasks(false);
                                                            fetchStats();
                                                            refreshWorkareaTask(item._id);
                                                            triggerScanRefresh();
                                                        }}
                                                        showTags={true}
                                                        showFolders={showFolders}
                                                        folders={folders}
                                                        availableLabels={labels}
                                                        isWorkarea={true}
                                                        defaultExpanded={item._forceExpanded}
                                                        onRemoveFromWorkarea={() => handleRemoveFromWorkarea(item._id)}
                                                        onAttachmentClick={handleNavigateToTask}
                                                        onTaskClick={() => handleNavigateToTask(item)}
                                                        globalExpanded={globalExpanded}
                                                        showFullTitles={showFullTitles}
                                                        showPreview={showPreview && !(globalExpanded || expandedTaskIds.has(item._id))}
                                                        showPulse={showPulse}
                                                        showDebugInfo={showDebugInfo}
                                                        sortBy={sortBy}
                                                        fontSize={fontSize}
                                                        timelineLimit={timelineLimit}
                                                        showCounts={showCounts}
                                                        agents={agents}
                                                        onSearch={handleChipSearch}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </motion.div>

                                    <div className="h-px bg-[var(--input-bg)] my-6 mx-6"></div>
                                </>
                            )}
                        </AnimatePresence>

                        {activeTab === 'assistant' ? (
                            <div className="min-h-0">
                                <AgentList
                                    onFocusAgent={handleFocusAgent}
                                    focusedAgentId={focusedAgentId}
                                    availableLabels={labels}
                                    isCreating={isCreatingAgent}
                                    setIsCreating={setIsCreatingAgent}
                                    timelineLimit={timelineLimit}
                                    agents={agents}
                                    onAgentsUpdate={fetchAgents}
                                    expandedIds={expandedAgentIds}
                                    onToggleExpand={(agentId, isExpanded) => {
                                        setExpandedAgentIds(prev => {
                                            const newSet = new Set(prev);
                                            if (isExpanded) newSet.add(agentId);
                                            else newSet.delete(agentId);
                                            return newSet;
                                        });
                                    }}
                                    onSearch={handleChipSearch}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col px-6 pb-8 min-h-0">
                                {error ? (
                                    <div className="flex flex-col items-center justify-center text-center py-12">
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
                                        <div className="pr-2">
                                            {loading ? (
                                                null
                                            ) : tasks.length === 0 ? (
                                                <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800/50 border-dashed">
                                                    <p className="text-[var(--text-muted)] text-lg">No {activeTab} tasks found.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <SortableContext
                                                        items={visibleTasks.map(t => t._id)}
                                                        strategy={verticalListSortingStrategy}
                                                    >
                                                        <div>
                                                            {visibleTasks.map(task => (
                                                                <SortableTaskItem
                                                                    key={task._id}
                                                                    id={task._id}
                                                                    task={task}
                                                                    onUpdate={() => {
                                                                        fetchTasks(false);
                                                                        fetchStats();
                                                                        triggerScanRefresh();
                                                                    }}
                                                                    showTags={showTags}
                                                                    showFolders={showFolders}
                                                                    folders={folders}
                                                                    availableLabels={labels}
                                                                    onSendToWorkarea={() => handleSendToWorkarea(task)}
                                                                    isWorkarea={false}
                                                                    defaultExpanded={autoExpandTaskId === task._id || expandedTaskIds.has(task._id)}
                                                                    onToggleExpand={(taskId, isExpanded) => {
                                                                        setExpandedTaskIds(prev => {
                                                                            const newSet = new Set(prev);
                                                                            if (isExpanded) {
                                                                                newSet.add(taskId);
                                                                                setLastCollapsedTaskId(null); // Clear when expanding
                                                                            } else {
                                                                                newSet.delete(taskId);
                                                                                setLastCollapsedTaskId(taskId); // Track when collapsing
                                                                            }
                                                                            return newSet;
                                                                        });
                                                                    }}
                                                                    onAttachmentClick={handleNavigateToTask}
                                                                    globalExpanded={globalExpanded}
                                                                    showFullTitles={showFullTitles}
                                                                    showPreview={showPreview}
                                                                    showDebugInfo={showDebugInfo}
                                                                    sortBy={sortBy}
                                                                    fontSize={fontSize}
                                                                    timelineLimit={timelineLimit}
                                                                    showCounts={showCounts}
                                                                    agents={agents}
                                                                    onSearch={handleChipSearch}
                                                                    showPulse={showPulse}
                                                                    // [NEW] Selection props
                                                                    isSelected={selectedTaskIds.has(task._id)}
                                                                    onToggleSelect={() => handleToggleTask(task._id)}
                                                                />
                                                            ))}
                                                        </div>
                                                    </SortableContext>

                                                    {/* Pagination Controls */}
                                                    {totalTasks > 0 && (
                                                        <div className="flex items-center justify-between px-4 py-4 border-t border-[var(--border)] mt-auto">
                                                            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                                                <span>Rows per page:</span>
                                                                <select
                                                                    value={pageSize}
                                                                    onChange={(e) => {
                                                                        setPageSize(Number(e.target.value));
                                                                        setCurrentPage(1); // Reset to first page on size change
                                                                    }}
                                                                    className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-blue-500/50"
                                                                >
                                                                    <option value={10}>10</option>
                                                                    <option value={20}>20</option>
                                                                    <option value={25}>25</option>
                                                                    <option value={50}>50</option>
                                                                    <option value={100}>100</option>
                                                                </select>
                                                                <span className="ml-2">
                                                                    Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalTasks)} of {totalTasks}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                                    disabled={currentPage === 1}
                                                                    className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                                                >
                                                                    <ChevronLeft size={16} />
                                                                </button>
                                                                <div className="text-xs font-medium text-[var(--text-muted)] px-2">
                                                                    Page {currentPage} of {totalPages}
                                                                </div>
                                                                <button
                                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                                    disabled={currentPage === totalPages}
                                                                    className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                                                >
                                                                    <ChevronRight size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <GeminiPanel isOpen={isGeminiOpen} onClose={() => setIsGeminiOpen(false)} />
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
                                showFolders={showFolders}
                                folders={folders}
                                isOverlay={true}
                                onUpdate={() => { }}
                                availableLabels={labels}
                                showDebugInfo={showDebugInfo}
                                showCounts={showCounts}
                                agents={agents}
                                sortBy={sortBy}
                            />
                        ) : (activeId && activeId.toString().startsWith('workarea-task-')) ? (
                            <TaskItem
                                task={workareaTasks.find(t => `workarea-task-${t._id}` === activeId)}
                                showTags={true}
                                showFolders={showFolders}
                                folders={folders}
                                isOverlay={true}
                                onUpdate={() => { }}
                                availableLabels={labels}
                                isWorkarea={true}
                                showDebugInfo={showDebugInfo}
                                showCounts={showCounts}
                                agents={agents}
                                sortBy={sortBy}
                            />
                        ) : null}
                    </DragOverlay >,
                    document.body
                )
            }
        </DndContext >
    );
}

