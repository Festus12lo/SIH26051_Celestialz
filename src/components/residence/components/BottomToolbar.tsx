import React from 'react';
import { Camera, Sun, Moon, Sparkles, Layers, Eye } from 'lucide-react';
import { HERO_VIEWS } from '../data/residenceData';
import type { HeroView } from '../types/architectural';

interface BottomToolbarProps {
  onSelectHero: (hero: HeroView) => void;
  activeHeroId: string | null;
  onOpenHeroGallery: () => void;
  onOpenSolarStudy: () => void;
  onOpenFloorPlans: () => void;
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  onSelectHero,
  activeHeroId,
  onOpenHeroGallery,
  onOpenSolarStudy,
  onOpenFloorPlans,
}) => {
  // Quick hero buttons
  const quickHeroes = [
    HERO_VIEWS[0], // South Facade
    HERO_VIEWS[1], // Entrance
    HERO_VIEWS[2], // Living
    HERO_VIEWS[5], // Courtyard
    HERO_VIEWS[6], // Clerestory / Chimney
    HERO_VIEWS[8], // Master Bedroom
    HERO_VIEWS[11], // Blue Hour
  ];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 max-w-full px-4 overflow-x-auto pointer-events-auto">
      <div className="flex items-center gap-1.5 p-1 bg-neutral-950/85 backdrop-blur-md border border-neutral-800 rounded-lg shadow-2xl">
        {quickHeroes.map((hero) => {
          const isSelected = activeHeroId === hero.id;
          return (
            <button
              key={hero.id}
              onClick={() => onSelectHero(hero)}
              className={`px-3 py-1.5 rounded text-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-amber-600/30 text-amber-200 border border-amber-600/60 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
              }`}
              title={hero.description}
            >
              {hero.lightingMood === 'Blue Hour' ? (
                <Moon className="w-3 h-3 text-indigo-400" />
              ) : hero.lightingMood === 'Golden Hour' ? (
                <Sparkles className="w-3 h-3 text-amber-400" />
              ) : (
                <Sun className="w-3 h-3 text-amber-200" />
              )}
              <span>{hero.title.split(' ')[0]} {hero.title.split(' ')[1] || ''}</span>
            </button>
          );
        })}

        <div className="w-px h-5 bg-neutral-800 mx-1" />

        <button
          onClick={onOpenHeroGallery}
          className="px-2.5 py-1.5 rounded text-xs text-neutral-400 hover:text-amber-300 hover:bg-neutral-900 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          title="Browse all 12 Hero Photography compositions"
        >
          <Camera className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">All 12 Views</span>
        </button>

        <button
          onClick={onOpenFloorPlans}
          className="px-2.5 py-1.5 rounded text-xs text-neutral-400 hover:text-amber-300 hover:bg-neutral-900 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          title="Floor-by-floor room inspector"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Rooms</span>
        </button>

        <button
          onClick={onOpenSolarStudy}
          className="px-2.5 py-1.5 rounded text-xs text-neutral-400 hover:text-amber-300 hover:bg-neutral-900 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          title="Solar & Natural Cooling simulation"
        >
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Solar</span>
        </button>
      </div>
    </div>
  );
};
