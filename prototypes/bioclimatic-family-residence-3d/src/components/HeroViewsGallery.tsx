import React from 'react';
import { HERO_VIEWS } from '../data/residenceData';
import { HeroView } from '../types/architectural';
import { Camera, Sun, Moon, Sparkles, ChevronRight } from 'lucide-react';

interface HeroViewsGalleryProps {
  activeHeroId: string | null;
  onSelectHero: (hero: HeroView) => void;
  onClose: () => void;
}

export const HeroViewsGallery: React.FC<HeroViewsGalleryProps> = ({
  activeHeroId,
  onSelectHero,
  onClose,
}) => {
  return (
    <aside className="absolute right-0 top-14 bottom-0 w-80 md:w-96 bg-neutral-950/90 backdrop-blur-xl border-l border-neutral-800/80 z-20 flex flex-col shadow-2xl">
      <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between">
        <div>
          <h2 className="font-serif-display text-base font-medium text-neutral-100">
            Architectural Photography
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            12 curated camera compositions (24–28mm equivalent)
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-100 text-xs px-2 py-1 bg-neutral-900 border border-neutral-800 rounded cursor-pointer"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-neutral-900 p-2 space-y-1">
        {HERO_VIEWS.map((hero) => {
          const isSelected = activeHeroId === hero.id;
          return (
            <button
              key={hero.id}
              onClick={() => onSelectHero(hero)}
              className={`w-full text-left p-3 rounded transition-all cursor-pointer group ${
                isSelected
                  ? 'bg-amber-950/40 border border-amber-600/50 shadow-sm'
                  : 'hover:bg-neutral-900/60 border border-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[11px] font-semibold tracking-wider text-amber-400/90">
                  {hero.id}
                </span>

                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  {hero.lightingMood === 'Blue Hour' ? (
                    <Moon className="w-3 h-3 text-indigo-400" />
                  ) : hero.lightingMood === 'Golden Hour' ? (
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  ) : (
                    <Sun className="w-3 h-3 text-amber-200" />
                  )}
                  <span>{hero.lightingMood}</span>
                  <span aria-hidden="true">·</span>
                  <span>{hero.solarAltDeg}° alt</span>
                </div>
              </div>

              <h3 className="font-serif-display text-sm font-medium text-neutral-100 mt-1 group-hover:text-amber-200 transition-colors">
                {hero.title}
              </h3>

              <div className="text-xs text-amber-300/80 italic mt-0.5">
                {hero.subtitle}
              </div>

              <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                {hero.description}
              </p>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-neutral-500 pt-2 border-t border-neutral-800/40">
                <span className="flex items-center gap-1 font-mono">
                  <Camera className="w-3 h-3" />
                  <span>{hero.fov}° FOV</span>
                </span>
                <span className="flex items-center text-amber-400/80 group-hover:translate-x-0.5 transition-transform">
                  Fly to view <ChevronRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
