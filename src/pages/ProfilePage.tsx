import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  User,
  Mail,
  Shield,
  LogOut,
  Clock,
  Palette,
  Bell,
  ChevronRight,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

export default function ProfilePage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  // Extract user data from Firebase Auth
  const displayName = currentUser?.displayName || 'ThermoShelter User';
  const email = currentUser?.email || 'Not signed in';
  const photoURL = currentUser?.photoURL;
  const creationTime = currentUser?.metadata?.creationTime
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';
  const lastSignIn = currentUser?.metadata?.lastSignInTime
    ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';
  const isGoogleUser = currentUser?.providerData?.some(
    (p) => p.providerId === 'google.com'
  );

  const [avatarError, setAvatarError] = useState(false);

  const settingsItems = [
    {
      icon: <Palette size={18} />,
      label: 'Appearance',
      description: 'Dark mode is always on',
      value: 'Dark',
      disabled: true,
    },
    {
      icon: <Bell size={18} />,
      label: 'Notifications',
      description: 'System alerts and updates',
      value: 'Enabled',
      disabled: true,
    },
    {
      icon: <Shield size={18} />,
      label: 'Privacy',
      description: 'Your data stays on your device',
      value: 'Local-first',
      disabled: true,
    },
  ];

  return (
    <div className="flex-1 w-full relative bg-transparent flex flex-col items-center pt-28 pb-24 overflow-y-auto scrollbar-hide select-none px-4 md:px-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/app')}
        className="absolute top-20 left-6 z-30 flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm font-medium cursor-pointer"
      >
        <ArrowLeft size={16} />
        Back to Home
      </button>

      <div className="w-full max-w-2xl space-y-6 animate-in fade-in duration-700 z-10">
        {/* Profile Header Card */}
        <div className="glass-card-premium rounded-[2rem] p-8 text-center">
          {/* Avatar */}
          <div className="mx-auto mb-5 relative w-24 h-24">
            {photoURL && !avatarError ? (
              <img
                src={photoURL}
                alt={displayName}
                onError={() => setAvatarError(true)}
                className="w-24 h-24 rounded-full border-2 border-white/20 object-cover shadow-xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF5722] to-[#FF9800] flex items-center justify-center text-white text-3xl font-black shadow-xl border-2 border-white/20">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            {isGoogleUser && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md" title="Signed in with Google">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
            )}
          </div>

          {/* User Info */}
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">
            {displayName}
          </h1>
          <p className="text-white/50 text-sm font-medium flex items-center justify-center gap-1.5">
            <Mail size={14} />
            {email}
          </p>

          {/* Verification Badge */}
          {currentUser?.emailVerified && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 size={12} />
              Verified Account
            </div>
          )}
        </div>

        {/* Account Details Card */}
        <div className="glass-card-premium rounded-[2rem] p-6 space-y-4">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider px-1">
            Account Details
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 px-4 bg-black/20 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-white/40" />
                <span className="text-sm text-white/70">Joined</span>
              </div>
              <span className="text-sm font-semibold text-white/90">{creationTime}</span>
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-black/20 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-white/40" />
                <span className="text-sm text-white/70">Last Sign In</span>
              </div>
              <span className="text-sm font-semibold text-white/90">{lastSignIn}</span>
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-black/20 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <Shield size={16} className="text-white/40" />
                <span className="text-sm text-white/70">Sign In Method</span>
              </div>
              <span className="text-sm font-semibold text-white/90">
                {isGoogleUser ? 'Google' : 'Email & Password'}
              </span>
            </div>
          </div>
        </div>

        {/* Settings Card */}
        <div className="glass-card-premium rounded-[2rem] p-6 space-y-4">
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider px-1">
            Settings
          </h2>
          <div className="space-y-2">
            {settingsItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-3 px-4 bg-black/20 rounded-xl border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white/40">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white/90">{item.label}</p>
                    <p className="text-xs text-white/40">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white/50">{item.value}</span>
                  <ChevronRight size={14} className="text-white/20" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logout Section */}
        <div className="glass-card-premium rounded-[2rem] p-6">
          {!showLogoutConfirm ? (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl text-red-400 font-bold transition-all cursor-pointer"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm text-white/70 font-medium">
                Are you sure you want to sign out?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white/70 font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-2xl text-red-400 font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoggingOut ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <LogOut size={16} />
                  )}
                  {isLoggingOut ? 'Signing out...' : 'Yes, Sign Out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
