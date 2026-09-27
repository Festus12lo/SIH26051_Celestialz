import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { signInWithEmail, signInWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/app');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signInWithEmail(email, password);
      navigate('/app');
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        const msg = err.message || '';
        if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
          setError('Invalid email or password. Please check your credentials.');
        } else if (msg.includes('too-many-requests')) {
          setError('Too many failed attempts. Please wait a few moments.');
        } else {
          setError(msg || 'Failed to authenticate');
        }
      } else {
        setError('Failed to authenticate');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setError('');
      setIsSubmitting(true);
      await signInWithGoogle();
      navigate('/app');
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message || 'Failed to authenticate with Google');
      } else {
        setError('Failed to authenticate with Google');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen text-[#D7E2EA] font-sans selection:bg-[var(--color-accent)]/30 overflow-hidden flex flex-col">
      {/* Organic Background Layers */}
      <div className="bg-earthy-glow" />
      <div className="bg-noise" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 backdrop-blur-md bg-black/20 border-b border-white/10 sticky top-0">
        <Link to="/" className="flex items-center group">
          <div className="bg-white rounded-xl py-1.5 px-3.5 shadow-md border border-white/20 transition-all group-hover:scale-[1.02] flex items-center justify-center">
            <Logo variant="compact" theme="light" imgClassName="h-7" />
          </div>
        </Link>
        <Link to="/" className="text-white/60 font-semibold hover:text-white transition-colors flex items-center gap-1 text-sm">
          <ChevronLeft size={16} /> Back to main
        </Link>
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24 flex flex-col lg:flex-row items-center justify-center gap-16 lg:gap-24">
        
        {/* Left: Marketing Pitch */}
        <div className="flex-1 space-y-8 w-full lg:max-w-xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6">
              Ready to design your <br/>
              <span className="relative inline-block">
                <span className="relative z-10 text-[var(--color-accent)]">shelter?</span>
                <svg className="absolute w-full h-3 -bottom-1 left-0 text-white opacity-70" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 0" stroke="currentColor" strokeWidth="4" fill="none" />
                </svg>
              </span>
            </h1>
            <p className="text-xl text-white/70 font-medium leading-relaxed max-w-lg">
              Sign in to access your AI-powered architecture assistant and optimize your shelter's energy efficiency.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            {[
              "Access your saved shelter designs",
              "Generate AI-driven bioclimatic blueprints",
              "Execute 48h thermodynamic simulations"
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="bg-white/10 rounded-full p-1 border border-white/20">
                  <CheckCircle2 size={20} className="text-[var(--color-accent)]" />
                </div>
                <span className="font-semibold text-white/90 text-lg">{feature}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Sign In Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full lg:w-[480px] shrink-0"
        >
          <div className="glass-card-premium rounded-[2.75rem] p-8 lg:p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-white tracking-tight mb-2">
                Sign In
              </h2>
              <p className="text-white/60 font-medium">Continue to your ThermoShelter workspace</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-500/10 text-red-400 px-4 py-3 rounded-2xl font-semibold text-sm border border-red-500/20 text-center">
                {error}
              </div>
            )}

            {/* Google Authentication (Prominent) */}
            <button 
              onClick={handleGoogleAuth}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white/10 hover:bg-white/15 border border-white/20 rounded-2xl font-bold text-white transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                <path d="M1 1h22v22H1z" fill="none"/>
              </svg>
              Sign in with Google
            </button>

            <div className="my-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 font-mono uppercase tracking-wider text-white/40" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                  or with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-white/80 px-2 block">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com" 
                    className="w-full bg-black/40 border border-white/20 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-white/30 font-semibold focus:outline-none focus:border-[var(--color-accent)] focus:bg-black/60 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-2">
                  <label className="text-sm font-bold text-white/80 block">Password</label>
                  <Link 
                    to="/forgot-password" 
                    className="text-xs font-semibold text-[var(--color-accent)] hover:text-white transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40">
                    <Lock size={18} />
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••" 
                    className="w-full bg-black/40 border border-white/20 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-white/30 font-semibold focus:outline-none focus:border-[var(--color-accent)] focus:bg-black/60 transition-colors"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-fluid bg-white text-black rounded-2xl py-4 font-black text-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors shadow-lg mt-4 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 size={20} strokeWidth={3} className="animate-spin" />
                ) : (
                  <>
                    Sign In <ArrowRight size={20} strokeWidth={3} />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default LoginPage;
