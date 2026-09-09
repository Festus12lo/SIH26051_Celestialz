import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Cloud, IndianRupee, Info, Menu, ShoppingCart, Zap, ArrowDown, Activity, Cpu, Box, Truck } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';import PillNav from './components/PillNav';
import FlowingMenu from './components/FlowingMenu';
import FloorplanViewer from './components/FloorplanViewer';
import BlueprintDashboard from './components/BlueprintDashboard';
import RadiantPromptInput from './components/RadiantPromptInput';
import LightRays from './components/LightRays';
import PhysicsPage from './components/PhysicsPage';
import { chatWithArchitect, generateBlueprint, type ChatMessage } from './api/llmClient';

// Shared State Context
export const AppContext = createContext<any>(null);

// Navigation Layout
const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { link: '/', text: 'HUB', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80' },
    { link: '/floorplan', text: 'FLOORPLAN', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80' },
    { link: '/physics', text: 'PHYSICS & CLIMATE', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80' },
    { link: '/bom', text: 'BOM & PROCUREMENT', image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80' },
    { link: '/catalogue', text: 'MATERIALS', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80' },
    { link: '/ai-assist', text: 'AI ASSIST', image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80' },
    { link: '/preferences', text: 'PREFERENCES', image: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=600&q=80' }
  ];

  return (
    <div className="flex flex-row h-screen w-full bg-[#1A1A1B] text-white/90 font-sans transition-colors duration-300 relative overflow-hidden">
      {/* Sidebar Navigation */}
      <div className={`h-full flex-shrink-0 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)] transition-all duration-500 ease-in-out ${isSidebarOpen ? 'w-[280px] border-r border-white/10' : 'w-0 overflow-hidden border-none'}`}>
         <FlowingMenu items={menuItems} bgColor="transparent" textColor="#FFFFFF" marqueeBgColor="#00ffff" marqueeTextColor="#000000" borderColor="rgba(255,255,255,0.1)" speed={25} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full h-full flex flex-col relative z-10 overflow-y-auto">
        {/* Toggle Sidebar Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-8 left-8 z-50 p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Menu size={24} />
        </button>
        {/* Cinematic Background */}
        <LightRays
          raysOrigin="top-center"
          raysColor="#00ffff"
          raysSpeed={1.5}
          lightSpread={1.2}
          rayLength={1.8}
          followMouse={true}
          mouseInfluence={0.3}
          noiseAmount={0.03}
          distortion={0.08}
          className="z-0 opacity-80"
        />
        <Outlet />
      </main>
    </div>
  );
};

// 1. Dashboard Hub
const Hub = () => {
  const { blueprintData } = useContext(AppContext);
  const [weatherData, setWeatherData] = useState<string>("Locating...");

  React.useEffect(() => {
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
              
              setWeatherData(`${temp}°C, ${getWeatherDesc(code)}`);
            } else {
              setWeatherData("Data unavailable");
            }
          } catch (e) {
            setWeatherData("Data unavailable");
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
         <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white pb-2 drop-shadow-lg">
           ThermoShelter
         </h1>
         <p className="text-white/80 text-xl md:text-2xl font-light max-w-2xl mx-auto leading-relaxed">
           Select a tool from the side panel to begin designing, simulating, and reviewing passive shelters.
         </p>
      </div>
      
      {/* Telemetry Overlays */}
      <div className="z-20 w-full max-w-5xl px-8 flex flex-col md:flex-row gap-6 pointer-events-none mb-32">
        <GlassCard icon={<Cloud size={20} />} title="Realtime Weather" value={weatherData} />
        <GlassCard 
          icon={<IndianRupee size={20} />} 
          title="Cost Analytics" 
          value={blueprintData?.cost_estimate?.total_cost_inr ? `₹${blueprintData.cost_estimate.total_cost_inr.toLocaleString()} Est.` : "₹10,00,000 Est."} 
        />
        <GlassCard icon={<Info size={20} />} title="Architectural Facts" value="Rammed earth walls absorb heat during the day and release it at night." />
      </div>

      {/* Flowchart Section */}
      <ProductFlowchart />
    </div>
  );
};

const ProductFlowchart = React.memo(() => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [100, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  const steps = [
    {
      icon: <Activity className="text-blue-400" size={32} />,
      title: "1. Define Constraints",
      desc: "Input location, budget, and shelter type. ThermoShelter fetches real-time climate data (Open-Meteo) and establishes the parametric bounds.",
      delay: 0.1
    },
    {
      icon: <Cpu className="text-purple-400" size={32} />,
      title: "2. AI Physics Engine",
      desc: "Our LLM pipeline calculates solar heat gain, R-value requirements, and structural necessities based on National Building Code standards.",
      delay: 0.3
    },
    {
      icon: <Box className="text-emerald-400" size={32} />,
      title: "3. Parametric Design Generation",
      desc: "2D floorplans and 3D conceptual renders are generated dynamically. Materials are selected for optimal thermal mass and insulation.",
      delay: 0.5
    },
    {
      icon: <Truck className="text-orange-400" size={32} />,
      title: "4. Material Procurement",
      desc: "Live Bill of Materials (BOM) is matched against an up-to-date catalogue for cross-vendor price comparison and procurement.",
      delay: 0.7
    }
  ];

  return (
    <motion.div 
      style={{ opacity }}
      className="w-full max-w-4xl px-8 py-16 mt-12 z-20 flex flex-col items-center"
    >
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold text-white mb-4 tracking-wide uppercase">How It Works</h2>
        <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
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
            <div className={`flex-1 w-full bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:bg-black/60 transition-colors shadow-lg ${idx % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
              <div className={`flex items-center gap-4 mb-4 ${idx % 2 === 0 ? 'md:justify-end' : 'md:justify-start'} justify-center`}>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-white">{step.title}</h3>
              </div>
              <p className="text-white/60 leading-relaxed text-lg">
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

const GlassCard = ({ icon, title, value }: { icon: React.ReactNode, title: string, value: string }) => (
  <div className="flex-1 bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] text-white pointer-events-auto hover:bg-black/50 transition-colors">
    <div className="flex items-center gap-3 mb-2 text-white/50 font-medium text-sm">
      {icon} <span>{title}</span>
    </div>
    <div className="text-2xl font-bold tracking-tight">{value}</div>
  </div>
);

// 2. Floorplan Viewer Page
const FloorplanPage = () => {
  const { blueprintData } = useContext(AppContext);
  // Support both the direct structure (from preferences API) and nested structure (from chat API if applicable)
  const geometry = blueprintData?.geometry || blueprintData?.architecture?.floor_plan?.geometry;
  const dimensions = blueprintData?.building || blueprintData?.architecture?.floor_plan;
  const imageUrl = blueprintData?.image_url;
  const materials = blueprintData?.materials_selected;
  const isEmergency = blueprintData?.building_type?.toLowerCase() === 'emergency';


  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700 overflow-y-auto">
      <h1 className="text-4xl font-semibold mb-8 text-white">Layout Viewer</h1>
      
      {!geometry && !imageUrl ? (
        <div className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 flex items-center justify-center shadow-sm min-h-[500px]">
          <div className="text-white/50 flex flex-col items-center gap-4">
             <span className="text-lg">No layout generated yet.</span>
             <Link to="/preferences" className="px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors">Go to Preferences to Generate</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {geometry && (
            <div className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center shadow-sm min-h-[500px]">
              <h2 className="text-xl font-medium text-white/80 mb-6 w-full text-left border-b border-white/10 pb-4">2D Floorplan Specification</h2>
              <FloorplanViewer geometry={geometry} dimensions={dimensions} />
            </div>
          )}
          
          {imageUrl && (
            <div className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center shadow-sm min-h-[500px]">
              <h2 className="text-xl font-medium text-white/80 mb-6 w-full text-left border-b border-white/10 pb-4">3D Exterior Concept Render</h2>
              <div className="w-full flex-1 flex items-center justify-center overflow-hidden rounded-xl bg-black/20">
                 <img src={imageUrl} alt="AI Generated Exterior" className="w-full h-full object-cover rounded-xl shadow-lg" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Materials Section */}
      {materials && (
        <div className="mt-12 animate-in fade-in duration-1000 slide-in-from-bottom-8">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 border-b border-white/10 pb-4">
            <h2 className="text-3xl font-bold text-white tracking-tight">Selected Materials</h2>
            {isEmergency && (
              <div className="inline-flex items-center gap-2 mt-4 md:mt-0 bg-red-500/20 text-red-300 border border-red-500/30 px-4 py-2 rounded-full font-bold text-sm tracking-wide">
                <Zap size={16} /> EMERGENCY / DEPLOYABLE CLASS
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-black/60 transition-colors">
              <div className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">Wall / Structural</div>
              <div className="text-xl font-bold text-white mb-2">{materials.structural?.name || 'Standard Concrete'}</div>
              {isEmergency && <div className="text-xs text-red-300/80 bg-red-500/10 inline-block px-2 py-1 rounded">Optimized for Rapid Deployment</div>}
            </div>
            
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-black/60 transition-colors">
              <div className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">Insulation</div>
              <div className="text-xl font-bold text-white mb-2">{materials.insulation?.name || 'None'}</div>
              {isEmergency && <div className="text-xs text-red-300/80 bg-red-500/10 inline-block px-2 py-1 rounded">High Thermal Resistance</div>}
            </div>
            
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-black/60 transition-colors">
              <div className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">Glazing / Glass</div>
              <div className="text-xl font-bold text-white mb-2">{materials.glazing?.name || 'Single Glazed'}</div>
              {isEmergency && <div className="text-xs text-red-300/80 bg-red-500/10 inline-block px-2 py-1 rounded">Shatter-Resistant</div>}
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <Link to="/shopping" className="group inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-200 hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]">
               <ShoppingCart size={24} className="group-hover:-rotate-12 transition-transform" />
               Procure Materials & Compare Prices
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

const AIAssistPage = () => {
  const { blueprintData, setBlueprintData, hasStartedChat, setHasStartedChat, initialMessages, setInitialMessages } = useContext(AppContext);

  const handleInitialSubmit = (value: string) => {
    setInitialMessages([{ role: 'user', content: value }]);
    setHasStartedChat(true);
  };

  return (
    <div className="flex-1 w-full flex flex-col lg:flex-row gap-6 p-4 md:p-8 bg-transparent max-h-screen overflow-hidden">
      {/* Chat Section */}
      <div className={`flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${blueprintData ? 'w-full lg:w-[400px] xl:w-[450px] shrink-0' : 'w-full max-w-5xl mx-auto'}`}>
        {hasStartedChat ? (
          <div className="flex-1 rounded-3xl bg-white border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden flex flex-col h-[calc(100vh-6rem)] relative z-30">
            <ChatInterfaceWrapper 
              initialMessages={initialMessages} 
              onMessagesChange={(msgs) => setInitialMessages(msgs)} 
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-12 mt-12 mb-20 animate-in fade-in duration-1000">
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white pb-2">
                Design the Unbuildable.
              </h1>
              <p className="text-white/60 text-lg md:text-xl font-light max-w-xl mx-auto leading-relaxed">
                Experience physics-grounded AI engineering. Generate highly resilient, passive shelter designs optimized for Earth's most extreme climates.
              </p>
            </div>
            <div className="w-full px-4 max-w-2xl mx-auto">
              <RadiantPromptInput 
                onSubmit={handleInitialSubmit} 
                placeholder="Ask about passive solar for Leh, or cooling for Jaipur..."
                showHistory={true}
                historyKey="thermoshelter_preferences_history"
              />
            </div>
          </div>
        )}
      </div>

      {/* Blueprint Dashboard Section */}
      {blueprintData && (
        <div className="flex-1 bg-white rounded-3xl overflow-y-auto h-[calc(100vh-6rem)] shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative z-20 animate-in slide-in-from-right-16 duration-700 fade-in border border-gray-200/60">
          <BlueprintDashboard data={blueprintData} onReset={() => setBlueprintData(null)} />
        </div>
      )}
    </div>
  );
};

import BomPage from './components/BomPage';
import CataloguePage from './components/CataloguePage';
import ShoppingPage from './components/ShoppingPage';

// Placeholder for other pages to keep the code concise but functional
const PlaceholderPage = ({ title, desc }: { title: string, desc: string }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
    <h1 className="text-4xl font-semibold tracking-tight text-white mb-4">{title}</h1>
    <p className="text-lg text-white/50 max-w-xl">{desc}</p>
  </div>
);

// Main App Component
export default function App() {
  const [blueprintData, setBlueprintData] = useState<any>(null);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);

  return (
    <AppContext.Provider value={{ blueprintData, setBlueprintData, hasStartedChat, setHasStartedChat, initialMessages, setInitialMessages }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Hub />} />
            <Route path="floorplan" element={<FloorplanPage />} />
            <Route path="physics" element={<PhysicsPage />} />
            <Route path="bom" element={<BomPage />} />
            <Route path="catalogue" element={<CataloguePage />} />
            <Route path="ai-assist" element={<AIAssistPage />} />
            <Route path="preferences" element={<PreferencesPage />} />
            <Route path="shopping" element={<ShoppingPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

// 4. Preferences Page
const PreferencesPage = () => {
  const { setBlueprintData } = useContext(AppContext);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [location, setLocation] = useState('Leh, India');
  const [budget, setBudget] = useState('250000');
  const [shelterType, setShelterType] = useState('Emergency Shelter');

  const getBudgetWarning = () => {
    const budgetNum = parseInt(budget) || 0;
    if (shelterType === 'Emergency Shelter' && budgetNum < 200000) return true;
    if (shelterType === 'Permanent Shelter' && budgetNum < 500000) return true;
    if (shelterType === 'Community Shelter' && budgetNum < 800000) return true;
    return false;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const messages: ChatMessage[] = [
         { role: 'user', content: `Generate a detailed blueprint for a ${shelterType} in ${location} with a budget of ₹${budget}. Use the latest material catalogue data.` }
      ];
      const data = await generateBlueprint(messages);
      setBlueprintData(data);
      // Let the user know they can check other tabs now
      alert("Blueprint generated successfully! Check the Hub, Floorplan, or BOM pages.");
    } catch(err) {
      console.error(err);
      alert("Failed to generate blueprint. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const isBudgetLow = getBudgetWarning();

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-8 animate-in fade-in duration-700">
      <h1 className="text-4xl font-semibold mb-8 text-white">Project Preferences</h1>
      
      <div className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl text-white space-y-6">
        
        <div>
           <label className="block text-sm font-medium text-white/70 mb-2">Location</label>
           <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30" />
        </div>

        <div>
           <label className="block text-sm font-medium text-white/70 mb-2">Budget (INR)</label>
           <input type="number" value={budget} onChange={e => setBudget(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30" />
        </div>

        <div>
           <label className="block text-sm font-medium text-white/70 mb-2">Shelter Type</label>
           <select value={shelterType} onChange={e => setShelterType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 [&>option]:bg-zinc-900">
              <option value="Emergency Shelter">Emergency Shelter</option>
              <option value="Community Shelter">Community Shelter</option>
              <option value="Permanent Shelter">Permanent Shelter</option>
           </select>
        </div>
        
        {isBudgetLow && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300/90 px-4 py-4 rounded-xl flex items-start gap-3 mt-4">
            <Info size={20} className="shrink-0 mt-0.5 text-yellow-500/70" />
            <p className="text-sm leading-relaxed">
              <strong>Price constraint warning:</strong> The budget provided is lower than real-time market preferences for a {shelterType.toLowerCase()}. The generated design may use highly constrained or temporary materials to meet this budget.
            </p>
          </div>
        )}

        <div className="pt-6">
           <button 
             onClick={handleGenerate}
             disabled={isGenerating}
             className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
           >
             {isGenerating ? (
               <>
                 <span className="w-5 h-5 rounded-full border-2 border-gray-400 border-t-black animate-spin"></span>
                 Generating Blueprint...
               </>
             ) : 'Generate Blueprint'}
           </button>
        </div>
      </div>
    </div>
  );
};

// Extracted ChatWrapper (from original App.tsx)
function ChatInterfaceWrapper({ 
  initialMessages,
  onMessagesChange
}: { 
  initialMessages: ChatMessage[],
  onMessagesChange?: (messages: ChatMessage[]) => void
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = React.useState(true);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Sync state up
  React.useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  React.useEffect(() => {
    let isMounted = true;
    
    // Only fetch if the last message is from user and no assistant response exists yet
    if (initialMessages.length > 0 && initialMessages[initialMessages.length - 1].role === 'user') {
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
      chatWithArchitect(initialMessages, undefined, (fullText) => {
        if (isMounted) {
          setIsLoading(false);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: fullText };
            return updated;
          });
        }
      }).catch(() => {
        if (isMounted) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: 'An error occurred.' };
            return updated;
          });
          setIsLoading(false);
        }
      });
    } else {
      setIsLoading(false);
    }
    
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (value: string) => {
    if (!value.trim()) return;
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: value }];
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setIsLoading(true);
    try {
      await chatWithArchitect(newMessages, undefined, (fullText) => {
        setIsLoading(false);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullText };
          return updated;
        });
      });
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'An error occurred.' };
        return updated;
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] w-full bg-white">
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-hide bg-white">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-3xl px-6 py-5 ${msg.role === 'user' ? 'bg-black text-white shadow-lg' : 'bg-gray-100 text-black prose max-w-none'}`}>
              {msg.role === 'user' ? (
                <p className="text-base font-medium tracking-wide m-0">{msg.content}</p>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex w-full justify-start pl-6">
            <div className="max-w-[85%] rounded-3xl px-6 py-5 bg-transparent text-gray-500 flex items-center gap-3">
              <span className="w-2 h-2 bg-black rounded-full animate-ping"></span>
              <span className="text-sm font-mono tracking-widest uppercase">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="w-full pb-8 px-6 mt-auto flex items-end gap-4 bg-white border-t border-gray-100 pt-4">
        <div className="flex-1">
          <RadiantPromptInput onSubmit={handleSubmit} placeholder="Ask about passive cooling..." disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
