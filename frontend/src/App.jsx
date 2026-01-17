import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import { TaskManager } from './components/TaskManager';
import FutbinAI from './components/FutbinAI';
import ProtectedRoute from './components/ProtectedRoute';
import TrafficTracker from './components/TrafficTracker';
import './App.css';

import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <TrafficTracker />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <TaskManager />
              </ProtectedRoute>
            }
          />
          <Route path="/futbin" element={<FutbinAI />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
