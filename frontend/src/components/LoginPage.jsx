import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { api } from '../api';

const LoginPage = () => {
    const [error, setError] = useState('');
    const navigate = useNavigate();

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
            navigate('/tasks');
        } catch (err) {
            console.error("Login Failed", err);
            setError("Login Failed. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1014] flex items-center justify-center p-6 relative overflow-hidden text-white font-sans">
            {/* Background Decor */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-pulse delay-1000"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-10 shadow-2xl relative z-10"
            >
                <div className="flex justify-center mb-8">
                    <div className="bg-gray-800 p-4 rounded-2xl text-purple-400 shadow-lg shadow-purple-900/20">
                        <Lock size={32} />
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-center mb-2">Welcome Back</h2>
                <p className="text-gray-500 text-center mb-8">Sign in to access Dorae Task AI</p>

                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={handleSuccess}
                        onError={() => setError('Login Failed')}
                        theme="filled_black"
                        shape="pill"
                        size="large"
                        width="300"
                    />
                </div>

                {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}

                <p className="mt-8 text-center text-gray-500 text-sm">
                    Secured by Google OAuth 2.0
                </p>
            </motion.div>
        </div>
    );
};

export default LoginPage;
