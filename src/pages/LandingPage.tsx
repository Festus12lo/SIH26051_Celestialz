import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '../components/Landing/HeroSection';
import MarqueeSection from '../components/Landing/MarqueeSection';
import AboutSection from '../components/Landing/AboutSection';
import ServicesSection from '../components/Landing/ServicesSection';
import ProjectsSection from '../components/Landing/ProjectsSection';
import { useAuth } from '../contexts/AuthContext';

const LandingPage: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  // If user is already signed in, redirect to the app workspace
  useEffect(() => {
    if (!loading && currentUser) {
      navigate('/app', { replace: true });
    }
  }, [currentUser, loading, navigate]);

  // Smooth scroll behavior for anchor links
  useEffect(() => {
    const handleHashChange = (e: HashChangeEvent) => {
      e.preventDefault();
      const hash = window.location.hash;
      if (hash) {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="relative min-h-screen text-[#D7E2EA] font-sans selection:bg-[var(--color-accent)]/30">
      {/* Organic Background Layers */}
      <div className="bg-earthy-glow" />
      <div className="bg-noise" />

      <HeroSection />
      <MarqueeSection />
      <AboutSection />
      <ServicesSection />
      <ProjectsSection />
      
      {/* Simple Footer */}
      <footer className="py-12 border-t border-[#D7E2EA]/10 text-center text-[#D7E2EA]/40 text-sm">
        <p>© 2026 ThermoShelter by team CelestialZ. Autonomous Passive Architecture.</p>
      </footer>
    </div>
  );
};

export default LandingPage;

