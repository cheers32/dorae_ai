const API_BASE = 'http://127.0.0.1:5000/api';

export const api = {
    getTasks: async (status) => {
        const params = status ? `?status=${status}` : '';
        const res = await fetch(`${API_BASE}/tasks${params}`);
        return res.json();
    },

    createTask: async (title) => {
        const res = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title }),
        });
        return res.json();
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
    }
};
