import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import Logo from '../components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      if (!auth) throw new Error('Authentication service is currently unavailable.');
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess(true);
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        if (err.message.includes('user-not-found')) {
          setError('No account found with this email address.');
        } else if (err.message.includes('too-many-requests')) {
          setError('Too many requests. Please wait before trying again.');
        } else if (err.message.includes('invalid-email')) {
          setError('Please enter a valid email address.');
        } else {
          setError('Failed to send reset email. Please try again.');
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen text-[#D7E2EA] font-sans selection:bg-[var(--color-accent)]/30 overflow-hidden flex flex-col">
      <div className="bg-earthy-glow" />
      <div className="bg-noise" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 backdrop-blur-md bg-black/20 border-b border-white/10 sticky top-0">
        <Link to="/" className="flex items-center gap-2 group">
          <Logo variant="compact" theme="dark" imgClassName="h-9" />
        </Link>
        <Link to="/login" className="text-white/60 font-semibold hover:text-white transition-colors flex items-center gap-1.5 text-sm">
          <ArrowLeft size={16} /> Back to Login
        </Link>
      </nav>

      {/* Main Content */}
      <main className="flex-1 relative z-10 max-w-md w-full mx-auto px-4 py-24 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="glass-card-premium p-8 sm:p-10 rounded-[2.5rem] space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black text-white tracking-tight">Reset Password</h1>
              <p className="text-white/60 text-sm font-medium">
                Enter your email and we'll send you a secure link to reset your password.
              </p>
            </div>

            {success ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                  <CheckCircle2 size={40} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">Password reset email sent</p>
                  <p className="text-white/60 text-sm mt-1">
                    Check your inbox at <strong className="text-white">{email}</strong> for instructions.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="mt-3 px-6 py-3 bg-[var(--color-accent)] text-white rounded-2xl font-bold hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(255,87,34,0.4)]"
                >
                  Return to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm p-3.5 rounded-2xl text-center font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-white/80 px-2 block">Account Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-black/40 border border-white/20 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-white/30 font-semibold focus:outline-none focus:border-[var(--color-accent)] focus:bg-black/60 transition-colors"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-base shadow-lg cursor-pointer mt-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
