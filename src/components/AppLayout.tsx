import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
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
  Sparkles,
  X,
} from 'lucide-react';
import MinimalSidebar from './MinimalSidebar';
import SettingsPanel from './SettingsPanel';
import { useAuth } from '../contexts/AuthContext';

export const AppLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [rateLimitHit, setRateLimitHit] = useState(false);
  const { currentUser } = useAuth();
  const notifRef = useRef<HTMLDivElement>(null);

  // Track read/unread notifications
  const [notifications, setNotifications] = useState([
    {
      id: 'welcome',
      title: 'Welcome to ThermoShelter!',
      message: 'Your AI-powered architecture workspace is ready. Start by creating your first shelter design.',
      time: 'Just now',
      read: false,
      action: '/app/preferences',
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleRateLimit = () => setRateLimitHit(true);
    window.addEventListener('rate_limit_hit', handleRateLimit);
    
    const saved = localStorage.getItem('rateLimitHit');
    if (saved === 'true') setRateLimitHit(true);

    return () => window.removeEventListener('rate_limit_hit', handleRateLimit);
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifOpen]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotifClick = (notif: typeof notifications[0]) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    setIsNotifOpen(false);
    if (notif.action) {
      navigate(notif.action);
    }
  };

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
                <Zap className="w-5 h-5 animate-bounce" />
                <span className="text-sm font-medium hidden md:inline">API Quota Low</span>
                <button 
                  onClick={() => setRateLimitHit(false)}
                  className="ml-2 hover:bg-amber-500/30 rounded-full p-1 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Notification Bell — Dropdown, not a page redirect */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors cursor-pointer relative"
                title="Notifications"
              >
                <Bell size={24} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF5722] rounded-full border-2 border-black flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 top-14 w-80 bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-[#FF5722] font-semibold hover:text-[#FF7043] transition-colors cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-white/40 text-sm">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-none ${
                            !notif.read ? 'bg-white/[0.03]' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {!notif.read && (
                              <div className="mt-1.5 w-2 h-2 rounded-full bg-[#FF5722] shrink-0" />
                            )}
                            <div className={!notif.read ? '' : 'ml-5'}>
                              <p className="text-sm font-semibold text-white/90 leading-snug">
                                {notif.title}
                              </p>
                              <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                                {notif.message}
                              </p>
                              <p className="text-[10px] text-white/30 mt-1 font-medium">
                                {notif.time}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings Button */}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors cursor-pointer relative"
              title="API Keys & Settings"
            >
              <Settings size={24} />
              {rateLimitHit && location.pathname === '/app' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-black animate-pulse"></span>
              )}
            </button>

            {/* Profile Avatar — Links to Profile Page */}
            <Link 
              to="/app/profile"
              className="p-1 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
              title="Your Profile"
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Profile"
                  className="w-10 h-10 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#FF5722] to-[#FF9800] flex items-center justify-center text-white font-bold text-sm">
                  {currentUser?.displayName?.charAt(0)?.toUpperCase() || <User size={20} />}
                </div>
              )}
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
