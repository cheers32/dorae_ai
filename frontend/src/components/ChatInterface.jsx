import { useState, useRef, useEffect } from 'react';
import { Send, User } from 'lucide-react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const GeminiIcon = ({ size = 16, className = "" }) => (
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

export function ChatInterface() {
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Hello! I\'m Gemini. I have access to your tasks. How can I help you organize your day?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsLoading(true);

        try {
            const data = await api.chatWithAI(userMessage);
            setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);

            // If a task was created, refresh the task list
            if (data.task_created) {
                window.dispatchEvent(new CustomEvent('task-created'));
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`message-wrapper ${msg.role}`}
                    >
                        <div className="message-avatar">
                            {msg.role === 'ai' ? <GeminiIcon size={16} /> : <User size={16} />}
                        </div>
                        <div className="message-bubble prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                    </motion.div>
                ))}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="message-wrapper ai"
                    >
                        <div className="message-avatar"><GeminiIcon size={16} /></div>
                        <div className="message-bubble typing">
                            <span>.</span><span>.</span><span>.</span>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Ask about your tasks..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                />
                <button type="submit" disabled={!input.trim() || isLoading}>
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
