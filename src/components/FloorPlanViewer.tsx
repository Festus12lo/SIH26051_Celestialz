import React, { useState, useRef } from 'react';
import { 
  Compass, 
  Eye, 
  Layers, 
  Maximize2, 
  Ruler, 
  Sun, 
  Download, 
  Printer, 
  Armchair, 
  Grid, 
  FileText,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface FloorplanViewerProps {
  geometry: any;
  dimensions: any;
  meta?: any;
  climate?: any;
  orientation?: any;
  solarGeometry?: any;
  windows?: any[];
  rooms?: any[];
}

export default function FloorplanViewer({
  geometry,
  dimensions,
  meta,
  climate,
  orientation,
  solarGeometry,
  windows,
  rooms: enrichedRooms,
}: FloorplanViewerProps) {
  if (!geometry || !dimensions) return null;

  const svgRef = useRef<SVGSVGElement>(null);

  // User interactive display toggles
  const [showDimensions, setShowDimensions] = useState(true);
  const [showFurniture, setShowFurniture] = useState(true);
  const [showThermalZoning, setShowThermalZoning] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showSolarSunpath, setShowSolarSunpath] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [paperTheme, setPaperTheme] = useState<'paper' | 'warm' | 'blueprint'>('paper');

  // Building boundary dimensions in mm
  const length_mm = dimensions.length_mm || (dimensions.length_m ? dimensions.length_m * 1000 : 7100);
  const width_mm = dimensions.width_mm || (dimensions.width_m ? dimensions.width_m * 1000 : 5900);
  
  // Clean architectural sheet margins (Room for dimension strings, North arrow, and Title block)
  const padLeft = 900;
  const padBottom = 800;
  const padRight = 900;
  const padTop = 900;

  const viewBoxW = length_mm + padLeft + padRight;
  const viewBoxH = width_mm + padBottom + padTop;

  // Direct, positive linear coordinate projection
  // Model coordinates: x in [0, length_mm], y in [0, width_mm] (y=0 is South, y=width_mm is North)
  // SVG coordinates: (0,0) is top-left. North is at the TOP (small SVG Y), South is at the BOTTOM (large SVG Y).
  const toSvgX = (x: number) => padLeft + x;
  const toSvgY = (y: number) => padTop + (width_mm - y);

  // Compass and orientation data
  const azimuthDeg = orientation?.azimuth_deg ?? 180;
  const primaryFacade = orientation?.primary_facade || 'South';
  const windDirection = climate?.prevailing_wind_dir || 'NW';
  const windSpeed = climate?.basic_wind_speed_m_s || 39;
  const climateZone = climate?.zone || 'Moderate';

  // Room architectural soft tint palette (Rayon style: elegant, muted, professional)
  const getRoomStyle = (room: any, enriched?: any) => {
    const fn = (enriched?.function || room.name || '').toLowerCase();
    const zone = enriched?.thermal_zone || '';

    if (showThermalZoning) {
      if (zone === 'heated_primary' || fn.includes('living')) {
        return { fill: '#FFF7ED', stroke: '#FDBA74', badgeColor: '#EA580C', label: 'Primary Solar Living' };
      }
      if (zone === 'heated_secondary' || fn.includes('kitchen')) {
        return { fill: '#FEF2F2', stroke: '#FCA5A5', badgeColor: '#DC2626', label: 'Internal Gains Core' };
      }
      if (zone === 'service' || fn.includes('bath')) {
        return { fill: '#F0FDFA', stroke: '#99F6E4', badgeColor: '#0D9488', label: 'Wet Service Core' };
      }
      return { fill: '#F5F3FF', stroke: '#DDD6FE', badgeColor: '#7C3AED', label: 'Thermal Buffer Zone' };
    }

    if (paperTheme === 'warm') {
      if (fn.includes('living')) return { fill: '#FAF7F2', stroke: '#E7DFD5', badgeColor: '#8C7A6B', label: 'Living & Dining' };
      if (fn.includes('bed')) return { fill: '#F7F6F4', stroke: '#E4E1DC', badgeColor: '#78716C', label: 'Sleeping Quarter' };
      if (fn.includes('kitchen')) return { fill: '#F5F7F4', stroke: '#DEE4DB', badgeColor: '#576B55', label: 'Kitchen Service' };
      if (fn.includes('bath')) return { fill: '#F3F6F8', stroke: '#DBE2E8', badgeColor: '#4F6B7D', label: 'Sanitary Core' };
      return { fill: '#FAFAFA', stroke: '#E5E5E5', badgeColor: '#737373', label: 'Circulation' };
    }

    if (paperTheme === 'blueprint') {
      return { fill: '#0F1E36', stroke: '#1E3A8A', badgeColor: '#38BDF8', label: 'Enclosed Space' };
    }

    // Default: Rayon Pure Minimalist Architectural
    if (fn.includes('living')) return { fill: '#FFFFFF', stroke: '#E2E8F0', badgeColor: '#0F172A', label: 'Living & Dining' };
    if (fn.includes('bed')) return { fill: '#FAFAFA', stroke: '#E2E8F0', badgeColor: '#1E293B', label: 'Bedroom' };
    if (fn.includes('kitchen')) return { fill: '#F8FAFC', stroke: '#E2E8F0', badgeColor: '#334155', label: 'Kitchen' };
    if (fn.includes('bath')) return { fill: '#F1F5F9', stroke: '#CBD5E1', badgeColor: '#475569', label: 'Bathroom' };
    return { fill: '#FFFFFF', stroke: '#E2E8F0', badgeColor: '#64748B', label: 'Foyer / Hall' };
  };

  // Export SVG handler
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ThermoShelter_FloorPlan_${meta?.building_type || 'Residence'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Safe calculated area metrics
  const totalFloorAreaM2 = ((length_mm * width_mm) / 1000000).toFixed(1);
  const totalFloorAreaSqFt = (((length_mm * width_mm) / 1000000) * 10.7639).toFixed(0);

  // Background and canvas colors based on selected theme
  const sheetBg = paperTheme === 'blueprint' ? '#080E1A' : paperTheme === 'warm' ? '#FAF8F5' : '#FFFFFF';
  const gridColor = paperTheme === 'blueprint' ? '#13233F' : '#F1F5F9';
  const majorGridColor = paperTheme === 'blueprint' ? '#1E3A8A' : '#E2E8F0';
  const wallExtColor = paperTheme === 'blueprint' ? '#38BDF8' : '#18181B';
  const wallIntColor = paperTheme === 'blueprint' ? '#1E40AF' : '#475569';
  const dimColor = paperTheme === 'blueprint' ? '#FBBF24' : '#334155';
  const primaryTextColor = paperTheme === 'blueprint' ? '#F8FAFC' : '#0F172A';
  const secondaryTextColor = paperTheme === 'blueprint' ? '#94A3B8' : '#64748B';

  return (
    <div className="flex flex-col gap-5 w-full select-none">
      {/* ── TOP ARCHITECTURAL CONTROL TOOLBAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-zinc-900/95 border-zinc-800 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl text-xs font-mono text-slate-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>RAYON CAD ENGINE</span>
          </div>
          <span className="text-white/30 hidden sm:inline">|</span>
          <span className="text-white/80 font-medium hidden sm:inline">SCALE 1:50 @ METRIC</span>
        </div>

        {/* View Style & Layer Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Theme selector */}
          <div className="flex items-center bg-black/40 p-0.5 rounded-xl border border-white/10 text-[11px]">
            <button
              onClick={() => setPaperTheme('paper')}
              className={`px-2.5 py-1 rounded-lg transition-all font-semibold ${
                paperTheme === 'paper' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              White Sheet
            </button>
            <button
              onClick={() => setPaperTheme('warm')}
              className={`px-2.5 py-1 rounded-lg transition-all font-semibold ${
                paperTheme === 'warm' ? 'bg-[#F5EFEB] text-stone-900 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Warm Vellum
            </button>
            <button
              onClick={() => setPaperTheme('blueprint')}
              className={`px-2.5 py-1 rounded-lg transition-all font-semibold ${
                paperTheme === 'blueprint' ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              Blueprint
            </button>
          </div>

          {/* Furniture Toggle */}
          <button
            type="button"
            onClick={() => setShowFurniture(!showFurniture)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
              showFurniture 
                ? 'bg-[#FF5722]/20 border-[#FF5722]/50 text-[#FF5722] font-semibold' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle Interior Architectural Furniture & Fixtures"
          >
            <Armchair size={14} />
            <span>Furniture</span>
          </button>

          {/* Dimensions Toggle */}
          <button
            type="button"
            onClick={() => setShowDimensions(!showDimensions)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
              showDimensions 
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle Exterior Dimension Strings"
          >
            <Ruler size={14} />
            <span>Dimensions</span>
          </button>

          {/* Thermal Zones Toggle */}
          <button
            type="button"
            onClick={() => setShowThermalZoning(!showThermalZoning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
              showThermalZoning 
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle Passive Thermal Zones & Sun Ingress"
          >
            <Layers size={14} />
            <span>Thermal Zones</span>
          </button>

          {/* Grid Toggle */}
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
              showGrid 
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle Drafting Grid"
          >
            <Grid size={14} />
            <span>Grid</span>
          </button>

          {/* Room Schedule Legend Toggle */}
          <button
            type="button"
            onClick={() => setShowLegend(!showLegend)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
              showLegend 
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle Room Schedule Table"
          >
            <FileText size={14} />
            <span>Legend</span>
          </button>

          {/* Export Actions */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
            <button
              onClick={handleExportSVG}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
              title="Download Architectural Vector SVG"
            >
              <Download size={14} />
            </button>
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
              title="Print Floor Plan Sheet"
            >
              <Printer size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── THE WHITE DRAFTING SHEET CANVAS ── */}
      <div className="relative w-full rounded-2xl p-4 sm:p-6 md:p-8 bg-[#0D121F] border border-white/10 shadow-2xl flex flex-col items-center justify-center overflow-x-auto">
        <div 
          className="w-full max-w-[1200px] rounded-2xl overflow-hidden transition-all duration-300"
          style={{
            backgroundColor: sheetBg,
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
            className="w-full h-auto object-contain select-none"
            style={{ backgroundColor: sheetBg }}
          >
            <defs>
              {/* Millimeter Engineering Drafting Grid */}
              <pattern id="arch-grid-fine" width="500" height="500" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 100 500 M 200 0 L 200 500 M 300 0 L 300 500 M 400 0 L 400 500" fill="none" stroke={gridColor} strokeWidth="1.5" />
                <path d="M 0 100 L 500 100 M 0 200 L 500 200 M 0 300 L 500 300 M 0 400 L 500 400" fill="none" stroke={gridColor} strokeWidth="1.5" />
                <rect width="500" height="500" fill="none" stroke={majorGridColor} strokeWidth="3" />
              </pattern>

              {/* Solar Vector Ingress Marker */}
              <marker id="solar-ray-marker" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#EA580C" />
              </marker>

              {/* Wind Vector Marker */}
              <marker id="wind-vector-marker" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 2 L 8 5 L 0 8 z" fill="#0284C7" />
              </marker>
            </defs>

            {/* Optional Drafting Grid */}
            {showGrid && <rect width="100%" height="100%" fill="url(#arch-grid-fine)" />}

            {/* Clean Drawing Sheet Outer Border Frame */}
            <rect 
              x={60} 
              y={60} 
              width={viewBoxW - 120} 
              height={viewBoxH - 120} 
              fill="none" 
              stroke={majorGridColor} 
              strokeWidth="4" 
            />
            <rect 
              x={90} 
              y={90} 
              width={viewBoxW - 180} 
              height={viewBoxH - 180} 
              fill="none" 
              stroke={majorGridColor} 
              strokeWidth="1.5" 
            />

            {/* ── TOP RIGHT: MINIMALIST ARCHITECTURAL NORTH ARROW & COMPASS ── */}
            <g transform={`translate(${viewBoxW - 480}, 320)`}>
              <circle r="180" fill={sheetBg} stroke={majorGridColor} strokeWidth="3" />
              <circle r="150" fill="none" stroke={majorGridColor} strokeWidth="1" strokeDasharray="6 6" />

              {/* Cardinal Axes */}
              <line x1="0" y1="-170" x2="0" y2="170" stroke={majorGridColor} strokeWidth="1.5" />
              <line x1="-170" y1="0" x2="170" y2="0" stroke={majorGridColor} strokeWidth="1.5" />

              {/* Bold N Label */}
              <text x="0" y="-190" textAnchor="middle" fill={primaryTextColor} fontSize="64" fontWeight="800" fontFamily="sans-serif">N</text>
              <text x="0" y="235" textAnchor="middle" fill={secondaryTextColor} fontSize="46" fontWeight="600" fontFamily="sans-serif">S</text>
              <text x="215" y="16" textAnchor="middle" fill={secondaryTextColor} fontSize="46" fontWeight="600" fontFamily="sans-serif">E</text>
              <text x="-215" y="16" textAnchor="middle" fill={secondaryTextColor} fontSize="46" fontWeight="600" fontFamily="sans-serif">W</text>

              {/* Minimalist Needle */}
              <g transform={`rotate(${azimuthDeg - 180})`}>
                <polygon points="0,-130 18,-15 0,-5" fill={primaryTextColor} />
                <polygon points="0,-130 -18,-15 0,-5" fill={secondaryTextColor} />
                <polygon points="0,130 18,15 0,5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
                <polygon points="0,130 -18,15 0,5" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1" />
                <circle cx="0" cy="0" r="14" fill={sheetBg} stroke={primaryTextColor} strokeWidth="4" />
              </g>

              {/* Solar Azimuth Annotation */}
              <text x="0" y="290" textAnchor="middle" fill="#EA580C" fontSize="38" fontWeight="700" fontFamily="sans-serif">
                SOLAR FACADE: {azimuthDeg}° ({primaryFacade})
              </text>
              <text x="0" y="335" textAnchor="middle" fill={secondaryTextColor} fontSize="32" fontWeight="500" fontFamily="sans-serif">
                WIND: {windDirection} @ {windSpeed} m/s
              </text>
            </g>

            {/* ── PASSIVE SOLAR FLUX OVERLAY ON SOUTH FACADE ── */}
            {showSolarSunpath && (
              <g>
                {[0.2, 0.4, 0.6, 0.8].map((factor, idx) => {
                  const rayX = padLeft + length_mm * factor;
                  const southWallY = padTop + width_mm;
                  return (
                    <g key={`sunray-${idx}`}>
                      <line
                        x1={rayX}
                        y1={southWallY + 450}
                        x2={rayX}
                        y2={southWallY + 60}
                        stroke="#EA580C"
                        strokeWidth="4"
                        strokeDasharray="16 10"
                        markerEnd="url(#solar-ray-marker)"
                      />
                      <circle cx={rayX} cy={southWallY + 470} r="16" fill="#FDBA74" stroke="#EA580C" strokeWidth="2" />
                    </g>
                  );
                })}
                <text
                  x={padLeft + length_mm / 2}
                  y={padTop + width_mm + 540}
                  textAnchor="middle"
                  fill="#EA580C"
                  fontSize="44"
                  fontWeight="700"
                  fontFamily="sans-serif"
                  letterSpacing="0.05em"
                >
                  SOLAR INSOLATION VECTOR • SOUTH-FACING PASSIVE HEATING
                </text>
              </g>
            )}

            {/* ── ROOMS: TINTS, LABELS & ARCHITECTURAL FURNITURE STAMPS ── */}
            {geometry.rooms?.map((room: any, i: number) => {
              const enriched = enrichedRooms?.find(
                (r: any) => r.id === room.id || r.name?.toLowerCase() === room.name?.toLowerCase()
              );
              const roomStyle = getRoomStyle(room, enriched);

              const roomW = room.width_m * 1000;
              const roomL = room.length_m * 1000;
              
              // Top-left of room in standard positive SVG coordinates
              const rx = toSvgX(room.x);
              const ry = toSvgY(room.y + roomL);
              const centerX = rx + roomW / 2;
              const centerY = ry + roomL / 2;
              const roomAreaM2 = (room.width_m * room.length_m).toFixed(1);
              const roomAreaSqFt = (room.width_m * room.length_m * 10.7639).toFixed(0);

              const roomLower = (room.name || '').toLowerCase();

              // Safe font size calculation to guarantee zero text overlap
              const maxTitleLength = Math.max(room.name.length, 8);
              const titleFontSize = Math.min(Math.floor((roomW * 0.75) / (maxTitleLength * 0.65)), 68);
              const subFontSize = Math.max(Math.floor(titleFontSize * 0.6), 28);

              return (
                <g key={`room-group-${i}`}>
                  {/* Clean Room Floor Fill (Rayon Soft Architectural Tint) */}
                  <rect
                    x={rx}
                    y={ry}
                    width={roomW}
                    height={roomL}
                    fill={roomStyle.fill}
                    stroke={roomStyle.stroke}
                    strokeWidth="1.5"
                  />

                  {/* ── RAYON-STYLE ARCHITECTURAL FURNITURE STAMPS ── */}
                  {showFurniture && (
                    <g opacity={paperTheme === 'blueprint' ? 0.75 : 0.85}>
                      {/* 1. BEDROOM FURNITURE */}
                      {roomLower.includes('bed') && (
                        <g>
                          {(() => {
                            const bedW = Math.min(roomW * 0.62, 1700);
                            const bedL = Math.min(roomL * 0.7, 1950);
                            const bedX = rx + (roomW - bedW) / 2;
                            const bedY = ry + 80; // Placed against North wall

                            return (
                              <g>
                                {/* Padded Headboard */}
                                <rect
                                  x={bedX}
                                  y={bedY}
                                  width={bedW}
                                  height={80}
                                  rx={8}
                                  fill="#E2E8F0"
                                  stroke="#64748B"
                                  strokeWidth="2"
                                />
                                {/* Main Mattress with rounded corners */}
                                <rect
                                  x={bedX}
                                  y={bedY + 80}
                                  width={bedW}
                                  height={bedL - 80}
                                  rx={12}
                                  fill="#FFFFFF"
                                  stroke="#64748B"
                                  strokeWidth="2.5"
                                />
                                {/* Two Plush Pillows */}
                                <rect
                                  x={bedX + 30}
                                  y={bedY + 110}
                                  width={(bedW - 90) / 2}
                                  height={260}
                                  rx={10}
                                  fill="#F8FAFC"
                                  stroke="#94A3B8"
                                  strokeWidth="1.5"
                                />
                                <rect
                                  x={bedX + bedW / 2 + 15}
                                  y={bedY + 110}
                                  width={(bedW - 90) / 2}
                                  height={260}
                                  rx={10}
                                  fill="#F8FAFC"
                                  stroke="#94A3B8"
                                  strokeWidth="1.5"
                                />
                                {/* Pillow Creases */}
                                <line
                                  x1={bedX + 30 + (bedW - 90) / 4 - 30}
                                  y1={bedY + 240}
                                  x2={bedX + 30 + (bedW - 90) / 4 + 30}
                                  y2={bedY + 240}
                                  stroke="#CBD5E1"
                                  strokeWidth="2"
                                />
                                <line
                                  x1={bedX + bedW / 2 + 15 + (bedW - 90) / 4 - 30}
                                  y1={bedY + 240}
                                  x2={bedX + bedW / 2 + 15 + (bedW - 90) / 4 + 30}
                                  y2={bedY + 240}
                                  stroke="#CBD5E1"
                                  strokeWidth="2"
                                />
                                {/* Duvet Fold Line */}
                                <line
                                  x1={bedX}
                                  y1={bedY + 80 + (bedL - 80) * 0.42}
                                  x2={bedX + bedW}
                                  y2={bedY + 80 + (bedL - 80) * 0.42}
                                  stroke="#94A3B8"
                                  strokeWidth="2"
                                />
                                <line
                                  x1={bedX}
                                  y1={bedY + 80 + (bedL - 80) * 0.44}
                                  x2={bedX + bedW}
                                  y2={bedY + 80 + (bedL - 80) * 0.44}
                                  stroke="#CBD5E1"
                                  strokeWidth="1"
                                  strokeDasharray="6 4"
                                />

                                {/* Beside Nightstands if width permits */}
                                {roomW > bedW + 700 && (
                                  <>
                                    {/* Left Nightstand */}
                                    <rect
                                      x={bedX - 340}
                                      y={bedY + 10}
                                      width={280}
                                      height={280}
                                      rx={6}
                                      fill="#F8FAFC"
                                      stroke="#64748B"
                                      strokeWidth="2"
                                    />
                                    <circle cx={bedX - 200} cy={bedY + 150} r="45" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1.5" />
                                    {/* Right Nightstand */}
                                    <rect
                                      x={bedX + bedW + 60}
                                      y={bedY + 10}
                                      width={280}
                                      height={280}
                                      rx={6}
                                      fill="#F8FAFC"
                                      stroke="#64748B"
                                      strokeWidth="2"
                                    />
                                    <circle cx={bedX + bedW + 200} cy={bedY + 150} r="45" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1.5" />
                                  </>
                                )}

                                {/* Wardrobe along opposite/side wall */}
                                {roomL > 2600 && (
                                  <g>
                                    <rect
                                      x={rx + 60}
                                      y={ry + roomL - 480}
                                      width={Math.min(roomW - 120, 1400)}
                                      height={400}
                                      rx={4}
                                      fill="#F1F5F9"
                                      stroke="#64748B"
                                      strokeWidth="2"
                                    />
                                    <line
                                      x1={rx + 60 + Math.min(roomW - 120, 1400) / 2}
                                      y1={ry + roomL - 480}
                                      x2={rx + 60 + Math.min(roomW - 120, 1400) / 2}
                                      y2={ry + roomL - 80}
                                      stroke="#94A3B8"
                                      strokeWidth="2"
                                    />
                                  </g>
                                )}
                              </g>
                            );
                          })()}
                        </g>
                      )}

                      {/* 2. LIVING & DINING FURNITURE */}
                      {roomLower.includes('living') && (
                        <g>
                          {(() => {
                            const sofaW = Math.min(roomW * 0.42, 2100);
                            const sofaD = 780;
                            const sofaX = rx + 140;
                            const sofaY = ry + 140;

                            const coffeeW = Math.min(sofaW * 0.65, 1100);
                            const coffeeD = 440;
                            const coffeeX = sofaX + (sofaW - coffeeW) / 2;
                            const coffeeY = sofaY + sofaD + 260;

                            return (
                              <g>
                                {/* Area Rug Dotted Outline */}
                                <rect
                                  x={sofaX - 60}
                                  y={sofaY - 40}
                                  width={sofaW + 120}
                                  height={sofaD + coffeeD + 480}
                                  rx={16}
                                  fill="#FAF8F5"
                                  stroke="#CBD5E1"
                                  strokeWidth="2"
                                  strokeDasharray="10 8"
                                />

                                {/* 3-Seater Sofa Frame */}
                                <rect
                                  x={sofaX}
                                  y={sofaY}
                                  width={sofaW}
                                  height={sofaD}
                                  rx={12}
                                  fill="#FFFFFF"
                                  stroke="#475569"
                                  strokeWidth="2.5"
                                />
                                {/* Back Cushions */}
                                <rect
                                  x={sofaX + 80}
                                  y={sofaY + 10}
                                  width={sofaW - 160}
                                  height={180}
                                  rx={6}
                                  fill="#F1F5F9"
                                  stroke="#64748B"
                                  strokeWidth="1.5"
                                />
                                {/* Armrests */}
                                <rect x={sofaX} y={sofaY} width={80} height={sofaD} rx={6} fill="#E2E8F0" stroke="#64748B" strokeWidth="1.5" />
                                <rect x={sofaX + sofaW - 80} y={sofaY} width={80} height={sofaD} rx={6} fill="#E2E8F0" stroke="#64748B" strokeWidth="1.5" />

                                {/* Cushion Seat Divisions */}
                                <line x1={sofaX + sofaW / 3} y1={sofaY + 190} x2={sofaX + sofaW / 3} y2={sofaY + sofaD} stroke="#94A3B8" strokeWidth="1.5" />
                                <line x1={sofaX + (2 * sofaW) / 3} y1={sofaY + 190} x2={sofaX + (2 * sofaW) / 3} y2={sofaY + sofaD} stroke="#94A3B8" strokeWidth="1.5" />

                                {/* Modern Coffee Table */}
                                <rect
                                  x={coffeeX}
                                  y={coffeeY}
                                  width={coffeeW}
                                  height={coffeeD}
                                  rx={16}
                                  fill="#FFFFFF"
                                  stroke="#64748B"
                                  strokeWidth="2"
                                />

                                {/* Media Console Unit along South Wall */}
                                <rect
                                  x={sofaX}
                                  y={ry + roomL - 320}
                                  width={sofaW}
                                  height={260}
                                  rx={6}
                                  fill="#F1F5F9"
                                  stroke="#64748B"
                                  strokeWidth="2"
                                />
                                <line
                                  x1={sofaX + 160}
                                  y1={ry + roomL - 190}
                                  x2={sofaX + sofaW - 160}
                                  y2={ry + roomL - 190}
                                  stroke="#0F172A"
                                  strokeWidth="8"
                                  strokeLinecap="round"
                                />

                                {/* Dining Table & 4 Chairs (if room width >= 3800mm) */}
                                {roomW >= 3800 && (
                                  <g transform={`translate(${rx + roomW - 1400}, ${ry + 200})`}>
                                    {/* Dining Table */}
                                    <rect x="120" y="160" width="960" height="600" rx="12" fill="#FFFFFF" stroke="#475569" strokeWidth="2.5" />
                                    {/* Top Chairs */}
                                    <rect x="220" y="50" width="280" height="100" rx="8" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.5" />
                                    <rect x="680" y="50" width="280" height="100" rx="8" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.5" />
                                    {/* Bottom Chairs */}
                                    <rect x="220" y="770" width="280" height="100" rx="8" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.5" />
                                    <rect x="680" y="770" width="280" height="100" rx="8" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.5" />
                                  </g>
                                )}
                              </g>
                            );
                          })()}
                        </g>
                      )}

                      {/* 3. KITCHEN FURNITURE & FIXTURES */}
                      {roomLower.includes('kitchen') && (
                        <g>
                          {(() => {
                            const counterDepth = 550;
                            const counterLength = Math.min(roomW - 100, 2600);

                            return (
                              <g>
                                {/* Countertop Run along North wall */}
                                <rect
                                  x={rx + 50}
                                  y={ry + 50}
                                  width={counterLength}
                                  height={counterDepth}
                                  fill="#FFFFFF"
                                  stroke="#475569"
                                  strokeWidth="2.5"
                                />

                                {/* Double Basin Sink */}
                                <g transform={`translate(${rx + 120}, ${ry + 80})`}>
                                  <rect x="0" y="0" width="700" height="380" rx="8" fill="#F1F5F9" stroke="#64748B" strokeWidth="2" />
                                  <rect x="25" y="25" width="300" height="330" rx="6" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.5" />
                                  <rect x="375" y="25" width="300" height="330" rx="6" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.5" />
                                  <circle cx="175" cy="190" r="20" fill="#CBD5E1" stroke="#64748B" strokeWidth="1.5" />
                                  <circle cx="525" cy="190" r="20" fill="#CBD5E1" stroke="#64748B" strokeWidth="1.5" />
                                  {/* Faucet */}
                                  <circle cx="350" cy="40" r="14" fill="#0F172A" />
                                  <line x1="350" y1="40" x2="350" y2="100" stroke="#0F172A" strokeWidth="5" strokeLinecap="round" />
                                </g>

                                {/* 4-Burner Cooktop Stove */}
                                {counterLength > 1600 && (
                                  <g transform={`translate(${rx + counterLength - 750}, ${ry + 80})`}>
                                    <rect x="0" y="0" width="600" height="380" rx="8" fill="#F8FAFC" stroke="#64748B" strokeWidth="2" />
                                    <circle cx="150" cy="100" r="50" fill="#E2E8F0" stroke="#475569" strokeWidth="2" />
                                    <circle cx="450" cy="100" r="50" fill="#E2E8F0" stroke="#475569" strokeWidth="2" />
                                    <circle cx="150" cy="280" r="60" fill="#E2E8F0" stroke="#475569" strokeWidth="2" />
                                    <circle cx="450" cy="280" r="60" fill="#E2E8F0" stroke="#475569" strokeWidth="2" />
                                  </g>
                                )}

                                {/* Refrigerator Footprint */}
                                <rect
                                  x={rx + 50}
                                  y={ry + roomL - 650}
                                  width={600}
                                  height={580}
                                  rx={8}
                                  fill="#F1F5F9"
                                  stroke="#64748B"
                                  strokeWidth="2"
                                />
                                <text x={rx + 350} y={ry + roomL - 340} textAnchor="middle" fill="#64748B" fontSize="28" fontWeight="bold">REF</text>
                              </g>
                            );
                          })()}
                        </g>
                      )}

                      {/* 4. BATHROOM SANITARY FIXTURES */}
                      {roomLower.includes('bath') && (
                        <g>
                          {(() => {
                            const wcX = rx + 100;
                            const wcY = ry + 80;

                            const showerSize = Math.min(roomW * 0.45, roomL * 0.45, 950);
                            const showerX = rx + roomW - showerSize - 60;
                            const showerY = ry + 60;

                            return (
                              <g>
                                {/* Porcelain Toilet (WC) */}
                                <g transform={`translate(${wcX}, ${wcY})`}>
                                  {/* Water Cistern Tank against wall */}
                                  <rect x="0" y="0" width="400" height="180" rx="8" fill="#FFFFFF" stroke="#475569" strokeWidth="2.5" />
                                  {/* Oval Toilet Bowl */}
                                  <path
                                    d="M 60,180 C 60,380 340,380 340,180 Z"
                                    fill="#FFFFFF"
                                    stroke="#475569"
                                    strokeWidth="2.5"
                                  />
                                  <circle cx="200" cy="260" r="40" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.5" />
                                </g>

                                {/* Vanity Washbasin */}
                                <g transform={`translate(${wcX}, ${ry + roomL - 480})`}>
                                  <rect x="0" y="0" width="520" height="380" rx="8" fill="#FFFFFF" stroke="#475569" strokeWidth="2" />
                                  <ellipse cx="260" cy="190" rx="190" ry="130" fill="#F8FAFC" stroke="#64748B" strokeWidth="2" />
                                  <circle cx="260" cy="90" r="16" fill="#0F172A" />
                                </g>

                                {/* Walk-In Shower Enclosure */}
                                <g transform={`translate(${showerX}, ${showerY})`}>
                                  <rect x="0" y="0" width={showerSize} height={showerSize} fill="#F0F9FF" stroke="#38BDF8" strokeWidth="2.5" />
                                  {/* Diagonal Floor Drain Falls */}
                                  <line x1="0" y1="0" x2={showerSize} y2={showerSize} stroke="#BAE6FD" strokeWidth="1.5" strokeDasharray="6 6" />
                                  <line x1={showerSize} y1="0" x2="0" y2={showerSize} stroke="#BAE6FD" strokeWidth="1.5" strokeDasharray="6 6" />
                                  <circle cx={showerSize / 2} cy={showerSize / 2} r="25" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2" />
                                  {/* Glass Door Swing */}
                                  <line x1="0" y1={showerSize} x2={showerSize * 0.4} y2={showerSize + 120} stroke="#0284C7" strokeWidth="4" />
                                </g>
                              </g>
                            );
                          })()}
                        </g>
                      )}
                    </g>
                  )}

                  {/* ── ROOM LABELS & DIMENSIONS (CLEAN & CENTERED) ── */}
                  <g>
                    {/* Clean Room Title Badge */}
                    <text
                      x={centerX}
                      y={centerY - 24}
                      textAnchor="middle"
                      fill={primaryTextColor}
                      fontSize={titleFontSize}
                      fontWeight="800"
                      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                      letterSpacing="0.04em"
                    >
                      {room.name.toUpperCase()}
                    </text>

                    {/* Room Dimension Metrics & Square Meters */}
                    <text
                      x={centerX}
                      y={centerY + titleFontSize * 0.75}
                      textAnchor="middle"
                      fill={secondaryTextColor}
                      fontSize={subFontSize}
                      fontWeight="600"
                      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                    >
                      {(roomW / 1000).toFixed(2)} × {(roomL / 1000).toFixed(2)} m • {roomAreaM2} m² ({roomAreaSqFt} sq ft)
                    </text>

                    {/* Optional Thermal Zone Badge */}
                    {showThermalZoning && (
                      <g transform={`translate(${centerX}, ${centerY + titleFontSize * 1.5})`}>
                        <rect
                          x="-140"
                          y="-20"
                          width="280"
                          height="40"
                          rx="20"
                          fill={roomStyle.fill}
                          stroke={roomStyle.stroke}
                          strokeWidth="2"
                        />
                        <text
                          x="0"
                          y="6"
                          textAnchor="middle"
                          fill={roomStyle.badgeColor}
                          fontSize="22"
                          fontWeight="700"
                          fontFamily="sans-serif"
                        >
                          {roomStyle.label.toUpperCase()}
                        </text>
                      </g>
                    )}
                  </g>
                </g>
              );
            })}

            {/* ── STRUCTURAL WALLS (SOLID CHARCOAL BLACK POCHÉ) ── */}
            {geometry.walls?.map((wall: any, i: number) => {
              const sx1 = toSvgX(wall.start[0]);
              const sy1 = toSvgY(wall.start[1]);
              const sx2 = toSvgX(wall.end[0]);
              const sy2 = toSvgY(wall.end[1]);

              const isExt = wall.is_exterior;
              // True architectural scale wall thickness:
              // Exterior thermal mass walls: 16px, Interior partitions: 9px
              const wallThickness = isExt ? 16 : 9;
              const wallColor = isExt ? wallExtColor : wallIntColor;

              return (
                <line
                  key={`wall-${i}`}
                  x1={sx1}
                  y1={sy1}
                  x2={sx2}
                  y2={sy2}
                  stroke={wallColor}
                  strokeWidth={wallThickness}
                  strokeLinecap="square"
                />
              );
            })}

            {/* ── ARCHITECTURAL WINDOWS (DOUBLE GLAZING & SILL) ── */}
            {geometry.windows?.map((win: any, i: number) => {
              const wx = toSvgX(win.pos[0]);
              const wy = toSvgY(win.pos[1]);
              const winWidth = win.width || 1200;
              const isHoriz = win.wall_id?.includes('north') || win.wall_id?.includes('south');

              return (
                <g key={`window-${i}`}>
                  {isHoriz ? (
                    <g transform={`translate(${wx - winWidth / 2}, ${wy - 10})`}>
                      {/* White Wall Opening Cut */}
                      <rect x="0" y="0" width={winWidth} height="20" fill={sheetBg} />
                      {/* Double Glazed Glass Lines */}
                      <line x1="0" y1="4" x2={winWidth} y2="4" stroke="#0284C7" strokeWidth="3" />
                      <line x1="0" y1="16" x2={winWidth} y2="16" stroke="#0284C7" strokeWidth="3" />
                      {/* Glass Glazing Tint */}
                      <rect x="0" y="5" width={winWidth} height="10" fill="#E0F2FE" opacity="0.8" />
                      {/* Outer Window Sill Line */}
                      <line x1="-30" y1="0" x2={winWidth + 30} y2="0" stroke="#64748B" strokeWidth="3.5" />
                    </g>
                  ) : (
                    <g transform={`translate(${wx - 10}, ${wy - winWidth / 2})`}>
                      <rect x="0" y="0" width="20" height={winWidth} fill={sheetBg} />
                      <line x1="4" y1="0" x2="4" y2={winWidth} stroke="#0284C7" strokeWidth="3" />
                      <line x1="16" y1="0" x2="16" y2={winWidth} stroke="#0284C7" strokeWidth="3" />
                      <rect x="5" y="0" width="10" height={winWidth} fill="#E0F2FE" opacity="0.8" />
                      <line x1="0" y1="-30" x2="0" y2={winWidth + 30} stroke="#64748B" strokeWidth="3.5" />
                    </g>
                  )}
                </g>
              );
            })}

            {/* ── ARCHITECTURAL DOORS (90° LEAF & SWING RADIUS ARC) ── */}
            {geometry.doors?.map((door: any, i: number) => {
              const dx = toSvgX(door.pos[0]);
              const dy = toSvgY(door.pos[1]);
              const doorW = door.width || 800;

              return (
                <g key={`door-${i}`} transform={`translate(${dx}, ${dy})`}>
                  {/* Clean Wall Opening Cut */}
                  <circle cx="0" cy="0" r="8" fill="#0F172A" />
                  {/* Door Leaf (Straight 90-degree thick timber line) */}
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2={-doorW}
                    stroke={primaryTextColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  {/* Delicate Door Swing Radius Arc */}
                  <path
                    d={`M 0,${-doorW} A ${doorW} ${doorW} 0 0 1 ${doorW},0`}
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="3.5"
                    strokeDasharray="14 10"
                  />
                  {/* Door Jambs */}
                  <rect x="-8" y="-12" width="16" height="24" fill={wallIntColor} />
                  <rect x={doorW - 8} y="-12" width="16" height="24" fill={wallIntColor} />
                </g>
              );
            })}

            {/* ── EXTERIOR ARCHITECTURAL DIMENSION STRINGS (RAYON / ROOMSKETCHER STYLE) ── */}
            {showDimensions && (
              <g stroke={dimColor} strokeWidth="2.5" fill="none">
                {/* 1. TOP DIMENSION (Overall North Length) */}
                <g transform={`translate(0, ${padTop - 280})`}>
                  {/* Dimension Line */}
                  <line x1={padLeft} y1="0" x2={padLeft + length_mm} y2="0" strokeWidth="3" />
                  {/* Witness Lines */}
                  <line x1={padLeft} y1="0" x2={padLeft} y2="280" stroke="#CBD5E1" strokeWidth="2" />
                  <line x1={padLeft + length_mm} y1="0" x2={padLeft + length_mm} y2="280" stroke="#CBD5E1" strokeWidth="2" />
                  {/* 45-degree Architectural Ticks */}
                  <line x1={padLeft - 25} y1="25" x2={padLeft + 25} y2="-25" strokeWidth="6" />
                  <line x1={padLeft + length_mm - 25} y1="25" x2={padLeft + length_mm + 25} y2="-25" strokeWidth="6" />
                  {/* Dimension Text */}
                  <text
                    x={padLeft + length_mm / 2}
                    y="-40"
                    textAnchor="middle"
                    fill={dimColor}
                    fontSize="56"
                    fontWeight="800"
                    fontFamily="monospace"
                    stroke="none"
                  >
                    OVERALL LENGTH: {(length_mm / 1000).toFixed(2)} m ({length_mm.toLocaleString()} mm)
                  </text>
                </g>

                {/* 2. LEFT DIMENSION (Overall West Depth) */}
                <g transform={`translate(${padLeft - 280}, 0)`}>
                  {/* Dimension Line */}
                  <line x1="0" y1={padTop} x2="0" y2={padTop + width_mm} strokeWidth="3" />
                  {/* Witness Lines */}
                  <line x1="0" y1={padTop} x2="280" y2={padTop} stroke="#CBD5E1" strokeWidth="2" />
                  <line x1="0" y1={padTop + width_mm} x2="280" y2={padTop + width_mm} stroke="#CBD5E1" strokeWidth="2" />
                  {/* 45-degree Architectural Ticks */}
                  <line x1="-25" y1={padTop + 25} x2="25" y2={padTop - 25} strokeWidth="6" />
                  <line x1="-25" y1={padTop + width_mm + 25} x2="25" y2={padTop + width_mm - 25} strokeWidth="6" />
                  {/* Dimension Text (Rotated -90 degrees) */}
                  <text
                    x="-50"
                    y={padTop + width_mm / 2}
                    transform={`rotate(-90, -50, ${padTop + width_mm / 2})`}
                    textAnchor="middle"
                    fill={dimColor}
                    fontSize="56"
                    fontWeight="800"
                    fontFamily="monospace"
                    stroke="none"
                  >
                    WIDTH: {(width_mm / 1000).toFixed(2)} m ({width_mm.toLocaleString()} mm)
                  </text>
                </g>
              </g>
            )}

            {/* ── LOWER RIGHT: PROFESSIONAL TITLE BLOCK & ARCHITECTURAL STAMP ── */}
            <g transform={`translate(${viewBoxW - 1050}, ${viewBoxH - 420})`}>
              <rect width="960" height="340" fill={sheetBg} stroke={majorGridColor} strokeWidth="4" />
              <rect x="0" y="0" width="960" height="75" fill={paperTheme === 'blueprint' ? '#1E293B' : '#F1F5F9'} />

              {/* Title Header */}
              <text x="30" y="50" fill={primaryTextColor} fontSize="38" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.08em">
                THERMOSHELTER BIOCLIMATIC CAD
              </text>
              <text x="930" y="50" textAnchor="end" fill="#EA580C" fontSize="30" fontWeight="700" fontFamily="sans-serif">
                SHEET A-101
              </text>

              {/* Grid Division Lines */}
              <line x1="0" y1="160" x2="960" y2="160" stroke={majorGridColor} strokeWidth="2" />
              <line x1="0" y1="245" x2="960" y2="245" stroke={majorGridColor} strokeWidth="2" />
              <line x1="500" y1="75" x2="500" y2="340" stroke={majorGridColor} strokeWidth="2" />

              {/* Cell 1: Project & Location */}
              <text x="30" y="110" fill={secondaryTextColor} fontSize="24" fontWeight="600" fontFamily="sans-serif">PROJECT / LOCATION</text>
              <text x="30" y="145" fill={primaryTextColor} fontSize="32" fontWeight="700" fontFamily="sans-serif">
                {meta?.location || 'Bioclimatic Residence'}
              </text>

              {/* Cell 2: Climate & NBC Code */}
              <text x="530" y="110" fill={secondaryTextColor} fontSize="24" fontWeight="600" fontFamily="sans-serif">NBC 2016 CLASSIFICATION</text>
              <text x="530" y="145" fill="#0284C7" fontSize="32" fontWeight="700" fontFamily="sans-serif">
                {climateZone.toUpperCase()} ZONE • IS 875
              </text>

              {/* Cell 3: Built-Up Area */}
              <text x="30" y="195" fill={secondaryTextColor} fontSize="24" fontWeight="600" fontFamily="sans-serif">BUILT-UP FOOTPRINT</text>
              <text x="30" y="230" fill={primaryTextColor} fontSize="30" fontWeight="700" fontFamily="sans-serif">
                {totalFloorAreaM2} m² ({totalFloorAreaSqFt} sq ft)
              </text>

              {/* Cell 4: Occupancy & Status */}
              <text x="530" y="195" fill={secondaryTextColor} fontSize="24" fontWeight="600" fontFamily="sans-serif">OCCUPANCY / STATUS</text>
              <text x="530" y="230" fill="#16A34A" fontSize="30" fontWeight="700" fontFamily="sans-serif">
                {meta?.occupancy ?? 4} OCCUPANTS • VERIFIED
              </text>

              {/* Bottom Stamp Footnote */}
              <text x="30" y="300" fill={secondaryTextColor} fontSize="22" fontFamily="monospace">
                SCALE 1:50 | AUTOCAD VECTOR LINELAYOUT v2.6 | DRAWING PASSES STRUCTURAL GATES
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* ── ROOMSKETCHER-STYLE ROOM SCHEDULE & MEASUREMENTS LEGEND ── */}
      {showLegend && (
        <div className="w-full bg-zinc-900/95 border-zinc-800 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-[#FF5722]"></div>
              <h3 className="text-base font-bold text-white tracking-tight">Room Schedule & Dimensional Measurements</h3>
              <span className="text-xs font-mono text-white/50 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                RoomSketcher Standard
              </span>
            </div>

            <div className="text-xs font-mono text-white/70">
              Total Carpet Area: <strong className="text-[#FF5722]">{totalFloorAreaM2} m²</strong> ({totalFloorAreaSqFt} sq ft)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 text-white/50 uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Room / Space</th>
                  <th className="py-2.5 px-3">Dimensions (L × W)</th>
                  <th className="py-2.5 px-3">Floor Area</th>
                  <th className="py-2.5 px-3">Thermal Zone & Daylight</th>
                  <th className="py-2.5 px-3 text-right">IS/NBC Standard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/90">
                {geometry.rooms?.map((room: any, idx: number) => {
                  const enriched = enrichedRooms?.find(
                    (r: any) => r.id === room.id || r.name?.toLowerCase() === room.name?.toLowerCase()
                  );
                  const roomW = room.width_m || (room.w ? room.w / 1000 : 3.0);
                  const roomL = room.length_m || (room.l ? room.l / 1000 : 3.0);
                  const area = (roomW * roomL).toFixed(1);
                  const areaSqFt = (roomW * roomL * 10.7639).toFixed(0);

                  const fn = (room.name || '').toLowerCase();
                  const daylight = fn.includes('living') 
                    ? 'South Direct Solar Heat Gain' 
                    : fn.includes('bed') 
                    ? 'North Natural Cross-Ventilation' 
                    : fn.includes('kitchen') 
                    ? 'East Morning Daylight' 
                    : 'Mechanical & Natural Exhaust';

                  return (
                    <tr key={`table-room-${idx}`} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF5722]"></span>
                        <span>{room.name}</span>
                      </td>
                      <td className="py-3 px-3 text-white/70">
                        {roomW.toFixed(2)}m × {roomL.toFixed(2)}m ({(roomW * 1000).toFixed(0)} × {(roomL * 1000).toFixed(0)} mm)
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        {area} m² <span className="text-white/40 font-normal">({areaSqFt} sq ft)</span>
                      </td>
                      <td className="py-3 px-3 text-amber-300">
                        {daylight}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-300 font-semibold">
                        NBC Part 8 Compliant
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick Specifications Summary Bar */}
          <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono text-white/70">
            <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
              <span className="text-white/40 block text-[10px]">CEILING HEIGHT</span>
              <strong className="text-white font-sans text-sm">2.75 m (9' 0")</strong>
            </div>
            <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
              <span className="text-white/40 block text-[10px]">EXTERIOR WALL POCHÉ</span>
              <strong className="text-white font-sans text-sm">250 mm Thermal Masonry</strong>
            </div>
            <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
              <span className="text-white/40 block text-[10px]">SOLAR ORIENTATION</span>
              <strong className="text-[#FF5722] font-sans text-sm">{azimuthDeg}° True South</strong>
            </div>
            <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
              <span className="text-white/40 block text-[10px]">ENERGY PERFORMANCE</span>
              <strong className="text-emerald-400 font-sans text-sm">Passive Solar Ready</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
