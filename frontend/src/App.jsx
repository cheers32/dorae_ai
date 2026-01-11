import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import { TaskManager } from './components/TaskManager';
import FutbinAI from './components/FutbinAI';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
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
  );
}

export default App;
