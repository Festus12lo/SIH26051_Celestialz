import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

import AnimatedText from './AnimatedText';
import Magnet from './Magnet';
import { ContactButton } from './Buttons';

export default function HeroSection() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative h-screen w-full flex flex-col items-center justify-center overflow-x-clip px-4 md:px-8">
      {/* Navbar */}
      <nav className="absolute top-0 w-full p-6 md:p-8 flex justify-between items-center max-w-[1400px] z-50">
        <div className="flex gap-4 md:gap-12 w-full justify-center md:justify-end text-[#D7E2EA] font-light text-sm md:text-base tracking-wide uppercase">
          <a href="#about" className="hover:text-white transition-colors">Philosophy</a>
          <a href="#services" className="hover:text-white transition-colors">AI Engine</a>
          <a href="#projects" className="hover:text-white transition-colors">Shelters</a>
        </div>
      </nav>

      {/* Main Content */}
      <motion.div 
        style={{ y, opacity }}
        className="flex flex-col items-center justify-center text-center mt-12 md:mt-0 z-10 w-full max-w-7xl"
      >
        <p className="text-[var(--color-accent)] font-sans uppercase tracking-[0.4em] text-xs sm:text-sm md:text-base mb-6 md:mb-10 font-semibold">
          Architectural Intelligence
        </p>

        <div className="mb-12 md:mb-20">
          <img 
            src="/images/thermoshelter_logo.png" 
            alt="ThermoShelter by Celestialz" 
            className="h-24 sm:h-32 md:h-44 lg:h-52 w-auto object-contain mx-auto drop-shadow-2xl"
          />
        </div>

        <div className="max-w-[280px] sm:max-w-md md:max-w-2xl mx-auto mb-16 md:mb-24">
          <AnimatedText 
            text="Precision floor plans and house designs driven by dimensions, materials, and thermal quality constraints."
            className="text-xl sm:text-2xl md:text-4xl text-white drop-shadow-lg font-light leading-relaxed text-center"
            mode="time"
          />
        </div>

        <Magnet padding={100} strength={2}>
          <div>
            <ContactButton />
          </div>
        </Magnet>
      </motion.div>

      {/* Background Video */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/HOUSE.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#09090B]/40 via-[#09090B]/80 to-[#09090B] pointer-events-none" />
      </div>
    </section>
  );
}
