import React from 'react';
import { SeasonType } from '../types/architectural';
import { SOLAR_STUDY_PRESETS } from '../data/residenceData';
import { Sun, Wind, Thermometer, ShieldCheck, Compass, Clock, Zap } from 'lucide-react';

interface SolarStudyPanelProps {
  timeOfDayHours: number;
  onChangeTimeOfDay: (hours: number) => void;
  season: SeasonType;
  onChangeSeason: (season: SeasonType) => void;
  showAirflow: boolean;
  onToggleAirflow: () => void;
  onClose: () => void;
}

export const SolarStudyPanel: React.FC<SolarStudyPanelProps> = ({
  timeOfDayHours,
  onChangeTimeOfDay,
  season,
  onChangeSeason,
  showAirflow,
  onToggleAirflow,
  onClose,
}) => {
  // Compute solar altitude and azimuth for current parameters
  let peakAlt = 76.5;
  if (season === 'equinox') peakAlt = 52.0;
  if (season === 'winter_solstice') peakAlt = 38.5;

  const solarProg = Math.max(0, Math.min(1, (timeOfDayHours - 6) / 12));
  const isDay = timeOfDayHours >= 6.0 && timeOfDayHours <= 18.8;
  const currentAlt = isDay ? Math.round(Math.sin(solarProg * Math.PI) * peakAlt) : 0;
  const currentAzimuth = isDay ? Math.round(90 + solarProg * 180) : 280;

  // Overhang solar cutoff angle: 1.5m projection over 2.7m glazing -> cutoff angle approx 61°
  const isGlazingShaded = currentAlt >= 58;

  const activePreset = SOLAR_STUDY_PRESETS.find((p) => p.id === season) || SOLAR_STUDY_PRESETS[0];

  const formatTime = (h: number) => {
    const hours = Math.floor(h);
    const minutes = Math.floor((h - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <aside className="absolute right-0 top-14 bottom-0 w-80 md:w-96 bg-neutral-950/90 backdrop-blur-xl border-l border-neutral-800/80 z-20 flex flex-col shadow-2xl overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between sticky top-0 bg-neutral-950/95 backdrop-blur z-10">
        <div>
          <h2 className="font-serif-display text-base font-medium text-neutral-100 flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            Solar &amp; Bioclimatic Study
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Passive cooling &amp; stack-effect ventilation
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-100 text-xs px-2 py-1 bg-neutral-900 border border-neutral-800 rounded cursor-pointer"
        >
          Close
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Time of Day Scrubber */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Time of Day
            </span>
            <span className="font-mono text-amber-300 font-semibold text-sm">
              {formatTime(timeOfDayHours)}
            </span>
          </div>

          <input
            type="range"
            min="6.0"
            max="20.0"
            step="0.25"
            value={timeOfDayHours}
            onChange={(e) => onChangeTimeOfDay(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
          />

          {/* Quick preset buttons */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <button
              onClick={() => onChangeTimeOfDay(9.0)}
              className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-[11px] rounded text-neutral-300 border border-neutral-800 text-center cursor-pointer"
            >
              Morning
            </button>
            <button
              onClick={() => onChangeTimeOfDay(12.5)}
              className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-[11px] rounded text-neutral-300 border border-neutral-800 text-center cursor-pointer"
            >
              Noon Peak
            </button>
            <button
              onClick={() => onChangeTimeOfDay(16.5)}
              className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900/60 text-[11px] rounded text-amber-300 border border-amber-800/60 text-center cursor-pointer font-medium"
            >
              32° Hero
            </button>
            <button
              onClick={() => onChangeTimeOfDay(19.5)}
              className="px-2 py-1 bg-indigo-950/60 hover:bg-indigo-900/60 text-[11px] rounded text-indigo-300 border border-indigo-800/60 text-center cursor-pointer"
            >
              Blue Hour
            </button>
          </div>
        </div>

        {/* Live Solar Geometry Readout */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-900/60 border border-neutral-800 rounded">
          <div>
            <div className="text-[11px] text-neutral-400 flex items-center gap-1">
              <Sun className="w-3 h-3 text-amber-400" />
              Solar Altitude
            </div>
            <div className="font-mono text-lg font-semibold text-neutral-100 mt-0.5">
              {currentAlt}°
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              Horizon elevation
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-400 flex items-center gap-1">
              <Compass className="w-3 h-3 text-amber-400" />
              Sun Azimuth
            </div>
            <div className="font-mono text-lg font-semibold text-neutral-100 mt-0.5">
              {currentAzimuth}°
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              {currentAzimuth < 135 ? 'East morning' : currentAzimuth < 225 ? 'True South' : 'West evening'}
            </div>
          </div>
        </div>

        {/* Seasonal Trajectory Selector */}
        <div className="space-y-2">
          <label className="text-xs text-neutral-400 font-medium block">
            Seasonal Solstice &amp; Trajectory
          </label>
          <div className="space-y-1.5">
            {SOLAR_STUDY_PRESETS.map((p) => {
              const isSelected = season === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onChangeSeason(p.id as SeasonType)}
                  className={`w-full text-left p-2.5 rounded transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-600/60 text-amber-200'
                      : 'bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span>{p.label}</span>
                    <span className="font-mono text-[11px]">{p.solarAltitudePeak}° Peak</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                    {p.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Southern Verandah Overhang Performance */}
        <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-neutral-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              1.5 m Southern Overhang
            </span>
            <span
              className={`font-mono text-xs font-semibold ${
                isGlazingShaded ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {isGlazingShaded ? '100% Shaded' : 'Passive Penetration'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            {isGlazingShaded
              ? 'High summer sun (cutoff > 58°) is completely intercepted by the 1.5m horizontal timber pergola. Zero direct radiant heat penetrates the living room glass.'
              : 'Low winter sun (altitude < 58°) glides under the 1.5m overhang, warming the Kota stone floor and rammed-earth spine wall for natural passive heating.'}
          </p>
        </div>

        {/* Stack-Effect Convective Ventilation Engine */}
        <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-200 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-emerald-400" />
              Thermal Chimney Stack
            </span>
            <button
              onClick={onToggleAirflow}
              className={`text-xs px-2.5 py-1 rounded transition-colors cursor-pointer border ${
                showAirflow
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 font-medium'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400'
              }`}
            >
              {showAirflow ? 'Streamlines Active' : 'Show Streamlines'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-neutral-950 p-2 rounded border border-neutral-800/80">
              <span className="text-[10px] text-neutral-500 block">Airflow Flowrate</span>
              <span className="font-mono text-emerald-400 font-semibold">{activePreset.stackFlowRate}</span>
            </div>
            <div className="bg-neutral-950 p-2 rounded border border-neutral-800/80">
              <span className="text-[10px] text-neutral-500 block">Passive Cooling</span>
              <span className="font-mono text-emerald-400 font-semibold">{activePreset.coolingDelta}</span>
            </div>
          </div>

          <div className="text-[11px] text-neutral-400 leading-snug">
            Low-level intake → living room → central 6.8m courtyard void → rising thermal buoyancy → roof clerestory louvers. No mechanical chillers.
          </div>
        </div>

        {/* Rammed Earth 350mm Thermal Flywheel */}
        <div className="p-3 bg-neutral-900/50 border border-neutral-800 rounded space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-neutral-200 flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              350 mm Rammed Earth Flywheel
            </span>
            <span className="font-mono text-xs text-amber-300 font-semibold">10–12 hr lag</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>Peak Outdoor: ~38.5°C (14:30)</span>
            <span className="text-emerald-400 font-mono">Indoor: ~24.8°C stable</span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed pt-1">
            Sub-soil stabilized earth walls absorb peak daytime caloric flux and discharge it during cooler night hours, dampening diurnal swings by over 13°C.
          </p>
        </div>
      </div>
    </aside>
  );
};
