import React from 'react';
import { X, CheckCircle2, ChevronRight, ShieldCheck } from 'lucide-react';
import { HotspotInfo } from '../types/shelter';
import { HOTSPOTS } from '../data/shelterData';

interface HotspotDetailCardProps {
  hotspot: HotspotInfo | null;
  onClose: () => void;
  onSelectHotspot: (hotspot: HotspotInfo) => void;
}

export const HotspotDetailCard: React.FC<HotspotDetailCardProps> = ({
  hotspot,
  onClose,
  onSelectHotspot,
}) => {
  if (!hotspot) return null;

  return (
    <div className="absolute top-16 right-4 w-96 max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-5 z-20 transition-all text-slate-100">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
            <span>Archetype 1</span>
            <span aria-hidden="true">·</span>
            <span>{hotspot.category}</span>
          </div>
          <h3 className="text-base font-semibold text-white mt-1">
            {hotspot.title}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close detail modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed mt-3">
        {hotspot.summary}
      </p>

      {/* Engineering Specs Table */}
      <div className="mt-4 space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Component Specifications
        </h4>
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-2 text-xs">
          {hotspot.specs.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start gap-2 py-1 border-b border-slate-800/50 last:border-none">
              <span className="text-slate-400 shrink-0">{item.label}</span>
              <span className="font-mono text-slate-200 text-right tabular-nums font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Jump Hotspot Carousel */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Inspect other assemblies:</span>
        <div className="flex items-center gap-1">
          {HOTSPOTS.map((h, i) => (
            <button
              key={h.id}
              onClick={() => onSelectHotspot(h)}
              className={`w-6 h-6 rounded-md text-xs font-mono transition-colors ${
                h.id === hotspot.id ? 'bg-sky-500 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title={h.title}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
