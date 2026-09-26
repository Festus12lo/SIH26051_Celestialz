import React from 'react';
import { Camera, Download, Layers } from 'lucide-react';

interface TopBarProps {
  activeTab: 'inspector' | 'thermal' | 'bom' | 'assembly';
  onSelectTab: (tab: 'inspector' | 'thermal' | 'bom' | 'assembly') => void;
  onExportSpec: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onExportSpec,
}) => {
  return (
    <header className="h-16 px-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex items-center justify-between shrink-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a href="#overview" className="text-lg font-semibold tracking-tight text-white hover:text-sky-400 transition-colors">
          Aegis-24 Emergency Shelter
        </a>
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 border-l border-slate-700 pl-3">
          <span>Archetype 1</span>
          <span aria-hidden="true">·</span>
          <span>6.0m × 4.0m × 2.4m</span>
          <span aria-hidden="true">·</span>
          <span>24 m²</span>
        </div>
      </div>

      {/* Zone 2: 4-6 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
        <button
          onClick={() => onSelectTab('inspector')}
          className={`transition-colors relative py-1 text-left ${
            activeTab === 'inspector' ? 'text-sky-400 font-semibold' : 'hover:text-white'
          }`}
        >
          3D Model
          {activeTab === 'inspector' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('thermal')}
          className={`transition-colors relative py-1 text-left ${
            activeTab === 'thermal' ? 'text-sky-400 font-semibold' : 'hover:text-white'
          }`}
        >
          Thermal Physics
          {activeTab === 'thermal' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('bom')}
          className={`transition-colors relative py-1 text-left ${
            activeTab === 'bom' ? 'text-sky-400 font-semibold' : 'hover:text-white'
          }`}
        >
          Bill of Materials
          {activeTab === 'bom' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => onSelectTab('assembly')}
          className={`transition-colors relative py-1 text-left ${
            activeTab === 'assembly' ? 'text-sky-400 font-semibold' : 'hover:text-white'
          }`}
        >
          Field Deployment
          {activeTab === 'assembly' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
          )}
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExportSpec}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-sky-950"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Architectural Spec</span>
        </button>
      </div>
    </header>
  );
};
