const API_BASE = '/api';

const getUserEmail = () => {
    const userProfile = localStorage.getItem('userProfile');
    if (userProfile) {
        try {
            return JSON.parse(userProfile).email;
        } catch (e) {
            return null;
        }
    }
    return null;
};

export const api = {
    getTasks: async (status, label, folderId) => {
        const query = new URLSearchParams();
        const userEmail = getUserEmail();
        if (userEmail) query.append('user_email', userEmail);
        if (status) query.append('status', status);
        if (label) query.append('label', label);
        if (folderId) query.append('folderId', folderId);
        const res = await fetch(`${API_BASE}/tasks?${query.toString()}`);
        return res.json();
    },

    getFolders: async () => {
        const query = new URLSearchParams();
        const userEmail = getUserEmail();
        if (userEmail) query.append('user_email', userEmail);
        const res = await fetch(`${API_BASE}/folders?${query.toString()}`);
        return res.json();
    },

    getStats: async () => {
        const query = new URLSearchParams();
        const userEmail = getUserEmail();
        if (userEmail) query.append('user_email', userEmail);
        const res = await fetch(`${API_BASE}/stats?${query.toString()}`);
        return res.json();
    },

    createFolder: async (name) => {
        const res = await fetch(`${API_BASE}/folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, user_email: getUserEmail() }),
        });
        return res.json();
    },

    deleteFolder: async (folderId) => {
        const res = await fetch(`${API_BASE}/folders/${folderId}`, {
            method: 'DELETE',
        });
        return res.json();
    },

    updateFolder: async (folderId, name) => {
        const res = await fetch(`${API_BASE}/folders/${folderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        return res.json();
    },

    getLabels: async () => {
        const query = new URLSearchParams();
        const userEmail = getUserEmail();
        if (userEmail) query.append('user_email', userEmail);
        const res = await fetch(`${API_BASE}/labels?${query.toString()}`);
        return res.json();
    },

    createLabel: async (name, color) => {
        const res = await fetch(`${API_BASE}/labels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color, user_email: getUserEmail() }),
        });
        return res.json();
    },

    deleteLabel: async (labelId) => {
        const res = await fetch(`${API_BASE}/labels/${labelId}`, {
            method: 'DELETE',
        });
        return res.json();
    },

    updateLabel: async (labelId, updates) => {
        const res = await fetch(`${API_BASE}/labels/${labelId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        return res.json();
    },

    createTask: async (title, labels = []) => {
        const res = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, labels, user_email: getUserEmail() }),
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

    emptyTrash: async () => {
        const query = new URLSearchParams();
        const userEmail = getUserEmail();
        if (userEmail) query.append('user_email', userEmail);
        const res = await fetch(`${API_BASE}/tasks/trash?${query.toString()}`, {
            method: 'DELETE',
        });
        return res.json();
    },

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
            body: JSON.stringify({ message, user_email: getUserEmail() })
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
