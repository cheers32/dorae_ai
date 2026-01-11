import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import { TaskManager } from './components/TaskManager';
import FutbinAI from './components/FutbinAI';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tasks" element={<TaskManager />} />
        <Route path="/futbin" element={<FutbinAI />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
