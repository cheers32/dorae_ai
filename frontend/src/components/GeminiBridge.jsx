
import React, { useState, useMemo } from 'react';
import QRCode from "react-qr-code";
import { X, Copy, Check, ExternalLink, Sparkles, MessageSquare } from "lucide-react";

const GeminiBridge = ({ tasks, onClose, isOpen }) => {
    const [copied, setCopied] = useState(false);

    // Generate the "Memory Block" prompt
    const memoryBlock = useMemo(() => {
        const activeTasks = tasks.filter(t =>
            !['Deleted', 'deleted', 'Archived', 'archived', 'Closed', 'completed'].includes(t.status)
        );

        const taskList = activeTasks.map(t =>
            `- ${t.title} (Priority: ${t.priority || 'medium'}, Status: ${t.status})`
        ).join('\n');

        return `You are Dorae, my AI assistant. Here is my current active task list from my Dorae app. 
Please use this context to answer my questions, help me plan, and prioritize. 
Be concise and helpful.

MY TASKS:
${taskList}

INSTRUCTIONS:
- You know these tasks exist.
- If I ask "what should I do?", analyze these tasks.
- If I ask about a specific project, look for related tasks.
`;
    }, [tasks]);

    const handleCopy = () => {
        navigator.clipboard.writeText(memoryBlock);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-2 text-blue-400">
                        <Sparkles size={20} />
                        <h2 className="text-lg font-semibold text-white">Gemini Bridge</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto">

                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 mb-2">
                            <MessageSquare size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">Connect to Gemini Live</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Transfer your task context to the official Gemini App to have voice conversations about your work.
                        </p>
                    </div>

                    {/* Step 1: Copy */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-xs">1</span>
                            Copy Context Block
                        </div>

                        <div className="relative group">
                            <pre className="w-full h-32 p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs text-zinc-500 font-mono overflow-y-auto resize-none focus:outline-none focus:border-zinc-700 transition-colors">
                                {memoryBlock}
                            </pre>
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950/40 pointer-events-none rounded-xl" />
                            <button
                                onClick={handleCopy}
                                className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? 'Copied!' : 'Copy to Clipboard'}
                            </button>
                        </div>
                    </div>

                    {/* Step 2: Paste */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-xs">2</span>
                            Paste in Gemini App
                        </div>
                        <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-800 flex items-center gap-4">
                            <div className="bg-white p-2 rounded-lg">
                                {/* QR Code as an optional quick link to open Gemini if possible, or just the small payload */}
                                <div className="w-24 h-24 bg-white flex items-center justify-center">
                                    {/* Only show QR if data is small enough, otherwise show a simplified one or just an icon */}
                                    {memoryBlock.length < 500 ? (
                                        <QRCode
                                            value={memoryBlock}
                                            size={96}
                                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                            viewBox={`0 0 256 256`}
                                        />
                                    ) : (
                                        <div className="text-center">
                                            <span className="text-[10px] text-zinc-500 font-medium">Use Copy Button</span>
                                            <div className="text-[8px] text-zinc-400">(Text too long for QR)</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 space-y-2">
                                <p className="text-xs text-zinc-400">
                                    1. Open <strong>Gemini App</strong> on your phone.
                                </p>
                                <p className="text-xs text-zinc-400">
                                    2. <strong>Paste</strong> the copied text.
                                </p>
                                <p className="text-xs text-zinc-400">
                                    3. Enter <strong>Live Mode</strong> and start talking!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        Done
                    </button>
                </div>

            </div>
        </div>
    );
};

export default GeminiBridge;
