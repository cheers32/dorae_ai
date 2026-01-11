import { motion } from 'framer-motion';
import { Layout, CheckSquare, Settings, Activity, MessageSquare, LogOut } from 'lucide-react';

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
            <div className="sidebar-header">
                <div className="logo-icon">D</div>
                <h2>Dorae AI</h2>
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
                    onClick={() => {
                        localStorage.removeItem('userProfile');
                        localStorage.removeItem('isAuthenticated');
                        window.location.href = '/';
                    }}
                >
                    <LogOut size={20} />
                    <span>Log Out</span>
                </button>
            </div>
        </motion.div>
    );
}
