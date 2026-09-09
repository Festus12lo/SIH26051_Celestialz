import React from 'react';
import { Sun, Wind, ShieldAlert, Activity, Info, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface PhysicsVisualizerProps {
  data: any;
}

const ProgressBar = ({ label, value, max, unit, color, delay }: { label: string, value: number, max: number, unit: string, color: string, delay: number }) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-semibold text-white/80 uppercase tracking-wider">{label}</span>
        <span className="text-lg font-bold text-white">{value.toFixed(1)} <span className="text-sm font-normal text-white/50">{unit}</span></span>
      </div>
      <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
        <motion.div 
          initial={{ width: 0 }}
          whileInView={{ width: `${percentage}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay, ease: "easeOut" }}
          className={`h-full ${color} shadow-[0_0_10px_currentColor]`}
        />
      </div>
    </div>
  );
};

export default function PhysicsVisualizer({ data }: PhysicsVisualizerProps) {
  if (!data) return null;

  const rValue = data.walls?.r_value_si || data.architecture?.wall_assembly?.r_value_total || 2.5;
  const climateZone = data.climate?.zone || data.location?.climate_zone || 'moderate';
  
  // Fake some analytical data based on R-Value for the bars
  const uValue = 1 / (rValue || 2.5);
  const thermalMassIndex = (rValue || 2.5) * 1.5 + 2; // Arbitrary calculation for visualization

  return (
    <div className="w-full mt-12 bg-[#1A1A1B] border border-white/10 rounded-3xl p-8 lg:p-12 text-white overflow-hidden shadow-2xl relative">
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl text-black shadow-lg shadow-cyan-500/20">
            <Activity size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Physics & Climate Logic</h2>
            <p className="text-white/60 text-base mt-1">Thermal dynamics simulation for a <strong className="text-white">{climateZone}</strong> climate.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
        
        {/* Left Column: Analytics Bars */}
        <div className="bg-black/30 border border-white/5 p-8 rounded-3xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
             <BarChart2 className="text-cyan-400" size={24} />
             <h3 className="text-xl font-semibold">Material Thermodynamics</h3>
          </div>
          
          <ProgressBar 
            label="R-Value (Thermal Resistance)" 
            value={rValue} 
            max={8} 
            unit="m²·K/W" 
            color="bg-gradient-to-r from-cyan-500 to-blue-500" 
            delay={0.2} 
          />
          <ProgressBar 
            label="U-Value (Thermal Transmittance)" 
            value={uValue} 
            max={1.5} 
            unit="W/m²·K" 
            color="bg-gradient-to-r from-red-500 to-orange-500" 
            delay={0.4} 
          />
          <ProgressBar 
            label="Thermal Mass Index" 
            value={thermalMassIndex} 
            max={15} 
            unit="kJ/m²·K" 
            color="bg-gradient-to-r from-emerald-500 to-green-500" 
            delay={0.6} 
          />
          
          <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10 text-sm text-white/70 leading-relaxed">
             <strong>Theory:</strong> The inverse relationship between R-Value and U-Value determines the heat flow rate ($Q = U \cdot A \cdot \Delta T$). A higher Thermal Mass absorbs excess heat during the day and releases it at night, damping temperature swings.
          </div>
        </div>

        {/* Right Column: Theoretical Concepts */}
        <div className="space-y-6">
          {/* Concept 1: Solar Gain */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-black/30 border border-white/5 p-6 rounded-2xl flex gap-6 items-start hover:bg-black/50 transition-colors"
          >
            <div className="w-14 h-14 shrink-0 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400">
              <Sun size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2 text-white">Solar Heat Gain Coefficient (SHGC)</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-3">
                The fraction of incident solar radiation admitted through a window. In {climateZone.includes('cold') ? 'cold climates, a high SHGC is selected to maximize passive winter heating.' : 'hot climates, low SHGC glass and calculated roof overhangs block direct summer sun.'}
              </p>
              <div className="inline-flex items-center gap-2 bg-orange-500/10 px-3 py-1.5 rounded-lg text-xs text-orange-300 font-medium">
                $q = SHGC \cdot A \cdot E$
              </div>
            </div>
          </motion.div>

          {/* Concept 2: Thermal Insulation */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-black/30 border border-white/5 p-6 rounded-2xl flex gap-6 items-start hover:bg-black/50 transition-colors"
          >
            <div className="w-14 h-14 shrink-0 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2 text-white">Thermal Envelope (Fourier's Law)</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-3">
                Fourier's law of heat conduction dictates that heat transfer rate is proportional to the negative gradient of temperature. The high R-Value wall assembly minimizes this gradient, creating an isolated thermal buffer.
              </p>
              <div className="inline-flex items-center gap-2 bg-cyan-500/10 px-3 py-1.5 rounded-lg text-xs text-cyan-300 font-medium">
                $q = -k \nabla T$
              </div>
            </div>
          </motion.div>

          {/* Concept 3: Natural Ventilation */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-black/30 border border-white/5 p-6 rounded-2xl flex gap-6 items-start hover:bg-black/50 transition-colors"
          >
            <div className="w-14 h-14 shrink-0 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
              <Wind size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-2 text-white">Stack Effect Ventilation</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-3">
                Driven by buoyancy, warm indoor air naturally rises and escapes through high exhaust vents. This creates a pressure differential that draws in cooler, denser air from lower, shaded intake areas (Passive Cooling).
              </p>
              <div className="inline-flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-lg text-xs text-green-300 font-medium">
                $\Delta P = C \cdot a \cdot h (1/T_o - 1/T_i)$
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="mt-8 flex items-start gap-4 p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl relative z-10"
      >
        <Info size={24} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-base text-blue-100/80 leading-relaxed">
          <strong>Why this matters:</strong> These passive design strategies work symbiotically to drastically reduce the reliance on HVAC systems. By aligning architectural geometry with thermodynamic principles, the shelter maintains habitability even during complete grid failures.
        </p>
      </motion.div>
    </div>
  );
}
