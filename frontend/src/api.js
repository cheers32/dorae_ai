const API_BASE = '/api';

export const api = {
    getTasks: async (status, label) => {
        const query = new URLSearchParams();
        if (status) query.append('status', status);
        if (label) query.append('label', label);
        const res = await fetch(`${API_BASE}/tasks${query.toString() ? '?' + query.toString() : ''}`);
        return res.json();
    },

    getLabels: async () => {
        const res = await fetch(`${API_BASE}/labels`);
        return res.json();
    },

    createLabel: async (name, color) => {
        const res = await fetch(`${API_BASE}/labels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color }),
        });
        return res.json();
    },

    deleteLabel: async (labelId) => {
        const res = await fetch(`${API_BASE}/labels/${labelId}`, {
            method: 'DELETE',
        });
        return res.json();
    },

    createTask: async (title, labels = []) => {
        const res = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, labels }),
        });
        return res.json();
    },

    updateTask: async (taskId, updates) => {
        const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        return res.json();
    },

    reorderTasks: async (taskIds) => {
        const res = await fetch(`${API_BASE}/tasks/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskIds }),
        });
        return res.json();
    },

    deleteTask: (taskId) =>
        fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' }),

    login: async (userProfile) => {
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userProfile)
            });
            return await response.json();
        } catch (error) {
            console.error("Failed to persist user", error);
        }
    },

    logTraffic: async (path, userEmail) => {
        try {
            await fetch(`${API_BASE}/traffic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, user_email: userEmail })
            });
        } catch (error) {
            console.error("Traffic log failed", error);
        }
    },

    addUpdate: async (taskId, content, type = 'detail') => {
        const res = await fetch(`${API_BASE}/tasks/${taskId}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, type }),
        });
        return res.json();
    },

    editUpdate: async (taskId, updateId, content) => {
        const res = await fetch(`${API_BASE}/tasks/${taskId}/update/${updateId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        });
        return res.json();
    },

    deleteUpdate: async (taskId, updateId) => {
        const res = await fetch(`${API_BASE}/tasks/${taskId}/update/${updateId}`, {
            method: 'DELETE',
        });
        return res.json();
    },

    closeTask: async (taskId) => {
        const res = await fetch(`${API_BASE}/tasks/${taskId}/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        return res.json();
    },

    analyzeTask: async (taskId) => {
        const res = await fetch(`${API_BASE}/tasks/${taskId}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        return res.json();
    },

    chatWithAI: async (message) => {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        if (!res.ok) throw new Error('Failed to send message');
        return res.json();
    },

    logout: () => {
        localStorage.removeItem('userProfile');
        localStorage.removeItem('isAuthenticated');
        window.location.href = '/';
    }
};
