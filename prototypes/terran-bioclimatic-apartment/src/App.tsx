import React, { useState } from 'react';
import {
  ApartmentHotspot,
  APARTMENT_HOTSPOTS,
  CameraPreset,
  MaterialSchemeId,
  MATERIAL_SCHEMES,
  ShadingMode,
  APARTMENT_UNITS,
  APARTMENT_ROOMS,
  ApartmentUnit,
  ApartmentRoom,
} from './data/apartmentData';
import { ApartmentScene3D } from './components/ApartmentScene3D';
import { SOLAR_PRESETS } from './utils/solar';
import {
  Sun,
  Layers,
  Compass,
  Thermometer,
  Ruler,
  Wind,
  Info,
  X,
  Upload,
  RotateCcw,
  Check,
  Home,
  Building,
  FileText,
  Eye,
  ChevronRight,
  Maximize2,
} from 'lucide-react';

export default function App() {
  // Visualization State
  const [shadingMode, setShadingMode] = useState<ShadingMode>('studio');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('hero');
  const [materialScheme, setMaterialScheme] = useState<MaterialSchemeId>('terracotta-earth');
  const [explodedProgress, setExplodedProgress] = useState<number>(0);

  // Overlay Toggles
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showAirflow, setShowAirflow] = useState<boolean>(false);
  const [showRoomLabels, setShowRoomLabels] = useState<boolean>(false);

  // Residential Program & Apartment Selection
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<ApartmentRoom | null>(null);
  const [activeFloor, setActiveFloor] = useState<'all' | 0 | 1 | 2 | 3>('all');
  const [isProgramModalOpen, setIsProgramModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'units' | 'hotspots'>('units');

  // Solar Geometry State
  const [sunAzimuth, setSunAzimuth] = useState<number>(180); // Noon South
  const [sunElevation, setSunElevation] = useState<number>(55); // 55° cut-off benchmark

  // Hotspot Drawer
  const [selectedHotspot, setSelectedHotspot] = useState<ApartmentHotspot | null>(
    APARTMENT_HOTSPOTS[0]
  );
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  // Model Asset Loader Modal
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [customModelUrl, setCustomModelUrl] = useState<string>('');
  const [activeModelUrl, setActiveModelUrl] = useState<string | undefined>(undefined);

  const currentSchemeData = MATERIAL_SCHEMES[materialScheme];
  const selectedUnit = APARTMENT_UNITS.find((u) => u.id === selectedUnitId) || null;

  const handleSelectSolarPreset = (az: number, el: number) => {
    setSunAzimuth(az);
    setSunElevation(el);
  };

  const handleSelectUnit = (unitId: string | null) => {
    setSelectedUnitId(unitId);
    setSelectedRoom(null);
    if (unitId) {
      const u = APARTMENT_UNITS.find((item) => item.id === unitId);
      if (u) {
        setActiveFloor(u.floor);
      }
      setActiveTab('units');
      setIsInspectorOpen(true);
    }
  };

  const resetAll = () => {
    setShadingMode('studio');
    setCameraPreset('hero');
    setMaterialScheme('terracotta-earth');
    setExplodedProgress(0);
    setSunAzimuth(180);
    setSunElevation(55);
    setShowHotspots(true);
    setShowDimensions(true);
    setShowAirflow(false);
    setShowRoomLabels(false);
    setSelectedUnitId(null);
    setSelectedRoom(null);
    setActiveFloor('all');
    setSelectedHotspot(APARTMENT_HOTSPOTS[0]);
    setActiveModelUrl(undefined);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* 1. TOP BAR CONTRACT: Single text Brand Zone, Metadata Prose, Primary Actions */}
      <header className="relative z-20 h-14 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800/80 px-6 flex items-center justify-between shrink-0 select-none">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold tracking-tight text-neutral-50">
              Terran Bioclimatic
            </span>
            <span className="text-xs uppercase tracking-wider text-amber-500 font-mono">
              6 Residential Apartments
            </span>
          </div>

          {/* Architectural Metadata (Clean unboxed text, no pills) */}
          <div className="hidden 2xl:flex items-center gap-2 text-xs text-neutral-400 font-mono">
            <span>14.0 × 10.0 m</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>3 Stories (+10.5 m)</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>3.0 m Core Atrium</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-amber-400">6 Units (477.6 m² Usable)</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-emerald-400">0 Mechanical Cooling</span>
          </div>
        </div>

        {/* Zone 2: Shading Mode Segmented Controls */}
        <div className="flex items-center gap-1 bg-neutral-950/80 p-1 rounded-lg border border-neutral-800">
          <button
            onClick={() => setShadingMode('studio')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
              shadingMode === 'studio'
                ? 'bg-amber-600/90 text-white shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Studio PBR</span>
          </button>

          <button
            onClick={() => setShadingMode('thermal')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
              shadingMode === 'thermal'
                ? 'bg-rose-600 text-white shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>Thermal Mode</span>
          </button>

          <button
            onClick={() => setShadingMode('wireframe')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
              shadingMode === 'wireframe'
                ? 'bg-neutral-800 text-amber-400 shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Wireframe CAD</span>
          </button>
        </div>

        {/* Zone 3: Primary Utility Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsProgramModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/70 rounded-md transition-colors flex items-center gap-1.5"
            title="Open Residential Program Schedule Sheet"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Program Sheet</span>
          </button>

          <button
            onClick={() => setIsModelModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 rounded-md transition-colors flex items-center gap-1.5"
            title="Import external GLTF/GLB model"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GLTF Asset</span>
          </button>

          <button
            onClick={resetAll}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 bg-neutral-800/40 hover:bg-neutral-800 rounded-md transition-colors"
            title="Reset View and Parameters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. SUB-HEADER: 6 RESIDENTIAL APARTMENTS SELECTOR STRIP */}
      <nav className="relative z-10 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800/90 px-6 py-2 flex items-center justify-between text-xs select-none overflow-x-auto gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono uppercase text-[10px] tracking-wider text-neutral-400 font-semibold flex items-center gap-1">
            <Building className="w-3 h-3 text-amber-500" />
            6 Residential Units:
          </span>

          {/* All Building Button */}
          <button
            onClick={() => handleSelectUnit(null)}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 font-medium ${
              selectedUnitId === null
                ? 'bg-neutral-800 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
            }`}
          >
            <span>Complete Building</span>
          </button>
        </div>

        {/* 6 Apartment Unit Chips */}
        <div className="flex items-center gap-1.5 shrink-0">
          {APARTMENT_UNITS.map((unit) => {
            const isSelected = selectedUnitId === unit.id;
            return (
              <button
                key={unit.id}
                onClick={() => handleSelectUnit(unit.id)}
                className={`px-2.5 py-1 rounded-md text-xs transition-all flex items-center gap-1.5 border font-mono ${
                  isSelected
                    ? 'bg-amber-600 text-white border-amber-400 font-bold shadow-md'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100'
                }`}
                title={`${unit.name} - Floor L${unit.floor} - ${unit.approximateArea} m² usable`}
              >
                <span className="font-semibold text-amber-300">{unit.id}</span>
                <span className="text-[11px] opacity-80">
                  {unit.type} · {unit.approximateArea} m²
                </span>
                {unit.balconyArea && (
                  <span className="text-[10px] text-amber-200/70 font-sans hidden lg:inline">
                    +Balc
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Room Overlays Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white cursor-pointer">
            <input
              type="checkbox"
              checked={showRoomLabels}
              onChange={(e) => setShowRoomLabels(e.target.checked)}
              className="rounded border-neutral-700 bg-neutral-800 accent-amber-500"
            />
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>3D Room Overlays</span>
            </span>
          </label>
        </div>
      </nav>

      {/* 3. MAIN 3D VIEWPORT & HUD OVERLAYS */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {/* Three.js Canvas Root */}
        <ApartmentScene3D
          modelUrl={activeModelUrl}
          explodedProgress={explodedProgress}
          shadingMode={shadingMode}
          materialScheme={materialScheme}
          cameraPreset={cameraPreset}
          showHotspots={showHotspots}
          showDimensions={showDimensions}
          showAirflow={showAirflow}
          showRoomLabels={showRoomLabels}
          selectedUnitId={selectedUnitId}
          activeFloor={activeFloor}
          sunAzimuth={sunAzimuth}
          sunElevation={sunElevation}
          selectedHotspotId={selectedHotspot?.id}
          onSelectHotspot={(hs) => {
            setSelectedHotspot(hs);
            setActiveTab('hotspots');
            setIsInspectorOpen(true);
          }}
          onSelectUnit={(uid) => {
            handleSelectUnit(uid);
          }}
          onSelectRoom={(room) => {
            setSelectedRoom(room);
            if (room && room.unitId !== 'shared') {
              setSelectedUnitId(room.unitId);
              setActiveTab('units');
              setIsInspectorOpen(true);
            }
          }}
        />

        {/* LEFT HUD: Camera Presets, Exploded View, Floor Slicer */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-3 max-w-[280px] select-none pointer-events-auto">
          {/* Floor Level Isolator / Slicer */}
          <div className="bg-neutral-900/85 backdrop-blur-md border border-neutral-800/80 rounded-xl p-3.5 shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-xs font-semibold text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-500" />
                Floor Level Cutaway
              </span>
              <span className="font-mono text-[10px] text-neutral-400">
                {activeFloor === 'all' ? 'All Stories' : `Floor ${activeFloor}`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'all', label: 'All Levels' },
                { id: 0, label: 'L0 Ground (A01/A02)' },
                { id: 1, label: 'L1 Middle (B01/B02)' },
                { id: 2, label: 'L2 Penthouse (C01/C02)' },
                { id: 3, label: 'Roof Terrace' },
              ].map((fl) => (
                <button
                  key={fl.id.toString()}
                  onClick={() => setActiveFloor(fl.id as any)}
                  className={`px-2 py-1.5 text-xs font-medium rounded-lg text-left transition-all ${
                    activeFloor === fl.id
                      ? 'bg-amber-600 text-white font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                  } ${fl.id === 'all' ? 'col-span-2' : ''}`}
                >
                  {fl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Presets Panel */}
          <div className="bg-neutral-900/85 backdrop-blur-md border border-neutral-800/80 rounded-xl p-3.5 shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-xs font-semibold text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-500" />
                Architectural Viewpoint
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'hero', label: 'Hero Axon' },
                  { id: 'facade', label: 'South Solar' },
                  { id: 'atrium', label: 'Core Void' },
                  { id: 'roof', label: 'Roof Terrace' },
                  { id: 'street', label: 'Street Eye (1.7m)' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setCameraPreset(preset.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg text-left transition-all ${
                    cameraPreset === preset.id
                      ? 'bg-amber-600/90 text-white font-semibold shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                  } ${preset.id === 'street' ? 'col-span-2' : ''}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exploded View Control */}
          <div className="bg-neutral-900/85 backdrop-blur-md border border-neutral-800/80 rounded-xl p-3.5 shadow-xl">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                Exploded Deconstruction
              </span>
              <span className="font-mono text-amber-400 tabular-nums">
                {Math.round(explodedProgress * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={explodedProgress}
              onChange={(e) => setExplodedProgress(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-neutral-700 h-1.5 rounded-lg appearance-none cursor-pointer"
            />

            <div className="flex justify-between items-center text-[10px] text-neutral-500 mt-1 font-mono">
              <span>Integrated</span>
              <span>Deconstructed</span>
            </div>
          </div>

          {/* Layer Toggles Panel */}
          <div className="bg-neutral-900/85 backdrop-blur-md border border-neutral-800/80 rounded-xl p-3 shadow-xl">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Analytical Layers
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="flex items-center justify-between text-xs text-neutral-300 hover:text-neutral-100 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-amber-400" />
                  Building Dimensions
                </span>
                <input
                  type="checkbox"
                  checked={showDimensions}
                  onChange={(e) => setShowDimensions(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-800 accent-amber-500"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-neutral-300 hover:text-neutral-100 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  Bioclimatic Hotspots
                </span>
                <input
                  type="checkbox"
                  checked={showHotspots}
                  onChange={(e) => setShowHotspots(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-800 accent-amber-500"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-neutral-300 hover:text-neutral-100 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  Atrium Convective Airflow
                </span>
                <input
                  type="checkbox"
                  checked={showAirflow}
                  onChange={(e) => setShowAirflow(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-800 accent-amber-500"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-neutral-300 hover:text-neutral-100 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-amber-400" />
                  3D Room Layouts & Labels
                </span>
                <input
                  type="checkbox"
                  checked={showRoomLabels}
                  onChange={(e) => setShowRoomLabels(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-800 accent-amber-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* BOTTOM RIGHT: Solar Controls & Material Schemes */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-3 max-w-[320px] select-none pointer-events-auto">
          {/* Material Schemes Switcher */}
          <div className="bg-neutral-900/85 backdrop-blur-md border border-neutral-800/80 rounded-xl p-3.5 shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-xs font-semibold text-neutral-300">
              <span>Material Scheme</span>
              <span className="text-[11px] font-mono text-neutral-400">
                Lag: {currentSchemeData.thermalLagHours}h
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(MATERIAL_SCHEMES) as MaterialSchemeId[]).map((schemeId) => {
                const s = MATERIAL_SCHEMES[schemeId];
                const isActive = materialScheme === schemeId;
                return (
                  <button
                    key={schemeId}
                    onClick={() => setMaterialScheme(schemeId)}
                    className={`p-2 rounded-lg text-left transition-all border flex flex-col gap-1 ${
                      isActive
                        ? 'bg-neutral-800/90 border-amber-500/80 text-neutral-100 shadow'
                        : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/30"
                        style={{ backgroundColor: s.colors.wall }}
                      />
                      <span className="text-xs font-medium truncate">{s.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Solar Geometry Simulator */}
          <div className="bg-neutral-900/85 backdrop-blur-md border border-neutral-800/80 rounded-xl p-3.5 shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-xs font-semibold text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Solar Insolation Simulator
              </span>
              <span className="font-mono text-amber-400 text-[11px] tabular-nums">
                {sunElevation}° El / {sunAzimuth}° Az
              </span>
            </div>

            {/* Quick Seasonal Presets */}
            <div className="grid grid-cols-2 gap-1 mb-3">
              {SOLAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectSolarPreset(preset.azimuth, preset.elevation)}
                  className={`text-[10px] px-2 py-1 rounded border text-left truncate transition-colors ${
                    sunAzimuth === preset.azimuth && sunElevation === preset.elevation
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300 font-medium'
                      : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Elevation (Cut-off threshold: 55°)</span>
                  <span className="font-mono">{sunElevation}°</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="85"
                  value={sunElevation}
                  onChange={(e) => setSunElevation(parseInt(e.target.value))}
                  className="w-full accent-amber-500 bg-neutral-700 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Compass Azimuth (180° = South, 270° = West)</span>
                  <span className="font-mono">{sunAzimuth}°</span>
                </div>
                <input
                  type="range"
                  min="45"
                  max="315"
                  value={sunAzimuth}
                  onChange={(e) => setSunAzimuth(parseInt(e.target.value))}
                  className="w-full accent-amber-500 bg-neutral-700 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* TOP RIGHT: APARTMENT UNIT OR HOTSPOT INSPECTOR DRAWER */}
        {isInspectorOpen && (
          <div className="absolute top-4 right-4 z-10 w-[380px] max-h-[85vh] overflow-y-auto bg-neutral-900/95 backdrop-blur-md border border-neutral-800/90 rounded-2xl shadow-2xl p-4 select-none pointer-events-auto transition-all">
            {/* Tab switch: Selected Unit vs Bioclimatic Hotspots */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-1.5 bg-neutral-950/60 p-1 rounded-lg border border-neutral-800">
                <button
                  onClick={() => setActiveTab('units')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                    activeTab === 'units'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Home className="w-3 h-3" />
                  <span>Apartment Unit</span>
                </button>
                <button
                  onClick={() => setActiveTab('hotspots')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                    activeTab === 'hotspots'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Info className="w-3 h-3" />
                  <span>Passive Hotspot</span>
                </button>
              </div>

              <button
                onClick={() => setIsInspectorOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded transition-colors"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TAB 1: RESIDENTIAL APARTMENT UNIT INSPECTOR */}
            {activeTab === 'units' && (
              <div className="mt-3 space-y-3.5 text-xs">
                {selectedUnit ? (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                            Unit {selectedUnit.id}
                          </span>
                          <span className="text-neutral-300 font-medium">
                            Floor {selectedUnit.floor === 0 ? 'Ground L0' : `Level ${selectedUnit.floor}`}
                          </span>
                        </div>
                        <h4 className="font-display text-sm font-semibold text-neutral-100 mt-1">
                          {selectedUnit.name}
                        </h4>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-amber-400">
                          {selectedUnit.approximateArea} m²
                        </div>
                        <div className="text-[10px] text-neutral-400">Usable Area</div>
                      </div>
                    </div>

                    {/* Quick Metrics Bar */}
                    <div className="grid grid-cols-3 gap-2 bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800/80">
                      <div>
                        <span className="text-[10px] text-neutral-400 block">Unit Type</span>
                        <span className="font-mono font-semibold text-neutral-200">
                          {selectedUnit.type}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block">Balcony</span>
                        <span className="font-mono font-semibold text-amber-400">
                          {selectedUnit.balconyArea ? `${selectedUnit.balconyArea} m²` : 'Garden Int.'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block">Orientation</span>
                        <span className="text-[11px] font-medium text-neutral-200 truncate block">
                          {selectedUnit.orientation}
                        </span>
                      </div>
                    </div>

                    {/* Rooms Spatial Breakdown */}
                    <div>
                      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-neutral-800/70">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                          Spatial Program ({selectedUnit.rooms.length} Spaces)
                        </span>
                        <span className="text-[10px] text-neutral-500">Excl. Shared Atrium</span>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {selectedUnit.rooms.map((rm) => (
                          <div
                            key={rm.id}
                            className={`p-2 rounded-lg border transition-colors flex items-center justify-between ${
                              selectedRoom?.id === rm.id
                                ? 'bg-amber-950/50 border-amber-600'
                                : 'bg-neutral-950/40 border-neutral-800/60 hover:bg-neutral-800/40'
                            }`}
                          >
                            <div>
                              <div className="font-medium text-neutral-200 flex items-center gap-1.5">
                                <span>{rm.name}</span>
                                <span className="text-[9px] uppercase tracking-wider font-mono text-neutral-400 px-1 rounded bg-neutral-900 border border-neutral-800">
                                  {rm.privacy}
                                </span>
                              </div>
                              <div className="text-[10px] text-neutral-400 mt-0.5 flex items-center gap-2">
                                <span>Daylight: {rm.daylightPriority}</span>
                                <span>·</span>
                                <span className="text-cyan-400">Flow: {rm.ventilationPriority}</span>
                              </div>
                            </div>
                            <div className="font-mono text-xs font-semibold text-amber-400">
                              {rm.approxArea} m²
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Common Area Exclusion Notice */}
                    <div className="p-2.5 bg-neutral-950/50 rounded-lg border border-neutral-800 text-[11px] text-neutral-400 leading-relaxed font-sans">
                      <strong className="text-neutral-300 font-medium">Common Area Boundary:</strong> The central 3×3m buoyancy atrium, northern stair flights, and public circulation are common shared spaces and strictly excluded from this {selectedUnit.approximateArea} m² usable floor area.
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleSelectUnit(null)}
                        className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
                      >
                        Deselect Unit
                      </button>
                      <button
                        onClick={() => {
                          setShowRoomLabels(true);
                          setActiveFloor(selectedUnit.floor);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-900/50 hover:bg-amber-800/60 border border-amber-700/60 rounded-md transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Isolate Floor L{selectedUnit.floor}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-neutral-400">
                    <Building className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                    <p className="font-medium text-neutral-300">No Unit Selected</p>
                    <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                      Click any of the 6 apartment buttons in the navigation bar or click inside any room in the 3D visualizer to inspect its layout schedule.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-4 max-w-xs mx-auto">
                      {APARTMENT_UNITS.slice(0, 4).map((u) => (
                        <button
                          key={u.id}
                          onClick={() => handleSelectUnit(u.id)}
                          className="px-2 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-neutral-300 hover:bg-neutral-800 text-xs font-mono"
                        >
                          {u.id} ({u.approximateArea} m²)
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: BIOCLIMATIC TECHNICAL HOTSPOT */}
            {activeTab === 'hotspots' && selectedHotspot && (
              <div className="mt-3 space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-amber-500 font-semibold">
                    Passive Technical Feature
                  </span>
                  <h3 className="text-sm font-semibold text-neutral-100 font-display mt-0.5">
                    {selectedHotspot.title}
                  </h3>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  {selectedHotspot.description}
                </p>

                <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-2.5">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mb-1">
                    Thermodynamic & Solar Principle
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                    {selectedHotspot.technicalPrinciple}
                  </p>
                </div>

                {selectedHotspot.metrics && (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedHotspot.metrics.map((m, idx) => (
                      <div
                        key={idx}
                        className="bg-neutral-950/40 border border-neutral-800/60 p-2 rounded"
                      >
                        <span className="text-[10px] text-neutral-400 block truncate">
                          {m.label}
                        </span>
                        <span className="text-xs font-mono font-semibold text-amber-400">
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hotspot carousel dots */}
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-neutral-500 font-mono">
                    Hotspot {APARTMENT_HOTSPOTS.findIndex((h) => h.id === selectedHotspot.id) + 1} of{' '}
                    {APARTMENT_HOTSPOTS.length}
                  </span>

                  <div className="flex gap-1">
                    {APARTMENT_HOTSPOTS.map((hs) => (
                      <button
                        key={hs.id}
                        onClick={() => setSelectedHotspot(hs)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          hs.id === selectedHotspot.id
                            ? 'bg-amber-500 w-4'
                            : 'bg-neutral-700 hover:bg-neutral-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Quick Tab to Re-open Inspector if closed */}
        {!isInspectorOpen && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-auto">
            {selectedUnitId ? (
              <button
                onClick={() => {
                  setActiveTab('units');
                  setIsInspectorOpen(true);
                }}
                className="bg-neutral-900/90 backdrop-blur-md border border-neutral-800 px-3 py-2 rounded-lg text-xs font-medium text-amber-400 hover:text-amber-300 shadow-xl flex items-center gap-2"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Unit {selectedUnitId} ({selectedUnit?.approximateArea} m²)</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setActiveTab('hotspots');
                  setIsInspectorOpen(true);
                }}
                className="bg-neutral-900/90 backdrop-blur-md border border-neutral-800 px-3 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white shadow-xl flex items-center gap-2"
              >
                <Info className="w-3.5 h-3.5 text-amber-400" />
                <span>Passive Inspector</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* 4. RESIDENTIAL PROGRAM SCHEDULE MODAL */}
      {isProgramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-amber-500 font-semibold">
                  Architectural Program Specification
                </span>
                <h2 className="font-display font-bold text-xl text-neutral-100 mt-0.5">
                  Terran Bioclimatic Apartment: 6-Unit Residential Schedule
                </h2>
              </div>
              <button
                onClick={() => setIsProgramModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-200 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Program Area Totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
                <span className="text-[11px] text-neutral-400 block">Total Residential Units</span>
                <span className="text-xl font-mono font-bold text-amber-400">6 Units</span>
                <span className="text-[10px] text-neutral-500 block">2 per floor (L0, L1, L2)</span>
              </div>
              <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
                <span className="text-[11px] text-neutral-400 block">Total Usable Net Area</span>
                <span className="text-xl font-mono font-bold text-neutral-100">477.6 m²</span>
                <span className="text-[10px] text-emerald-400 block">Excluding common areas</span>
              </div>
              <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
                <span className="text-[11px] text-neutral-400 block">Cantilever Balconies</span>
                <span className="text-xl font-mono font-bold text-amber-400">37.2 m²</span>
                <span className="text-[10px] text-neutral-500 block">Deep solar cut-off shading</span>
              </div>
              <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
                <span className="text-[11px] text-neutral-400 block">Mechanical HVAC Load</span>
                <span className="text-xl font-mono font-bold text-emerald-400">0.0 W</span>
                <span className="text-[10px] text-emerald-500/80 block">100% Passive Geometry</span>
              </div>
            </div>

            {/* 6 Apartments Master Table */}
            <div className="border border-neutral-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 text-neutral-400 font-mono text-[11px] uppercase border-b border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Floor</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Usable Area</th>
                    <th className="py-2.5 px-3">Balcony</th>
                    <th className="py-2.5 px-3">Orientation</th>
                    <th className="py-2.5 px-3">Passive Cooling Role</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/70">
                  {APARTMENT_UNITS.map((unit) => (
                    <tr key={unit.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">{unit.id}</td>
                      <td className="py-3 px-3 text-neutral-300">
                        {unit.floor === 0 ? 'Ground L0' : `Level ${unit.floor}`}
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-200">{unit.type}</td>
                      <td className="py-3 px-3 font-mono font-semibold text-neutral-100">
                        {unit.approximateArea} m²
                      </td>
                      <td className="py-3 px-3 font-mono text-amber-400">
                        {unit.balconyArea ? `${unit.balconyArea} m²` : '—'}
                      </td>
                      <td className="py-3 px-3 text-neutral-300">{unit.orientation}</td>
                      <td className="py-3 px-3 text-neutral-400 max-w-xs truncate">
                        {unit.floor === 0
                          ? 'Dense basalt heat sink coupling + ground air intake'
                          : unit.floor === 1
                          ? '1.5m balcony overhang cut-off + West terracotta Jaali screen'
                          : 'High clerestory stack chimney exhaust + reflective roof terrace'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            handleSelectUnit(unit.id);
                            setIsProgramModalOpen(false);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium bg-amber-600/80 hover:bg-amber-600 text-white rounded transition-colors"
                        >
                          View 3D
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Common Areas & Central Atrium Separation Note */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 space-y-2 text-xs text-neutral-300">
              <h4 className="font-semibold text-neutral-100 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-amber-500" />
                Shared Common Areas (Explicitly Excluded from Apartment Usable Areas)
              </h4>
              <p className="text-neutral-400 leading-relaxed">
                As required by the bioclimatic brief, all shared architectural and environmental circulation elements are common zones:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <li className="bg-neutral-900 p-2 rounded border border-neutral-800">
                  <span className="text-amber-400 font-semibold">Central Atrium Void:</span> 3.0 × 3.0 m (27 m² vertical column)
                </li>
                <li className="bg-neutral-900 p-2 rounded border border-neutral-800">
                  <span className="text-amber-400 font-semibold">Dedicated Stair Core:</span> North of Atrium (27.9 m² total)
                </li>
                <li className="bg-neutral-900 p-2 rounded border border-neutral-800">
                  <span className="text-amber-400 font-semibold">Reflective Roof Terrace:</span> 135.0 m² lime plaster slab
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 5. GLTF MODEL URL MODAL */}
      {isModelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <h3 className="font-display font-bold text-base text-neutral-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-500" />
                Load External GLTF/GLB Asset
              </h3>
              <button
                onClick={() => setIsModelModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Supply an external <code className="text-amber-400 font-mono">.gltf</code> or{' '}
              <code className="text-amber-400 font-mono">.glb</code> model URL. The material pipeline will
              automatically re-assign PBR rammed-earth, terracotta, concrete, and low-iron glass materials.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="https://example.com/models/passive_apartment.glb"
                value={customModelUrl}
                onChange={(e) => setCustomModelUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200 focus:outline-none focus:border-amber-500 font-mono"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setActiveModelUrl(undefined);
                    setIsModelModalOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
                >
                  Use Procedural Model
                </button>

                <button
                  onClick={() => {
                    if (customModelUrl.trim()) {
                      setActiveModelUrl(customModelUrl.trim());
                      setIsModelModalOpen(false);
                    }
                  }}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Load Model
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
