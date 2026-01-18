import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Layout,
    CheckSquare,
    Home,
    Sparkles,
    Trash2,
    Plus,
    Tag as TagIcon,
    X,
    LogOut,
    MessageSquare,
    Palette,
    Folder,
    Check,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Layers,
    Moon,
    Sun
} from 'lucide-react';
import { api } from '../api';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTheme } from '../context/ThemeContext';

const SortableSidebarItem = ({ id, icon: Icon, label, isActive, onClick, data, isFolder, onDelete, count, onColorChange, color, isCollapsed, density = 5 }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    // Calculate padding based on numeric density (1=compact, 10=comfortable)
    const getPaddingPx = (density) => {
        return 2 + ((density - 1) * 1.56);
    };
    const paddingY = getPaddingPx(density);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
        isOver
    } = useSortable({ id, data });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative group">
            <button
                className={`nav-item w-full flex items-center gap-3 px-4 rounded-xl transition-all ${isActive ? 'bg-blue-500/10 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    } ${isOver && !isDragging ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''} ${isCollapsed ? '!justify-center !px-0' : ''}`}
                style={{ paddingTop: `${paddingY}px`, paddingBottom: `${paddingY}px` }}
                onClick={onClick}
                title={isCollapsed ? label : ''}
            >
                {Icon && <Icon size={18} className={`shrink-0 ${isOver ? 'text-blue-400' : ''}`} />}
                {!Icon && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: data?.color || '#3B82F6' }} />}
                {!isCollapsed && <span className={`text-sm font-medium truncate ${isOver ? 'text-blue-400' : ''}`}>{label}</span>}
                {!isCollapsed && count !== undefined && count > 0 && (
                    <span className={`ml-auto text-xs ${isActive ? 'text-blue-400' : 'text-gray-600'}`}>{count}</span>
                )}
                {isActive && !isOver && (
                    <motion.div
                        className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
                        layoutId="activeIndicator"
                    />
                )}
            </button>
            {isFolder && onDelete && (
                <div
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-50"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {!isCollapsed && (
                        isDeleting ? (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={onDelete}
                                    className="p-1 text-green-400 hover:text-green-300 transition-colors bg-green-400/10 rounded"
                                    title="Confirm Delete"
                                >
                                    <Check size={12} />
                                </button>
                                <button
                                    onClick={() => setIsDeleting(false)}
                                    className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                                    title="Cancel"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsDeleting(true)}
                                className="p-1.5 text-gray-600 hover:text-red-400 transition-all rounded hover:bg-white/5"
                                title="Delete Folder"
                            >
                                <Trash2 size={12} />
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

const DraggableSidebarLabel = ({ id, label, isActive, onClick, color, data, count, onDelete, onColorChange, isCollapsed, density = 5 }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const getPaddingPx = (density) => {
        return 2 + ((density - 1) * 1.56);
    };
    const paddingY = getPaddingPx(density);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
        isOver
    } = useSortable({
        id: id,
        data: data
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="relative group w-full"
        >
            <button
                className={`nav-item w-full flex items-center gap-3 px-4 rounded-xl transition-all touch-none cursor-grab active:cursor-grabbing ${isActive ? 'bg-blue-500/10 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    } ${isOver && !isDragging ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''} ${isCollapsed ? '!justify-center !px-0' : ''}`}
                style={{ paddingTop: `${paddingY}px`, paddingBottom: `${paddingY}px` }}
                onClick={onClick}
                title={isCollapsed ? label : ''}
            >
                <div className="w-2 h-2 rounded-full pointer-events-none shrink-0" style={{ backgroundColor: color || '#3B82F6' }} />
                {!isCollapsed && <span className={`text-sm font-medium pointer-events-none truncate ${isOver ? 'text-blue-400' : ''}`}>{label}</span>}
                {!isCollapsed && count !== undefined && count > 0 && (
                    <span className={`ml-auto text-xs transition-opacity group-hover:opacity-0 ${isActive ? 'text-blue-400' : 'text-gray-600'}`}>{count}</span>
                )}
                {isActive && !isOver && (
                    <motion.div
                        className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
                        layoutId="activeIndicator"
                    />
                )}
            </button>
            <div
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-50"
                onPointerDown={(e) => e.stopPropagation()}
            >
                {!isCollapsed && (
                    isDeleting ? (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={onDelete}
                                className="p-1 text-green-400 hover:text-green-300 transition-colors bg-green-400/10 rounded"
                                title="Confirm Delete"
                            >
                                <Check size={12} />
                            </button>
                            <button
                                onClick={() => setIsDeleting(false)}
                                className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                                title="Cancel"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <label className="relative cursor-pointer p-1 text-gray-600 hover:text-blue-400 transition-colors">
                                <Palette size={12} />
                                <input
                                    type="color"
                                    value={color || '#3B82F6'}
                                    onChange={onColorChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </label>
                            <button
                                onClick={() => setIsDeleting(true)}
                                className="relative p-1 text-gray-600 hover:text-red-400 transition-all"
                                title="Delete Label"
                            >
                                <Trash2 size={12} />
                            </button>
                        </>
                    )
                )}
            </div>
        </div>
    );
};

export function Sidebar({ activeTab, onNavigate, labels = [], onLabelsChange, selectedLabel, folders = [], onFoldersChange, selectedFolder, sidebarItems = [], stats = {}, isCollapsed, onToggle, density = 5, isOpen = false, onCloseMobile }) {
    const { theme, toggleTheme } = useTheme();
    const [isAddingLabel, setIsAddingLabel] = useState(false);
    const [newLabelName, setNewLabelName] = useState('');
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [editingLabelId, setEditingLabelId] = useState(null);
    const [showAllFolders, setShowAllFolders] = useState(false);

    // Calculate spacing based on numeric density (1=compact, 10=comfortable)
    // More granular: 1-2=space-y-0.5, 3-4=space-y-1, 5-7=space-y-1.5, 8-10=space-y-2
    const getSpacingClass = (density) => {
        if (density <= 2) return 'space-y-0.5';
        if (density <= 4) return 'space-y-1';
        if (density <= 7) return 'space-y-1.5';
        return 'space-y-2';
    };
    const spacingClass = getSpacingClass(density);

    const systemItems = {
        'active': { label: 'Active Tasks', icon: Layout },
        'all': { label: 'All Tasks', icon: Layers },
        'closed': { label: 'Closed Tasks', icon: CheckSquare },
        'assistant': { label: 'Agents', icon: MessageSquare },
        'trash': { label: 'Trash', icon: Trash2 },
    };

    const handleAddLabel = async (e) => {
        if (e) e.preventDefault();
        if (!newLabelName.trim()) {
            setIsAddingLabel(false);
            return;
        }

        try {
            await api.createLabel(newLabelName);
            setNewLabelName('');
            setIsAddingLabel(false);
            if (onLabelsChange) onLabelsChange();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteLabel = async (e, id) => {
        e.stopPropagation();
        try {
            const res = await api.deleteLabel(id);
            if (res.error) throw new Error(res.error);
            if (onLabelsChange) onLabelsChange();
            if (selectedLabel === id) onNavigate(activeTab, null);
        } catch (err) {
            console.error("Failed to delete label:", err);
        }
    };

    const handleColorChange = async (e, labelId) => {
        e.stopPropagation();
        const newColor = e.target.value;
        try {
            await api.updateLabel(labelId, { color: newColor });
            if (onLabelsChange) onLabelsChange();
        } catch (err) {
            console.error("Failed to update label color:", err);
        }
    };

    const handleAddFolder = async (e) => {
        if (e) e.preventDefault();
        if (!newFolderName.trim()) {
            setIsAddingFolder(false);
            return;
        }

        try {
            await api.createFolder(newFolderName);
            setNewFolderName('');
            setIsAddingFolder(false);
            if (onFoldersChange) onFoldersChange();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteFolder = async (e, id) => {
        e.stopPropagation();
        try {
            await api.deleteFolder(id);
            if (onFoldersChange) onFoldersChange();
            if (selectedFolder === id) onNavigate('active', null, null);
        } catch (err) {
            console.error("Failed to delete folder:", err);
        }
    };

    return (
        <div
            className={`sidebar shrink-0 h-screen border-r flex flex-col pt-8 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[80px]' : 'w-[280px]'} ${isOpen ? 'mobile-open' : ''}`}
            style={{
                background: 'var(--bg-sidebar)',
                borderColor: 'var(--border)'
            }}
        >
            {/* Mobile Close Button */}
            <button
                className="mobile-sidebar-close mobile-only"
                onClick={onCloseMobile}
            >
                <X size={20} />
            </button>
            <div className={`px-6 mb-6 flex items-start justify-between ${isCollapsed ? 'px-0 justify-center' : ''}`}>
                <div
                    className="flex items-start gap-3 cursor-pointer group"
                    onClick={() => onNavigate('active', null)}
                >
                    <div className="pt-1.5 pb-2.5 px-2.5 rounded-xl transition-colors" style={{ background: 'var(--sidebar-active-bg)' }}>
                        <Sparkles size={24} style={{ color: 'var(--sidebar-active-text)' }} />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col items-start px-1">
                            <h2 className="text-xl font-semibold tracking-tight leading-none mb-1" style={{ color: 'var(--text-main)' }}>
                                Task AI
                            </h2>
                            <span className="text-[9px] font-mono uppercase tracking-[0.3em] leading-none" style={{ color: 'var(--text-muted)' }}>
                                {__APP_VERSION__}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {!isCollapsed && (
                        <button
                            onClick={() => window.location.href = '/'}
                            className="p-2 rounded-xl border border-transparent transition-all flex items-center justify-center group"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'var(--card-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                            title="Back to Home"
                        >
                            <Home size={18} className="group-hover:scale-110 transition-transform" />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                        className={`p-2 rounded-xl border border-transparent transition-all flex items-center justify-center group ${isCollapsed ? 'mx-auto' : ''}`}
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'var(--card-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>
            </div>

            <div className="flex-1 px-4 overflow-y-auto space-y-4 scrollbar-hide">
                <nav className={spacingClass}>
                    {!isCollapsed && (
                        <div className="flex items-center justify-between px-4 mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Main</p>
                            <button
                                onClick={() => setIsAddingFolder(true)}
                                className="p-1 transition-colors hover:text-blue-400"
                                style={{ color: 'var(--text-muted)' }}
                                title="New Folder"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    )}
                    {/* Unified Sortable List */}
                    <SortableContext items={sidebarItems.map(id => `sidebar-${id}`)} strategy={verticalListSortingStrategy}>
                        {(() => {
                            let itemCount = 0;
                            const itemLimit = 10;

                            return sidebarItems.map(itemId => {
                                // Logic for System Items
                                if (!itemId.startsWith('folder-')) {
                                    const item = systemItems[itemId];
                                    if (!item) return null;

                                    itemCount++;
                                    if (!showAllFolders && itemCount > itemLimit) return null;

                                    return (
                                        <SortableSidebarItem
                                            key={itemId}
                                            id={`sidebar-${itemId}`}
                                            icon={item.icon}
                                            label={item.label}
                                            isActive={activeTab === itemId && !selectedLabel}
                                            onClick={() => onNavigate(itemId, null)}
                                            data={{ type: 'sidebar', target: itemId }}
                                            count={stats[itemId]}
                                            isCollapsed={isCollapsed}
                                            density={density}
                                        />
                                    );
                                }
                                // Logic for Folders
                                else {
                                    const folderId = itemId.replace('folder-', '');
                                    const folder = folders.find(f => f._id === folderId);
                                    if (!folder) return null;

                                    itemCount++;
                                    if (!showAllFolders && itemCount > itemLimit) return null;

                                    return (
                                        <SortableSidebarItem
                                            key={itemId}
                                            id={`sidebar-${itemId}`}
                                            icon={Folder}
                                            label={folder.name}
                                            isActive={activeTab === 'folder' && selectedFolder === folder._id}
                                            onClick={() => onNavigate('folder', null, folder._id)}
                                            data={{ type: 'folder', target: folder._id, folderId: folder._id }}
                                            isFolder={true}
                                            onDelete={(!stats.folders || !stats.folders[folder._id]) ? (e) => handleDeleteFolder(e, folder._id) : null}
                                            count={stats.folders && stats.folders[folder._id]}
                                            isCollapsed={isCollapsed}
                                            density={density}
                                        />
                                    );
                                }
                            });
                        })()}
                    </SortableContext>

                    {/* Show toggle if we have more items than limit */}
                    {sidebarItems.length > 10 && !isCollapsed && (
                        <button
                            onClick={() => setShowAllFolders(!showAllFolders)}
                            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all text-sm font-medium group mt-1"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'var(--card-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            {showAllFolders ? (
                                <>
                                    <ChevronUp size={16} />
                                    <span>Less</span>
                                </>
                            ) : (
                                <>
                                    <ChevronDown size={16} />
                                    <span>More</span>
                                </>
                            )}
                        </button>
                    )}

                    <div className="space-y-1 pt-2 mt-2" style={{ borderTop: '1px solid var(--border)' }}>
                        <AnimatePresence>
                            {isAddingFolder && (
                                <motion.form
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onSubmit={handleAddFolder}
                                    className="px-4 py-2"
                                >
                                    <div className="relative">
                                        <input
                                            autoFocus
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                            onBlur={handleAddFolder}
                                            placeholder="Folder name..."
                                            className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500/50"
                                            style={{
                                                background: 'var(--input-bg)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-main)'
                                            }}
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            <X size={12} className="cursor-pointer hover:text-gray-300" style={{ color: 'var(--text-muted)' }} onClick={() => setIsAddingFolder(false)} />
                                        </div>
                                    </div>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>

                </nav>

                <div className={spacingClass}>
                    {!isCollapsed && (
                        <div className="px-4 flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Labels</p>
                            <button
                                onClick={() => setIsAddingLabel(true)}
                                className="p-1 hover:text-blue-400 transition-colors"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    )}

                    <div className={spacingClass}>
                        <AnimatePresence>
                            {isAddingLabel && (
                                <motion.form
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onSubmit={handleAddLabel}
                                    className="px-4 py-2"
                                >
                                    <div className="relative">
                                        <input
                                            autoFocus
                                            value={newLabelName}
                                            onChange={(e) => setNewLabelName(e.target.value)}
                                            onBlur={handleAddLabel}
                                            placeholder="Label name..."
                                            className="w-full rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500/50"
                                            style={{
                                                background: 'var(--input-bg)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-main)'
                                            }}
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            <X size={12} className="cursor-pointer hover:text-gray-300" style={{ color: 'var(--text-muted)' }} onClick={() => setIsAddingLabel(false)} />
                                        </div>
                                    </div>
                                </motion.form>
                            )}
                        </AnimatePresence>

                        <SortableContext items={labels.map(l => `sidebar-label-${l.name}`)} strategy={verticalListSortingStrategy}>
                            {labels.map((label) => (
                                <DraggableSidebarLabel
                                    key={label._id}
                                    id={`sidebar-label-${label.name}`}
                                    label={label.name}
                                    isActive={selectedLabel === label.name}
                                    onClick={() => onNavigate(activeTab, label.name)}
                                    color={label.color}
                                    data={{ type: 'sidebar-label', target: label.name, color: label.color }}
                                    count={stats.labels && stats.labels[label.name]}
                                    onDelete={(e) => handleDeleteLabel(e, label._id)}
                                    onColorChange={(e) => handleColorChange(e, label._id)}
                                    isCollapsed={isCollapsed}
                                    density={density}
                                />
                            ))}
                        </SortableContext>


                        {!isAddingLabel && labels.length === 0 && (
                            <p className="px-4 py-2 text-xs italic" style={{ color: 'var(--text-muted)' }}>No labels yet</p>
                        )}
                    </div>
                </div>
            </div >

            <div className={`p-4 mt-auto ${isCollapsed ? 'px-0 flex-col items-center gap-2' : ''}`} style={{ borderTop: '1px solid var(--border)', background: 'var(--card-hover)' }}>
                {/* Theme Toggle */}
                <button
                    className={`nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isCollapsed ? 'px-0 justify-center' : ''}`}
                    onClick={() => {
                        toggleTheme();
                        // Optional: Add a small animation or transition effect here if desired
                    }}
                    title={isCollapsed ? (theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode') : ''}
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'var(--bg-dark)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    {!isCollapsed && <span className="text-sm font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                </button>

                <button
                    className={`nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isCollapsed ? 'px-0 justify-center' : ''}`}
                    onClick={() => api.logout()}
                    title={isCollapsed ? 'Log Out' : ''}
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.background = 'var(--bg-dark)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                >
                    <LogOut size={18} />
                    {!isCollapsed && <span className="text-sm font-medium">Log Out</span>}
                </button>
            </div>
        </div>
    );
}
