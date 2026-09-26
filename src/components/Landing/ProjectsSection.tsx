import React from 'react';
import { ExternalLink } from 'lucide-react';
import FadeIn from './FadeIn';

const projects = [
  {
    title: 'The Tundra Shell',
    category: 'Sub-Zero Architecture',
    images: [
      '/images/media_1790065661836.jpg', 
      '/images/media_1790065784533.jpg', 
      '/images/media_1790065865684.png', 
    ]
  },
  {
    title: 'The Dune Module',
    category: 'Arid Climate Habitat',
    images: [
      '/images/media_1790066133388.jpg', 
      '/images/media_1790066218522.jpg', 
      '/images/media_1790066370346.jpg', 
    ]
  },
  {
    title: 'The Savannah Homestead',
    category: 'Tropical/Equatorial Habitat',
    images: [
      '/images/media_1790066492842.png', 
      '/images/media_1790066722802.jpg', 
      '/images/media_1790066881173.jpg', 
    ]
  },
  {
    title: 'The Alpine Retreat',
    category: 'High Altitude Shelter',
    images: [
      '/images/media_1790067873463.jpg', 
      '/images/media_1790067303419.jpg', 
      '/images/media_1790067485019.jpg', 
    ]
  },
  {
    title: 'The Oasis Center',
    category: 'Desert Community Hub',
    images: [
      '/images/media_1790067036252.jpg', 
      '/images/media_1790067133368.jpg', 
      '/images/media_1790067218985.png', 
    ]
  }
];

export default function ProjectsSection() {
  return (
    <section id="projects" className="py-32 md:py-48 px-4 md:px-8 max-w-7xl mx-auto border-t border-[var(--color-border)]">
      <div className="flex flex-col md:flex-row justify-between items-end mb-24 md:mb-32">
        <FadeIn>
          <h2 className="text-[var(--color-accent)] font-sans text-sm md:text-base uppercase tracking-[0.3em] font-semibold mb-6">
            03 — Conceptual Designs
          </h2>
          <h3 className="text-5xl md:text-8xl font-heading font-semibold text-white">
            Engineered for <span className="italic text-[var(--color-accent)]">Constraints</span>
          </h3>
        </FadeIn>
      </div>

      <div className="space-y-40">
        {projects.map((project, i) => (
          <FadeIn key={i} delay={0.2} className="group">
            {/* The main project image grid (3 images as requested) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {project.images.map((img, j) => (
                <div key={j} className="relative aspect-[4/5] md:aspect-square overflow-hidden bg-[var(--color-muted)]">
                  <img 
                    src={img} 
                    alt={`${project.title} view ${j + 1}`}
                    className="w-full h-full object-cover filter grayscale opacity-80 transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/0 transition-colors duration-700" />
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center text-center max-w-3xl mx-auto px-4">
              <h4 className="text-3xl md:text-5xl font-heading font-semibold text-white mb-4">
                {project.title}
              </h4>
              <p className="text-[var(--color-muted-foreground)] font-sans uppercase tracking-[0.2em] text-sm md:text-base">
                {project.category}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
