import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';

const TrafficTracker = () => {
    const location = useLocation();

    useEffect(() => {
        // Get user info if available
        const userProfile = localStorage.getItem('userProfile');
        const email = userProfile ? JSON.parse(userProfile).email : null;

        // Log the visit
        api.logTraffic(location.pathname, email);
    }, [location]); // Triggers on every route change

    return null; // This component renders nothing
};

export default TrafficTracker;
