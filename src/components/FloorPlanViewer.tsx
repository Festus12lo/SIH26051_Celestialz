import React from 'react';

interface FloorplanViewerProps {
  geometry: any;
  dimensions: any;
}

export default function FloorplanViewer({ geometry, dimensions }: FloorplanViewerProps) {
  if (!geometry || !dimensions) return null;

  const length_mm = dimensions.length_mm || (dimensions.length_m * 1000) || 10000;
  const width_mm = dimensions.width_mm || (dimensions.width_m * 1000) || 8000;
  
  // Padding around the drawing
  const padding = 1200;
  const viewBoxW = length_mm + padding * 2;
  const viewBoxH = width_mm + padding * 2;

  // Transform to move drawing to center of padding and flip Y
  const transform = `translate(${padding}, ${width_mm + padding}) scale(1, -1)`;
  
  // Text transform needs to flip Y back so text isn't upside down
  const textTransform = (y: number) => `scale(1, -1) translate(0, -${y * 2})`;

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 bg-[#0b1120] shadow-2xl">
      <svg 
        viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
        className="w-full max-h-[700px] object-contain"
        style={{ background: '#0b1120' }}
      >
        <defs>
          {/* Professional Blueprint Grid */}
          <pattern id="blueprint-grid" width="1000" height="1000" patternUnits="userSpaceOnUse" patternTransform="scale(1, -1)">
            {/* Minor grid lines */}
            <path d="M 200 0 L 200 1000 M 400 0 L 400 1000 M 600 0 L 600 1000 M 800 0 L 800 1000" fill="none" stroke="#1e293b" strokeWidth="5" />
            <path d="M 0 200 L 1000 200 M 0 400 L 1000 400 M 0 600 L 1000 600 M 0 800 L 1000 800" fill="none" stroke="#1e293b" strokeWidth="5" />
            {/* Major grid lines */}
            <rect width="1000" height="1000" fill="none" stroke="#334155" strokeWidth="10" />
          </pattern>

          {/* Hatch pattern for exterior walls */}
          <pattern id="wall-hatch" width="100" height="100" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="100" stroke="#38bdf8" strokeWidth="15" opacity="0.3" />
            <line x1="25" y1="0" x2="25" y2="100" stroke="#38bdf8" strokeWidth="5" opacity="0.1" />
            <line x1="50" y1="0" x2="50" y2="100" stroke="#38bdf8" strokeWidth="15" opacity="0.3" />
            <line x1="75" y1="0" x2="75" y2="100" stroke="#38bdf8" strokeWidth="5" opacity="0.1" />
          </pattern>
        </defs>

        {/* Background Grid Fill */}
        <rect width="100%" height="100%" fill="url(#blueprint-grid)" />

        <g transform={transform}>
          
          {/* ROOMS (Subtle shading and clean text) */}
          {geometry.rooms?.map((room: any, i: number) => (
            <g key={`room-${i}`}>
              <rect
                x={room.x}
                y={room.y}
                width={room.width_m * 1000}
                height={room.length_m * 1000}
                fill="#38bdf8"
                fillOpacity={0.02}
                stroke="#38bdf8"
                strokeWidth={5}
                strokeDasharray="50 50"
                opacity={0.5}
              />
              {/* Room Name */}
              <text
                x={room.x + (room.width_m * 1000) / 2}
                y={room.y + (room.length_m * 1000) / 2 + 100}
                transform={textTransform(room.y + (room.length_m * 1000) / 2 + 100)}
                textAnchor="middle"
                alignmentBaseline="middle"
                fill="#f8fafc"
                fontSize={350}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                fontWeight="600"
                letterSpacing="0.05em"
                style={{ userSelect: 'none' }}
              >
                {room.name.toUpperCase()}
              </text>
              {/* Room Dimensions */}
              <text
                x={room.x + (room.width_m * 1000) / 2}
                y={room.y + (room.length_m * 1000) / 2 - 350}
                transform={textTransform(room.y + (room.length_m * 1000) / 2 - 350)}
                textAnchor="middle"
                alignmentBaseline="middle"
                fill="#94a3b8"
                fontSize={250}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                letterSpacing="0.05em"
                style={{ userSelect: 'none' }}
              >
                {(room.width_m * 1000).toFixed(0)} × {(room.length_m * 1000).toFixed(0)}
              </text>
            </g>
          ))}

          {/* WALLS (CAD Style) */}
          {geometry.walls?.map((wall: any, i: number) => {
            const dx = wall.end[0] - wall.start[0];
            const dy = wall.end[1] - wall.start[1];
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            
            return (
              <g 
                key={`wall-${i}`}
                transform={`translate(${wall.start[0]}, ${wall.start[1]}) rotate(${angle})`}
              >
                {/* Wall Fill */}
                <rect
                  x={0}
                  y={-wall.thickness / 2}
                  width={length}
                  height={wall.thickness}
                  fill={wall.is_exterior ? "url(#wall-hatch)" : "#1e293b"}
                  stroke={wall.is_exterior ? "#7dd3fc" : "#94a3b8"}
                  strokeWidth={15}
                />
              </g>
            );
          })}

          {/* DOORS (Architectural Swings) */}
          {geometry.doors?.map((door: any, i: number) => {
            return (
              <g 
                key={`door-${i}`}
                transform={`translate(${door.pos[0]}, ${door.pos[1]}) rotate(${door.rot})`}
              >
                {/* Door swing arc */}
                <path
                  d={`M 0,0 A ${door.width} ${door.width} 0 0 1 ${door.width} ${door.width}`}
                  fill="none"
                  stroke="#fbbf24" /* Amber/Yellow for contrast against blue grid */
                  strokeWidth={15}
                  strokeDasharray="40 40"
                />
                {/* Door leaf */}
                <line
                  x1={0} y1={0}
                  x2={0} y2={door.width}
                  stroke="#fbbf24"
                  strokeWidth={30}
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* EXTERIOR DIMENSION LINES (Yellow CAD style with architectural ticks) */}
          <g stroke="#facc15" strokeWidth={15} fill="none">
            {/* Bottom dimension (Length) */}
            <line x1={0} y1={-600} x2={length_mm} y2={-600} />
            <line x1={0} y1={-400} x2={0} y2={-800} />
            <line x1={length_mm} y1={-400} x2={length_mm} y2={-800} />
            {/* Architectural ticks */}
            <line x1={-100} y1={-700} x2={100} y2={-500} strokeWidth={25} />
            <line x1={length_mm - 100} y1={-700} x2={length_mm + 100} y2={-500} strokeWidth={25} />
            
            <text 
              x={length_mm / 2} y={-850} 
              transform={textTransform(-850)} 
              fill="#facc15" fontSize={350} 
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              textAnchor="middle" stroke="none"
            >
              {length_mm} mm
            </text>
            
            {/* Left dimension (Width) */}
            <line x1={-600} y1={0} x2={-600} y2={width_mm} />
            <line x1={-400} y1={0} x2={-800} y2={0} />
            <line x1={-400} y1={width_mm} x2={-800} y2={width_mm} />
            {/* Architectural ticks */}
            <line x1={-700} y1={-100} x2={-500} y2={100} strokeWidth={25} />
            <line x1={-700} y1={width_mm - 100} x2={-500} y2={width_mm + 100} strokeWidth={25} />

            <text 
              x={-850} y={width_mm / 2} 
              transform={`translate(-850, ${width_mm/2}) scale(1, -1) rotate(-90)`}
              fill="#facc15" fontSize={350} 
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              textAnchor="middle" stroke="none"
            >
              {width_mm} mm
            </text>
          </g>

        </g>
      </svg>
      
      {/* Blueprint Legend Overlay */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-lg shadow-xl font-mono text-xs text-slate-300 pointer-events-none">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-[url(#wall-hatch)] border border-sky-400 rounded-sm"></div>
          <span>Exterior Wall</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-slate-800 border border-slate-400 rounded-sm"></div>
          <span>Partition Wall</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0 border-t-2 border-dashed border-amber-400"></div>
          <span>Door Swing</span>
        </div>
      </div>
    </div>
  );
}

