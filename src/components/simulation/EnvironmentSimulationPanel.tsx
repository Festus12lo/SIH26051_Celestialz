import React from 'react';
import {
  Sun,
  Moon,
  Flame,
  CloudSnow,
  CloudRain,
  Shield,
  Activity,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { getMaterialsForTypology, type MaterialDef } from '../../constants/materials';

export type EnvironmentPresetId = 'daylight' | 'night' | 'desert' | 'arctic' | 'disaster';
export type RenderEngineMode = 'pbr' | 'wireframe' | 'xray' | 'thermal';
export type DataSourceMode = 'presets' | 'live';
export type ComfortTarget = 'warm' | 'hot' | 'normal';

export interface EnvironmentPreset {
  id: EnvironmentPresetId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ambientTemp: number; // °C
  solarRadiation: number; // W/m²
  description: string;
}

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  {
    id: 'daylight',
    label: 'DAYLIGHT',
    icon: Sun,
    ambientTemp: 25.0,
    solarRadiation: 650,
    description: 'Sunny daytime weather (25°C) with natural sunlight.',
  },
  {
    id: 'night',
    label: 'NIGHT TIME',
    icon: Moon,
    ambientTemp: 10.0,
    solarRadiation: 0,
    description: 'Cool nighttime (10°C) with no sunlight.',
  },
  {
    id: 'desert',
    label: 'DESERT',
    icon: Flame,
    ambientTemp: 42.0,
    solarRadiation: 950,
    description: 'Hot desert weather (42°C) with intense blazing sun.',
  },
  {
    id: 'arctic',
    label: 'ARCTIC',
    icon: CloudSnow,
    ambientTemp: -18.0,
    solarRadiation: 180,
    description: 'Freezing winter snow (-18°C) with cold winds.',
  },
  {
    id: 'disaster',
    label: 'RAIN & STORM',
    icon: CloudRain,
    ambientTemp: 16.0,
    solarRadiation: 300,
    description: 'Rainy storm conditions (16°C) with high winds and damp air.',
  },
];

interface EnvironmentSimulationPanelProps {
  dataSource: DataSourceMode;
  onToggleDataSource: (mode: DataSourceMode) => void;
  selectedEnvironment: EnvironmentPresetId;
  onSelectEnvironment: (id: EnvironmentPresetId) => void;
  renderMode: RenderEngineMode;
  onSelectRenderMode: (mode: RenderEngineMode) => void;
  selectedRoof: MaterialDef;
  onSelectRoof: (mat: MaterialDef) => void;
  selectedWall: MaterialDef;
  onSelectWall: (mat: MaterialDef) => void;
  selectedWindow: MaterialDef;
  onSelectWindow: (mat: MaterialDef) => void;
  comfortTarget?: ComfortTarget;
  onSelectComfortTarget?: (target: ComfortTarget) => void;
  activeTypology?: 'emergency' | 'resident' | 'community';
  onBack?: () => void;
  className?: string;
}

export const EnvironmentSimulationPanel: React.FC<EnvironmentSimulationPanelProps> = ({
  dataSource,
  onToggleDataSource,
  selectedEnvironment,
  onSelectEnvironment,
  renderMode,
  onSelectRenderMode,
  selectedRoof,
  onSelectRoof,
  selectedWall,
  onSelectWall,
  selectedWindow,
  onSelectWindow,
  comfortTarget = 'normal',
  onSelectComfortTarget,
  activeTypology = 'emergency',
  onBack,
  className = '',
}) => {
  // Retrieve materials tailored strictly for the active typology
  // Emergency = Deployable modular materials ONLY
  // Resident / Community = Permanent non-deployable construction ONLY
  const bundle = getMaterialsForTypology(activeTypology);
  const isDeployable = bundle.categoryType === 'deployable';

  // Defensive auto-correction: if current selected material does not belong to active bundle, clamp immediately
  React.useEffect(() => {
    if (!bundle.walls.some((m) => m.id === selectedWall.id)) {
      onSelectWall(bundle.walls[0]);
    }
    if (!bundle.roofs.some((m) => m.id === selectedRoof.id)) {
      onSelectRoof(bundle.roofs[0]);
    }
    if (!bundle.windows.some((m) => m.id === selectedWindow.id)) {
      onSelectWindow(bundle.windows[0]);
    }
  }, [activeTypology, bundle, selectedWall.id, selectedRoof.id, selectedWindow.id, onSelectWall, onSelectRoof, onSelectWindow]);

  return (
    <div
      className={`w-80 md:w-[340px] flex flex-col gap-3 select-none ${className}`}
    >
      {/* ── CARD 1: ENVIRONMENT SIMULATION ── */}
      <div className="glass-card-premium p-4.5 flex flex-col gap-3.5">
        {/* Header with Back Button, Title and Mode Switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Return to Typology & Strategy Config"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <Sparkles className="w-4 h-4 text-[#FF5722]" />
            <span className="text-[11px] font-black uppercase tracking-wider font-mono">
              Weather Simulation
            </span>
          </div>

          {/* Toggle pill: PRESETS | LIVE DATA */}
          <div className="flex items-center bg-[#090d16] p-1 rounded-xl border border-white/10 text-[10px] font-bold font-mono">
            <button
              onClick={() => onToggleDataSource('presets')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dataSource === 'presets'
                  ? 'bg-[#FF5722]/20 text-[#FF5722] border border-[#FF5722]/50 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              PRESETS
            </button>
            <button
              onClick={() => onToggleDataSource('live')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                dataSource === 'live'
                  ? 'bg-[#FF5722]/20 text-[#FF5722] border border-[#FF5722]/50 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Pull live Open-Meteo weather data"
            >
              <Activity className="w-2.5 h-2.5 text-[#FF5722]" />
              <span>LIVE DATA</span>
            </button>
          </div>
        </div>

        {/* 5 Environment Surrounding Cards */}
        <div className="grid grid-cols-5 gap-1.5">
          {ENVIRONMENT_PRESETS.map((preset) => {
            const isSelected = selectedEnvironment === preset.id;
            const Icon = preset.icon;

            return (
              <button
                key={preset.id}
                onClick={() => onSelectEnvironment(preset.id)}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-[#241712] border-[#FF5722] text-[#FF5722] ring-2 ring-[#FF5722]/40 shadow-[0_0_12px_rgba(255,87,34,0.35)]'
                    : 'bg-[#18202f]/60 border-white/5 text-slate-400 hover:bg-[#1f2b3e] hover:text-slate-200'
                }`}
                title={preset.description}
              >
                <Icon
                  className={`w-4 h-4 mb-1 transition-transform group-hover:scale-110 ${
                    isSelected ? 'text-[#FF5722]' : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                />
                <span className="text-[8px] font-bold tracking-tight text-center leading-tight">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Render Shading Engine Segmented Control */}
        <div className="grid grid-cols-4 bg-[#0a0f18] p-1 rounded-xl border border-white/10 text-xs font-semibold gap-1">
          <button
            onClick={() => onSelectRenderMode('pbr')}
            className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
              renderMode === 'pbr'
                ? 'bg-[#FF5722] text-white font-bold shadow-[0_0_12px_rgba(255,87,34,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="Realistic materials & textures"
          >
            Realistic
          </button>
          <button
            onClick={() => onSelectRenderMode('wireframe')}
            className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
              renderMode === 'wireframe'
                ? 'bg-[#FF5722] text-white font-bold shadow-[0_0_12px_rgba(255,87,34,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="3D Frame view"
          >
            3D Frame
          </button>
          <button
            onClick={() => onSelectRenderMode('xray')}
            className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
              renderMode === 'xray'
                ? 'bg-[#FF5722] text-white font-bold shadow-[0_0_12px_rgba(255,87,34,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="See-through view"
          >
            See-Through
          </button>
          <button
            onClick={() => onSelectRenderMode('thermal')}
            className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
              renderMode === 'thermal'
                ? 'bg-[#FF5722] text-white font-bold shadow-[0_0_12px_rgba(255,87,34,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="Heat distribution map"
          >
            Heat Map
          </button>
        </div>

        {/* ── INTERIOR COMFORT TARGET ── */}
        <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
          <div className="flex items-center gap-2 text-[11px]">
            <Flame className="w-3.5 h-3.5 text-[#FF5722]" />
            <span className="font-mono text-slate-400 uppercase tracking-wider text-[10px]">
              Interior Comfort Target
            </span>
          </div>
          <div className="grid grid-cols-3 bg-[#0a0f18] p-1 rounded-xl border border-white/10 text-xs font-semibold gap-1">
            {(['normal', 'warm', 'hot'] as ComfortTarget[]).map((target) => (
              <button
                key={target}
                onClick={() => onSelectComfortTarget?.(target)}
                className={`py-1.5 rounded-lg text-center transition-all capitalize cursor-pointer ${
                  comfortTarget === target
                    ? 'bg-[#FF5722] text-white font-bold shadow-[0_0_12px_rgba(255,87,34,0.4)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
                title={
                  target === 'normal'
                    ? 'Maintain standard 20-25°C comfort band'
                    : target === 'warm'
                    ? 'Target 26-30°C (cold climate heating)'
                    : 'Target 30-35°C (extreme cold arctic heating)'
                }
              >
                {target === 'normal' ? '🌡️ Normal' : target === 'warm' ? '🔥 Warm' : '♨️ Hot'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CARD 2: STRUCTURAL ASSEMBLY ── */}
      <div className="glass-card-premium p-4.5 flex flex-col gap-3.5">
        {/* Section Header with Category Badge */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Shield className="w-4 h-4 text-[#FF5722]" />
              <span className="text-[11px] font-black uppercase tracking-wider font-mono">
                Structural Assembly
              </span>
            </div>

            {/* Typology Classification Badge */}
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider border flex items-center gap-1 ${
                isDeployable
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
              }`}
            >
              {isDeployable ? '⚡ DEPLOYABLE MODULAR' : '🏛️ PERMANENT (NON-DEPLOYABLE)'}
            </span>
          </div>

          {/* Contextual Typology Explainer */}
          <div className="bg-black/30 rounded-lg p-2 border border-white/5">
            <p className="text-[10px] text-slate-300 leading-snug">
              {isDeployable ? (
                <span>
                  <strong className="text-amber-400">Acute Relief Envelope:</strong> 24–48h rapid dry deployment. Lightweight flat-pack panels, zero wet mortar curing.
                </span>
              ) : (
                <span>
                  <strong className="text-emerald-400">Permanent Construction:</strong> 40+ year lifecycle masonry & thermal mass. Diurnal damping, non-deployable.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Sub-section 1: ROOFING SYSTEM */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-slate-400 uppercase tracking-wider text-[10px]">
              Roofing System
            </span>
            <span className="font-mono font-bold text-[#FF5722] text-[10px]">
              ALBEDO: {selectedRoof.albedo?.toFixed(2) || '0.50'}
            </span>
          </div>

          {/* Roofing Swatches - strictly bundle.roofs */}
          <div className="flex items-center gap-2">
            {bundle.roofs.map((mat) => {
              const isSelected = selectedRoof.id === mat.id;
              return (
                <button
                  key={mat.id}
                  onClick={() => onSelectRoof(mat)}
                  style={{ backgroundColor: mat.hex }}
                  className={`w-9 h-9 rounded-xl transition-all cursor-pointer relative shadow-md ${
                    isSelected
                      ? 'ring-2 ring-[#FF5722] border-2 border-white scale-105 shadow-[0_0_12px_rgba(255,87,34,0.6)]'
                      : 'border border-white/10 hover:border-white/40 hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  title={`${mat.name} (Albedo: ${mat.albedo}) — ${mat.deploymentTime}`}
                />
              );
            })}
          </div>

          {/* Active Roof Details */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-100">{selectedRoof.name}</span>
              {selectedRoof.typologyCriteriaBadge && (
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  isDeployable
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {selectedRoof.typologyCriteriaBadge}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
              {selectedRoof.desc}
            </p>
            <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500 mt-0.5">
              <span>Mass: <strong className="text-slate-300">{selectedRoof.thermalMass}</strong></span>
              <span>•</span>
              <span>Eco: <strong className="text-slate-300">{selectedRoof.ecoScore}</strong></span>
              <span>•</span>
              <span className={isDeployable ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {selectedRoof.deploymentTime}
              </span>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Sub-section 2: WALL ASSEMBLY */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-slate-400 uppercase tracking-wider text-[10px]">
              Wall Assembly
            </span>
            <span className="font-mono font-bold text-[#FF5722] text-[10px]">
              R-{selectedWall.rValue ? selectedWall.rValue.toFixed(1) : '4.0'}/IN
            </span>
          </div>

          {/* Wall Swatches - strictly bundle.walls */}
          <div className="flex items-center gap-2">
            {bundle.walls.map((mat) => {
              const isSelected = selectedWall.id === mat.id;
              return (
                <button
                  key={mat.id}
                  onClick={() => onSelectWall(mat)}
                  style={{ backgroundColor: mat.hex }}
                  className={`w-9 h-9 rounded-xl transition-all cursor-pointer relative shadow-md ${
                    isSelected
                      ? 'ring-2 ring-[#FF5722] border-2 border-white scale-105 shadow-[0_0_12px_rgba(255,87,34,0.6)]'
                      : 'border border-white/10 hover:border-white/40 hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  title={`${mat.name} (R-${mat.rValue}/in) — ${mat.deploymentTime}`}
                />
              );
            })}
          </div>

          {/* Active Wall Details */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-100">{selectedWall.name}</span>
              {selectedWall.typologyCriteriaBadge && (
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  isDeployable
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {selectedWall.typologyCriteriaBadge}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
              {selectedWall.desc}
            </p>
            <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500 mt-0.5">
              <span>Mass: <strong className="text-slate-300">{selectedWall.thermalMass}</strong></span>
              <span>•</span>
              <span>Eco: <strong className="text-slate-300">{selectedWall.ecoScore}</strong></span>
              <span>•</span>
              <span className={isDeployable ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {selectedWall.deploymentTime}
              </span>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Sub-section 3: FENESTRATION & GLAZING */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-slate-400 uppercase tracking-wider text-[10px]">
              Fenestration & Glazing
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
              <span className="text-[#FF5722]">
                U-{selectedWindow.uValue ? selectedWindow.uValue.toFixed(1) : '2.4'}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400">
                SHGC {selectedWindow.shgc ? selectedWindow.shgc.toFixed(2) : '0.55'}
              </span>
            </div>
          </div>

          {/* Window Glazing Swatches - strictly bundle.windows */}
          <div className="flex items-center gap-2">
            {bundle.windows.map((mat) => {
              const isSelected = selectedWindow.id === mat.id;
              return (
                <button
                  key={mat.id}
                  onClick={() => onSelectWindow(mat)}
                  style={{ backgroundColor: mat.hex }}
                  className={`w-9 h-9 rounded-xl transition-all cursor-pointer relative shadow-md overflow-hidden ${
                    isSelected
                      ? 'ring-2 ring-[#FF5722] border-2 border-white scale-105 shadow-[0_0_12px_rgba(255,87,34,0.6)]'
                      : 'border border-white/10 hover:border-white/40 hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  title={`${mat.name} (U-${mat.uValue}, SHGC ${mat.shgc}) — ${mat.deploymentTime}`}
                >
                  {/* Subtle glass reflection highlight */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
                </button>
              );
            })}
          </div>

          {/* Active Window Details */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-100">{selectedWindow.name}</span>
              {selectedWindow.typologyCriteriaBadge && (
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  isDeployable
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {selectedWindow.typologyCriteriaBadge}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
              {selectedWindow.desc}
            </p>
            <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500 mt-0.5">
              <span>VLT: <strong className="text-slate-300">{Math.round((selectedWindow.vlt || 0.6) * 100)}%</strong></span>
              <span>•</span>
              <span className={isDeployable ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {selectedWindow.deploymentTime}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
