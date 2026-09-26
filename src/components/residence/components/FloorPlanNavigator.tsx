import React, { useState } from 'react';
import { ROOMS } from '../data/residenceData';
import type { RoomData, CutawayLevel } from '../types/architectural';
import { Maximize2, Compass, Layers } from 'lucide-react';

interface FloorPlanNavigatorProps {
  selectedRoomId: string | null;
  onSelectRoom: (room: RoomData) => void;
  cutawayLevel: CutawayLevel;
  onSelectCutaway: (level: CutawayLevel) => void;
  onClose: () => void;
}

export const FloorPlanNavigator: React.FC<FloorPlanNavigatorProps> = ({
  selectedRoomId,
  onSelectRoom,
  cutawayLevel,
  onSelectCutaway,
  onClose,
}) => {
  const [activeFloor, setActiveFloor] = useState<'Ground Floor' | 'First Floor'>(
    cutawayLevel === 'first' ? 'First Floor' : 'Ground Floor'
  );

  const filteredRooms = ROOMS.filter((r) => r.floor === activeFloor);

  const handleFloorChange = (floor: 'Ground Floor' | 'First Floor') => {
    setActiveFloor(floor);
    onSelectCutaway(floor === 'Ground Floor' ? 'ground' : 'first');
  };

  return (
    <aside className="absolute left-0 top-14 bottom-0 w-80 md:w-96 bg-neutral-950/90 backdrop-blur-xl border-r border-neutral-800/80 z-20 flex flex-col shadow-2xl">
      {/* Top Header */}
      <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between">
        <div>
          <h2 className="font-serif-display text-base font-medium text-neutral-100">
            Architectural Floor Plans
          </h2>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
            <span>18.0 m × 12.0 m</span>
            <span aria-hidden="true">·</span>
            <span>Orthogonal 1:1.5</span>
            <span aria-hidden="true">·</span>
            <span>Courtyard Lung</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-100 text-xs px-2 py-1 bg-neutral-900 border border-neutral-800 rounded cursor-pointer"
        >
          Close
        </button>
      </div>

      {/* Floor Selector Tabs */}
      <div className="p-3 border-b border-neutral-800/60 bg-neutral-900/40 flex items-center gap-2">
        <button
          onClick={() => handleFloorChange('Ground Floor')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors cursor-pointer text-center ${
            activeFloor === 'Ground Floor'
              ? 'bg-amber-600/20 border border-amber-600/50 text-amber-300 font-semibold'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          Ground Floor (G01–G13)
          <div className="text-[10px] text-neutral-400 font-normal">216 m² Social &amp; Living</div>
        </button>

        <button
          onClick={() => handleFloorChange('First Floor')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors cursor-pointer text-center ${
            activeFloor === 'First Floor'
              ? 'bg-amber-600/20 border border-amber-600/50 text-amber-300 font-semibold'
              : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          First Floor (F01–F10)
          <div className="text-[10px] text-neutral-400 font-normal">142 m² Master &amp; Family</div>
        </button>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-neutral-900">
        {filteredRooms.map((room) => {
          const isSelected = selectedRoomId === room.id;
          return (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room)}
              className={`w-full text-left p-2.5 rounded transition-all cursor-pointer group ${
                isSelected
                  ? 'bg-amber-950/40 border border-amber-600/60 shadow-sm'
                  : 'hover:bg-neutral-900/60 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-amber-300">
                    {room.id}
                  </span>
                  <span className="font-serif-display text-sm font-medium text-neutral-100 group-hover:text-amber-200 transition-colors">
                    {room.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
                  <span>{room.areaM2} m²</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1.5">
                <span className="flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-neutral-500" />
                  <span>{room.dimensions}</span>
                </span>
                <span className="flex items-center gap-1 text-neutral-400">
                  <Compass className="w-3 h-3 text-amber-400/70" />
                  <span>{room.orientation}</span>
                </span>
              </div>

              <p className="text-xs text-neutral-400 mt-1.5 line-clamp-1">
                {room.bioclimaticFeature}
              </p>
            </button>
          );
        })}
      </div>

      {/* Quick Footprint Summary */}
      <div className="p-3 border-t border-neutral-800/80 bg-neutral-950 text-[11px] text-neutral-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Central Courtyard Lung</span>
        </span>
        <span className="font-mono text-neutral-300">18.9 m² Void · 6.8 m H</span>
      </div>
    </aside>
  );
};
