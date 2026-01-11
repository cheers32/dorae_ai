import { useState, useEffect } from 'react';
import { api } from './api';
import { TaskItem } from './components/TaskItem';
import { Plus, Layout, CheckSquare } from 'lucide-react';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'closed'
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
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

  return (
    <div className="app-container">
      <div className="glass-panel main-layout">
        <header className="app-header">
          <h1>Dorae AI</h1>
          <p>Task Manager</p>
        </header>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <Layout size={18} /> Active Tasks
          </button>
          <button
            className={`tab ${activeTab === 'closed' ? 'active' : ''}`}
            onClick={() => setActiveTab('closed')}
          >
            <CheckSquare size={18} /> Closed Tasks
          </button>
        </div>

        {activeTab === 'active' && (
          <form className="create-task-bar" onSubmit={handleCreateTask}>
            <input
              type="text"
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <button type="submit" disabled={!newTaskTitle.trim()}>
              <Plus size={20} /> Create Task
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
            tasks.map(task => (
              <TaskItem key={task._id} task={task} onUpdate={fetchTasks} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
