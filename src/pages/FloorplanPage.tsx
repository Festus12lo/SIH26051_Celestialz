import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { 
  Ruler, 
  ShoppingCart, 
  Layers, 
  Sparkles, 
  Maximize2, 
  Eye, 
  Download, 
  X 
} from 'lucide-react';
import { AppContext } from '../App';
import FloorplanViewer from '../components/FloorPlanViewer';
import BlueprintDashboard from '../components/BlueprintDashboard';
import ModelViewer3D from '../components/ModelViewer3D';

export const FloorplanPage: React.FC = () => {
  const { blueprintData, setBlueprintData } = useContext(AppContext);
  const [active2DTab, setActive2DTab] = useState<'cad' | 'ai'>('cad');
  const [active3DTab, setActive3DTab] = useState<'interactive' | 'render'>('interactive');
  const [img2DFailed, setImg2DFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Safe data extraction
  const geometry = blueprintData?.geometry || blueprintData?.architecture?.floor_plan?.geometry;
  const dimensions = blueprintData?.dimensions || blueprintData?.architecture?.floor_plan;
  const bType = (blueprintData?.building_type || blueprintData?.meta?.building_type || 'residential').toLowerCase();
  
  // High quality photo fallbacks
  const defaultFallback3D = bType.includes('emergency')
    ? '/emergency_house.jpg'
    : bType.includes('community')
    ? '/community_house.jpg'
    : '/permanent_house.jpg';
  const defaultFallback2D = bType.includes('emergency')
    ? '/emergency_blueprint.jpg'
    : '/residential_blueprint.jpg';

  const imageUrl2D = blueprintData?.floor_plan_2d_url || blueprintData?.visual?.floor_plan_2d_url || blueprintData?.image_url;
  const imageUrl3D = blueprintData?.floor_plan_3d_url || blueprintData?.visual?.floor_plan_3d_url;
  const current3DImage = imageUrl3D || defaultFallback3D;
  const current2DImage = imageUrl2D || defaultFallback2D;

  const length_mm = dimensions?.length_mm || (dimensions?.length_m ? dimensions.length_m * 1000 : 7100);
  const width_mm = dimensions?.width_mm || (dimensions?.width_m ? dimensions.width_m * 1000 : 5900);
  const safeDimensions = {
    length_mm,
    width_mm,
    ceiling_height_mm: dimensions?.ceiling_height_mm || 2700,
    floor_area_m2: dimensions?.floor_area_m2 || ((length_mm * width_mm) / 1000000)
  };

  if (!blueprintData && !geometry && !imageUrl2D && !imageUrl3D) {
    return (
      <div className="flex-1 p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700 overflow-y-auto">
        <h1 className="text-4xl font-semibold mb-8 text-white">Floor Plan & 3D Model</h1>
        <div className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 flex items-center justify-center shadow-sm min-h-[500px]">
          <div className="text-white/50 flex flex-col items-center gap-4">
             <span className="text-lg font-medium">No layout generated yet.</span>
             <Link to="/app/preferences" className="btn-fluid px-6 py-3 bg-[#FF5722] hover:bg-[#FF7043] text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(255,87,34,0.35)]">
               Go to Shelter Builder to Generate
             </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full animate-in fade-in duration-700 overflow-y-auto scrollbar-hide pb-24">
      {/* Title & Metadata */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5722]/10 border border-[#FF5722]/20 text-[#FF5722] text-xs font-mono font-medium mb-2">
            <Ruler size={13} />
            <span>ARCHITECTURAL GEOMETRY & VOLUMETRICS</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Floor Plan & 3D Model
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Interactive CAD drafting linework paired with photorealistic 3D architectural perspectives.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/app/bom"
            className="flex items-center gap-2 bg-gradient-to-r from-[#FF5722] to-[#E64A19] hover:from-[#FF7043] hover:to-[#FF5722] text-white font-semibold px-5 py-3 rounded-2xl transition-all shadow-[0_0_20px_rgba(255,87,34,0.35)] text-sm cursor-pointer"
          >
            <ShoppingCart size={18} />
            <span>View Cost & Materials</span>
          </Link>
        </div>
      </div>

      <div className="w-full flex flex-col gap-10">
        {/* CARD 1: 2D ARCHITECTURAL BLUEPRINT */}
        <div className="w-full glass-card-premium p-6 md:p-8 flex flex-col relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-[#FF5722] font-bold mb-1">
                <Layers size={14} />
                <span>2D Architectural Drafting</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Floor Plan Blueprint
              </h2>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono">
              <button
                onClick={() => setActive2DTab('cad')}
                className={`px-3.5 py-1.5 rounded-xl transition-all font-semibold cursor-pointer ${
                  active2DTab === 'cad'
                    ? 'bg-[#FF5722] text-white shadow-[0_0_15px_rgba(255,87,34,0.4)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Architectural Floor Plan
              </button>
              {imageUrl2D && !img2DFailed && (
                <button
                  onClick={() => setActive2DTab('ai')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all font-semibold cursor-pointer ${
                    active2DTab === 'ai'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  AI Concept Render
                </button>
              )}
            </div>
          </div>

          {/* 2D Content Display */}
          <div className="w-full rounded-2xl overflow-hidden bg-transparent border-0 p-0">
            {active2DTab === 'cad' ? (
              <div className="w-full min-h-[480px] flex items-center justify-center">
                {geometry ? (
                  <FloorplanViewer
                    geometry={geometry}
                    dimensions={safeDimensions}
                    meta={blueprintData?.meta}
                    climate={blueprintData?.climate}
                    orientation={blueprintData?.building?.orientation || blueprintData?.architecture?.shape_and_orientation?.orientation}
                    solarGeometry={blueprintData?.building?.solar_geometry}
                    windows={blueprintData?.windows}
                    rooms={blueprintData?.rooms}
                  />
                ) : (
                  <div className="text-center py-20 text-white/50 font-mono text-sm">
                    CAD linework geometry compiling...
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full min-h-[480px] flex flex-col items-center justify-center bg-black/50 p-6 rounded-2xl border border-white/10">
                <img
                  src={current2DImage}
                  alt="AI 2D Architectural Concept"
                  onError={() => setImg2DFailed(true)}
                  className="max-h-[500px] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
                />
                <span className="text-xs font-mono text-white/50 mt-4">
                  AI-Synthesized Bioclimatic Architectural Concept Drafting
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: 3D PHOTOREALISTIC PERSPECTIVE & CUTAWAY */}
        <div className="w-full glass-card-premium p-6 md:p-8 flex flex-col relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-[#FF5722] font-bold mb-1">
                <Sparkles size={14} />
                <span>3D Volumetric Visualization</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                3D Architectural Cutaway & Perspective
              </h2>
            </div>

            {/* View Switcher for 3D */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono">
              <button
                onClick={() => setActive3DTab('interactive')}
                className={`px-3.5 py-1.5 rounded-xl transition-all font-semibold cursor-pointer ${
                  active3DTab === 'interactive'
                    ? 'bg-[#FF5722] text-white shadow-[0_0_15px_rgba(255,87,34,0.4)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Interactive 3D Mesh
              </button>
              <button
                onClick={() => setActive3DTab('render')}
                className={`px-3.5 py-1.5 rounded-xl transition-all font-semibold cursor-pointer ${
                  active3DTab === 'render'
                    ? 'bg-[#FF5722] text-white shadow-[0_0_15px_rgba(255,87,34,0.4)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Photorealistic Render
              </button>
            </div>
          </div>

          {/* 3D Display Container */}
          <div className="w-full rounded-2xl overflow-hidden bg-black/40 border border-white/10 min-h-[520px] flex items-center justify-center relative">
            {active3DTab === 'interactive' ? (
              <div className="w-full h-[520px] relative">
                <ModelViewer3D 
                  glbUrl={bType.includes('emergency') ? '/models/emergency_shelter.glb' : bType.includes('community') ? '/models/community_shelter.glb' : '/models/permanent_shelter.glb'}
                  buildingType={bType}
                  dimensions={safeDimensions}
                />
                <div className="absolute bottom-4 left-4 z-10 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-mono text-white/70">
                  Left Click: Orbit • Right Click: Pan • Scroll: Zoom
                </div>
              </div>
            ) : (
              <div className="relative group w-full h-[520px] flex items-center justify-center bg-black/60 p-4">
                <img
                  src={current3DImage}
                  alt="3D Photorealistic Architectural Render"
                  className="max-h-[490px] w-auto object-contain rounded-xl shadow-2xl transition-transform duration-500 group-hover:scale-[1.01]"
                />
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="absolute bottom-6 right-6 p-3 rounded-2xl bg-black/80 hover:bg-black text-white border border-white/20 transition-all shadow-xl flex items-center gap-2 text-xs font-mono cursor-pointer hover:border-[#FF5722]"
                  title="Expand to Fullscreen Lightbox"
                >
                  <Maximize2 size={16} />
                  <span>View Fullscreen</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CARD 3: COMPLETE ARCHITECTURAL SPECIFICATION DOSSIER */}
        {blueprintData && (
          <div className="w-full glass-card-premium overflow-hidden mt-6">
            <div className="p-6 md:p-8 border-b border-white/10 bg-white/[0.02]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium mb-2">
                <Eye size={13} />
                <span>COMPLETE BIOCLIMATIC DOSSIER & SPECIFICATION</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Architectural Blueprint & Spec Dashboard
              </h2>
              <p className="text-white/60 text-sm mt-1">
                Full scrollable engineering dossier: Wall multi-layer assemblies, NBC compliance, thermodynamic simulation, and material metrics.
              </p>
            </div>
            
            <div className="p-4 sm:p-6 md:p-8 bg-transparent">
              <BlueprintDashboard 
                data={blueprintData} 
                onReset={() => setBlueprintData(null)} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal for 3D Photorealistic Render */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8"
          onClick={() => setLightboxOpen(false)}
        >
          <div 
            className="relative max-w-6xl max-h-[92vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              <a
                href={current3DImage}
                download={`ThermoShelter_3D_${bType}.jpg`}
                className="p-2.5 rounded-xl bg-black/80 hover:bg-black text-white border border-white/20 transition-all shadow-xl cursor-pointer"
                title="Download 3D Render"
              >
                <Download size={18} />
              </a>
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-2.5 rounded-xl bg-black/80 hover:bg-black text-white border border-white/20 transition-all shadow-xl cursor-pointer"
                title="Close Lightbox"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={current3DImage}
              alt="3D Photorealistic Architectural Render"
              className="max-h-[85vh] w-auto object-contain rounded-2xl border border-white/10 shadow-2xl"
            />
            <div className="mt-3 text-center text-xs font-mono text-white/60">
              ThermoShelter Bioclimatic Architectural Perspective • High-Resolution Render
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorplanPage;
