import React from 'react';
import { Thermometer } from 'lucide-react';

export interface ThermalTelemetryData {
  ambientOutside: number; // °C
  estIndoorTemp: number; // °C
  solarHeatGain: number; // kWh/day
  heatLossRate: number; // W/m²K
  windowUValue?: number; // W/m²K
  fenestrationSolarGain?: number; // kWh/day
  comfortScorePct?: number; // %
  deltaT?: number; // °C
}

interface ThermalPhysicsTelemetryCardProps {
  telemetry: ThermalTelemetryData;
  className?: string;
  isLive?: boolean;
}

export const ThermalPhysicsTelemetryCard: React.FC<ThermalPhysicsTelemetryCardProps> = ({
  telemetry,
  className = '',
  isLive = false,
}) => {
  const deltaT = telemetry.deltaT ?? Math.round((telemetry.estIndoorTemp - telemetry.ambientOutside) * 10) / 10;
  const isWarming = deltaT > 0;

  return (
    <div
      className={`w-72 md:w-84 glass-card-premium p-5 flex flex-col gap-3.5 select-none ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2 text-slate-300">
          <div className="p-1.5 rounded-lg bg-[#FF5722]/10 border border-[#FF5722]/20">
            <Thermometer className="w-4 h-4 text-[#FF5722]" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider font-mono">
            Live Temperature & Comfort
          </span>
        </div>

        {isLive && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono font-bold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE</span>
          </div>
        )}
      </div>

      {/* Metric 1: AMBIENT OUTSIDE */}
      <div className="flex items-baseline justify-between py-1 border-b border-white/5">
        <span className="font-mono text-slate-400 uppercase text-[10px] tracking-wider">
          Outside Weather
        </span>
        <span className="font-mono font-bold text-base text-slate-200">
          {telemetry.ambientOutside.toFixed(1)}°C
        </span>
      </div>

      {/* Metric 2: EST. INDOOR TEMP (Hero Value with Delta T) */}
      <div className="flex items-baseline justify-between py-1 border-b border-white/5">
        <div className="flex flex-col">
          <span className="font-mono text-slate-400 uppercase text-[10px] tracking-wider">
            Inside Temperature
          </span>
          <span className="text-[9px] font-mono font-bold text-slate-400">
            ΔT: <span className={isWarming ? 'text-emerald-400' : 'text-[#FF5722]'}>
              {isWarming ? `+${deltaT.toFixed(1)}` : deltaT.toFixed(1)}°C
            </span>
          </span>
        </div>
        <span className="font-mono font-black text-2xl text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]">
          {telemetry.estIndoorTemp.toFixed(1)}°C
        </span>
      </div>

      {/* Metric 3: FENESTRATION / GLAZING U-VALUE */}
      {telemetry.windowUValue !== undefined && (
        <div className="flex items-baseline justify-between py-1 border-b border-white/5">
          <span className="font-mono text-slate-400 uppercase text-[10px] tracking-wider">
            Window Heat Loss (Lower is better)
          </span>
          <div className="flex items-baseline gap-1 font-mono">
            <span className="font-bold text-base text-[#FF5722]">
              {telemetry.windowUValue.toFixed(1)}
            </span>
            <span className="text-[10px] text-[#FF5722]/70 font-sans">W/m²K</span>
          </div>
        </div>
      )}

      {/* Metric 4: SOLAR HEAT GAIN */}
      <div className="flex items-baseline justify-between py-1 border-b border-white/5">
        <div className="flex flex-col">
          <span className="font-mono text-slate-400 uppercase text-[10px] tracking-wider">
            Sun Heat Captured
          </span>
          {telemetry.fenestrationSolarGain !== undefined && (
            <span className="text-[9px] font-mono text-amber-300/70">
              Glazing: {telemetry.fenestrationSolarGain.toFixed(1)} kWh
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="font-bold text-base text-amber-400">
            {telemetry.solarHeatGain.toFixed(1)}
          </span>
          <span className="text-[10px] text-amber-300/70 font-sans">kWh/day</span>
        </div>
      </div>

      {/* Metric 5: OVERALL ENVELOPE HEAT LOSS RATE */}
      <div className="flex items-baseline justify-between py-1">
        <span className="font-mono text-slate-400 uppercase text-[10px] tracking-wider">
          Envelope Heat Loss Rate (Walls/Roof)
        </span>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="font-bold text-base text-orange-400">
            {telemetry.heatLossRate.toFixed(1)}
          </span>
          <span className="text-[10px] text-orange-300/70 font-sans">W/m²K</span>
        </div>
      </div>
    </div>
  );
};
