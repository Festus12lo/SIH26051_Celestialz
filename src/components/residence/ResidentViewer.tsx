import React from 'react';
import { ArchitecturalViewer } from './components/3d/ArchitecturalViewer';
import { HERO_VIEWS } from './data/residenceData';
import type { SeasonType } from './types/architectural';
import type { EnvironmentPresetId } from '../simulation/EnvironmentSimulationPanel';

interface ResidentViewerProps {
  thermalStrategy?: 'gain' | 'rejection' | 'balanced';
  timeOfDayHours?: number;
  season?: SeasonType;
  environment?: EnvironmentPresetId;
  renderMode?: 'pbr' | 'wireframe' | 'xray' | 'thermal';
}

export const ResidentViewer: React.FC<ResidentViewerProps> = ({
  timeOfDayHours = 12.0,
  season = 'equinox',
  environment = 'daylight',
  renderMode = 'pbr',
}) => {
  const hero = HERO_VIEWS[0];

  return (
    <div className="relative w-full h-full min-h-0 overflow-hidden bg-transparent">
      <ArchitecturalViewer
        cameraTargetPos={hero.cameraPosition}
        cameraLookAt={hero.cameraTarget}
        targetFov={hero.fov}
        timeOfDayHours={timeOfDayHours}
        season={season}
        cutawayLevel="all"
        highlightedRoomId={null}
        showAirflow={false}
        environment={environment}
        renderMode={renderMode}
      />
    </div>
  );
};
