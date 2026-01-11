import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp } from 'lucide-react';
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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="z-10 text-center mb-16"
            >
                {/* Title Removed */}
                <p className="text-xl text-gray-400 max-w-lg mx-auto">
                    Choose your intelligence mode.
                </p>
            </motion.div>

            <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">

                {/* Futbin AI Card - Coming Soon */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="group relative cursor-not-allowed opacity-70"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-600 rounded-2xl blur opacity-20"></div>
                    <div className="relative bg-gray-900 border border-gray-800 p-8 rounded-2xl h-80 flex flex-col items-center justify-center text-center">
                        <div className="absolute top-4 right-4 bg-gray-800 border border-gray-700 text-gray-400 text-xs font-bold px-3 py-1 rounded-full">
                            COMING SOON
                        </div>
                        <div className="bg-gray-800 p-4 rounded-full mb-6 text-gray-500">
                            <TrendingUp size={48} />
                        </div>
                        <h2 className="text-3xl font-bold mb-2 text-gray-500">FUT AI</h2>
                        <p className="text-gray-500 text-sm max-w-xs mx-auto">
                            Maximize your hard-earned coins. Master Evolutions on elite players, and build the best possible Ultimate Team with AI precision.
                        </p>
                    </div>
                </motion.div>

                {/* Task AI Card - Active */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/tasks')}
                    className="group relative cursor-pointer"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
                    <div className="relative bg-gray-900 border border-gray-700 p-8 rounded-2xl h-80 flex flex-col items-center justify-center text-center hover:border-purple-500/50 transition duration-300">
                        <div className="bg-gray-800 p-4 rounded-full mb-6 group-hover:text-purple-400 transition-colors">
                            <Sparkles size={48} />
                        </div>
                        <h2 className="text-3xl font-bold mb-2 group-hover:text-purple-400">Task AI</h2>
                        <p className="text-gray-400 text-sm">
                            Smart task management, context-aware scheduling, and productivity assistant.
                        </p>
                    </div>
                </motion.div>

                {/* Auth Section - Spanning Full Width */}
                <div className="md:col-span-2 flex flex-col items-center justify-center min-h-[80px]">
                    {!user ? (
                        <div className="animate-fade-in">
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
                            className="flex items-center gap-3 bg-gray-900/80 px-6 py-3 rounded-full border border-gray-800 backdrop-blur-sm"
                        >
                            <img src={user.picture} alt="" className="w-8 h-8 rounded-full border border-gray-600" />
                            <div className="flex flex-col items-start">
                                <span className="text-xs text-gray-400">Welcome back,</span>
                                <span className="text-sm font-medium text-white">{user.name}</span>
                            </div>
                        </motion.div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default LandingPage;
