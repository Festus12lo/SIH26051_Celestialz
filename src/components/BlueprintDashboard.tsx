import React from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, FileText, ChevronRight, Wind, Sun, Layers, Ruler } from 'lucide-react';
import FloorplanViewer from './FloorplanViewer';
import PhysicsVisualizer from './PhysicsVisualizer';

interface BlueprintDashboardProps {
  data: any; // The JSON blueprint payload
  onReset: () => void;
}

const BlueprintDashboard = React.memo(({ data, onReset }: BlueprintDashboardProps) => {
  if (!data) return null;

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

  const handleDownloadPDF = () => {
    window.print();
  };

  const narrative = data.narrative || data.visual?.narrative || "Physics-grounded design optimized for the target climate.";
  const imageUrl = data.image_url || data.visual?.image_url;
  const imagePrompt = data.image_generation_prompt || data.visual?.image_generation_prompt || "Synthesizing architectural features...";
  
  const areaM2 = data.building?.floor_area_m2 || data.architecture?.floor_plan?.area_m2 || 0;
  const lengthMm = data.building?.length_m ? data.building.length_m * 1000 : data.architecture?.floor_plan?.length_mm || 0;
  const widthMm = data.building?.width_m ? data.building.width_m * 1000 : data.architecture?.floor_plan?.width_mm || 0;
  const azimuthDeg = data.building?.orientation?.azimuth_deg || data.architecture?.shape_and_orientation?.orientation?.azimuth_deg || 0;
  const primaryFacade = data.building?.orientation?.primary_facade?.toUpperCase() || data.architecture?.shape_and_orientation?.orientation?.primary_facade?.toUpperCase() || 'SOUTH';
  const rValueTotal = data.walls?.r_value_si || data.architecture?.wall_assembly?.r_value_total || 0;
  const uValueTotal = data.walls?.u_value_si || data.architecture?.wall_assembly?.u_value_total || 0;
  
  const totalCostInr = data.budget?.total_cost_inr || data.cost_estimate?.total_cost_inr || 0;
  const breakdown = data.budget?.breakdown || data.cost_estimate?.breakdown || [];
  
  const geometry = data.geometry || data.architecture?.floor_plan?.geometry;
  const dimensions = { length_mm: lengthMm, width_mm: widthMm };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-full min-h-screen bg-white text-zinc-900 font-sans p-6 md:p-12 overflow-y-auto"
    >
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 mb-4 cursor-pointer hover:text-zinc-900 transition-colors" onClick={onReset}>
              <span>ThermoShelter</span>
              <ChevronRight size={14} />
              <span>Dashboard</span>
              <ChevronRight size={14} />
              <span className="text-zinc-900">Blueprint</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900">
              {narrative ? "Architectural Blueprint" : "Shelter Blueprint"}
            </h1>
            <p className="text-lg text-zinc-500 font-light max-w-2xl">
              {narrative}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 text-zinc-900 font-medium text-sm hover:bg-zinc-200 transition-colors">
              <Share2 size={16} /> Share
            </button>
            <button onClick={handleDownloadJSON} className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 text-zinc-900 font-medium text-sm hover:bg-zinc-200 transition-colors">
              <FileText size={16} /> Export JSON
            </button>
            <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white font-medium text-sm shadow-md shadow-black/10 hover:bg-zinc-800 transition-colors">
              <Download size={16} /> Export PDF
            </button>
          </div>
        </header>

        {/* HERO: AI IMAGE & CORE METRICS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 rounded-3xl overflow-hidden bg-zinc-100 border border-zinc-200 aspect-[16/9] relative shadow-sm">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="AI Generated Architecture" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400">
                Generating Visual...
              </div>
            )}
            <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-white/40 shadow-lg text-sm text-zinc-700">
              <span className="font-semibold text-zinc-900">AI Prompt: </span>
              {imagePrompt}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <MetricCard 
              icon={<Ruler className="text-blue-500" />} 
              label="Footprint Area" 
              value={`${areaM2} m²`} 
              subtext={`${lengthMm / 1000}m x ${widthMm / 1000}m`}
            />
            <MetricCard 
              icon={<Sun className="text-orange-500" />} 
              label="Solar Orientation" 
              value={`${azimuthDeg}°`} 
              subtext={`Faces ${primaryFacade}`}
            />
            <MetricCard 
              icon={<Layers className="text-emerald-500" />} 
              label="Wall Assembly (R-Value)" 
              value={`R-${rValueTotal}`} 
              subtext={`U-Value: ${uValueTotal} W/m²K`}
            />
            <MetricCard 
              icon={<FileText className="text-purple-500" />} 
              label="Est. Cost" 
              value={`₹${totalCostInr?.toLocaleString()}`} 
              subtext={`Estimated Total Cost (INR)`}
            />
          </div>
        </section>

        {/* 2D FLOORPLAN */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Floorplan & Layout</h2>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#f59e0b] rounded-sm"></div> Bedroom</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#ef4444] rounded-sm"></div> Living</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#3b82f6] rounded-sm"></div> Kitchen</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#10b981] rounded-sm"></div> Bath</span>
            </div>
          </div>
          <div className="w-full bg-zinc-50 border border-zinc-200 rounded-3xl p-8 flex items-center justify-center overflow-x-auto shadow-inner relative min-h-[400px]">
             {geometry ? (
                <FloorplanViewer geometry={geometry} dimensions={dimensions} />
             ) : (
                <div className="text-zinc-400">Rendering Floorplan...</div>
             )}
          </div>
        </section>

        {/* PHYSICS CONCEPTUAL MAPS */}
        <section className="space-y-6">
          <PhysicsVisualizer data={data} />
        </section>

        {/* BILL OF MATERIALS */}
        <section className="space-y-6 pb-20">
          <h2 className="text-2xl font-semibold tracking-tight">Bill of Materials (BOM)</h2>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
            <table className="w-full text-left text-sm text-zinc-600">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-900 font-medium">
                <tr>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Material</th>
                  <th className="px-6 py-4">Quantity</th>
                  <th className="px-6 py-4">Unit Cost (INR)</th>
                  <th className="px-6 py-4">Total Cost (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {breakdown?.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900 capitalize">{item.category}</td>
                    <td className="px-6 py-4">{item.material_name}</td>
                    <td className="px-6 py-4">{item.quantity}</td>
                    <td className="px-6 py-4">₹{item.unit_price_inr?.toLocaleString() || 0}</td>
                    <td className="px-6 py-4 text-emerald-600 font-medium">₹{item.total_cost_inr?.toLocaleString() || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </motion.div>
  );
});

export default BlueprintDashboard;

function MetricCard({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string, subtext: string }) {
  return (
    <div className="flex-1 bg-zinc-50 rounded-2xl p-6 border border-zinc-200 shadow-sm flex flex-col justify-between hover:border-zinc-300 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white rounded-xl shadow-sm border border-zinc-100">
          {icon}
        </div>
        <span className="text-sm font-medium text-zinc-600">{label}</span>
      </div>
      <div>
        <div className="text-3xl font-semibold tracking-tight text-zinc-900">{value}</div>
        <div className="text-xs text-zinc-500 font-medium mt-1 uppercase tracking-wider">{subtext}</div>
      </div>
    </div>
  );
}
