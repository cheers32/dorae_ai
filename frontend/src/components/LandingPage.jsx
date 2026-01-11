import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanFace, ListTodo, TrendingUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const LandingPage = () => {
    const navigate = useNavigate();

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
                <h1 className="text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Dorae AI
                </h1>
                <p className="text-xl text-gray-400 max-w-lg mx-auto">
                    Choose your intelligence mode.
                </p>
            </motion.div>

            <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">

                {/* Futbin AI Card */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/futbin')}
                    className="group relative cursor-pointer"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
                    <div className="relative bg-gray-900 border border-gray-700 p-8 rounded-2xl h-80 flex flex-col items-center justify-center text-center hover:border-green-500/50 transition duration-300">
                        <div className="bg-gray-800 p-4 rounded-full mb-6 group-hover:text-green-400 transition-colors">
                            <TrendingUp size={48} />
                        </div>
                        <h2 className="text-3xl font-bold mb-2 group-hover:text-green-400">Futbin AI</h2>
                        <p className="text-gray-400 text-sm">
                            Market intelligence, player analysis, and trading predictions.
                        </p>
                    </div>
                </motion.div>

                {/* Task AI Card */}
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

            </div>
        </div>
    );
};

export default LandingPage;
