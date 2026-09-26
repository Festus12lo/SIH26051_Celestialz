import React from 'react';
import { Compass } from 'lucide-react';

interface CompassRoseProps {
  solarAzimuthDeg: number;
  timeOfDayHours: number;
}

export const CompassRose: React.FC<CompassRoseProps> = ({
  solarAzimuthDeg,
  timeOfDayHours,
}) => {
  // Format time of day
  const hours = Math.floor(timeOfDayHours);
  const minutes = Math.floor((timeOfDayHours - hours) * 60);
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  return (
    <div className="absolute bottom-6 left-6 z-20 pointer-events-none flex items-center gap-3">
      {/* Compass Disc */}
      <div className="relative w-16 h-16 rounded-full bg-neutral-950/80 backdrop-blur-md border border-neutral-800 shadow-xl flex items-center justify-center pointer-events-auto">
        {/* Cardinal Markers */}
        <span className="absolute top-1 text-[9px] font-mono font-bold text-neutral-400">N</span>
        <span className="absolute bottom-1 text-[9px] font-mono font-bold text-amber-400">S 180°</span>
        <span className="absolute right-1.5 text-[9px] font-mono font-bold text-neutral-400">E</span>
        <span className="absolute left-1.5 text-[9px] font-mono font-bold text-neutral-400">W</span>

        {/* Center dot */}
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />

        {/* Sun Azimuth Needle */}
        <div
          className="absolute w-full h-full pointer-events-none transition-transform duration-300"
          style={{ transform: `rotate(${solarAzimuthDeg}deg)` }}
        >
          <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] absolute top-0.5 left-1/2 -translate-x-1/2" />
        </div>
      </div>

      {/* Orientation & Solar Status Badge */}
      <div className="bg-neutral-950/85 backdrop-blur-md border border-neutral-800 rounded px-3 py-2 text-xs shadow-xl pointer-events-auto">
        <div className="flex items-center gap-2 text-neutral-200 font-medium">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>Active South Facade (180°)</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5 font-mono">
          <span>Sun: {solarAzimuthDeg}° Az</span>
          <span aria-hidden="true">·</span>
          <span>{timeStr} Local Time</span>
        </div>
      </div>
    </div>
  );
};
