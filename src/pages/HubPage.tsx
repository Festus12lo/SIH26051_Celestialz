import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, Info, FileText, Activity, Maximize, Package, Clock, Cpu, Box, Truck } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { AppContext } from '../App';
import WeatherBackground from '../components/WeatherBackground';
import { architecturalFacts } from '../data/architecturalFacts';

export const HubPage: React.FC = () => {
  const { blueprintData } = useContext(AppContext);
  const [weatherData, setWeatherData] = useState<string>("Locating...");
  const [weatherCondition, setWeatherCondition] = useState<string>("Unknown");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            const data = await res.json();
            if (data.current_weather) {
              const temp = data.current_weather.temperature;
              const code = data.current_weather.weathercode;
              
              const getWeatherDesc = (c: number) => {
                if (c === 0) return 'Clear';
                if (c <= 3) return 'Cloudy';
                if (c <= 48) return 'Fog';
                if (c <= 67) return 'Rain';
                if (c <= 77) return 'Snow';
                if (c <= 82) return 'Showers';
                if (c <= 86) return 'Snow Showers';
                if (c >= 95) return 'Thunderstorm';
                return 'Unknown';
              };
              
              const desc = getWeatherDesc(code);
              const formattedData = `${temp}°C, ${desc}`;
              setWeatherData(formattedData);
              setWeatherCondition(desc);
              
              // Cache for offline use
              localStorage.setItem('thermoshelter_weather_cache', JSON.stringify({ data: formattedData, condition: desc }));
            } else {
              setWeatherData("Data unavailable");
            }
          } catch (e) {
            // Load from cache if offline
            const cached = localStorage.getItem('thermoshelter_weather_cache');
            if (cached) {
              const parsed = JSON.parse(cached);
              setWeatherData(parsed.data + " (Offline)");
              setWeatherCondition(parsed.condition);
            } else {
              setWeatherData("Offline (No cache)");
            }
          }
        },
        () => {
          setWeatherData("Location denied");
        }
      );
    } else {
      setWeatherData("Geo not supported");
    }
  }, []);
  
  return (
    <div className="flex-1 flex flex-col w-full relative bg-transparent items-center pt-32 pb-24 overflow-y-auto scrollbar-hide">
      
      <div className="text-center space-y-4 animate-in fade-in duration-1000 z-10 mb-16 px-8">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight hero-heading pb-2 leading-[1.1]">
          ThermoShelter
        </h1>
        <p className="text-white/80 text-xl md:text-2xl font-medium max-w-2xl mx-auto leading-relaxed text-balance">
          Design and test climate-smart shelters that stay naturally warm in winter and cool in summer without high energy bills.
        </p>
      </div>
      
      {/* Telemetry Overlays */}
      <div className="z-20 w-full max-w-5xl px-8 flex flex-col md:flex-row gap-6 pointer-events-none mb-16">
        <GlassCard icon={<Cloud size={20} />} title="Realtime Weather" value={weatherData}>
          <div className="absolute inset-0 pointer-events-none z-0">
            <WeatherBackground condition={weatherCondition} />
          </div>
        </GlassCard>
        <RotatingFactsCard />
      </div>

      {/* Active Engineering Modules */}
      <div className="z-20 w-full max-w-5xl px-8 mb-16">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 uppercase tracking-wider mb-4 px-1">
          <span>Explore Shelter Tools</span>
          <span className="text-[#FF5722] font-semibold">Climate-Smart Protection</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Link
            to="/app/floorplan"
            className="glass-card-premium p-6 group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#FF5722] mb-4 group-hover:scale-110 group-hover:bg-[#FF5722]/15 transition-all duration-300">
                <FileText size={20} />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-[#FF5722] transition-colors tracking-tight">
                Blueprint & Overview
              </h3>
              <p className="text-xs text-white/60 mt-2 line-clamp-2 leading-relaxed">
                Clear 2D room layouts, window directions for sunlight, and building safety guidelines.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs font-mono text-[#FF5722] font-semibold group-hover:translate-x-0.5 transition-transform">
              <span>View Blueprint</span>
              <span>&rarr;</span>
            </div>
          </Link>

          <Link
            to="/app/simulation"
            className="glass-card-premium p-6 group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-110 group-hover:bg-sky-500/15 transition-all duration-300">
                <Activity size={20} />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors tracking-tight">
                Temperature Test (48-Hr)
              </h3>
              <p className="text-xs text-white/60 mt-2 line-clamp-2 leading-relaxed">
                See how warm or cool your shelter stays across day and night using live local weather.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs font-mono text-sky-400 font-semibold group-hover:translate-x-0.5 transition-transform">
              <span>Test Temperature</span>
              <span>&rarr;</span>
            </div>
          </Link>

          <Link
            to="/app/floorplan"
            className="glass-card-premium p-6 group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 group-hover:bg-amber-500/15 transition-all duration-300">
                <Maximize size={20} />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors tracking-tight">
                3D Model & Floor Plan
              </h3>
              <p className="text-xs text-white/60 mt-2 line-clamp-2 leading-relaxed">
                Realistic 3D photo views and interactive room layouts with room dimensions.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs font-mono text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform">
              <span>View 3D & Rooms</span>
              <span>&rarr;</span>
            </div>
          </Link>

          <Link
            to="/app/catalogue"
            className="glass-card-premium p-6 group flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 group-hover:bg-emerald-500/15 transition-all duration-300">
                <Package size={20} />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors tracking-tight">
                Materials & Costs
              </h3>
              <p className="text-xs text-white/60 mt-2 line-clamp-2 leading-relaxed">
                Browse wall, roof, and window materials with clear insulation scores and local market prices.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-xs font-mono text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">
              <span>Browse Materials</span>
              <span>&rarr;</span>
            </div>
          </Link>
        </div>
      </div>

      <div className="w-full max-w-5xl px-8 z-20 mb-20 flex justify-center">
        <Link to="/app/history" className="glass-card-subtle group relative px-8 py-4 rounded-2xl flex items-center justify-center gap-3 cursor-pointer hover:border-white/30">
          <div className="p-2 bg-white/5 rounded-xl text-[#FF5722] group-hover:scale-110 transition-transform">
            <Clock size={20} />
          </div>
          <span className="text-sm font-mono font-bold text-white tracking-wide">View Saved Blueprints & Previous Designs &rarr;</span>
        </Link>
      </div>

      {/* Flowchart Section */}
      <ProductFlowchart />
    </div>
  );
};

const ProductFlowchart = React.memo(() => {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  const steps = [
    {
      icon: <Activity className="text-blue-400" size={32} />,
      title: "1. Choose Location & Budget",
      desc: "Enter where you want to build and your budget. We automatically look up local temperatures, seasonal weather, and snowfall for that location.",
      delay: 0.1
    },
    {
      icon: <Cpu className="text-purple-400" size={32} />,
      title: "2. Smart Climate Analysis",
      desc: "Calculates the right wall thickness, window positions, and insulation needed so your shelter stays naturally warm in winter and cool in summer.",
      delay: 0.3
    },
    {
      icon: <Box className="text-emerald-400" size={32} />,
      title: "3. Room Plan & 3D Visuals",
      desc: "Creates an easy-to-read room plan and photorealistic 3D views showing how the completed shelter will look in real life.",
      delay: 0.5
    },
    {
      icon: <Truck className="text-orange-400" size={32} />,
      title: "4. Materials & Estimated Cost",
      desc: "Provides an item-by-item shopping list with estimated prices for local blocks, wood, insulation, and roof sheets.",
      delay: 0.7
    }
  ];

  return (
    <motion.div 
      style={{ opacity }}
      className="w-full max-w-4xl px-8 py-16 mt-12 z-20 flex flex-col items-center"
    >
      <div className="text-center mb-16">
        <h2 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">How It Works</h2>
        <div className="h-1 w-24 bg-[var(--color-accent)] mx-auto rounded-full"></div>
      </div>

      <div className="relative w-full flex flex-col items-center">
        {/* Vertical Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white/10 -translate-x-1/2 rounded-full hidden md:block"></div>

        {steps.map((step, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: step.delay }}
            key={idx}
            className={`w-full flex flex-col md:flex-row items-center gap-8 mb-16 relative ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}
          >
            {/* Timeline Dot */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black border-4 border-[#1A1A1B] z-10 items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>

            {/* Content Card */}
            <div className={`flex-1 w-full glass-card-premium p-8 ${idx % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
              <div className={`flex items-center gap-4 mb-4 ${idx % 2 === 0 ? 'md:justify-end' : 'md:justify-start'} justify-center`}>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-[var(--color-accent)]">
                  {step.icon}
                </div>
                <h3 className="text-xl font-black tracking-tight text-white">{step.title}</h3>
              </div>
              <p className="text-white/60 font-medium leading-relaxed text-lg">
                {step.desc}
              </p>
            </div>
            
            {/* Empty space for timeline alignment */}
            <div className="hidden md:block flex-1"></div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});

const GlassCard = ({ icon, title, value, children }: { icon: React.ReactNode, title: string, value: string, children?: React.ReactNode }) => (
  <div className="flex-1 bg-white/5 backdrop-blur-2xl border border-white/10 border-t-white/20 border-l-white/20 p-8 rounded-[2rem] shadow-[inset_0_0_20px_rgba(255,255,255,0.02),0_8px_30px_rgb(0,0,0,0.4)] text-white pointer-events-auto hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/30 transition-all duration-500 ease-out flex flex-col justify-center relative overflow-hidden">
    {children}
    <div className="relative z-10 pointer-events-none">
      <div className="flex items-center gap-3 mb-4 text-white/70 font-semibold text-sm tracking-wide">
        <div className="bg-white/5 p-2 rounded-xl text-[var(--color-accent)]">{icon}</div>
        <span>{title}</span>
      </div>
      <div className="text-3xl font-black tracking-tighter text-white/90">{value}</div>
    </div>
  </div>
);

const RotatingFactsCard = () => {
  const [index, setIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % architecturalFacts.length);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 bg-white/5 backdrop-blur-2xl border border-white/10 border-t-white/20 border-l-white/20 p-8 rounded-[2rem] shadow-[inset_0_0_20px_rgba(255,255,255,0.02),0_8px_30px_rgb(0,0,0,0.4)] text-white pointer-events-auto hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl hover:border-white/30 transition-all duration-500 ease-out flex flex-col justify-center">
      <div className="flex items-center gap-3 mb-4 text-white/70 font-semibold text-sm tracking-wide">
        <div className="bg-white/5 p-2 rounded-xl text-[var(--color-accent)]"><Info size={20} /></div>
        <span>Architectural Facts</span>
      </div>
      <div className="relative min-h-[8rem] h-auto flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="text-white/80 font-medium text-base leading-relaxed tracking-wide"
          >
            {architecturalFacts[index]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HubPage;
