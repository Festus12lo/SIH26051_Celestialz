import React from 'react';
import type { ViewMode, CutawayLevel } from '../types/architectural';
import { Wind, RotateCcw } from 'lucide-react';

interface HeaderNavProps {
  currentMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  cutawayLevel: CutawayLevel;
  onSelectCutaway: (level: CutawayLevel) => void;
  showAirflow: boolean;
  onToggleAirflow: () => void;
  onResetCamera: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentMode,
  onSelectMode,
  cutawayLevel,
  onSelectCutaway,
  showAirflow,
  onToggleAirflow,
  onResetCamera,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3.5 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/80">
      {/* Zone 1: Single text element Brand Wordmark */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onSelectMode('orbit')}
          className="text-left group cursor-pointer focus:outline-none"
        >
          <span className="font-serif-display text-lg md:text-xl font-medium tracking-tight text-neutral-100 group-hover:text-amber-200 transition-colors">
            Vāstu Bioclimatic Residence
          </span>
        </button>
      </div>

      {/* Zone 2: 4-5 clean text navigation links */}
      <nav className="hidden lg:flex items-center gap-7 text-xs font-medium tracking-wide uppercase">
        <button
          onClick={() => onSelectMode('orbit')}
          className={`transition-colors pb-0.5 border-b-2 cursor-pointer ${
            currentMode === 'orbit'
              ? 'text-amber-300 border-amber-300'
              : 'text-neutral-400 border-transparent hover:text-neutral-200'
          }`}
        >
          3D Model
        </button>

        <button
          onClick={() => onSelectMode('hero')}
          className={`transition-colors pb-0.5 border-b-2 cursor-pointer ${
            currentMode === 'hero'
              ? 'text-amber-300 border-amber-300'
              : 'text-neutral-400 border-transparent hover:text-neutral-200'
          }`}
        >
          Hero Photography
        </button>

        <button
          onClick={() => onSelectMode('floorplan')}
          className={`transition-colors pb-0.5 border-b-2 cursor-pointer ${
            currentMode === 'floorplan'
              ? 'text-amber-300 border-amber-300'
              : 'text-neutral-400 border-transparent hover:text-neutral-200'
          }`}
        >
          Floor Plans
        </button>

        <button
          onClick={() => onSelectMode('solar')}
          className={`transition-colors pb-0.5 border-b-2 cursor-pointer ${
            currentMode === 'solar'
              ? 'text-amber-300 border-amber-300'
              : 'text-neutral-400 border-transparent hover:text-neutral-200'
          }`}
        >
          Solar &amp; Cooling Study
        </button>

        <button
          onClick={() => onSelectMode('materials')}
          className={`transition-colors pb-0.5 border-b-2 cursor-pointer ${
            currentMode === 'materials'
              ? 'text-amber-300 border-amber-300'
              : 'text-neutral-400 border-transparent hover:text-neutral-200'
          }`}
        >
          Material Palette
        </button>
      </nav>

      {/* Zone 3: Primary interactive actions */}
      <div className="flex items-center gap-3">
        {/* Cutaway segmented buttons */}
        <div className="hidden sm:flex items-center bg-neutral-900 border border-neutral-800 rounded p-0.5 text-[11px]">
          <button
            onClick={() => onSelectCutaway('all')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
              cutawayLevel === 'all'
                ? 'bg-neutral-800 text-neutral-100 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Complete building with roof"
          >
            All
          </button>
          <button
            onClick={() => onSelectCutaway('ground')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
              cutawayLevel === 'ground'
                ? 'bg-neutral-800 text-neutral-100 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Ground Floor Plan G01-G13"
          >
            Ground
          </button>
          <button
            onClick={() => onSelectCutaway('first')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
              cutawayLevel === 'first'
                ? 'bg-neutral-800 text-neutral-100 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="First Floor Private Zone F01-F10"
          >
            Upper
          </button>
          <button
            onClick={() => onSelectCutaway('section')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
              cutawayLevel === 'section'
                ? 'bg-neutral-800 text-neutral-100 font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Courtyard Cross-Section"
          >
            Section
          </button>
        </div>

        {/* Airflow stack toggle */}
        <button
          onClick={onToggleAirflow}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors border cursor-pointer ${
            showAirflow
              ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-300'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
          title="Toggle Convective Thermal Chimney Airflow Streamlines"
        >
          <Wind className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Airflow Stack</span>
        </button>

        {/* Reset view */}
        <button
          onClick={onResetCamera}
          className="p-1.5 rounded text-neutral-400 hover:text-neutral-100 bg-neutral-900 border border-neutral-800 transition-colors cursor-pointer"
          title="Reset Camera to Exterior South View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
