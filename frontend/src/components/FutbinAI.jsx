import React, { useState } from 'react';
import { Home, LineChart, Search, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChatInterface } from './ChatInterface';

const FutbinAI = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showChat, setShowChat] = useState(false);

    return (
        <div className="flex bg-gray-900 text-white min-h-screen">
            {/* Sidebar */}
            <div className="w-64 bg-gray-800 p-6 flex flex-col">
                <h2 className="text-2xl font-bold mb-10 text-green-400 tracking-wider">FUTBIN AI</h2>

                <nav className="flex-1 space-y-4">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center w-full p-3 rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-green-600/20 text-green-400 border border-green-600/50' : 'text-gray-400 hover:bg-gray-700'}`}
                    >
                        <Home className="mr-3" size={20} /> Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('market')}
                        className={`flex items-center w-full p-3 rounded-lg transition-all ${activeTab === 'market' ? 'bg-green-600/20 text-green-400 border border-green-600/50' : 'text-gray-400 hover:bg-gray-700'}`}
                    >
                        <LineChart className="mr-3" size={20} /> Market Analysis
                    </button>
                    <button
                        onClick={() => setActiveTab('player')}
                        className={`flex items-center w-full p-3 rounded-lg transition-all ${activeTab === 'player' ? 'bg-green-600/20 text-green-400 border border-green-600/50' : 'text-gray-400 hover:bg-gray-700'}`}
                    >
                        <Search className="mr-3" size={20} /> Player Search
                    </button>
                </nav>

                <button
                    onClick={() => navigate('/')}
                    className="flex items-center w-full p-3 mt-auto text-gray-500 hover:text-white transition-colors"
                >
                    <LogOut className="mr-3" size={20} /> Switch Mode
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {activeTab === 'dashboard' && (
                    <div>
                        <header className="flex justify-between items-center mb-8">
                            <h1 className="text-3xl font-bold">Market Overview</h1>
                            <button className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg font-medium transition-colors">
                                Add Tracker
                            </button>
                        </header>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                    <h3 className="text-gray-400 text-sm mb-2">Market Index {i}</h3>
                                    <div className="text-3xl font-bold text-white">12,450</div>
                                    <div className="text-green-400 text-sm mt-2 flex items-center">
                                        +4.2% <span className="text-gray-500 ml-2">vs yesterday</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                            <h2 className="text-xl font-bold mb-4">Latest Insights</h2>
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-green-300">Mbappe Price Drop</h4>
                                            <p className="text-sm text-gray-300 mt-1">Predicted dip due to incoming promo. Recommend waiting 24h.</p>
                                        </div>
                                        <span className="text-xs text-gray-500">2h ago</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-red-300">SBC Alert</h4>
                                            <p className="text-sm text-gray-300 mt-1">High demand for 84+ rated fodder.</p>
                                        </div>
                                        <span className="text-xs text-gray-500">5h ago</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab !== 'dashboard' && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <LineChart size={64} className="mb-4 opacity-50" />
                        <h2 className="text-xl">Feature Coming Soon</h2>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FutbinAI;
