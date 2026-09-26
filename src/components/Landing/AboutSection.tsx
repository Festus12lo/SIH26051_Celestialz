import React from 'react';
import FadeIn from './FadeIn';

export default function AboutSection() {
  return (
    <section id="about" className="py-32 md:py-48 px-4 md:px-8 max-w-7xl mx-auto border-t border-[var(--color-border)]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32 items-center">
        <FadeIn className="space-y-8 md:space-y-12">
          <h2 className="text-[var(--color-accent)] font-sans text-sm md:text-base uppercase tracking-[0.3em] font-semibold">
            01 — The Philosophy
          </h2>
          <h3 className="text-4xl md:text-6xl lg:text-7xl font-heading font-semibold text-white leading-[1.1] tracking-tight">
            Designing for <br/>
            <span className="italic text-[var(--color-accent)]">
              Reality.
            </span>
          </h3>
          <p className="text-[var(--color-muted-foreground)] font-sans text-lg md:text-xl font-light leading-relaxed max-w-xl">
            True architectural intelligence isn't about science fiction—it's about precision. 
            ThermoShelter AI generates comprehensive floor plans and house layouts driven entirely by constraints. 
            By calculating precise dimensions, selecting optimal materials, and ensuring exact thermal quality, we design for the real world.
          </p>
        </FadeIn>

        <FadeIn delay={0.2} className="relative aspect-square md:aspect-auto md:h-[700px] w-full bg-[var(--color-muted)] overflow-hidden">
          <img 
            src="/images/media_1790066912774.jpg" 
            alt="Parametric Architecture" 
            className="absolute inset-0 w-full h-full object-cover filter grayscale opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-1000 hover:opacity-100 hover:scale-105 hover:grayscale-0"
          />
        </FadeIn>
      </div>
    </section>
  );
}
