import React, { useContext } from 'react';
import { AppContext } from '../App';
import { ThermometerSun, Wind, Droplets, Sun, Activity, Flame, Shield, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

const GlassCard = ({ title, value, icon, subtitle }: any) => (
  <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:bg-black/50 transition-colors">
    <div className="flex items-center gap-3 mb-2 text-white/50 font-medium text-sm">
      {icon} <span>{title}</span>
    </div>
    <div className="text-3xl font-bold tracking-tight text-white mb-1">{value}</div>
    {subtitle && <div className="text-xs text-white/40">{subtitle}</div>}
  </div>
);

const PhysicsPage = () => {
  const { blueprintData } = useContext(AppContext);
  const climate = blueprintData?.climate;
  const walls = blueprintData?.walls;
  const location = blueprintData?.meta?.location || "Unknown Location";

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700 overflow-y-auto pb-24">
      <div className="mb-10 border-b border-white/10 pb-6">
        <h1 className="text-4xl font-bold text-white mb-2">Physics & Climate Analytics</h1>
        <p className="text-white/60 text-lg flex items-center gap-2">
          <MapPin size={18} /> {location}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <GlassCard 
          icon={<ThermometerSun size={20} className="text-orange-400" />}
          title="Design Temp"
          value={climate?.design_temp_min_c !== undefined ? `${climate.design_temp_min_c}°C` : '-5°C'}
          subtitle="Minimum winter design temperature"
        />
        <GlassCard 
          icon={<Sun size={20} className="text-yellow-400" />}
          title="Solar Peak"
          value={climate?.design_solar_peak_w_m2 !== undefined ? `${climate.design_solar_peak_w_m2} W/m²` : '850 W/m²'}
          subtitle="Peak solar irradiance"
        />
        <GlassCard 
          icon={<Shield size={20} className="text-emerald-400" />}
          title="Wall R-Value"
          value={walls?.r_value_si !== undefined ? walls.r_value_si : '3.5'}
          subtitle="Thermal Resistance (m²·K/W)"
        />
        <GlassCard 
          icon={<Flame size={20} className="text-red-400" />}
          title="Heating Degree Days"
          value={climate?.heating_degree_days_18c !== undefined ? climate.heating_degree_days_18c : '3200'}
          subtitle="Base 18°C (Annual)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Activity className="text-blue-400" /> Thermal Performance Analysis
            </h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm text-white/70 mb-2">
                  <span>Insulation Efficacy</span>
                  <span>{walls?.r_value_si ? Math.min(100, Math.round(walls.r_value_si * 20)) : 70}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${walls?.r_value_si ? Math.min(100, walls.r_value_si * 20) : 70}%` }}
                    transition={{ duration: 1.5, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm text-white/70 mb-2">
                  <span>Solar Gain Potential</span>
                  <span>65%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "65%" }}
                    transition={{ duration: 1.5, delay: 0.4 }}
                    className="h-full bg-gradient-to-r from-orange-500 to-yellow-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm text-white/70 mb-2">
                  <span>Thermal Mass Activation</span>
                  <span>82%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "82%" }}
                    transition={{ duration: 1.5, delay: 0.6 }}
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <p className="text-blue-200 text-sm leading-relaxed">
                <strong>Physics Insight:</strong> The selected wall assembly provides strong resistance to conductive heat loss. Combining this with south-facing glazing will maximize passive solar heating during winter months. The thermal mass of the floor will help dampen diurnal temperature swings.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl flex flex-col h-full">
            <h2 className="text-xl font-bold text-white mb-6">Sun Path & Orientation</h2>
            
            <div className="flex-1 flex items-center justify-center relative min-h-[250px]">
              {/* Abstract Sun Path Visualization */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 rounded-full border border-white/20 border-dashed relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 text-xs font-bold">N</div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 text-white/50 text-xs font-bold">S</div>
                  <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 text-xs font-bold">W</div>
                  <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 text-white/50 text-xs font-bold">E</div>
                  
                  {/* Sun Path Curve */}
                  <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 -rotate-90">
                    <motion.path 
                      d="M 10 50 A 40 40 0 0 1 90 50" 
                      fill="none" 
                      stroke="rgba(250, 204, 21, 0.4)" 
                      strokeWidth="2"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, delay: 0.5 }}
                    />
                  </svg>
                  
                  {/* Sun Icon */}
                  <motion.div 
                    className="absolute top-1/4 right-1/4"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 2.5 }}
                  >
                    <div className="w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.8)]" />
                  </motion.div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center text-sm text-white/60">
              Optimal ridge orientation: East-West to maximize southern exposure for solar gain.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhysicsPage;
