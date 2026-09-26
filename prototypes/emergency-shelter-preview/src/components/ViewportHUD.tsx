import React from 'react';
import {
  Eye,
  Sliders,
  Sun,
  Flame,
  Grid,
  RotateCcw,
  Compass,
  Layers,
  Ruler,
  Maximize2,
  Lightbulb,
} from 'lucide-react';
import { ColorSchemeId, RenderMode } from '../types/shelter';

interface ViewportHUDProps {
  colorScheme: ColorSchemeId;
  onChangeColorScheme: (scheme: ColorSchemeId) => void;
  renderMode: RenderMode;
  onChangeRenderMode: (mode: RenderMode) => void;
  explodedProgress: number;
  onChangeExplodedProgress: (val: number) => void;
  roofRemoved: boolean;
  onToggleRoof: () => void;
  showDimensions: boolean;
  onToggleDimensions: () => void;
  showHotspots: boolean;
  onToggleHotspots: () => void;
  cameraPreset: 'hero' | 'south' | 'east' | 'roof' | 'interior';
  onChangeCameraPreset: (preset: 'hero' | 'south' | 'east' | 'roof' | 'interior') => void;
  onResetView: () => void;
  interiorLightsOn?: boolean;
  onToggleInteriorLights?: () => void;
  interiorLightMode?: 'warm' | 'daylight' | 'emergency';
  onChangeInteriorLightMode?: (mode: 'warm' | 'daylight' | 'emergency') => void;
}

export const ViewportHUD: React.FC<ViewportHUDProps> = ({
  colorScheme,
  onChangeColorScheme,
  renderMode,
  onChangeRenderMode,
  explodedProgress,
  onChangeExplodedProgress,
  roofRemoved,
  onToggleRoof,
  showDimensions,
  onToggleDimensions,
  showHotspots,
  onToggleHotspots,
  cameraPreset,
  onChangeCameraPreset,
  onResetView,
  interiorLightsOn = true,
  onToggleInteriorLights,
  interiorLightMode = 'warm',
  onChangeInteriorLightMode,
}) => {
  return (
    <>
      {/* Top Floating Bar: View Presets & Render Modes */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-10">
        {/* Camera Elevation Presets */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-700/60 pointer-events-auto shadow-lg">
          <button
            onClick={() => onChangeCameraPreset('hero')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              cameraPreset === 'hero' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            3/4 Axonometric
          </button>
          <button
            onClick={() => onChangeCameraPreset('south')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              cameraPreset === 'south' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            South Elevation
          </button>
          <button
            onClick={() => onChangeCameraPreset('east')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              cameraPreset === 'east' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            East Profile (15°)
          </button>
          <button
            onClick={() => onChangeCameraPreset('roof')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              cameraPreset === 'roof' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Roof Plan
          </button>
          <button
            onClick={() => onChangeCameraPreset('interior')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              cameraPreset === 'interior' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Interior View
          </button>
        </div>

        {/* Render Shading Engine Mode */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-700/60 pointer-events-auto shadow-lg">
          <button
            onClick={() => onChangeRenderMode('studio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              renderMode === 'studio' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Photorealistic Octane-Style Studio PBR"
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>PBR Studio</span>
          </button>
          <button
            onClick={() => onChangeRenderMode('thermal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              renderMode === 'thermal' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="FLIR Thermal Infrared Inspection Mode"
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>Thermal IR</span>
          </button>
          <button
            onClick={() => onChangeRenderMode('wireframe')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              renderMode === 'wireframe' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Watertight Manifold CAD Mesh Wireframe"
          >
            <Grid className="w-3.5 h-3.5 text-emerald-400" />
            <span>CAD Mesh</span>
          </button>
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-10">
        {/* Exploded View Slider & Toggles */}
        <div className="flex items-center gap-4 px-4 py-2 bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/60 pointer-events-auto shadow-xl">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-medium text-slate-300 whitespace-nowrap">Exploded View</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={explodedProgress}
              onChange={e => onChangeExplodedProgress(parseFloat(e.target.value))}
              className="w-28 accent-sky-500 cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-400 w-8 tabular-nums">
              {Math.round(explodedProgress * 100)}%
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Roof Cutaway Toggle */}
          <button
            onClick={onToggleRoof}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              roofRemoved ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {roofRemoved ? 'Restore Roof' : 'Cutaway Roof'}
          </button>

          {/* Dimension Lines Toggle */}
          <button
            onClick={onToggleDimensions}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              showDimensions ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Dimensions</span>
          </button>

          {/* Hotspots Toggle */}
          <button
            onClick={onToggleHotspots}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              showHotspots ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Callouts</span>
          </button>

          {/* Interior Lights Toggle & Mode Selector */}
          {onToggleInteriorLights && (
            <div className="flex items-center gap-1.5 pl-1">
              <button
                onClick={onToggleInteriorLights}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  interiorLightsOn
                    ? interiorLightMode === 'emergency'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : interiorLightMode === 'daylight'
                      ? 'bg-sky-400/20 text-sky-200 border border-sky-400/40'
                      : 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
                title="Toggle Interior LED Illumination"
              >
                <Lightbulb className={`w-3.5 h-3.5 ${interiorLightsOn ? (interiorLightMode === 'emergency' ? 'text-red-400' : 'text-amber-400') : 'text-slate-500'}`} />
                <span>{interiorLightsOn ? (interiorLightMode === 'emergency' ? 'Lights (Red)' : interiorLightMode === 'daylight' ? 'Lights (Day)' : 'Lights (Warm)') : 'Lights Off'}</span>
              </button>

              {interiorLightsOn && onChangeInteriorLightMode && (
                <div className="flex items-center bg-slate-800/90 rounded-md p-0.5 border border-slate-700/60">
                  <button
                    onClick={() => onChangeInteriorLightMode('warm')}
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                      interiorLightMode === 'warm' ? 'bg-amber-500/30 text-amber-200 font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Warm 3200K Architectural Ambient"
                  >
                    3200K
                  </button>
                  <button
                    onClick={() => onChangeInteriorLightMode('daylight')}
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                      interiorLightMode === 'daylight' ? 'bg-sky-500/30 text-sky-200 font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Daylight 5000K Inspection White"
                  >
                    5000K
                  </button>
                  <button
                    onClick={() => onChangeInteriorLightMode('emergency')}
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                      interiorLightMode === 'emergency' ? 'bg-red-500/30 text-red-200 font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Tactical Emergency Low-Lux Red"
                  >
                    Red
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Material Scheme Selector */}
        <div className="flex items-center gap-2 p-1 bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/60 pointer-events-auto shadow-xl">
          <span className="text-xs text-slate-400 pl-2">Finish:</span>
          <button
            onClick={() => onChangeColorScheme('olive-warm')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              colorScheme === 'olive-warm' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Matte Olive-Drab & Warm White"
          >
            Olive & Warm White
          </button>
          <button
            onClick={() => onChangeColorScheme('arctic-white')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              colorScheme === 'arctic-white' ? 'bg-slate-800 text-white border border-slate-600' : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Arctic High-Albedo -40°C Package"
          >
            Arctic Freeze
          </button>
          <button
            onClick={() => onChangeColorScheme('desert-sand')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              colorScheme === 'desert-sand' ? 'bg-amber-950 text-amber-300 border border-amber-700/60' : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Desert Sand Solar Barrier"
          >
            Khaki Sand
          </button>
          <button
            onClick={() => onChangeColorScheme('treated-bamboo')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              colorScheme === 'treated-bamboo' ? 'bg-yellow-950 text-yellow-300 border border-yellow-700/60' : 'text-slate-300 hover:bg-slate-800'
            }`}
            title="Archetype 1 Modular Bamboo Alternative"
          >
            Modular Bamboo
          </button>
        </div>
      </div>
    </>
  );
};
