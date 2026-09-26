import React, { useState, useEffect, useMemo } from 'react';
import { TypologySelector, type HousingTypology, type ThermalStrategy } from '../components/simulation/TypologySelector';
import { CommunityShelterViewer } from '../components/community/CommunityShelterViewer';
import { ResidentViewer } from '../components/residence/ResidentViewer';
import { ShelterScene3D } from '../components/shelter/ShelterScene3D';
import {
  EnvironmentSimulationPanel,
  type EnvironmentPresetId,
  type RenderEngineMode,
  type DataSourceMode,
  type ComfortTarget,
} from '../components/simulation/EnvironmentSimulationPanel';
import { ThermalPhysicsTelemetryCard } from '../components/simulation/ThermalPhysicsTelemetryCard';
import { type MaterialDef, getDefaultMaterialsForTypology } from '../constants/materials';
import { calculateThermalTelemetry, ENVIRONMENT_CONFIGS } from '../utils/thermalPhysics';
import { fetchLiveSimulationTelemetry } from '../api/simulationClient';
import type { ColorSchemeId, RenderMode as ShelterRenderMode } from '../types/shelter';
import {
  Building2,
  Home,
  Tent,
  Activity,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SimulationPage() {
  // Step state: false = typology/strategy options screen; true = 3D simulation screen
  const [isSimulating, setIsSimulating] = useState(false);

  // Selected Options from first screen
  const [selectedTypology, setSelectedTypology] = useState<HousingTypology>('emergency');
  const [selectedStrategy, setSelectedStrategy] = useState<ThermalStrategy>('rejection');

  // Environmental Simulation State (matching Image 1)
  const [dataSource, setDataSource] = useState<DataSourceMode>('presets');
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentPresetId>('daylight');
  const [renderMode, setRenderMode] = useState<RenderEngineMode>('pbr');
  const [comfortTarget, setComfortTarget] = useState<ComfortTarget>('normal');

  // Structural Assembly Materials State - auto-initialized from typology defaults
  const initialMaterials = getDefaultMaterialsForTypology('emergency');
  const [selectedRoof, setSelectedRoof] = useState<MaterialDef>(initialMaterials.roof);
  const [selectedWall, setSelectedWall] = useState<MaterialDef>(initialMaterials.wall);
  const [selectedWindow, setSelectedWindow] = useState<MaterialDef>(initialMaterials.window);

  // UI Overlays visibility toggle (allows 100% pure 3D view or full telemetry HUD)
  const [showHUD, setShowHUD] = useState<boolean>(true);

  // Live weather telemetry state from backend
  const [liveWeather, setLiveWeather] = useState<{ ambientTemp: number; solarRadiation: number } | undefined>(undefined);

  // Auto-set recommended materials when typology changes
  useEffect(() => {
    const targetTypology = selectedTypology === 'resident' ? 'resident' : selectedTypology === 'community' ? 'community' : 'emergency';
    const defaults = getDefaultMaterialsForTypology(targetTypology);
    setSelectedRoof(defaults.roof);
    setSelectedWall(defaults.wall);
    setSelectedWindow(defaults.window);
  }, [selectedTypology]);

  // Fetch live telemetry when in 'live' data source mode
  useEffect(() => {
    if (dataSource === 'live') {
      let isMounted = true;
      fetchLiveSimulationTelemetry(34.1526, 77.5771, selectedTypology, {
        structural: selectedWall.id,
        roofing: selectedRoof.id,
        glazing: selectedWindow.id,
      }, comfortTarget).then((result) => {
        if (isMounted && result) {
          setLiveWeather({
            ambientTemp: result.ambientOutside,
            solarRadiation: 600,
          });
        }
      });
      return () => {
        isMounted = false;
      };
    } else {
      setLiveWeather(undefined);
    }
  }, [dataSource, selectedTypology, selectedWall.id, selectedRoof.id, selectedWindow.id, comfortTarget]);

  // Compute thermal physics telemetry dynamically with window physics & comfort target
  const telemetry = useMemo(() => {
    return calculateThermalTelemetry(selectedEnvironment, selectedRoof, selectedWall, selectedWindow, liveWeather, comfortTarget);
  }, [selectedEnvironment, selectedRoof, selectedWall, selectedWindow, liveWeather, comfortTarget]);

  const handleStartSimulation = () => {
    setIsSimulating(true);
  };

  const handleBackToSelector = () => {
    setIsSimulating(false);
  };

  const handleSwitchTypology = (typology: HousingTypology) => {
    setSelectedTypology(typology);
    const targetTypology = typology === 'resident' ? 'resident' : typology === 'community' ? 'community' : 'emergency';
    const defaults = getDefaultMaterialsForTypology(targetTypology);
    setSelectedRoof(defaults.roof);
    setSelectedWall(defaults.wall);
    setSelectedWindow(defaults.window);
  };

  // Convert environment to Three.js lighting & sun params
  const envConfig = ENVIRONMENT_CONFIGS[selectedEnvironment];

  // Map materials & render engine to Emergency ShelterScene3D props
  const shelterRenderMode: ShelterRenderMode =
    renderMode === 'wireframe'
      ? 'wireframe'
      : renderMode === 'xray'
      ? 'xray'
      : renderMode === 'thermal'
      ? 'thermal'
      : 'studio';

  const shelterColorScheme: ColorSchemeId =
    selectedRoof.id === 'low_e_alu' || selectedRoof.id === 'cool_roof'
      ? 'arctic-white'
      : selectedWall.id === 'hempcrete' || selectedWall.id === 'hollow_polymer'
      ? 'desert-sand'
      : selectedRoof.id === 'solar_absorbent'
      ? 'olive-warm'
      : 'arctic-white';

  // 1. FIRST SCREEN: TYPOLOGY & THERMAL STRATEGY SELECTOR
  if (!isSimulating) {
    return (
      <div className="flex-1 w-full relative bg-transparent flex flex-col items-center pt-28 pb-24 overflow-y-auto scrollbar-hide select-none px-4 md:px-8">
        {/* Page Hero Header matching ThermoShelter Theme */}
        <div className="text-center space-y-4 animate-in fade-in duration-700 z-10 mb-10 px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF5722]/10 border border-[#FF5722]/30 text-xs font-semibold text-[#FF5722] mb-1 backdrop-blur-md shadow-sm">
            <Activity size={14} className="text-[#FF5722] animate-pulse" />
            <span className="font-mono tracking-wider">3D BIOCLIMATIC SIMULATION</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight hero-heading pb-1 leading-[1.15]">
            Synthesize Architecture
          </h1>

          <p className="text-white/80 text-base md:text-xl font-medium max-w-2xl mx-auto leading-relaxed text-balance">
            Select a structural typology and thermodynamic bioclimatic strategy to synthesize your passive shelter.
          </p>
        </div>

        {/* Typology & Strategy Configuration Card */}
        <div className="w-full max-w-5xl relative z-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <TypologySelector
            selectedTypology={selectedTypology}
            onSelectTypology={setSelectedTypology}
            selectedStrategy={selectedStrategy}
            onSelectStrategy={setSelectedStrategy}
            onSynthesize={handleStartSimulation}
          />
        </div>
      </div>
    );
  }

  // 2. 3D SIMULATION SCREEN (Active across all 3 models with live Environmental Simulation & Telemetry)
  return (
    <div className="flex-1 w-full h-full min-h-0 bg-transparent relative overflow-hidden flex flex-col select-none">
      {/* ── FLOATING OVERLAYS (Shown when showHUD is true) ── */}
      {showHUD && (
        <>
          {/* Left Floating Panel: Environment Simulation & Structural Assembly */}
          <div className="absolute top-4 left-4 z-30 pointer-events-auto max-h-[calc(100vh-32px)] overflow-y-auto scrollbar-hide animate-in fade-in slide-in-from-left-4 duration-300">
            <EnvironmentSimulationPanel
              dataSource={dataSource}
              onToggleDataSource={setDataSource}
              selectedEnvironment={selectedEnvironment}
              onSelectEnvironment={setSelectedEnvironment}
              renderMode={renderMode}
              onSelectRenderMode={setRenderMode}
              selectedRoof={selectedRoof}
              onSelectRoof={setSelectedRoof}
              selectedWall={selectedWall}
              onSelectWall={setSelectedWall}
              selectedWindow={selectedWindow}
              onSelectWindow={setSelectedWindow}
              comfortTarget={comfortTarget}
              onSelectComfortTarget={setComfortTarget}
              activeTypology={selectedTypology === 'resident' ? 'resident' : selectedTypology === 'community' ? 'community' : 'emergency'}
              onBack={handleBackToSelector}
            />
          </div>

          {/* Right Floating Card: Thermal Physics Telemetry */}
          <div className="absolute top-4 right-4 z-30 pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <ThermalPhysicsTelemetryCard
              telemetry={telemetry}
              isLive={dataSource === 'live'}
            />
          </div>
        </>
      )}

      {/* ── COMPACT FLOATING CONTROLS: Typology Switcher & HUD Toggle ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Quick Typology Switcher */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-white/10 backdrop-blur-md shadow-lg">
          <button
            onClick={() => handleSwitchTypology('emergency')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedTypology === 'emergency'
                ? 'bg-[#FF5722]/20 text-[#FF5722] border border-[#FF5722]/50 shadow-[0_0_15px_rgba(255,87,34,0.3)] font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Tent className={`w-3.5 h-3.5 ${selectedTypology === 'emergency' ? 'text-[#FF5722]' : 'text-slate-400'}`} />
            <span>Emergency</span>
          </button>

          <button
            onClick={() => handleSwitchTypology('resident')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedTypology === 'resident'
                ? 'bg-[#FF5722]/20 text-[#FF5722] border border-[#FF5722]/50 shadow-[0_0_15px_rgba(255,87,34,0.3)] font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="Switch to Family Residence Model"
          >
            <Home className={`w-3.5 h-3.5 ${selectedTypology === 'resident' ? 'text-[#FF5722]' : 'text-slate-400'}`} />
            <span>Resident</span>
          </button>

          <button
            onClick={() => handleSwitchTypology('community')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedTypology === 'community'
                ? 'bg-[#FF5722]/20 text-[#FF5722] border border-[#FF5722]/50 shadow-[0_0_15px_rgba(255,87,34,0.3)] font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="Switch to Terran Bioclimatic Duplex Community Model"
          >
            <Building2 className={`w-3.5 h-3.5 ${selectedTypology === 'community' ? 'text-[#FF5722]' : 'text-slate-400'}`} />
            <span>Duplex</span>
          </button>
        </div>

        {/* HUD Visibility Toggle */}
        <button
          onClick={() => setShowHUD(!showHUD)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all shadow-lg cursor-pointer ${
            showHUD
              ? 'bg-[#FF5722]/20 text-[#FF5722] border-[#FF5722]/50 shadow-[0_0_15px_rgba(255,87,34,0.3)]'
              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-white/10'
          }`}
          title={showHUD ? 'Hide Environmental & Telemetry Overlays' : 'Show Environmental & Telemetry Overlays'}
        >
          {showHUD ? <Eye className="w-3.5 h-3.5 text-[#FF5722]" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── PURE 3D CANVAS VIEWPORT (Full-bleed, sky is the background) ── */}
      <main className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
        {selectedTypology === 'emergency' && (
          <ShelterScene3D
            shelterType="emergency"
            colorScheme={shelterColorScheme}
            renderMode={shelterRenderMode}
            explodedProgress={0}
            roofRemoved={false}
            showDimensions={false}
            showHotspots={false}
            selectedHotspotId={null}
            onSelectHotspot={() => {}}
            cameraPreset="hero"
            interiorLightsOn={selectedEnvironment !== 'night'}
            interiorLightMode={selectedEnvironment === 'night' ? 'emergency' : 'warm'}
            environment={selectedEnvironment}
          />
        )}

        {selectedTypology === 'resident' && (
          <ResidentViewer
            thermalStrategy={selectedStrategy}
            timeOfDayHours={selectedEnvironment === 'night' ? 22.0 : envConfig.sunElevation > 70 ? 13.5 : 12.0}
            season={selectedEnvironment === 'arctic' ? 'winter_solstice' : selectedEnvironment === 'desert' ? 'summer_solstice' : 'equinox'}
            environment={selectedEnvironment}
            renderMode={renderMode}
          />
        )}

        {selectedTypology === 'community' && (
          <CommunityShelterViewer
            thermalStrategy={selectedStrategy}
            sunAzimuth={envConfig.sunAzimuth}
            sunElevation={envConfig.sunElevation}
            shadingMode={
              renderMode === 'wireframe'
                ? 'wireframe'
                : renderMode === 'xray'
                ? 'xray'
                : renderMode === 'thermal'
                ? 'thermal'
                : 'studio'
            }
            materialScheme={selectedRoof.id === 'solar_absorbent' ? 'basalt-monolith' : selectedRoof.id === 'low_e_alu' ? 'limestone-coastal' : 'terracotta-earth'}
            environment={selectedEnvironment}
          />
        )}
      </main>
    </div>
  );
}
