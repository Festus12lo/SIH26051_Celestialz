import React from 'react';

interface LogoProps {
  variant?: 'full' | 'compact' | 'icon-only';
  /** 'light' = white-bg logo for light surfaces, 'dark' = transparent-bg logo for dark surfaces */
  theme?: 'light' | 'dark';
  className?: string;
  imgClassName?: string;
}

/**
 * ThermoShelter Brand Logo — single source of truth.
 * 
 * Variants:
 * - `full`      → Full logo image (house + flame + text)
 * - `compact`   → Smaller inline logo for nav bars
 * - `icon-only` → Just the house icon (for very small spaces)
 */
export default function Logo({
  variant = 'full',
  theme = 'dark',
  className = '',
  imgClassName = '',
}: LogoProps) {
  const src =
    theme === 'light'
      ? '/images/thermoshelter_logo.png'
      : '/images/thermoshelter_logo_transparent.png';

  if (variant === 'icon-only') {
    return (
      <img
        src={src}
        alt="ThermoShelter"
        className={`h-8 w-auto object-contain ${imgClassName}`}
        style={{ objectPosition: 'left center', clipPath: 'inset(0 60% 0 0)' }}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-0 ${className}`}>
        <img
          src={src}
          alt="ThermoShelter by Celestialz"
          className={`h-8 w-auto object-contain ${imgClassName}`}
        />
      </div>
    );
  }

  // Full variant
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src={src}
        alt="ThermoShelter by Celestialz"
        className={`w-full max-w-[280px] h-auto object-contain ${imgClassName}`}
      />
    </div>
  );
}
