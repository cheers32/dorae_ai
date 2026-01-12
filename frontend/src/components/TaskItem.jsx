import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Plus, Check, X, Clock, AlertCircle, Sparkles, Trash2, Tag, Flag } from 'lucide-react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';

export function TaskItem({ task, onUpdate }) {
    const [expanded, setExpanded] = useState(false);
    const [newDetail, setNewDetail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');

    const handleAddDetail = async (e) => {
        e.preventDefault();
        if (!newDetail.trim()) return;

        setIsSubmitting(true);
        try {
            await api.addUpdate(task._id, newDetail);
            onUpdate();
            setNewDetail('');
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveEdit = async (updateId) => {
        try {
            await api.editUpdate(task._id, updateId, editContent);
            setEditingId(null);
            onUpdate();
        } catch (err) {
            console.error(err);
        }
    };

    const handleCloseTask = async (e) => {
        e.stopPropagation();
        try {
            await api.closeTask(task._id);
            onUpdate();
        } catch (err) {
            console.error(err);
        }
    };

    const handleAnalyzeTask = async () => {
        setIsSubmitting(true);
        try {
            await api.analyzeTask(task._id);
            onUpdate();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTask = async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this task?')) return;
        setIsSubmitting(true);
        try {
            await api.deleteTask(task._id);
            onUpdate();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateField = async (field, value) => {
        try {
            await api.updateTask(task._id, { [field]: value });
            onUpdate();
        } catch (err) {
            console.error(err);
        }
    };

    const priorities = ['low', 'medium', 'high', 'urgent'];
    const nextPriority = () => {
        const idx = priorities.indexOf(task.priority || 'medium');
        const next = priorities[(idx + 1) % priorities.length];
        updateField('priority', next);
    };

    const categories = ['General', 'Planning', 'Development', 'Bug Fix', 'Design'];
    const nextCategory = () => {
        const idx = categories.indexOf(task.category || 'General');
        const next = categories[(idx + 1) % categories.length];
        updateField('category', next);
    };

    const getPriorityColor = (p) => {
        switch (p) {
            case 'urgent': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'high': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            case 'medium': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'low': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
            default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={`group hover:bg-white/[0.02] transition-colors rounded-xl border border-white/5 bg-[#1a1f2e]/50 overflow-hidden mb-3 ${expanded ? 'ring-1 ring-blue-500/20' : ''}`}
        >
            <div
                className="p-4 flex items-center gap-4 cursor-pointer select-none"
                onClick={() => setExpanded(!expanded)}
            >
                <div
                    className={`w-3 h-3 rounded-full shrink-0 ${task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'} shadow-[0_0_10px_rgba(59,130,246,0.3)]`}
                />

                <h3 className={`flex-1 font-medium text-gray-200 ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                    {task.title}
                </h3>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={nextPriority}
                        className={`text-[10px] px-2 py-1 rounded border uppercase tracking-wider font-semibold transition-colors ${getPriorityColor(task.priority)}`}
                    >
                        {task.priority || 'normal'}
                    </button>

                    <button
                        onClick={nextCategory}
                        className="text-[10px] px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-gray-300 hover:bg-white/5 uppercase tracking-wider font-medium"
                    >
                        {task.category || 'General'}
                    </button>

                    <button className="p-1.5 text-gray-500 hover:text-red-400 transition-colors" onClick={handleDeleteTask}>
                        <Trash2 size={14} />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-green-400 transition-colors" onClick={handleCloseTask}>
                        <Check size={14} />
                    </button>
                </div>

                <div className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''} text-gray-500`}>
                    <ChevronDown size={18} />
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="px-4 pb-4 pt-0 border-t border-white/5 bg-black/20">
                            {/* Condensed Timeline */}
                            <div className="py-4 space-y-1">
                                {task.updates.map((update, idx) => (
                                    <div key={update.id} className="flex gap-4 group/item text-sm">
                                        <div className="w-24 text-xs text-gray-500 text-right pt-0.5 font-mono shrink-0">
                                            {format(new Date(update.timestamp), 'MMM d, HH:mm')}
                                        </div>
                                        <div className="relative border-l-2 border-white/5 pl-4 pb-1 flex-1">
                                            <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-gray-700 ring-4 ring-[#13161c]" />
                                            {editingId === update.id ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-blue-500/50"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleSaveEdit(update.id)} className="text-green-400"><Check size={14} /></button>
                                                </div>
                                            ) : (
                                                <div className="group/content flex items-start gap-2">
                                                    <p className={`text-gray-400 ${update.type === 'creation' ? 'italic opacity-60' : ''}`}>
                                                        {update.content}
                                                    </p>
                                                    <button
                                                        className="opacity-0 group-hover/content:opacity-100 text-gray-600 hover:text-blue-400 transition-all pt-0.5"
                                                        onClick={() => { setEditingId(update.id); setEditContent(update.content); }}
                                                    >
                                                        <Sparkles size={10} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Quick Add Line */}
                                <div className="flex gap-4 group/add mt-2">
                                    <div className="w-24 text-xs text-gray-600 text-right pt-2 font-mono shrink-0">Now</div>
                                    <div className="relative border-l-2 border-white/5 pl-4 pb-2 flex-1">
                                        <div className="absolute -left-[5px] top-2.5 w-2 h-2 rounded-full border border-gray-600 bg-[#13161c]" />
                                        <form onSubmit={handleAddDetail} className="relative">
                                            <input
                                                type="text"
                                                placeholder="Add update..."
                                                value={newDetail}
                                                onChange={(e) => setNewDetail(e.target.value)}
                                                className="w-full bg-transparent border-none text-gray-300 placeholder-gray-600 focus:ring-0 p-0 py-1 text-sm"
                                            />
                                        </form>
                                    </div>
                                </div>
                            </div>

                            {/* AI Analysis Footer */}
                            {task.ai_analysis && (
                                <div className="mt-2 ml-28 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 mb-4">
                                    <div className="flex items-start gap-2">
                                        <Sparkles size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                        <p className="text-sm text-blue-200/80 italic leading-relaxed">
                                            {task.ai_analysis.suggestions}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2 border-t border-white/5 mx-[-16px] px-4 bg-black/40 pb-2 mb-[-16px]">
                                <button
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-400/10 transition-colors"
                                    onClick={handleAnalyzeTask}
                                    disabled={isSubmitting}
                                >
                                    <Sparkles size={14} />
                                    {isSubmitting ? 'Analyzing...' : 'AI Analyze'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
