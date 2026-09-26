import React, { useState } from 'react';
import { ShelterScene3D } from './components/ShelterScene3D';
import { ViewportHUD } from './components/ViewportHUD';
import { HotspotDetailCard } from './components/HotspotDetailCard';
import { TopBar } from './components/TopBar';
import { ThermalSimulator } from './components/ThermalSimulator';
import { BOMView } from './components/BOMView';
import { AssemblyGuide } from './components/AssemblyGuide';
import { ExportModal } from './components/ExportModal';
import { ColorSchemeId, RenderMode, HotspotInfo } from './types/shelter';
import { HOTSPOTS } from './data/shelterData';
import { ShieldCheck, Maximize, Ruler, Sparkles, Layers, Box } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'inspector' | 'thermal' | 'bom' | 'assembly'>('inspector');
  const [colorScheme, setColorScheme] = useState<ColorSchemeId>('olive-warm');
  const [renderMode, setRenderMode] = useState<RenderMode>('studio');
  const [explodedProgress, setExplodedProgress] = useState<number>(0);
  const [roofRemoved, setRoofRemoved] = useState<boolean>(false);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotInfo | null>(HOTSPOTS[0]);
  const [cameraPreset, setCameraPreset] = useState<'hero' | 'south' | 'east' | 'roof' | 'interior'>('hero');
  const [interiorLightsOn, setInteriorLightsOn] = useState<boolean>(true);
  const [interiorLightMode, setInteriorLightMode] = useState<'warm' | 'daylight' | 'emergency'>('warm');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      {/* Top Bar Navigation */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onExportSpec={() => setIsExportOpen(true)}
      />

      {/* Main Content Area */}
      <div className="relative flex-1 overflow-hidden flex flex-col">
        {activeTab === 'inspector' && (
          <div className="relative w-full h-full flex flex-col">
            {/* 3D WebGL Canvas Viewport */}
            <div className="relative flex-1 w-full h-full overflow-hidden">
              <ShelterScene3D
                colorScheme={colorScheme}
                renderMode={renderMode}
                explodedProgress={explodedProgress}
                roofRemoved={roofRemoved}
                showDimensions={showDimensions}
                showHotspots={showHotspots}
                selectedHotspotId={selectedHotspot?.id || null}
                onSelectHotspot={setSelectedHotspot}
                cameraPreset={cameraPreset}
                interiorLightsOn={interiorLightsOn}
                interiorLightMode={interiorLightMode}
              />

              {/* Viewport Floating HUD */}
              <ViewportHUD
                colorScheme={colorScheme}
                onChangeColorScheme={setColorScheme}
                renderMode={renderMode}
                onChangeRenderMode={setRenderMode}
                explodedProgress={explodedProgress}
                onChangeExplodedProgress={setExplodedProgress}
                roofRemoved={roofRemoved}
                onToggleRoof={() => setRoofRemoved(!roofRemoved)}
                showDimensions={showDimensions}
                onToggleDimensions={() => setShowDimensions(!showDimensions)}
                showHotspots={showHotspots}
                onToggleHotspots={() => setShowHotspots(!showHotspots)}
                cameraPreset={cameraPreset}
                onChangeCameraPreset={setCameraPreset}
                interiorLightsOn={interiorLightsOn}
                onToggleInteriorLights={() => setInteriorLightsOn(!interiorLightsOn)}
                interiorLightMode={interiorLightMode}
                onChangeInteriorLightMode={setInteriorLightMode}
                onResetView={() => {
                  setCameraPreset('hero');
                  setExplodedProgress(0);
                  setRoofRemoved(false);
                  setInteriorLightsOn(true);
                  setInteriorLightMode('warm');
                }}
              />

              {/* Hotspot Specification Card */}
              <HotspotDetailCard
                hotspot={selectedHotspot}
                onClose={() => setSelectedHotspot(null)}
                onSelectHotspot={setSelectedHotspot}
              />

              {/* Quiet Architectural Dimension Callout Badge in Lower Left */}
              <div className="absolute bottom-20 left-4 hidden sm:flex items-center gap-3 px-3.5 py-2 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/60 pointer-events-auto text-xs">
                <div className="flex items-center gap-1.5 text-sky-400 font-medium">
                  <Box className="w-3.5 h-3.5" />
                  <span>Envelope Geometry:</span>
                </div>
                <div className="font-mono text-slate-300 tabular-nums">
                  6.0m L × 4.0m W × 2.4m H
                </div>
                <span className="text-slate-600">|</span>
                <div className="text-slate-400 font-mono">
                  Pitch: 15.0°
                </div>
                <span className="text-slate-600">|</span>
                <div className="text-slate-400 font-mono">
                  Clearance: +150mm
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Thermal Simulator */}
        {activeTab === 'thermal' && (
          <div className="flex-1 overflow-y-auto">
            <ThermalSimulator />
          </div>
        )}

        {/* Tab 3: Bill of Materials */}
        {activeTab === 'bom' && (
          <div className="flex-1 overflow-y-auto">
            <BOMView />
          </div>
        )}

        {/* Tab 4: Assembly Guide */}
        {activeTab === 'assembly' && (
          <div className="flex-1 overflow-y-auto">
            <AssemblyGuide
              onHighlightAssembly={step => {
                // Adjust exploded or camera if user selects step
                if (step === 1) {
                  setExplodedProgress(0.8);
                  setRoofRemoved(false);
                } else if (step === 2) {
                  setExplodedProgress(0.4);
                } else {
                  setExplodedProgress(0);
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Export Blueprint Specification Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
