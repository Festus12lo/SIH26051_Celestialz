import React, { useState } from 'react';
import { Layers, Thermometer, ShieldAlert, ArrowRight, CheckCircle2, ChevronRight, Sliders } from 'lucide-react';

interface WallAssemblyVisualizerProps {
  wallAssembly: {
    layers?: Array<{
      material: string;
      thickness_mm: number;
      conductivity_w_m_k: number;
      r_value_si: number;
    }>;
    total_thickness_m?: number;
    r_value_si?: number;
    u_value_si?: number;
  };
  roof?: {
    type?: string;
    slope_deg?: number;
    span_m?: number;
    ridge_height_m?: number;
    overhang_mm?: number;
    beam?: any;
    loads?: any;
  };
  climate?: any;
}

export default function WallAssemblyVisualizer({
  wallAssembly,
  roof,
  climate,
}: WallAssemblyVisualizerProps) {
  const climateZone = (climate?.zone || 'Moderate').toLowerCase();
  
  // Default outdoor temperature based on climate
  const defaultExtTemp = climateZone.includes('cold') ? -12 : (climateZone.includes('hot') ? 42 : 18);
  const [extTemp, setExtTemp] = useState<number>(defaultExtTemp);
  const intTargetTemp = 21; // Target indoor comfort temperature (°C)

  const layers = wallAssembly?.layers && wallAssembly.layers.length > 0 ? wallAssembly.layers : [
    { material: 'Protective Lime Render', thickness_mm: 15, conductivity_w_m_k: 0.8, r_value_si: 0.019 },
    { material: 'Compressed Stabilized Earth Block (CSEB)', thickness_mm: 230, conductivity_w_m_k: 0.85, r_value_si: 0.27 },
    { material: 'Wood Wool Insulation Board', thickness_mm: 75, conductivity_w_m_k: 0.065, r_value_si: 1.15 },
    { material: 'Interior Clay/Gypsum Plaster', thickness_mm: 15, conductivity_w_m_k: 0.35, r_value_si: 0.043 },
  ];

  const totalThicknessMm = layers.reduce((acc, l) => acc + (l.thickness_mm || 0), 0);
  const totalR = wallAssembly?.r_value_si || layers.reduce((acc, l) => acc + (l.r_value_si || 0.01), 0);
  const uValue = wallAssembly?.u_value_si || (totalR > 0 ? (1 / totalR) : 0.45);

  // Compute thermal drop profile through each layer
  // T(x) across each boundary
  let currentTemp = extTemp;
  const tempProfile: Array<{
    boundaryName: string;
    temp: number;
    layer?: any;
    xPercent: number;
  }> = [
    {
      boundaryName: 'Exterior Surface',
      temp: extTemp,
      xPercent: 0,
    }
  ];

  let accumulatedMm = 0;
  layers.forEach((layer, idx) => {
    const layerR = layer.r_value_si || 0.05;
    const deltaT = (layerR / (totalR || 1)) * (extTemp - intTargetTemp);
    currentTemp = currentTemp - deltaT;
    accumulatedMm += layer.thickness_mm;
    const xPct = Math.round((accumulatedMm / totalThicknessMm) * 100);

    tempProfile.push({
      boundaryName: idx === layers.length - 1 ? 'Interior Surface' : `Interface ${idx + 1}`,
      temp: Math.round(currentTemp * 10) / 10,
      layer,
      xPercent: xPct,
    });
  });

  // Color mapping for materials
  const getLayerColor = (name: string, idx: number) => {
    const lower = name.toLowerCase();
    if (lower.includes('insul') || lower.includes('wool') || lower.includes('cork') || lower.includes('puf') || lower.includes('xps')) {
      return { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-300', tag: 'Thermal Insulation' };
    }
    if (lower.includes('earth') || lower.includes('cseb') || lower.includes('brick') || lower.includes('stone') || lower.includes('laterite') || lower.includes('rammed')) {
      return { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-300', tag: 'Thermal Mass' };
    }
    if (lower.includes('plaster') || lower.includes('render') || lower.includes('lime') || lower.includes('clay')) {
      return { bg: 'bg-zinc-800/50', border: 'border-zinc-700', text: 'text-zinc-300', tag: 'Vapor & Protective Finish' };
    }
    return { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-300', tag: 'Structural Element' };
  };

  return (
    <div className="w-full space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium mb-2">
            <Layers size={13} />
            <span>WALL & ROOF LAYERS</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white font-heading">
            Wall & Roof Layer Protection
          </h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-3xl">
            See how each wall layer blocks outdoor heat or freezing cold. Drag the slider to test how warm and comfortable the inside stays even when outside weather changes drastically.
          </p>
        </div>

        {/* Assembly Metrics */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
            WALL THICKNESS: <strong className="text-white">{totalThicknessMm} mm</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
            R-VALUE: <strong className="text-emerald-400">R-{totalR.toFixed(2)} m²K/W</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
            U-VALUE: <strong className="text-white font-bold">{uValue.toFixed(3)} W/m²K</strong>
          </span>
        </div>
      </div>

      {/* Interactive Temperature Simulation Bar */}
      <div className="glass-card-subtle p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-2 text-zinc-300">
          <Sliders size={16} className="text-amber-400" />
          <span>Interactive Outside Weather Test:</span>
          <span className="font-bold text-amber-400 text-sm">{extTemp}°C Outside</span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-64">
          <span className="text-zinc-500">-20°C</span>
          <input 
            type="range" 
            min="-20" 
            max="48" 
            value={extTemp}
            onChange={(e) => setExtTemp(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FF5722]"
          />
          <span className="text-zinc-500">+48°C</span>
        </div>
      </div>

      {/* Visual Multi-Layer Cross-Section with Temperature Gradient */}
      <div className="relative glass-card-premium p-6 md:p-8 overflow-hidden space-y-6">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span>OUTSIDE WEATHER ( {extTemp}°C)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
            <span>INSIDE ROOM (Target:  {intTargetTemp}°C)</span>
          </div>
        </div>

        {/* Layers Stack Graphic */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative z-10">
          {layers.map((layer, idx) => {
            const style = getLayerColor(layer.material, idx);
            const relativeWidthPct = Math.max(15, Math.round((layer.thickness_mm / totalThicknessMm) * 100));

            return (
              <div 
                key={idx} 
                className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${style.bg} ${style.border}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-black/40 text-zinc-300">
                      Layer 0{idx + 1}
                    </span>
                    <span className={`text-[10px] font-mono font-medium ${style.text}`}>
                      {style.tag}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug">
                    {layer.material}
                  </h4>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-1 font-mono text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Thickness:</span>
                    <span className="text-white font-medium">{layer.thickness_mm} mm</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Conductivity (k):</span>
                    <span className="text-white font-medium">{layer.conductivity_w_m_k} W/mK</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Resistance (R):</span>
                    <span className="text-emerald-400 font-bold">{layer.r_value_si?.toFixed(2)} m²K/W</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Temperature Gradient Step Curve */}
        <div className="mt-6 p-4 rounded-xl bg-black/50 border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Thermometer size={14} className="text-white font-bold" />
              1D Steady-State Temperature Drop Gradient Across Boundaries:
            </span>
            <span className="text-emerald-400">
              ΔT Total: {Math.abs(extTemp - intTargetTemp)}°C
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 overflow-x-auto py-2">
            {tempProfile.map((pt, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center min-w-[70px]">
                  <span className="text-[10px] font-mono text-zinc-500">{pt.boundaryName}</span>
                  <div className={`mt-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                    pt.temp > 25 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                    pt.temp < 10 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {pt.temp}°C
                  </div>
                </div>
                {i < tempProfile.length - 1 && (
                  <ArrowRight size={14} className="text-zinc-600 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Roof & Overhead Structure Details */}
      {roof && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-card-subtle p-6 space-y-2.5 flex flex-col justify-between group">
            <span className="text-xs font-mono text-zinc-500 uppercase">Roof Architecture</span>
            <div className="text-lg font-bold text-white capitalize">{roof.type || 'Pitched Gable'} Roof</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Designed with a {roof.slope_deg || 25}° slope to rapidly shed precipitation and maximize southern photovoltaic or solar thermal collection angle.
            </p>
          </div>

          <div className="glass-card-subtle p-6 space-y-2.5 flex flex-col justify-between group">
            <span className="text-xs font-mono text-zinc-500 uppercase">Solar Eaves Overhang</span>
            <div className="text-lg font-bold text-amber-400">{roof.overhang_mm || 600} mm Projection</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Calculated solar overhang blocks high summer noon rays (68° altitude) while admitting low-angle winter sunlight (26° altitude) for free solar heating.
            </p>
          </div>

          <div className="glass-card-subtle p-6 space-y-2.5 flex flex-col justify-between group">
            <span className="text-xs font-mono text-zinc-500 uppercase">Structural Roof Truss</span>
            <div className="text-lg font-bold text-emerald-400">{roof.span_m || 6.0}m Span Capacity</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Engineered for regional load compliance with timber/steel purlins sized to withstand severe snow accumulation and gust wind pressure.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
