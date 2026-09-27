import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { type ChatMessage } from './api/llmClient';

// Core Layout & Protection
import AppLayout from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Route Pages (Segregated in src/pages)
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ModelViewerPage from './pages/ModelViewerPage';
import HubPage from './pages/HubPage';
import SimulationPage from './pages/SimulationPage';
import HistoryPage from './pages/HistoryPage';
import FloorplanPage from './pages/FloorplanPage';
import PhysicsPage from './pages/PhysicsPage';
import BomPage from './pages/BomPage';
import CataloguePage from './pages/CataloguePage';
import AIAssistPage from './pages/AIAssistPage';
import PreferencesPage from './pages/PreferencesPage';
import ShoppingPage from './pages/ShoppingPage';
import ProfilePage from './pages/ProfilePage';

// Global Shared State Context
export const AppContext = createContext<any>(null);

/**
 * ThermoShelter - Architectural AI Engineering Platform
 * Root Router & State Provider
 */
export default function App() {
  const [blueprintData, setBlueprintData] = useState<any>(() => {
    try {
      const active = localStorage.getItem('thermoshelter_active_blueprint');
      if (active) return JSON.parse(active);
      const saved = localStorage.getItem('thermoshelter_blueprints_history');
      if (saved) {
        const hist = JSON.parse(saved);
        if (hist && hist.length > 0 && hist[0].data) return hist[0].data;
      }
    } catch (e) {
      console.warn("Could not parse saved blueprint from localStorage", e);
    }
    return null;
  });

  useEffect(() => {
    if (blueprintData) {
      try {
        localStorage.setItem('thermoshelter_active_blueprint', JSON.stringify(blueprintData));
      } catch (e) {
        console.warn("Could not save blueprint to localStorage", e);
      }
    }
  }, [blueprintData]);

  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);

  return (
    <AppContext.Provider 
      value={{ 
        blueprintData, 
        setBlueprintData, 
        hasStartedChat, 
        setHasStartedChat, 
        initialMessages, 
        setInitialMessages 
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* Public Authentication & Landing Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/3d-viewer" element={<ModelViewerPage />} />

          {/* Legacy Redirect Shortcuts */}
          <Route path="/simulation" element={<Navigate to="/app/simulation" replace />} />
          <Route path="/shopping" element={<Navigate to="/app/bom" replace />} />

          {/* Protected Application Workspace */}
          <Route 
            path="/app" 
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HubPage />} />
            <Route path="simulation" element={<SimulationPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="floorplan" element={<FloorplanPage />} />
            <Route path="physics" element={<PhysicsPage />} />
            <Route path="bom" element={<BomPage />} />
            <Route path="catalogue" element={<CataloguePage />} />
            <Route path="blueprint" element={<Navigate to="/app/floorplan" replace />} />
            <Route path="ai-assist" element={<AIAssistPage />} />
            <Route path="preferences" element={<PreferencesPage />} />
            <Route path="shopping" element={<ShoppingPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}
