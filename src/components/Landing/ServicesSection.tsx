import React from 'react';
import { Sun, Wind, Snowflake, Home } from 'lucide-react';
import FadeIn from './FadeIn';

const services = [
  {
    icon: <Sun className="w-8 h-8 text-[var(--color-accent)]" />,
    title: 'Thermal Quality',
    desc: 'Algorithmic calculation of heat gain and loss to ensure optimal thermal performance across any given floor plan.'
  },
  {
    icon: <Home className="w-8 h-8 text-[var(--color-accent)]" />,
    title: 'Floor Plan Generation',
    desc: 'Intelligent spatial layouts strictly adhering to requested dimension constraints and practical usability requirements.'
  },
  {
    icon: <Snowflake className="w-8 h-8 text-[var(--color-accent)]" />,
    title: 'Material Selection',
    desc: 'Strategic recommendations for building materials based on local climate data, cost, and thermal mass requirements.'
  },
  {
    icon: <Wind className="w-8 h-8 text-[var(--color-accent)]" />,
    title: 'Constraint Resolution',
    desc: 'Generative exterior forms optimized to balance structural integrity with environmental and budgetary limitations.'
  }
];

export default function ServicesSection() {
  return (
    <section id="services" className="py-32 md:py-48 px-4 md:px-8 max-w-7xl mx-auto border-t border-[var(--color-border)]">
      <div className="text-center mb-24 md:mb-32">
        <FadeIn>
          <h2 className="text-[var(--color-accent)] font-sans text-sm md:text-base uppercase tracking-[0.3em] font-semibold mb-6">
            02 — The AI Engine
          </h2>
          <h3 className="text-5xl md:text-8xl font-heading font-semibold text-white">
            Generative <span className="italic">Performance</span>
          </h3>
        </FadeIn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {services.map((service, i) => (
          <FadeIn 
            key={i} 
            delay={i * 0.1}
            className="group p-8 md:p-12 bg-transparent border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all duration-500"
          >
            <div className="mb-10 w-16 h-16 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:border-[var(--color-accent)] group-hover:-translate-y-2 group-hover:shadow-[0_8px_30px_rgb(255,87,34,0.12)] transition-all duration-500">
              {service.icon}
            </div>
            <h4 className="text-2xl md:text-3xl font-heading font-semibold text-white mb-6">
              {service.title}
            </h4>
            <p className="text-[var(--color-muted-foreground)] font-sans font-light leading-relaxed">
              {service.desc}
            </p>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
