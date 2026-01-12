import { motion } from 'framer-motion';
import { Layout, CheckSquare, Settings, Activity, MessageSquare, LogOut, Home, Sparkles } from 'lucide-react';
import { api } from '../api';

export function Sidebar({ activeTab, setActiveTab }) {
    const menuItems = [
        { id: 'active', label: 'Active Tasks', icon: Layout },
        { id: 'closed', label: 'Closed Tasks', icon: CheckSquare },
        { id: 'assistant', label: 'Assistant', icon: MessageSquare },
    ];

    return (
        <motion.div
            className="sidebar"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="sidebar-header flex items-center justify-between pr-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/10 rounded-full group">
                        <Sparkles size={32} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
                    </div>
                    <h2 className="bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent font-bold">Task AI</h2>
                </div>
                <button
                    onClick={() => window.location.href = '/'}
                    className="p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 text-gray-500 hover:text-white transition-all flex items-center justify-center group"
                    title="Back to Home"
                >
                    <Home size={20} className="group-hover:scale-110 transition-transform" />
                </button>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                            {isActive && (
                                <motion.div
                                    className="active-indicator"
                                    layoutId="activeIndicator"
                                />
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <button
                    className="nav-item"
                    onClick={() => api.logout()}
                >
                    <LogOut size={20} />
                    <span>Log Out</span>
                </button>
            </div>
        </motion.div>
    );
}
