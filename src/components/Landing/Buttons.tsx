import React from 'react';
import { Link } from 'react-router-dom';

export function ContactButton({ className = '', onClick }: { className?: string, onClick?: () => void }) {
  return (
    <Link
      to="/login"
      onClick={onClick}
      className={`inline-block text-center relative overflow-hidden rounded-full border border-white/20 bg-transparent px-8 py-4 sm:px-12 sm:py-5 text-xs sm:text-sm md:text-base text-white font-sans uppercase tracking-[0.2em] transition-all hover:bg-white hover:text-black hover:border-white active:scale-95 ${className}`}
    >
      Get Started
    </Link>
  );
}

export function LiveProjectButton({ to, className = '' }: { to: string; className?: string }) {
  return (
    <Link
      to={to}
      className={`rounded-full border-2 border-[#D7E2EA] text-[#D7E2EA] font-medium uppercase tracking-widest px-8 py-3 sm:px-10 sm:py-3.5 text-sm sm:text-base hover:bg-[#D7E2EA]/10 transition-colors ${className}`}
    >
      Configure Shelter
    </Link>
  );
}
