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
    Check
} from 'lucide-react';
import { api } from '../api';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const SortableSidebarItem = ({ id, icon: Icon, label, isActive, onClick, data, isFolder, onDelete, count }) => {
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
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative group">
            <button
                className={`nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-blue-500/10 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    } ${isOver && !isDragging ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''}`}
                onClick={onClick}
            >
                {Icon && <Icon size={18} className={isOver ? 'text-blue-400' : ''} />}
                {!Icon && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data?.color || '#3B82F6' }} />}
                <span className={`text-sm font-medium ${isOver ? 'text-blue-400' : ''}`}>{label}</span>
                {count !== undefined && count > 0 && (
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
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={onDelete}
                        className="p-1.5 text-gray-600 hover:text-red-400 transition-all rounded hover:bg-white/5"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            )}
        </div>
    );
};

const DraggableSidebarLabel = ({ id, label, isActive, onClick, color, data, count, onDelete, onColorChange }) => {
    const [isDeleting, setIsDeleting] = useState(false);

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
                className={`nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all touch-none cursor-grab active:cursor-grabbing ${isActive ? 'bg-blue-500/10 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    } ${isOver && !isDragging ? 'bg-blue-500/20 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''}`}
                onClick={onClick}
            >
                <div className="w-2 h-2 rounded-full pointer-events-none" style={{ backgroundColor: color || '#3B82F6' }} />
                <span className={`text-sm font-medium pointer-events-none ${isOver ? 'text-blue-400' : ''}`}>{label}</span>
                {count !== undefined && count > 0 && (
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
                {isDeleting ? (
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
                )}
            </div>
        </div>
    );
};

export function Sidebar({ activeTab, onNavigate, labels = [], onLabelsChange, selectedLabel, folders = [], onFoldersChange, selectedFolder, sidebarItems = [], stats = {} }) {
    const [isAddingLabel, setIsAddingLabel] = useState(false);
    const [newLabelName, setNewLabelName] = useState('');
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [editingLabelId, setEditingLabelId] = useState(null);

    const systemItems = {
        'active': { label: 'Active Tasks', icon: Layout },
        'closed': { label: 'Closed Tasks', icon: CheckSquare },
        'assistant': { label: 'Assistant', icon: MessageSquare },
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
        <motion.div
            className="w-[280px] h-screen bg-[#0f111a] border-r border-white/5 flex flex-col pt-8"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="px-6 mb-10 flex items-center justify-between">
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => onNavigate('active', null)}
                >
                    <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                        <Sparkles size={24} className="text-blue-400" />
                    </div>
                    <div className="flex flex-col items-start px-1">
                        <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-100 tracking-tight leading-none mb-1">
                            Task AI
                        </h2>
                        <span className="text-[9px] text-gray-500/60 font-mono uppercase tracking-[0.3em] leading-none">
                            {__APP_VERSION__}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => window.location.href = '/'}
                    className="p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 text-gray-500 hover:text-white transition-all flex items-center justify-center group"
                    title="Back to Home"
                >
                    <Home size={18} className="group-hover:scale-110 transition-transform" />
                </button>
            </div>

            <div className="flex-1 px-4 overflow-y-auto space-y-8 scrollbar-hide">
                <nav className="space-y-1">
                    <div className="flex items-center justify-between px-4 mb-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Main</p>
                        <button
                            onClick={() => setIsAddingFolder(true)}
                            className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                            title="New Folder"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    {/* Unified Sortable List */}
                    <SortableContext items={sidebarItems.map(id => `sidebar-${id}`)} strategy={verticalListSortingStrategy}>
                        {sidebarItems.map(itemId => {
                            if (itemId.startsWith('folder-')) {
                                const folderId = itemId.replace('folder-', '');
                                const folder = folders.find(f => f._id === folderId);
                                if (!folder) return null;
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
                                    />
                                );
                            } else {
                                const item = systemItems[itemId];
                                if (!item) return null;
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
                                    />
                                );
                            }
                        })}
                    </SortableContext>

                    <div className="space-y-1 pt-2 border-t border-white/5 mt-2">
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
                                            className="w-full bg-white/5 border border-blue-500/30 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            <X size={12} className="text-gray-500 cursor-pointer hover:text-gray-300" onClick={() => setIsAddingFolder(false)} />
                                        </div>
                                    </div>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>

                </nav>

                <div className="space-y-1">
                    <div className="px-4 flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Labels</p>
                        <button
                            onClick={() => setIsAddingLabel(true)}
                            className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    <div className="space-y-1">
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
                                            className="w-full bg-white/5 border border-blue-500/30 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            <X size={12} className="text-gray-500 cursor-pointer hover:text-gray-300" onClick={() => setIsAddingLabel(false)} />
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
                                />
                            ))}
                        </SortableContext>


                        {!isAddingLabel && labels.length === 0 && (
                            <p className="px-4 py-2 text-xs text-gray-600 italic">No labels yet</p>
                        )}
                    </div>
                </div>
            </div >

            <div className="p-4 mt-auto border-t border-white/5 bg-black/20">
                <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                    onClick={() => api.logout()}
                >
                    <LogOut size={18} />
                    <span className="text-sm font-medium">Log Out</span>
                </button>
            </div>
        </motion.div >
    );
}
