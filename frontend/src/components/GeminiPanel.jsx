import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ExternalLink } from 'lucide-react';
import { ChatInterface } from './ChatInterface';

export const GeminiPanel = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 350, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="h-screen bg-[#0f111a] border-l border-white/5 flex flex-col shrink-0 overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0f111a]">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-lg">
                                <Sparkles size={16} className="text-blue-400" />
                            </div>
                            <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                Gemini
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Potential Future: Pop-out button */}
                            {/* <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                <ExternalLink size={14} />
                            </button> */}
                            <button
                                onClick={onClose}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex flex-col bg-[#0f111a]">
                        <ChatInterface />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
