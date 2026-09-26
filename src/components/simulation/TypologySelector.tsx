import React from 'react';
import { Box, Flame, ArrowRight, ShieldCheck, Tent, Home, Building2, Sun, Wind, Shield } from 'lucide-react';

export type HousingTypology = 'emergency' | 'resident' | 'community';
export type ThermalStrategy = 'gain' | 'rejection' | 'balanced';

interface TypologySelectorProps {
  selectedTypology: HousingTypology;
  onSelectTypology: (typology: HousingTypology) => void;
  selectedStrategy: ThermalStrategy;
  onSelectStrategy: (strategy: ThermalStrategy) => void;
  onSynthesize: () => void;
}

export const TypologySelector: React.FC<TypologySelectorProps> = ({
  selectedTypology,
  onSelectTypology,
  selectedStrategy,
  onSelectStrategy,
  onSynthesize,
}) => {
  const typologies = [
    {
      id: 'emergency' as HousingTypology,
      title: 'Emergency Shelter',
      subtitle: 'Rapid deploy',
      badge: 'Disaster Relief',
      description: 'Quick-assembly deployable shelter with modular thermal insulation envelope and reflection roof.',
      icon: Tent,
    },
    {
      id: 'resident' as HousingTypology,
      title: 'Resident',
      subtitle: 'Permanent setup',
      badge: 'Passive House',
      description: 'Permanent passive residential home engineered with heavy thermal mass rammed earth and timber framework.',
      icon: Home,
    },
    {
      id: 'community' as HousingTypology,
      title: 'Duplex',
      subtitle: 'Multi-level living',
      badge: 'Community Shelter',
      description: 'Bioclimatic apartment complex with 6 residential units, central atrium thermal chimney & jaali solar shading.',
      icon: Building2,
    },
  ];

  const strategies = [
    {
      id: 'gain' as ThermalStrategy,
      label: 'Max Heat Gain',
      subtitle: 'Solar Heat Trapping',
      description: 'Passive solar capture & envelope heat retention for cold alpine climates',
      icon: Sun,
    },
    {
      id: 'rejection' as ThermalStrategy,
      label: 'Max Heat Rejection',
      subtitle: 'Atrium Chimney & Jaali',
      description: 'Convective atrium exhaust & solar shading for hot/arid extremes',
      icon: Wind,
    },
    {
      id: 'balanced' as ThermalStrategy,
      label: 'Balanced Year-Round',
      subtitle: 'Diurnal Inertia Mass',
      description: 'Diurnal thermal mass stabilization for temperate conditions',
      icon: Shield,
    },
  ];

  return (
    <div className="w-full select-none">
      {/* Frosted Glassmorphism Container matching Theme */}
      <div className="glass-card-premium p-6 md:p-10 space-y-8">
        
        {/* 1. HOUSING TYPOLOGY SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#FF5722] font-mono tracking-widest text-xs uppercase font-bold">
              <Box className="w-4 h-4 text-[#FF5722]" />
              <span>HOUSING TYPOLOGY</span>
            </div>
            <span className="text-[11px] text-white/40 font-mono hidden sm:inline">
              Select architectural program
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {typologies.map((t) => {
              const isSelected = selectedTypology === t.id;
              const Icon = t.icon;
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTypology(t.id)}
                  className={`group relative p-6 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[190px] border ${
                    isSelected
                      ? 'bg-[#FF5722]/10 border-[#FF5722] shadow-[0_0_30px_rgba(255,87,34,0.25)] ring-1 ring-[#FF5722]/50 scale-[1.02]'
                      : 'glass-card-subtle hover:-translate-y-1 hover:border-white/25'
                  }`}
                >
                  {/* Top Bar: Icon and selection badge */}
                  <div className="flex items-start justify-between w-full mb-4">
                    <div
                      className={`p-3 rounded-2xl border transition-colors ${
                        isSelected
                          ? 'bg-[#FF5722]/20 border-[#FF5722]/60 text-[#FF5722] shadow-[0_0_15px_rgba(255,87,34,0.3)]'
                          : 'bg-white/5 border-white/10 text-[#FF5722] group-hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex items-center gap-2">
                      {t.badge && (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
                            isSelected
                              ? 'bg-[#FF5722]/20 text-[#FF5722] border-[#FF5722]/40 font-bold'
                              : 'bg-white/5 text-white/50 border-white/10'
                          }`}
                        >
                          {t.badge}
                        </span>
                      )}

                      {isSelected && (
                        <div className="text-[#FF5722] animate-in zoom-in-75 duration-200">
                          <ShieldCheck className="w-5 h-5 text-[#FF5722] drop-shadow-[0_0_8px_rgba(255,87,34,0.8)]" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Text */}
                  <div>
                    <h3 className="text-xl font-bold font-heading text-white tracking-tight">
                      {t.title}
                    </h3>
                    <p className="text-xs font-semibold text-[#FF5722] mt-0.5 tracking-wide">
                      {t.subtitle}
                    </p>
                    <p className="text-xs text-white/60 leading-relaxed mt-2 line-clamp-2">
                      {t.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. THERMAL STRATEGY SECTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#FF5722] font-mono tracking-widest text-xs uppercase font-bold">
              <Flame className="w-4 h-4 text-[#FF5722]" />
              <span>THERMAL STRATEGY</span>
            </div>
            <span className="text-[11px] text-white/40 font-mono hidden sm:inline">
              Target thermodynamic balance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {strategies.map((s) => {
              const isSelected = selectedStrategy === s.id;
              const StratIcon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectStrategy(s.id)}
                  className={`py-4 px-5 rounded-2xl text-left transition-all duration-200 border cursor-pointer flex items-center gap-3.5 group ${
                    isSelected
                      ? 'bg-[#FF5722]/15 border-[#FF5722] text-white shadow-[0_0_24px_rgba(255,87,34,0.25)] ring-1 ring-[#FF5722]/50'
                      : 'bg-white/[0.03] border-white/10 text-white/70 hover:border-white/20 hover:text-white hover:bg-white/[0.07]'
                  }`}
                  title={s.description}
                >
                  <div
                    className={`p-2 rounded-xl border transition-colors ${
                      isSelected
                        ? 'bg-[#FF5722]/20 border-[#FF5722]/50 text-[#FF5722]'
                        : 'bg-white/5 border-white/10 text-white/40 group-hover:text-white/70'
                    }`}
                  >
                    <StratIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold tracking-tight text-white">{s.label}</div>
                    <div className="text-[11px] text-white/50">{s.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. SYNTHESIZE ARCHITECTURE CTA BUTTON */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onSynthesize}
            className="relative w-full py-4.5 px-8 rounded-2xl bg-gradient-to-r from-[#FF5722] via-[#F4511E] to-[#E64A19] hover:from-[#ff6d3b] hover:via-[#FF5722] hover:to-[#F4511E] text-white font-bold text-base md:text-lg tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer shadow-[0_0_35px_rgba(255,87,34,0.4)] hover:shadow-[0_0_50px_rgba(255,87,34,0.6)] hover:-translate-y-0.5 group overflow-hidden"
          >
            {/* Shimmer sweep animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
            
            <span className="font-heading tracking-widest drop-shadow-sm">SYNTHESIZE ARCHITECTURE</span>
            <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
