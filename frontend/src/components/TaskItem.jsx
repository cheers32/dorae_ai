import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Plus, Check, X, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../api';

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
            const update = await api.addUpdate(task._id, newDetail);
            // We need to refresh the task or optimistically update
            // For simplicity, trigger parent update
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

    const handleCloseTask = async () => {
        // Removed native confirm for better UX and testing
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

    return (
        <div className={`task-card ${task.status}`}>
            <div className="task-header" onClick={() => setExpanded(!expanded)}>
                <div className="task-title-section">
                    <div className={`status-indicator ${task.status}`}></div>
                    <h3>{task.title}</h3>
                    {task.status === 'completed' && <span className="badge completed">Closed</span>}
                </div>

                <div className="task-meta">
                    <span className={`badge priority-${task.priority}`}>{task.priority}</span>
                    <span className="badge category">{task.category}</span>
                    {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            {expanded && (
                <div className="task-body">
                    <div className="timeline">
                        {task.updates.map((update) => (
                            <div key={update.id} className="timeline-item">
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <div className="timeline-header">
                                        <span className="timestamp">
                                            {format(new Date(update.timestamp), 'MMM d, h:mm a')}
                                        </span>
                                        {editingId !== update.id && (
                                            <button className="edit-icon" onClick={() => {
                                                setEditingId(update.id);
                                                setEditContent(update.content);
                                            }}>Edit</button>
                                        )}
                                    </div>

                                    {editingId === update.id ? (
                                        <div className="edit-box">
                                            <input
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                autoFocus
                                            />
                                            <button onClick={() => handleSaveEdit(update.id)}><Check size={16} /></button>
                                            <button onClick={() => setEditingId(null)}><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <p className="update-text">{update.content}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {task.status !== 'completed' && (
                        <div className="actions-area">
                            <form onSubmit={handleAddDetail} className="add-detail-form">
                                <input
                                    type="text"
                                    placeholder="Add a detail, execution note, or update..."
                                    value={newDetail}
                                    onChange={(e) => setNewDetail(e.target.value)}
                                    disabled={isSubmitting}
                                />
                                <button type="submit" disabled={isSubmitting || !newDetail.trim()}>
                                    <Plus size={18} /> Add
                                </button>
                            </form>

                            <div className="task-footer">
                                <button className="analyze-btn" onClick={handleAnalyzeTask} disabled={isSubmitting}>
                                    <Sparkles size={18} /> AI Analyze
                                </button>
                                <button className="close-btn" onClick={handleCloseTask}>
                                    <Check size={18} /> Mark as Complete
                                </button>
                            </div>
                        </div>
                    )}

                    {task.completed_at && (
                        <div className="completion-info">
                            <Check size={16} /> Completed on {format(new Date(task.completed_at), 'PPP p')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
