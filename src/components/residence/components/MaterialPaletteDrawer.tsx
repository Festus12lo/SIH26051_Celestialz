import React from 'react';
import { MATERIALS } from '../data/residenceData';
import type { MaterialSpec } from '../types/architectural';
import { Layers, ShieldCheck, Sparkles, X } from 'lucide-react';

interface MaterialPaletteDrawerProps {
  onClose: () => void;
}

export const MaterialPaletteDrawer: React.FC<MaterialPaletteDrawerProps> = ({ onClose }) => {
  return (
    <aside className="absolute right-0 top-14 bottom-0 w-80 md:w-96 bg-neutral-950/95 backdrop-blur-xl border-l border-neutral-800/80 z-20 flex flex-col shadow-2xl overflow-y-auto">
      <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between sticky top-0 bg-neutral-950/95 backdrop-blur z-10">
        <div>
          <h2 className="font-serif-display text-base font-medium text-neutral-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            Material Heritage &amp; Craft
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            5 authentic mineral &amp; bioclimatic tactile materials
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {MATERIALS.map((mat: MaterialSpec) => (
          <div
            key={mat.id}
            className="p-3.5 bg-neutral-900/50 border border-neutral-800 rounded space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-serif-display text-sm font-semibold text-neutral-100 flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                    style={{ backgroundColor: mat.colorHex }}
                  />
                  {mat.name}
                </h3>
                <span className="text-[11px] text-amber-400/90 font-mono mt-0.5 block">
                  {mat.thickness}
                </span>
              </div>
            </div>

            <div className="text-xs text-neutral-300">
              <span className="text-neutral-500 font-medium">Application: </span>
              {mat.role}
            </div>

            <div className="p-2 bg-neutral-950/70 border border-neutral-800/80 rounded text-[11px] space-y-1">
              <div className="text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Thermal &amp; Bioclimatic Metric</span>
              </div>
              <p className="text-neutral-300 font-mono leading-relaxed">
                {mat.thermalProperties}
              </p>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              {mat.visualDetails}
            </p>

            <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/60 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500/80 shrink-0" />
              <span>{mat.sustainability}</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
