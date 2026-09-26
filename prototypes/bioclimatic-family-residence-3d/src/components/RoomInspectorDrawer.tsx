import React from 'react';
import { RoomData } from '../types/architectural';
import { ROOMS } from '../data/residenceData';
import {
  Maximize2,
  Compass,
  Wind,
  Layers,
  CheckCircle2,
  ArrowRight,
  Camera,
  X
} from 'lucide-react';

interface RoomInspectorDrawerProps {
  room: RoomData | null;
  onSelectRoom: (room: RoomData) => void;
  onFlyToRoom: (room: RoomData) => void;
  onClose: () => void;
}

export const RoomInspectorDrawer: React.FC<RoomInspectorDrawerProps> = ({
  room,
  onSelectRoom,
  onFlyToRoom,
  onClose,
}) => {
  if (!room) return null;

  // Find adjacent rooms on the same floor for quick architectural navigation
  const siblingRooms = ROOMS.filter(
    (r) => r.floor === room.floor && r.id !== room.id
  ).slice(0, 3);

  return (
    <aside className="absolute right-0 top-14 bottom-0 w-80 md:w-96 bg-neutral-950/95 backdrop-blur-xl border-l border-neutral-800/80 z-20 flex flex-col shadow-2xl overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800/80 flex items-start justify-between sticky top-0 bg-neutral-950/95 backdrop-blur z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-amber-950/60 border border-amber-600/50 rounded text-amber-300">
              {room.id}
            </span>
            <span className="text-xs text-neutral-400 font-medium">{room.floor}</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="text-xs text-neutral-400">{room.zone}</span>
          </div>

          <h2 className="font-serif-display text-lg font-medium text-neutral-100 mt-1">
            {room.name}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded">
            <div className="text-[11px] text-neutral-400 flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-amber-400" />
              Dimensions &amp; Area
            </div>
            <div className="font-mono text-base font-semibold text-neutral-100 mt-0.5">
              {room.areaM2} m²
            </div>
            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
              {room.dimensions}
            </div>
          </div>

          <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded">
            <div className="text-[11px] text-neutral-400 flex items-center gap-1">
              <Compass className="w-3 h-3 text-amber-400" />
              Orientation &amp; Light
            </div>
            <div className="font-serif-display text-base font-medium text-neutral-100 mt-0.5">
              {room.orientation}
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              {room.ceilingHeight}
            </div>
          </div>
        </div>

        {/* Action Button: Fly Camera */}
        <button
          onClick={() => onFlyToRoom(room)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/50 text-xs font-medium transition-colors cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Fly Camera to Room Interior</span>
        </button>

        {/* Architectural Description */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
            Architectural Role
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {room.description}
          </p>
        </div>

        {/* Bioclimatic Feature */}
        <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <Wind className="w-3.5 h-3.5" />
            <span>Bioclimatic &amp; Ventilation Strategy</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {room.bioclimaticFeature}
          </p>
        </div>

        {/* Authentic Material System */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wide flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Specified Materials
          </h3>
          <div className="space-y-1">
            {room.materials.map((mat, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-neutral-300 py-1 border-b border-neutral-900 last:border-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                <span>{mat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Furniture & Joinery */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
            Custom Joinery &amp; Furniture
          </h3>
          <ul className="space-y-1 text-xs text-neutral-400 list-disc list-inside">
            {room.keyFurniture.map((item, i) => (
              <li key={i} className="leading-snug">
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Adjacent Rooms */}
        <div className="pt-2 border-t border-neutral-900 space-y-2">
          <h4 className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
            Connected Spatial Axis
          </h4>
          <div className="space-y-1">
            {siblingRooms.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectRoom(s)}
                className="w-full flex items-center justify-between p-2 rounded bg-neutral-900/40 hover:bg-neutral-900 text-left text-xs text-neutral-300 border border-neutral-800/60 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-amber-400/80">{s.id}</span>
                  <span>{s.name}</span>
                </div>
                <ArrowRight className="w-3 h-3 text-neutral-500 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
