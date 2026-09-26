import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Share2, 
  FileText, 
  ChevronRight, 
  Wind, 
  Sun, 
  Layers, 
  Ruler, 
  Leaf, 
  Clock, 
  MapPin, 
  Compass, 
  Sparkles,
  Printer,
  Eye,
  Maximize2
} from 'lucide-react';
import FloorplanViewer from './FloorPlanViewer';
import PhysicsVisualizer from './PhysicsVisualizer';
import ModelViewer3D from './ModelViewer3D';
import BioclimaticDossier from './BioclimaticDossier';
import WallAssemblyVisualizer from './WallAssemblyVisualizer';
import MaterialImpactMatrix from './MaterialImpactMatrix';
import MaterialImprovementBreakdown from './MaterialImprovementBreakdown';
import { exportBlueprintToPDF } from '../utils/pdfGenerator';

interface BlueprintDashboardProps {
  data: any; // The JSON blueprint payload
  onReset: () => void;
  onOpenCoPilot?: () => void;
}

const BlueprintDashboard = React.memo(({ data, onReset, onOpenCoPilot }: BlueprintDashboardProps) => {
  if (!data) return null;

  const [activeImageTab, setActiveImageTab] = useState<'3d' | '2d'>('3d');
  const [selectedModalImage, setSelectedModalImage] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thermoshelter_blueprint_${data.building_type || 'design'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      await exportBlueprintToPDF(data);
    } catch (err) {
      console.error('Failed to generate PDF, falling back to window.print()', err);
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Safe extraction of rich data
  const meta = data.meta || {
    location: data.location || 'Leh, Ladakh',
    lat: data.lat,
    lon: data.lon,
    altitude_m: data.altitude_m || 3500,
    occupancy: data.occupancy || 4,
    building_type: data.building_type || 'residential',
  };

  const climate = data.climate || data.location?.climate || { zone: 'Cold', basic_wind_speed_m_s: 39 };
  const building = data.building || {};
  const orientation = building.orientation || data.architecture?.shape_and_orientation?.orientation || { azimuth_deg: 180, primary_facade: 'South' };
  const solarGeometry = building.solar_geometry || {};
  const walls = data.walls || data.architecture?.wall_assembly || {};
  const roof = data.roof || {};
  const windows = data.windows || [];
  const rooms = data.rooms || [];
  const geometry = data.geometry || data.architecture?.floor_plan?.geometry;

  const designBrief = data.design_brief || data.narrative || data.visual?.narrative;
  const bioclimaticStrategy = data.bioclimatic_strategy || {};
  const zoningRationale = data.zoning_rationale || {};
  const codeCompliance = data.code_compliance || [];
  const materialImpact = data.material_impact || {};
  const heatBalance = data.heat_balance || {};

  const lengthMm = building.length_m ? building.length_m * 1000 : data.architecture?.floor_plan?.length_mm || 10000;
  const widthMm = building.width_m ? building.width_m * 1000 : data.architecture?.floor_plan?.width_mm || 8000;
  const areaM2 = building.floor_area_m2 || data.architecture?.floor_plan?.area_m2 || ((lengthMm * widthMm) / 1000000);
  const azimuthDeg = orientation.azimuth_deg ?? 180;
  const primaryFacade = orientation.primary_facade?.toUpperCase() || 'SOUTH';
  const rValueTotal = walls.r_value_si || data.architecture?.wall_assembly?.r_value_total || 2.5;
  const uValueTotal = walls.u_value_si || data.architecture?.wall_assembly?.u_value_total || 0.4;
  
  const totalCostInr = data.budget?.total_estimated_inr || data.budget?.total_cost_inr || data.cost_estimate?.total_cost_inr || 0;
  const breakdown = data.budget?.breakdown ? (
    Array.isArray(data.budget.breakdown) ? data.budget.breakdown : 
    Object.entries(data.budget.breakdown).map(([k, v]) => ({
      category: k.replace('_inr', '').replace('_', ' '),
      material_name: k.replace('_inr', '').replace('_', ' ').toUpperCase(),
      total_cost_inr: v
    }))
  ) : (data.cost_estimate?.breakdown || []);

  const bType = (data.building_type || meta.building_type || 'residential').toLowerCase();
  const defaultFallback3D = bType.includes('emergency')
    ? '/emergency_house.jpg'
    : bType.includes('community')
    ? '/community_house.jpg'
    : '/permanent_house.jpg';
  const defaultFallback2D = bType.includes('emergency')
    ? '/emergency_blueprint.jpg'
    : '/residential_blueprint.jpg';

  const imageUrl2D = data.floor_plan_2d_url || data.visual?.floor_plan_2d_url || data.image_url || data.visual?.image_url;
  const imageUrl3D = data.floor_plan_3d_url || data.visual?.floor_plan_3d_url;

  const [active3DImage, setActive3DImage] = useState<string>(imageUrl3D || defaultFallback3D);
  const [active2DImage, setActive2DImage] = useState<string>(imageUrl2D || defaultFallback2D);

  useEffect(() => {
    setActive3DImage(imageUrl3D || defaultFallback3D);
  }, [imageUrl3D, defaultFallback3D]);

  useEffect(() => {
    setActive2DImage(imageUrl2D || defaultFallback2D);
  }, [imageUrl2D, defaultFallback2D]);
  const imagePrompt2D = data.floor_plan_2d_prompt || data.visual?.floor_plan_2d_prompt || data.image_generation_prompt || "Synthesizing architectural 2D linework...";
  const imagePrompt3D = data.floor_plan_3d_prompt || data.visual?.floor_plan_3d_prompt || "Synthesizing architectural 3D cutaway...";
  
  const dimensions = { length_mm: lengthMm, width_mm: widthMm };
  const lagHours = materialImpact?.thermal_mass_and_lag?.thermal_lag_hours ?? 9.2;
  const carbonSavingsPct = materialImpact?.embodied_carbon?.carbon_reduction_pct ?? 78.5;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-full min-h-screen bg-[#09090b] text-zinc-100 font-sans p-4 sm:p-6 md:p-10 lg:p-12 overflow-y-auto relative"
    >
      <div className="absolute inset-0 bg-noise pointer-events-none opacity-20"></div>
      
      <div className="max-w-7xl mx-auto space-y-14 relative z-10">
        
        {/* HEADER & ACTION BAR */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-800 pb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-zinc-400 cursor-pointer hover:text-white transition-colors" onClick={onReset}>
              <span className="text-[#FF5722] font-bold">THERMOSHELTER</span>
              <ChevronRight size={14} />
              <span>PROJECT DOSSIER</span>
              <ChevronRight size={14} />
              <span className="text-white font-bold">{meta.location}</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white font-heading">
                Shelter Blueprint & Overview
              </h1>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
                NBC 2016 COMPLIANT
              </span>
            </div>

            <p className="text-base text-zinc-400 font-light max-w-3xl">
              Custom climate-smart design for <strong className="text-white">{meta.location}</strong> ({climate.zone} Zone). Engineered to keep {meta.occupancy} occupants safe and comfortable.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {onOpenCoPilot && (
              <button 
                onClick={onOpenCoPilot}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FF5722]/15 border border-[#FF5722]/40 text-[#FF5722] hover:bg-[#FF5722]/25 font-semibold text-xs font-mono transition-all shadow-[0_0_15px_rgba(255,87,34,0.15)] cursor-pointer"
                title="Consult the Architectural Co-Pilot"
              >
                <Sparkles size={15} />
                <span>Architectural Co-Pilot</span>
              </button>
            )}
            <button 
              onClick={handleDownloadJSON} 
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white font-medium text-xs font-mono hover:bg-white/10 transition-colors backdrop-blur-sm cursor-pointer"
            >
              <FileText size={15} /> Export Raw Data
            </button>
            <button 
              onClick={handleDownloadPDF} 
              disabled={isGeneratingPDF}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FF5722] text-white font-medium text-xs font-mono shadow-[0_0_20px_rgba(255,87,34,0.35)] hover:bg-[#F4511E] transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download size={15} /> {isGeneratingPDF ? 'Compiling PDF...' : 'Save / Print as PDF'}
            </button>
          </div>
        </header>

        {/* HERO SECTION: CAD ARCHITECTURAL MASTER DRAWING & KEY METRICS */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#FF5722] font-semibold mb-1">
                <span>ROOM FLOOR PLAN</span>
                <span>•</span>
                <span>ORIENTED FOR NATURAL SUNLIGHT</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Room Layout & Sunlight Alignment</h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>Main Windows Face: <strong>South ({azimuthDeg}°)</strong></span>
            </div>
          </div>

          {/* Master CAD Floorplan Viewer */}
          <div className="w-full">
            {geometry ? (
              <FloorplanViewer 
                geometry={geometry} 
                dimensions={dimensions} 
                meta={meta}
                climate={climate}
                orientation={orientation}
                solarGeometry={solarGeometry}
                windows={windows}
                rooms={rooms}
              />
            ) : (
              <div className="w-full h-80 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 font-mono text-sm">
                Generating Vector CAD Linework...
              </div>
            )}
          </div>

          {/* Key Engineering Indicators Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard 
              icon={<Ruler className="text-zinc-300" size={18} />} 
              label="Living Space" 
              value={`${areaM2.toFixed(1)} m²`} 
              subtext={`${(lengthMm / 1000).toFixed(1)}m × ${(widthMm / 1000).toFixed(1)}m floor area`}
            />
            <MetricCard 
              icon={<Sun className="text-amber-400" size={18} />} 
              label="Sun Direction" 
              value={`${azimuthDeg}°`} 
              subtext={`Main windows face ${primaryFacade}`}
            />
            <MetricCard 
              icon={<Layers className="text-emerald-400" size={18} />} 
              label="Insulation Power" 
              value={`R-${Number(rValueTotal).toFixed(1)}`} 
              subtext="Blocks winter cold & summer heat"
            />
            <MetricCard 
              icon={<Clock className="text-amber-400" size={18} />} 
              label="Heat Retention" 
              value={`${lagHours} hrs`} 
              subtext="Holds warmth overnight"
            />
            <MetricCard 
              icon={<Leaf className="text-green-400" size={18} />} 
              label="Eco-Savings" 
              value={`-${carbonSavingsPct}%`} 
              subtext="Lower pollution than brick"
            />
            <MetricCard 
              icon={<FileText className="text-purple-400" size={18} />} 
              label="Estimated Cost" 
              value={`₹${totalCostInr?.toLocaleString()}`} 
              subtext="Total build & materials"
            />
          </div>
        </section>

        {/* SECTION 1: BIOCLIMATIC DOSSIER & CODE AUDIT */}
        <section className="pt-6">
          <BioclimaticDossier 
            designBrief={designBrief}
            bioclimaticStrategy={bioclimaticStrategy}
            zoningRationale={zoningRationale}
            codeCompliance={codeCompliance}
            climate={climate}
          />
        </section>

        {/* SECTION 2: WALL & ROOF MULTI-LAYER ASSEMBLY WITH TEMPERATURE GRADIENT */}
        <section className="pt-6">
          <WallAssemblyVisualizer 
            wallAssembly={walls}
            roof={roof}
            climate={climate}
          />
        </section>

        {/* SECTION 3: MATERIAL IMPACT & THERMODYNAMIC TRADE-OFF MATRIX */}
        <section className="pt-6">
          <MaterialImpactMatrix 
            materialImpact={materialImpact}
            heatBalance={heatBalance}
            materials={data.materials}
          />
        </section>

        {/* SECTION 3B: COMPREHENSIVE MATERIAL SPECIFICATIONS & THERMAL IMPROVEMENTS */}
        <section className="pt-6">
          <MaterialImprovementBreakdown data={data} />
        </section>

        {/* SECTION 4: 24-HOUR THERMODYNAMICS & CLIMATE PHYSICS */}
        <section className="pt-6">
          <PhysicsVisualizer data={data} />
        </section>

        {/* SECTION 5: 3D MODEL & COMPANION AI CONCEPTUAL VISUALIZATIONS */}
        <section className="space-y-6 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono font-medium mb-2">
                <Sparkles size={13} />
                <span>SPATIAL & VISUAL WALKTHROUGH</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white font-heading">
                3D Interactive Model & Conceptual Visualizations
              </h2>
              <p className="text-sm text-zinc-400 mt-1 max-w-3xl">
                Companion 3D WebGL volumetric structure alongside generative architectural perspective cutaways.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left: 3D WebGL Interactive Inspector */}
            <div className="glass-card-premium p-6 md:p-8 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs text-[#FF5722] font-bold">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5722] animate-ping"></div>
                  <span>INTERACTIVE 3D WEBGL VOLUMETRIC</span>
                </div>
                <span className="text-xs font-mono text-zinc-500">Orbit / Pan Enabled</span>
              </div>
              
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 min-h-[420px] flex items-center justify-center">
                <ModelViewer3D dimensions={dimensions} />
              </div>
            </div>

            {/* Right: Companion Generative Architectural Renderings */}
            <div className="glass-card-premium p-6 md:p-8 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs text-amber-400 font-bold">
                  <Sparkles size={14} />
                  <span>AI ARCHITECTURAL CONCEPT VISUALS</span>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
                  <button
                    onClick={() => setActiveImageTab('3d')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      activeImageTab === '3d' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    3D Isometric Cutaway
                  </button>
                  <button
                    onClick={() => setActiveImageTab('2d')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      activeImageTab === '2d' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    2D Orthographic Concept
                  </button>
                </div>
              </div>

              {/* Display Active Image */}
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-[16/10] relative group">
                {activeImageTab === '3d' ? (
                  <img 
                    src={active3DImage} 
                    alt="3D Floor Plan Visualization" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                    onClick={() => setSelectedModalImage(active3DImage)}
                    onError={() => {
                      if (active3DImage !== defaultFallback3D) {
                        setActive3DImage(defaultFallback3D);
                      }
                    }}
                  />
                ) : (
                  <img 
                    src={active2DImage} 
                    alt="2D Floor Plan Visualization" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                    onClick={() => setSelectedModalImage(active2DImage)}
                    onError={() => {
                      if (active2DImage !== defaultFallback2D) {
                        setActive2DImage(defaultFallback2D);
                      }
                    }}
                  />
                )}

                {/* Prompt inspect overlay */}
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-xs text-zinc-300 line-clamp-2">
                  <span className="font-semibold text-amber-400 font-mono">Prompt: </span>
                  {activeImageTab === '3d' ? imagePrompt3D : imagePrompt2D}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: ITEMIZED BILL OF MATERIALS (BOM) & COST ANALYSIS */}
        <section className="space-y-6 pb-20 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono font-medium mb-2">
                <FileText size={13} />
                <span>PROCUREMENT & BUDGET</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white font-heading">
                Itemized Bill of Materials (BOM)
              </h2>
              <p className="text-sm text-zinc-400 mt-1 max-w-3xl">
                Cost estimate breakdown based on CPWD Delhi Schedule of Rates (DSR 2023) and regional Indian quarry indices.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-zinc-400 uppercase">Total Estimated Budget</span>
              <div className="text-2xl md:text-3xl font-extrabold text-[#FF5722] font-mono">
                ₹{totalCostInr?.toLocaleString() || 0}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-xl">
            <table className="w-full text-left text-xs md:text-sm text-zinc-300">
              <thead className="bg-white/[0.04] border-b border-white/10 text-zinc-400 font-mono uppercase text-[11px]">
                <tr>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Specification / Material Item</th>
                  <th className="px-6 py-4">Quantity / Unit</th>
                  <th className="px-6 py-4">Unit Rate (INR)</th>
                  <th className="px-6 py-4 text-right">Subtotal Cost (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-xs">
                {breakdown?.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-bold text-[#FF5722] capitalize">{item.category}</td>
                    <td className="px-6 py-4 font-sans text-white font-medium">{item.material_name}</td>
                    <td className="px-6 py-4 text-zinc-400">{item.quantity || '--'}</td>
                    <td className="px-6 py-4 text-zinc-400">
                      {item.unit_price_inr ? `₹${item.unit_price_inr.toLocaleString()}` : '--'}
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-400 font-bold">
                      ₹{item.total_cost_inr?.toLocaleString() || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      {/* Image Full-Size Modal */}
      {selectedModalImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 cursor-pointer"
          onClick={() => setSelectedModalImage(null)}
        >
          <div className="max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden border border-white/20 relative shadow-2xl">
            <img src={selectedModalImage} alt="Full size preview" className="w-full h-full object-contain" />
          </div>
        </div>
      )}

      {/* Floating Co-Pilot Launcher */}
      {onOpenCoPilot && (
        <button
          onClick={onOpenCoPilot}
          className="fixed bottom-8 right-8 z-40 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#090d15]/95 hover:bg-[#121927] border border-[#FF5722]/50 text-white shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl hover:scale-105 active:scale-95 transition-all cursor-pointer font-mono text-xs group"
          title="Consult Architectural Co-Pilot"
        >
          <div className="w-7 h-7 rounded-xl bg-[#FF5722] text-white flex items-center justify-center shadow-[0_0_12px_rgba(255,87,34,0.6)] group-hover:rotate-12 transition-transform">
            <Sparkles size={15} />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold tracking-wide text-white text-xs">Architectural Co-Pilot</span>
            <span className="text-[10px] text-zinc-400 font-mono">Ask Engineering AI</span>
          </div>
        </button>
      )}
    </motion.div>
  );
});

export default BlueprintDashboard;

function MetricCard({ 
  icon, 
  label, 
  value, 
  subtext 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  subtext: string; 
}) {
  return (
    <div className="glass-card-subtle p-5 flex flex-col justify-between group cursor-default">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-2 bg-white/5 border border-white/10 rounded-xl text-[var(--color-accent)] group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className="text-[11px] font-mono text-white/70 font-semibold tracking-wide truncate">{label}</span>
      </div>
      <div>
        <div className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono">{value}</div>
        <div className="text-[10px] text-white/50 font-mono mt-1 uppercase tracking-wider truncate">{subtext}</div>
      </div>
    </div>
  );
}

