import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TIME_PHASES = {
    SUNRISE: 'sunrise',
    MORNING: 'morning',
    MIDDAY: 'midday',
    SUNSET: 'sunset',
    DUSK: 'dusk',
    NIGHT: 'night',
};

const getPhase = (hour) => {
    if (hour >= 5 && hour < 7) return TIME_PHASES.SUNRISE;
    if (hour >= 7 && hour < 11) return TIME_PHASES.MORNING;
    if (hour >= 11 && hour < 16) return TIME_PHASES.MIDDAY;
    if (hour >= 16 && hour < 19) return TIME_PHASES.SUNSET;
    if (hour >= 19 && hour < 21) return TIME_PHASES.DUSK;
    return TIME_PHASES.NIGHT;
};

const PHASE_STYLES = {
    [TIME_PHASES.SUNRISE]: {
        background: 'linear-gradient(180deg, #FF7E5F 0%, #FEB47B 100%)',
        overlay: 'rgba(255, 126, 95, 0.1)',
        clouds: 'rgba(255, 255, 255, 0.4)',
        sun: '#FFD700',
        sunGlow: 'rgba(255, 215, 0, 0.3)',
    },
    [TIME_PHASES.MORNING]: {
        background: 'linear-gradient(180deg, #4facfe 0%, #00f2fe 100%)',
        overlay: 'rgba(79, 172, 254, 0.05)',
        clouds: 'rgba(255, 255, 255, 0.7)',
        sun: '#FFFACD',
        sunGlow: 'rgba(255, 250, 205, 0.4)',
    },
    [TIME_PHASES.MIDDAY]: {
        background: 'linear-gradient(180deg, #2193b0 0%, #6dd5ed 100%)',
        overlay: 'rgba(33, 147, 176, 0.02)',
        clouds: 'rgba(255, 255, 255, 0.8)',
        sun: '#FFFFFF',
        sunGlow: 'rgba(255, 255, 255, 0.5)',
    },
    [TIME_PHASES.SUNSET]: {
        background: 'linear-gradient(180deg, #42275a 0%, #734b6d 100%)',
        overlay: 'rgba(66, 39, 90, 0.2)',
        clouds: 'rgba(255, 200, 200, 0.3)',
        sun: 'radial-gradient(circle, #FFFFFF 0%, #FFD700 30%, #FF4500 70%)',
        sunGlow: 'rgba(255, 69, 0, 0.5)',
    },
    [TIME_PHASES.DUSK]: {
        background: 'linear-gradient(180deg, #2c3e50 0%, #000000 100%)',
        overlay: 'rgba(44, 62, 80, 0.3)',
        clouds: 'rgba(255, 255, 255, 0.1)',
        sun: '#E6E6FA',
        sunGlow: 'rgba(230, 230, 250, 0.2)',
    },
    [TIME_PHASES.NIGHT]: {
        background: 'linear-gradient(180deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
        overlay: 'rgba(15, 32, 39, 0.4)',
        clouds: 'rgba(255, 255, 255, 0.05)',
        sun: '#F0F8FF',
        sunGlow: 'rgba(240, 248, 255, 0.2)',
    },
};

const Cloud = ({ style, delay, duration, y }) => (
    <motion.div
        initial={{ x: '-20%', opacity: 0 }}
        animate={{ x: '120%', opacity: 1 }}
        transition={{
            duration: duration || 60,
            repeat: Infinity,
            delay: delay || 0,
            ease: "linear"
        }}
        style={{
            top: y || '20%',
            ...style
        }}
        className="absolute flex items-center pointer-events-none"
    >
        <div className="w-24 h-8 bg-current rounded-full blur-md" />
        <div className="w-16 h-16 bg-current rounded-full blur-md -ml-12 -mt-8" />
        <div className="w-20 h-20 bg-current rounded-full blur-md -ml-8 -mt-4" />
    </motion.div>
);

export const DynamicBackground = () => {
    const [phase, setPhase] = useState(getPhase(new Date().getHours()));
    const [testMode, setTestMode] = useState(false);
    const [testPhaseIndex, setTestPhaseIndex] = useState(0);

    useEffect(() => {
        if (testMode) {
            const phases = Object.values(TIME_PHASES);
            const timer = setInterval(() => {
                setTestPhaseIndex((prev) => (prev + 1) % phases.length);
            }, 5000);
            return () => clearInterval(timer);
        } else {
            const timer = setInterval(() => {
                setPhase(getPhase(new Date().getHours()));
            }, 60000);
            return () => clearInterval(timer);
        }
    }, [testMode]);

    useEffect(() => {
        if (testMode) {
            const phases = Object.values(TIME_PHASES);
            setPhase(phases[testPhaseIndex]);
        }
    }, [testPhaseIndex, testMode]);

    useEffect(() => {
        const handleToggleTest = () => setTestMode(prev => !prev);
        window.addEventListener('toggle-background-test', handleToggleTest);
        return () => window.removeEventListener('toggle-background-test', handleToggleTest);
    }, []);

    const isNight = phase === TIME_PHASES.NIGHT || phase === TIME_PHASES.DUSK;
    const isSunsetSunrise = phase === TIME_PHASES.SUNSET || phase === TIME_PHASES.SUNRISE;
    const currentStyle = PHASE_STYLES[phase];

    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none select-none">
            <AnimatePresence mode="wait">
                <motion.div
                    key={phase}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    className="absolute inset-0"
                    style={{ background: currentStyle.background }}
                >
                    {/* Celestial Body (Sun/Moon) */}
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{
                            y: isSunsetSunrise ? '60%' : (isNight ? '20%' : '10%'),
                            opacity: 1,
                            scale: isSunsetSunrise ? 1.5 : 1
                        }}
                        transition={{ duration: 4, ease: "easeOut" }}
                        className="absolute left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[60px]"
                        style={{
                            background: currentStyle.sun,
                            boxShadow: `0 0 120px ${currentStyle.sunGlow}`
                        }}
                    />

                    {/* Stars (Night only) */}
                    {isNight && (
                        <div className="absolute inset-0">
                            {[...Array(50)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: Math.random() }}
                                    animate={{ opacity: [0.2, 1, 0.2] }}
                                    transition={{
                                        duration: 2 + Math.random() * 4,
                                        repeat: Infinity,
                                        delay: Math.random() * 5
                                    }}
                                    className="absolute w-0.5 h-0.5 bg-white rounded-full"
                                    style={{
                                        top: `${Math.random() * 100}%`,
                                        left: `${Math.random() * 100}%`,
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Animated Clouds */}
                    <div className="absolute inset-0" style={{ color: currentStyle.clouds }}>
                        <Cloud y="15%" delay={0} duration={80} style={{ scale: 1.2 }} />
                        <Cloud y="40%" delay={-20} duration={100} style={{ scale: 0.8, opacity: 0.5 }} />
                        <Cloud y="25%" delay={-45} duration={120} style={{ scale: 1, opacity: 0.3 }} />
                        <Cloud y="60%" delay={-10} duration={90} style={{ scale: 1.5, opacity: 0.2 }} />
                    </div>

                    {/* Fog Layer for depth */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent mix-blend-overlay" />

                    {/* Noise Overlay */}
                    <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3 Vagabond %3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Dynamic Tint Overlay */}
            <div
                className="absolute inset-0 transition-colors duration-[2000ms]"
                style={{ backgroundColor: currentStyle.overlay }}
            />

            {testMode && (
                <div className="fixed bottom-4 right-4 z-[100] bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white/50 border border-white/10">
                    iGoogle Mode: {phase.toUpperCase()}
                </div>
            )}
        </div>
    );
};
