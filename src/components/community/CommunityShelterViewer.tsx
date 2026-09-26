import React from 'react';
import { ApartmentScene3D } from './components/ApartmentScene3D';
import type { MaterialSchemeId, ShadingMode } from './data/apartmentData';
import type { EnvironmentPresetId } from '../simulation/EnvironmentSimulationPanel';

interface CommunityShelterViewerProps {
  thermalStrategy?: 'gain' | 'rejection' | 'balanced';
  sunAzimuth?: number;
  sunElevation?: number;
  shadingMode?: ShadingMode;
  materialScheme?: MaterialSchemeId;
  environment?: EnvironmentPresetId;
}

export const CommunityShelterViewer: React.FC<CommunityShelterViewerProps> = ({
  sunAzimuth = 180,
  sunElevation = 55,
  shadingMode = 'studio',
  materialScheme = 'terracotta-earth',
  environment = 'daylight',
}) => {
  return (
    <div className="relative w-full h-full min-h-0 overflow-hidden bg-transparent">
      <ApartmentScene3D
        explodedProgress={0}
        shadingMode={shadingMode}
        materialScheme={materialScheme}
        cameraPreset="hero"
        sunAzimuth={sunAzimuth}
        sunElevation={sunElevation}
        showHotspots={false}
        showDimensions={false}
        showAirflow={false}
        showRoomLabels={false}
        selectedUnitId={null}
        activeFloor="all"
        environment={environment}
      />
    </div>
  );
};
