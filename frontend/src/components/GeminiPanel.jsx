import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { ChatInterface } from './ChatInterface';

export const GeminiIcon = ({ size = 24, className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M12 2C12 7.525 16.475 12 22 12C16.475 12 12 16.475 12 22C12 16.475 7.525 12 2 12C7.525 12 12 7.525 12 2Z" fill="currentColor" />
    </svg>
);

export const GeminiPanel = ({ isOpen, onClose }) => {
    const [width, setWidth] = useState(400);
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isResizing) {
                const newWidth = window.innerWidth - e.clientX;
                // Clamp width between 300px and 800px
                if (newWidth >= 300 && newWidth <= 1200) {
                    setWidth(newWidth);
                }
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: width, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        // Disable transition during resize for smooth tracking
                        duration: isResizing ? 0 : undefined
                    }}
                    className="h-screen bg-[#0f111a] border-l border-white/5 flex flex-col shrink-0 overflow-hidden relative"
                    style={{ width: width }}
                >
                    {/* Resize Handle */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1 hover:w-1.5 hover:bg-blue-500/50 cursor-col-resize z-50 transition-all"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsResizing(true);
                        }}
                    />

                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0f111a]">
                        <div className="flex items-center gap-2">
                            {/* <div className="p-1.5 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-lg"> */}
                            <GeminiIcon size={20} className="text-blue-400" />
                            {/* </div> */}
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
