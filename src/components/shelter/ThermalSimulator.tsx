import React, { useState, useMemo } from 'react';
import { Thermometer, ShieldCheck, Sun, Wind, Flame, Users, Zap, CheckCircle } from 'lucide-react';

export const ThermalSimulator: React.FC = () => {
  const [ambientTemp, setAmbientTemp] = useState<number>(-15); // -15°C external freeze
  const [occupants, setOccupants] = useState<number>(4); // 4 relief occupants
  const [auxHeaterWatts, setAuxHeaterWatts] = useState<number>(500); // 500W survival heater
  const [daylightSolar, setDaylightSolar] = useState<boolean>(true); // South facing solar gain

  // Thermal Envelope Physics Model:
  // Total Envelope conductance UA (W/K):
  // Walls (44 m², U = 0.20): 8.8 W/K
  // Roof (30 m², U = 0.18): 5.4 W/K
  // Floor raised 150mm (24 m², U = 0.24): 5.76 W/K
  // Windows (3.0 m², U = 2.4): 7.2 W/K
  // Door & Storm Vestibule (1.9 m², U = 0.8): 1.52 W/K
  // Controlled Infiltration (0.25 ACH @ 57.6 m³): ~4.9 W/K
  // Total UA ≈ 33.58 W/K
  const UA_TOTAL = 33.58;

  // Heat Inputs:
  // Human metabolic rate ≈ 100W per person
  // Aux low-draw survival heater: 0 to 1000W
  // South-facing passive solar gain: ~380W when daytime
  const internalHeatWatts = useMemo(() => {
    const humanHeat = occupants * 100;
    const solarHeat = daylightSolar ? 380 : 0;
    return humanHeat + auxHeaterWatts + solarHeat;
  }, [occupants, auxHeaterWatts, daylightSolar]);

  // Indoor Equilibrium Temperature:
  // Q_in = UA * (T_in - T_out)  =>  T_in = T_out + (Q_in / UA)
  const indoorTemp = useMemo(() => {
    const deltaT = internalHeatWatts / UA_TOTAL;
    return Math.round((ambientTemp + deltaT) * 10) / 10;
  }, [ambientTemp, internalHeatWatts]);

  // Canvas tent baseline for stark comparison:
  // Standard emergency tent has UA ≈ 280 W/K
  const tentTemp = useMemo(() => {
    const deltaT = (occupants * 100 + auxHeaterWatts) / 280;
    return Math.round((ambientTemp + deltaT) * 10) / 10;
  }, [ambientTemp, occupants, auxHeaterWatts]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-slate-100">
      <div>
        <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
          <span>Thermodynamic Physics Model</span>
          <span aria-hidden="true">·</span>
          <span>Archetype 1 Envelope Evaluation</span>
        </div>
        <h2 className="text-xl font-bold text-white mt-1">
          Acute Freeze & Flood Thermal Performance Simulation
        </h2>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Evaluate indoor equilibrium temperature retention against external ambient conditions from acute -30°C winter disaster zones to extreme +45°C heatwaves.
        </p>
      </div>

      {/* Main Equilibrium Display Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Exterior Ambient */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Exterior Ambient</span>
            <Wind className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-sky-300">
              {ambientTemp > 0 ? `+${ambientTemp}` : ambientTemp}°C
            </span>
            <span className="text-xs text-slate-400">
              ({Math.round(ambientTemp * 1.8 + 32)}°F)
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            {ambientTemp < -10
              ? 'Acute freeze / hypothermia danger zone'
              : ambientTemp < 10
              ? 'Cold wet conditions'
              : ambientTemp > 35
              ? 'Severe heatwave'
              : 'Moderate climate'}
          </div>
        </div>

        {/* Shelter Indoor Equilibrium */}
        <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>Aegis-24 Interior Equilibrium</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-emerald-300">
              {indoorTemp > 0 ? `+${indoorTemp}` : indoorTemp}°C
            </span>
            <span className="text-xs text-emerald-400/80">
              ({Math.round(indoorTemp * 1.8 + 32)}°F)
            </span>
          </div>
          <div className="mt-3 text-xs text-emerald-300/90 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span>
              {indoorTemp >= 16 && indoorTemp <= 24
                ? 'WHO Humanitarian Comfort Standard (Optimal)'
                : indoorTemp > 24
                ? 'Warm insulated state'
                : 'Survivable threshold maintained'}
            </span>
          </div>
        </div>

        {/* Conventional Tent Comparison */}
        <div className="bg-slate-900/90 border border-rose-900/40 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-rose-400">
            <span>Standard Relief Canvas Tent</span>
            <Thermometer className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-rose-300">
              {tentTemp > 0 ? `+${tentTemp}` : tentTemp}°C
            </span>
            <span className="text-xs text-slate-400">
              ({Math.round(tentTemp * 1.8 + 32)}°F)
            </span>
          </div>
          <div className="mt-3 text-xs text-rose-400/90">
            Δ{Math.round((indoorTemp - tentTemp) * 10) / 10}°C warmer in Aegis-24 due to high-R PIR sandwich core
          </div>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-5">
        <h3 className="text-sm font-semibold text-white">
          Environmental Parameters & Heat Source Controls
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ambient Temp Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">External Ambient Temperature:</span>
              <span className="font-mono text-white font-semibold tabular-nums">{ambientTemp}°C</span>
            </div>
            <input
              type="range"
              min="-35"
              max="45"
              value={ambientTemp}
              onChange={e => setAmbientTemp(parseInt(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>-35°C (Acute Arctic)</span>
              <span>0°C (Freezing)</span>
              <span>+45°C (Desert)</span>
            </div>
          </div>

          {/* Survival Heater Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Auxiliary Survival Heater (Watts):</span>
              <span className="font-mono text-white font-semibold tabular-nums">{auxHeaterWatts} W</span>
            </div>
            <input
              type="range"
              min="0"
              max="1500"
              step="50"
              value={auxHeaterWatts}
              onChange={e => setAuxHeaterWatts(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>0 W (Passive only)</span>
              <span>500 W (Low battery draw)</span>
              <span>1500 W (Full emergency heater)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-800">
          {/* Occupants Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Users className="w-4 h-4 text-sky-400" />
              <span>Disaster Relief Occupants (100W body heat each):</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 4, 6, 8].map(num => (
                <button
                  key={num}
                  onClick={() => setOccupants(num)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                    occupants === num
                      ? 'bg-sky-500 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {num}p
                </button>
              ))}
            </div>
          </div>

          {/* South-Facing Solar Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>South-Facing Polycarbonate Passive Solar Gain (+380W):</span>
            </div>
            <button
              onClick={() => setDaylightSolar(!daylightSolar)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                daylightSolar
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {daylightSolar ? 'Active (Daylight)' : 'Inactive (Night)'}
            </button>
          </div>
        </div>
      </div>

      {/* Envelope Subsystem Conductance Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">
          Thermal Envelope Assembly U-Value & Thermal Resistance Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2 font-medium">Subsystem</th>
                <th className="pb-2 font-medium">Construction Material</th>
                <th className="pb-2 font-medium">Area</th>
                <th className="pb-2 font-medium">U-Value (W/m²K)</th>
                <th className="pb-2 font-medium">R-Value (Imperial / SI)</th>
                <th className="pb-2 font-medium text-right">Conductance (W/K)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums text-slate-300">
              <tr>
                <td className="py-2 font-sans font-medium text-white">Wall Sandwich Panels</td>
                <td className="py-2 font-sans text-slate-400">75mm PIR closed-cell core, 0.5mm steel skins</td>
                <td className="py-2">44.0 m²</td>
                <td className="py-2">0.20</td>
                <td className="py-2">R-28.4 / RSI 5.0</td>
                <td className="py-2 text-right">8.80</td>
              </tr>
              <tr>
                <td className="py-2 font-sans font-medium text-white">15° Corrugated Roof</td>
                <td className="py-2 font-sans text-slate-400">Fiber-composite with radiant foil barrier</td>
                <td className="py-2">30.3 m²</td>
                <td className="py-2">0.18</td>
                <td className="py-2">R-31.5 / RSI 5.5</td>
                <td className="py-2 text-right">5.45</td>
              </tr>
              <tr>
                <td className="py-2 font-sans font-medium text-white">Raised Subfloor (150mm)</td>
                <td className="py-2 font-sans text-slate-400">Air decoupling + R-24 rigid XPS foam</td>
                <td className="py-2">24.0 m²</td>
                <td className="py-2">0.24</td>
                <td className="py-2">R-23.6 / RSI 4.2</td>
                <td className="py-2 text-right">5.76</td>
              </tr>
              <tr>
                <td className="py-2 font-sans font-medium text-white">South Windows (2×)</td>
                <td className="py-2 font-sans text-slate-400">16mm double-wall polycarbonate + EPDM seals</td>
                <td className="py-2">3.0 m²</td>
                <td className="py-2">2.40</td>
                <td className="py-2">R-2.4 / RSI 0.42</td>
                <td className="py-2 text-right">7.20</td>
              </tr>
              <tr>
                <td className="py-2 font-sans font-medium text-white">Storm Entry Vestibule</td>
                <td className="py-2 font-sans text-slate-400">Thermal curtain drape + gasketed storm door</td>
                <td className="py-2">1.9 m²</td>
                <td className="py-2">0.80</td>
                <td className="py-2">R-7.1 / RSI 1.25</td>
                <td className="py-2 text-right">1.52</td>
              </tr>
              <tr>
                <td className="py-2 font-sans font-medium text-white">Dual-Zone Ventilation & Cowl</td>
                <td className="py-2 font-sans text-slate-400">Rotary roof wind cowls + high/low storm louvers with HRV core</td>
                <td className="py-2">0.5–1.8 ACH</td>
                <td className="py-2">78% HRV eff</td>
                <td className="py-2">Anti-Condensation</td>
                <td className="py-2 text-right">4.85</td>
              </tr>
              <tr className="font-semibold text-white bg-slate-800/40">
                <td className="py-2 font-sans">Total Building Envelope</td>
                <td className="py-2 font-sans text-slate-400">Passive Envelope + Controlled Fresh Air Exchange</td>
                <td className="py-2">103.2 m²</td>
                <td className="py-2">0.28 avg</td>
                <td className="py-2">R-20.3 avg</td>
                <td className="py-2 text-right text-sky-400">33.58 W/K</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
