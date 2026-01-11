import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, CircleDollarSign, Lock, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { api } from '../api';

const LandingPage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('userProfile');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleSuccess = async (credentialResponse) => {
        try {
            const decoded = jwtDecode(credentialResponse.credential);
            const userProfile = {
                name: decoded.name,
                picture: decoded.picture,
                email: decoded.email
            };

            // Persist to backend
            await api.login(userProfile);

            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userProfile', JSON.stringify(userProfile));
            setUser(userProfile);
        } catch (err) {
            console.error("Login Failed", err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Professional Radial Gradient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none"></div>

            {/* Subtle Ambient Glows - De-emphasized for professionalism */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="z-10 text-center mb-16"
            >
                {/* Title Removed */}
                <p className="text-xl text-slate-400 max-w-lg mx-auto font-light tracking-wide">
                    Choose your intelligence mode.
                </p>
            </motion.div>

            <div className="z-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full px-4">

                {/* Futbin AI Card - Coming Soon */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="group relative cursor-not-allowed opacity-70"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl"></div>
                    <div className="relative bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-2xl h-80 flex flex-col items-center justify-center text-center shadow-2xl">
                        <div className="absolute top-4 right-4 bg-white/10 border border-white/10 text-slate-400 p-2 rounded-full">
                            <Lock size={16} />
                        </div>
                        <div className="bg-white/5 p-4 rounded-full mb-6 text-slate-500">
                            {/* Custom Soccer Ball SVG */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-12 h-12"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 7 L16 10 L14.5 15 L9.5 15 L8 10 Z" />
                                <path d="M12 7 L12 2" />
                                <path d="M16 10 L20.5 8.5" />
                                <path d="M14.5 15 L18 19" />
                                <path d="M9.5 15 L6 19" />
                                <path d="M8 10 L3.5 8.5" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold mb-2 text-slate-600">FUT AI</h2>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto">
                            Maximize your hard-earned coins. Master Evolutions on elite players, and build the best possible Ultimate Team with AI precision.
                        </p>
                    </div>
                </motion.div>

                {/* Finance AI Card - Coming Soon */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="group relative cursor-not-allowed opacity-70"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl"></div>
                    <div className="relative bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-2xl h-80 flex flex-col items-center justify-center text-center shadow-2xl">
                        <div className="absolute top-4 right-4 bg-white/10 border border-white/10 text-slate-400 p-2 rounded-full">
                            <Lock size={16} />
                        </div>
                        <div className="bg-white/5 p-4 rounded-full mb-6 text-slate-500">
                            <TrendingUp size={48} />
                        </div>
                        <h2 className="text-3xl font-bold mb-2 text-slate-600">Finance AI</h2>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto">
                            Smart portfolio tracking, market trend analysis, and personalized investment insights.
                        </p>
                    </div>
                </motion.div>

                {/* Task AI Card - Active only if logged in */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={user ? { scale: 0.95 } : undefined}
                    onClick={() => user && navigate('/tasks')}
                    className={`group relative ${user ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                >
                    <div className={`absolute inset-0 bg-gradient-to-br ${user ? 'from-blue-600/20 to-blue-900/20 blur-xl opacity-50 group-hover:opacity-100' : 'from-white/5 to-transparent'} rounded-2xl transition duration-700`}></div>
                    <div className={`relative bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-2xl h-80 flex flex-col items-center justify-center text-center shadow-2xl ${user ? 'hover:border-blue-500/30' : ''} transition duration-300`}>

                        {!user && (
                            <div className="absolute top-4 right-4 bg-white/10 border border-white/10 text-slate-400 p-2 rounded-full">
                                <Lock size={16} />
                            </div>
                        )}

                        <div className={`bg-white/10 p-4 rounded-full mb-6 ${user ? 'text-blue-400 group-hover:text-blue-300' : 'text-slate-500'} transition-colors`}>
                            <Sparkles size={48} />
                        </div>
                        <h2 className={`text-3xl font-bold mb-2 ${user ? 'text-white group-hover:text-blue-200' : 'text-slate-600'}`}>Task AI</h2>
                        <p className={`text-sm ${user ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500'} transition-colors`}>
                            Smart task management, context-aware scheduling, and productivity assistant.
                        </p>
                    </div>
                </motion.div>

                {/* Auth Section - Spanning Full Width */}
                <div className="md:col-span-3 flex flex-col items-center justify-center min-h-[80px]">
                    {!user ? (
                        <div className="flex flex-col gap-3 items-center animate-fade-in w-full max-w-[250px]">
                            <GoogleLogin
                                onSuccess={handleSuccess}
                                onError={() => console.log('Login Failed')}
                                theme="filled_black"
                                shape="pill"
                                size="large"
                                width="250"
                            />
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-4 bg-white/5 pl-6 pr-4 py-3 rounded-full border border-white/10 backdrop-blur-md"
                        >
                            <div className="flex items-center gap-3">
                                <img src={user.picture} alt="" className="w-8 h-8 rounded-full border border-gray-600" />
                                <div className="flex flex-col items-start">
                                    <span className="text-xs text-slate-400">Welcome back,</span>
                                    <span className="text-sm font-medium text-white">{user.name}</span>
                                </div>
                            </div>
                            <div className="h-8 w-[1px] bg-white/10 mx-1"></div>
                            <button
                                onClick={() => {
                                    localStorage.removeItem('userProfile');
                                    localStorage.removeItem('isAuthenticated');
                                    setUser(null);
                                    window.location.href = '/';
                                }}
                                className="text-slate-400 hover:text-white transition-colors p-1"
                                title="Log Out"
                            >
                                <LogOut size={18} />
                            </button>
                        </motion.div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default LandingPage;
