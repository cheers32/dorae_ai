import { useState, useEffect } from 'react';
import { api } from './api';
import { TaskItem } from './components/TaskItem';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'closed' | 'assistant'
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);

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
    <div className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        <header className="content-header">
          <div>
            <h1>{getHeaderTitle()}</h1>
            <p className="subtitle">
              {activeTab === 'assistant'
                ? 'Chat with your tasks powered by Gemini 3.0'
                : 'Manage your daily goals and track progress.'}
            </p>
          </div>
        </header>

        {activeTab === 'assistant' ? (
          <ChatInterface />
        ) : (
          <>
            {activeTab === 'active' && (
              <form className="create-task-bar" onSubmit={handleCreateTask}>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
                <button type="submit" disabled={!newTaskTitle.trim()}>
                  <Plus size={20} /> Create
                </button>
              </form>
            )}

            <div className="task-list">
              {loading ? (
                <div className="loader">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="empty-state">
                  <p>No {activeTab} tasks found.</p>
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
      </main>
    </div>
  );
}

export default App;
