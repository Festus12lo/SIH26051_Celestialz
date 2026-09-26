import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  Zap, 
  Settings, 
  User, 
  LayoutDashboard, 
  Activity, 
  Clock, 
  Maximize, 
  Wind, 
  Box, 
  Package, 
  Sparkles 
} from 'lucide-react';
import MinimalSidebar from './MinimalSidebar';
import SettingsPanel from './SettingsPanel';

export const AppLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const location = useLocation();
  const [rateLimitHit, setRateLimitHit] = useState(false);

  useEffect(() => {
    const handleRateLimit = () => setRateLimitHit(true);
    window.addEventListener('rate_limit_hit', handleRateLimit);
    
    // Also check localStorage in case it happened on another page
    const saved = localStorage.getItem('rateLimitHit');
    if (saved === 'true') setRateLimitHit(true);

    return () => window.removeEventListener('rate_limit_hit', handleRateLimit);
  }, []);

  const menuItems = [
    { link: '/app', text: 'Home', icon: <LayoutDashboard size={20} /> },
    { link: '/app/simulation', text: '3D Comfort Test', icon: <Activity size={20} /> },
    { link: '/app/history', text: 'Saved Blueprints', icon: <Clock size={20} /> },
    { link: '/app/floorplan', text: 'Floor Plan & 3D', icon: <Maximize size={20} /> },
    { link: '/app/physics', text: 'Weather & Comfort', icon: <Wind size={20} /> },
    { link: '/app/bom', text: 'Cost & Materials', icon: <Box size={20} /> },
    { link: '/app/catalogue', text: 'Materials Guide', icon: <Package size={20} /> },
    { link: '/app/ai-assist', text: 'AI Assistant', icon: <Sparkles size={20} /> },
    { link: '/app/preferences', text: 'Build Shelter', icon: <Settings size={20} /> }
  ];

  return (
    <div className="flex flex-row h-screen w-full bg-transparent text-white/90 font-sans transition-colors duration-300 relative overflow-hidden">
      {/* Organic Background Layers */}
      <div className="bg-earthy-glow" />
      <div className="bg-noise" />

      {/* Sidebar Navigation */}
      <div className={`h-full flex-shrink-0 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)] transition-all duration-500 ease-in-out ${isSidebarOpen ? 'w-[280px] border-r border-white/10' : 'w-0 overflow-hidden border-none'}`}>
        <MinimalSidebar items={menuItems} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full h-full flex flex-col relative z-10 overflow-y-auto">
        {/* Top Navigation Bar (Floating) */}
        <div className="absolute top-8 left-8 right-8 z-50 flex justify-between items-start pointer-events-none">
          {/* Toggle Sidebar Button */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors cursor-pointer pointer-events-auto"
            title="Toggle Sidebar"
          >
            <Menu size={24} />
          </button>
          
          {/* Right Side Actions */}
          <div className="flex items-center gap-3 pointer-events-auto">
            {rateLimitHit && location.pathname === '/app' && (
              <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 px-4 py-2 rounded-xl border border-amber-500/50 backdrop-blur-md animate-in fade-in slide-in-from-top-4 mr-2" title="Primary API Quota Exhausted. Using fallback keys.">
                <Bell className="w-5 h-5 animate-bounce" />
                <span className="text-sm font-medium hidden md:inline">API Quota Low</span>
                <button 
                  onClick={() => setRateLimitHit(false)}
                  className="ml-2 hover:bg-amber-500/30 rounded-full p-1 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
            {location.pathname === '/app' && (
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors cursor-pointer relative group"
                title="API Credits & System Status — Click to configure keys"
              >
                <Bell size={24} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-black animate-pulse"></span>
                <div className="absolute right-0 top-14 w-72 bg-zinc-900 border border-white/10 p-4 rounded-xl shadow-xl hidden group-hover:block transition-all z-50 text-left">
                  <p className="text-sm text-yellow-400 font-bold mb-2 flex items-center gap-2"><Zap size={16}/> Low Credits Warning</p>
                  <p className="text-xs text-white/70 leading-relaxed">Your free API credits are running low. Click here to add your Gemini or NVIDIA API keys in Settings to continue without interruption.</p>
                </div>
              </button>
            )}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors cursor-pointer relative"
              title="API Keys & Integrations"
            >
              <Settings size={24} />
              {rateLimitHit && location.pathname === '/app' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-black animate-pulse"></span>
              )}
            </button>
            <Link 
              to="/app/preferences"
              className="p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Build Shelter & Project Settings"
            >
              <User size={24} />
            </Link>
          </div>
        </div>
        
        <Outlet />
      </main>

      {/* Settings Modal (BYOK & Logs) */}
      {isSettingsOpen && <SettingsPanel onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
};

export default AppLayout;
