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
        background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
        overlay: 'rgba(255, 154, 158, 0.15)',
        image: null,
    },
    [TIME_PHASES.MORNING]: {
        background: 'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)',
        overlay: 'rgba(161, 196, 253, 0.05)',
        image: null,
    },
    [TIME_PHASES.MIDDAY]: {
        background: 'linear-gradient(to top, #4facfe 0%, #00f2fe 100%)',
        overlay: 'rgba(79, 172, 254, 0.02)',
        image: null,
    },
    [TIME_PHASES.SUNSET]: {
        background: 'linear-gradient(to top, #ff0844 0%, #ffb199 100%)',
        overlay: 'rgba(255, 8, 68, 0.15)',
        image: null,
    },
    [TIME_PHASES.DUSK]: {
        background: 'linear-gradient(to top, #30cfd0 0%, #330867 100%)',
        overlay: 'rgba(51, 8, 103, 0.2)',
        image: null,
    },
    [TIME_PHASES.NIGHT]: {
        background: 'linear-gradient(to top, #09203f 0%, #537895 100%)',
        overlay: 'rgba(9, 32, 63, 0.3)',
        image: null,
    },
};

export const DynamicBackground = () => {
    const [phase, setPhase] = useState(getPhase(new Date().getHours()));
    const [testMode, setTestMode] = useState(false);
    const [testPhaseIndex, setTestPhaseIndex] = useState(0);

    useEffect(() => {
        if (testMode) {
            const phases = Object.values(TIME_PHASES);
            const timer = setInterval(() => {
                setTestPhaseIndex((prev) => (prev + 1) % phases.length);
            }, 5000); // Cycle every 5 seconds in test mode
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
        // Listen for custom event to toggle test mode
        const handleToggleTest = () => setTestMode(prev => !prev);
        window.addEventListener('toggle-background-test', handleToggleTest);
        return () => window.removeEventListener('toggle-background-test', handleToggleTest);
    }, []);

    const isNight = phase === TIME_PHASES.NIGHT || phase === TIME_PHASES.DUSK;
    const isDay = phase === TIME_PHASES.MIDDAY || phase === TIME_PHASES.MORNING;
    const isSunsetSunrise = phase === TIME_PHASES.SUNSET || phase === TIME_PHASES.SUNRISE;

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
                    style={{ background: PHASE_STYLES[phase].background }}
                >
                    {/* Celestial Bodies */}
                    <div className="absolute inset-0 overflow-hidden">
                        {/* Sun / Moon */}
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{
                                y: isSunsetSunrise ? "40%" : (isDay ? "10%" : (isNight ? "20%" : "100%")),
                                opacity: 1,
                                scale: isSunsetSunrise ? 1.2 : 1
                            }}
                            transition={{ duration: 3, ease: "easeOut" }}
                            className={`absolute left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[60px] ${isNight ? 'bg-indigo-100/40 shadow-[0_0_100px_rgba(255,255,255,0.2)]' :
                                (isSunsetSunrise ? 'bg-orange-400 shadow-[0_0_120px_rgba(251,146,60,0.4)]' : 'bg-yellow-200 shadow-[0_0_100px_rgba(254,240,138,0.4)]')
                                }`}
                        />

                        {/* Stars for Night/Dusk */}
                        {isNight && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.8 }}
                                className="absolute inset-0"
                                style={{
                                    backgroundImage: `radial-gradient(1px 1px at 10% 10%, #fff, transparent),
                                      radial-gradient(1px 1px at 20% 40%, #fff, transparent),
                                      radial-gradient(1.5px 1.5px at 30% 20%, #fff, transparent),
                                      radial-gradient(1px 1px at 50% 60%, #fff, transparent),
                                      radial-gradient(2px 2px at 70% 30%, #fff, transparent),
                                      radial-gradient(1px 1px at 80% 80%, #fff, transparent),
                                      radial-gradient(1.5px 1.5px at 90% 10%, #fff, transparent),
                                      radial-gradient(1px 1px at 40% 90%, #fff, transparent)`,
                                    backgroundSize: '300px 300px'
                                }}
                            />
                        )}
                    </div>

                    {PHASE_STYLES[phase].image && (
                        <motion.img
                            src={PHASE_STYLES[phase].image}
                            alt=""
                            initial={{ scale: 1.1, opacity: 0 }}
                            animate={{ scale: 1, opacity: 0.6 }}
                            className="w-full h-full object-cover"
                        />
                    )}

                    {/* Grain/Noise Overlay */}
                    <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3 Vagabond %3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
                    </div>

                    {/* Subtle light pulse */}
                    <motion.div
                        animate={{
                            opacity: [0.1, 0.3, 0.1],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%]"
                    />
                </motion.div>
            </AnimatePresence>

            {/* Dynamic Overlay to tint the content slightly */}
            <div
                className="absolute inset-0 transition-colors duration-[2000ms]"
                style={{ backgroundColor: PHASE_STYLES[phase].overlay }}
            />

            {/* Test Mode Indicator (Optional, hidden by default) */}
            {testMode && (
                <div className="fixed bottom-4 right-4 z-[100] bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white/50 border border-white/10">
                    Background Test Mode: {phase.toUpperCase()}
                </div>
            )}
        </div>
    );
};
