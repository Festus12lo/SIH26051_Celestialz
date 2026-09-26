/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArchitecturalViewer } from './components/3d/ArchitecturalViewer';
import { HeaderNav } from './components/HeaderNav';
import { HeroViewsGallery } from './components/HeroViewsGallery';
import { FloorPlanNavigator } from './components/FloorPlanNavigator';
import { SolarStudyPanel } from './components/SolarStudyPanel';
import { RoomInspectorDrawer } from './components/RoomInspectorDrawer';
import { MaterialPaletteDrawer } from './components/MaterialPaletteDrawer';
import { BottomToolbar } from './components/BottomToolbar';
import { CompassRose } from './components/CompassRose';
import { HERO_VIEWS, ROOMS } from './data/residenceData';
import { HeroView, RoomData, ViewMode, CutawayLevel, SeasonType } from './types/architectural';
import { Info, HelpCircle } from 'lucide-react';

export default function App() {
  // Navigation & View Mode
  const [currentMode, setCurrentMode] = useState<ViewMode>('hero');

  // Camera & Perspective
  const [cameraPos, setCameraPos] = useState<[number, number, number]>(HERO_VIEWS[0].cameraPosition);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>(HERO_VIEWS[0].cameraTarget);
  const [targetFov, setTargetFov] = useState<number>(HERO_VIEWS[0].fov);

  // Active Hero View
  const [activeHeroId, setActiveHeroId] = useState<string | null>(HERO_VIEWS[0].id);

  // Solar & Time Parameters
  const [timeOfDayHours, setTimeOfDayHours] = useState<number>(HERO_VIEWS[0].timeOfDayHours);
  const [season, setSeason] = useState<SeasonType>('summer_solstice');

  // Cutaway & Floor Selection
  const [cutawayLevel, setCutawayLevel] = useState<CutawayLevel>('all');

  // Room Inspection
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);

  // Bioclimatic Airflow Streamlines
  const [showAirflow, setShowAirflow] = useState<boolean>(true);

  // Quick Controls Guide modal
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // Handlers
  const handleSelectHero = (hero: HeroView) => {
    setActiveHeroId(hero.id);
    setCameraPos(hero.cameraPosition);
    setCameraTarget(hero.cameraTarget);
    setTargetFov(hero.fov);
    setTimeOfDayHours(hero.timeOfDayHours);
    setSelectedRoom(null);
  };

  const handleSelectRoom = (room: RoomData) => {
    setSelectedRoom(room);
    setCameraPos(room.cameraPosition);
    setCameraTarget(room.cameraTarget);
    setActiveHeroId(null);
    if (room.floor === 'First Floor' && cutawayLevel === 'ground') {
      setCutawayLevel('first');
    } else if (room.floor === 'Ground Floor' && cutawayLevel === 'first') {
      setCutawayLevel('ground');
    }
  };

  const handleFlyToRoom = (room: RoomData) => {
    setCameraPos(room.cameraPosition);
    setCameraTarget(room.cameraTarget);
  };

  const handleResetCamera = () => {
    handleSelectHero(HERO_VIEWS[0]);
    setCutawayLevel('all');
  };

  // Calculate live Sun Azimuth for the compass indicator
  const solarProg = Math.max(0, Math.min(1, (timeOfDayHours - 6) / 12));
  const isDay = timeOfDayHours >= 6.0 && timeOfDayHours <= 18.8;
  const currentAzimuth = isDay ? Math.round(90 + solarProg * 180) : 280;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-neutral-950 font-sans-ui text-neutral-100">
      {/* Top Navigation Bar adhering to Top Bar Contract */}
      <HeaderNav
        currentMode={currentMode}
        onSelectMode={(mode) => {
          setCurrentMode(mode);
          if (mode === 'floorplan') {
            if (!selectedRoom) setSelectedRoom(ROOMS[2]); // Central living room
          }
        }}
        cutawayLevel={cutawayLevel}
        onSelectCutaway={(level) => setCutawayLevel(level)}
        showAirflow={showAirflow}
        onToggleAirflow={() => setShowAirflow(!showAirflow)}
        onResetCamera={handleResetCamera}
      />

      {/* 3D WebGL Architectural Model Canvas - Guaranteed full viewport */}
      <main className="absolute inset-0 w-full h-full overflow-hidden">
        <ArchitecturalViewer
          cameraTargetPos={cameraPos}
          cameraLookAt={cameraTarget}
          targetFov={targetFov}
          timeOfDayHours={timeOfDayHours}
          season={season}
          cutawayLevel={cutawayLevel}
          highlightedRoomId={selectedRoom ? selectedRoom.id : null}
          showAirflow={showAirflow}
        />

        {/* Compass Rose & Orientation HUD */}
        <CompassRose
          solarAzimuthDeg={currentAzimuth}
          timeOfDayHours={timeOfDayHours}
        />

        {/* Current Active Camera Badge */}
        {activeHeroId && (
          <div className="absolute top-18 left-6 z-10 pointer-events-none hidden sm:block">
            <div className="bg-neutral-950/80 backdrop-blur-md border border-neutral-800/80 rounded px-3 py-2 text-xs shadow-lg pointer-events-auto">
              <span className="font-mono text-[11px] font-semibold text-amber-400">
                {activeHeroId}
              </span>
              <span aria-hidden="true" className="mx-1.5 text-neutral-600">·</span>
              <span className="font-serif-display font-medium text-neutral-200">
                {HERO_VIEWS.find((h) => h.id === activeHeroId)?.title}
              </span>
              <div className="text-[11px] text-neutral-400 mt-0.5 max-w-sm leading-snug">
                {HERO_VIEWS.find((h) => h.id === activeHeroId)?.description}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Quick Navigation Toolbar */}
        <BottomToolbar
          onSelectHero={handleSelectHero}
          activeHeroId={activeHeroId}
          onOpenHeroGallery={() => setCurrentMode('hero')}
          onOpenSolarStudy={() => setCurrentMode('solar')}
          onOpenFloorPlans={() => setCurrentMode('floorplan')}
        />

        {/* Help / Guide button */}
        <button
          onClick={() => setShowGuide(true)}
          className="absolute top-18 right-6 z-10 p-2 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 border border-neutral-800 backdrop-blur transition-colors cursor-pointer shadow-lg"
          title="Model Exploration Controls & Architecture Notes"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Side Panels based on active mode */}
        {currentMode === 'hero' && (
          <HeroViewsGallery
            activeHeroId={activeHeroId}
            onSelectHero={handleSelectHero}
            onClose={() => setCurrentMode('orbit')}
          />
        )}

        {currentMode === 'floorplan' && (
          <FloorPlanNavigator
            selectedRoomId={selectedRoom?.id || null}
            onSelectRoom={handleSelectRoom}
            cutawayLevel={cutawayLevel}
            onSelectCutaway={setCutawayLevel}
            onClose={() => setCurrentMode('orbit')}
          />
        )}

        {currentMode === 'solar' && (
          <SolarStudyPanel
            timeOfDayHours={timeOfDayHours}
            onChangeTimeOfDay={setTimeOfDayHours}
            season={season}
            onChangeSeason={setSeason}
            showAirflow={showAirflow}
            onToggleAirflow={() => setShowAirflow(!showAirflow)}
            onClose={() => setCurrentMode('orbit')}
          />
        )}

        {currentMode === 'materials' && (
          <MaterialPaletteDrawer onClose={() => setCurrentMode('orbit')} />
        )}

        {/* Room Dossier Modal / Drawer */}
        {selectedRoom && currentMode !== 'materials' && currentMode !== 'solar' && (
          <RoomInspectorDrawer
            room={selectedRoom}
            onSelectRoom={handleSelectRoom}
            onFlyToRoom={handleFlyToRoom}
            onClose={() => setSelectedRoom(null)}
          />
        )}

        {/* Interactive Controls & Bioclimatic Architecture Info Modal */}
        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-amber-400" />
                  <h3 className="font-serif-display text-lg font-medium text-neutral-100">
                    Architectural Model Guide &amp; Bioclimatic Strategy
                  </h3>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-xs px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-neutral-400 hover:text-neutral-100 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3 text-xs text-neutral-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <h4 className="font-semibold text-amber-300 uppercase tracking-wide">
                    3D Viewport Controls
                  </h4>
                  <ul className="mt-1 space-y-1 text-neutral-400 list-disc list-inside">
                    <li><strong className="text-neutral-200">Left Click + Drag:</strong> Orbit camera around house and courtyard.</li>
                    <li><strong className="text-neutral-200">Right Click (or Shift + Drag):</strong> Pan camera vertically and horizontally.</li>
                    <li><strong className="text-neutral-200">Mouse Wheel / Pinch:</strong> Smooth zoom in and out.</li>
                    <li><strong className="text-neutral-200">Floor Cutaway buttons (Top Bar):</strong> View Ground floor plan (G01–G13), Upper private floor (F01–F10), or Courtyard Section cut.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-amber-300 uppercase tracking-wide">
                    Passive Bioclimatic Principles
                  </h4>
                  <ul className="mt-1 space-y-1.5 text-neutral-400">
                    <li>
                      <strong className="text-neutral-200">True South Orientation (180°):</strong> Elongated 18m East–West axis minimizes harsh low morning/evening solar exposure while capturing predictable southern arcs.
                    </li>
                    <li>
                      <strong className="text-neutral-200">1.5 m Southern Verandah Overhang:</strong> Accurately calculated horizontal overhang completely shades southern glazing from high summer sun (76° altitude) while welcoming deep low winter sun (38° altitude).
                    </li>
                    <li>
                      <strong className="text-neutral-200">Convective Stack Effect Thermal Chimney:</strong> Warm air naturally ascends through the central 6.8m double-height courtyard void and exhausts through operable clerestory louvers, drawing cool air across the ground Kota stone floor without mechanical compressors.
                    </li>
                    <li>
                      <strong className="text-neutral-200">350 mm Stabilized Rammed Earth:</strong> Dense sub-soil mineral walls provide a 10–12 hour thermal lag, stabilizing internal temperatures at 24°–26°C despite exterior 38°C midday spikes.
                    </li>
                    <li>
                      <strong className="text-neutral-200">Terracotta Jaali Lattice:</strong> Porous geometric screens on East/West facades cut radiant heat by 68% while allowing continuous breeze flow and casting intricate geometric shadows.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-800 flex justify-end">
                <button
                  onClick={() => setShowGuide(false)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-semibold text-xs rounded transition-colors cursor-pointer"
                >
                  Explore Residence
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
