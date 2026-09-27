import React, { useEffect, useState } from 'react';
import { Package, ThermometerSun, IndianRupee, Layers, Shield, Droplets, X } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  category: string;
  r_value?: number;
  u_value?: number;
  shgc?: number;
  cost_per_m2_inr: number;
  density_kg_m3?: number;
  description?: string;
  desc?: string;
  image_url?: string;
}

interface MaterialsData {
  insulation: Material[];
  structural: Material[];
  glazing: Material[];
  roofing: Material[];
}

import defaultMaterialsData from '../data/materials.json';

export default function CataloguePage() {
  const [materials, setMaterials] = useState<MaterialsData>(() => {
    try {
      const cached = localStorage.getItem('thermoshelter_materials_cache');
      if (cached) return JSON.parse(cached);
    } catch {}
    return defaultMaterialsData as unknown as MaterialsData;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'structural' | 'insulation' | 'glazing' | 'roofing'>('structural');
  const [tierFilter, setTierFilter] = useState<'all' | 'emergency' | 'community' | 'permanent'>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('thermoshelter_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    
    // Attempt background sync if backend is active
    fetch(`${API_BASE_URL}/api/materials?t=` + new Date().getTime(), { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.status === 'success' && data.materials) {
          setMaterials(data.materials);
          localStorage.setItem('thermoshelter_materials_cache', JSON.stringify(data.materials));
        }
      })
      .catch(err => {
        // Safe to ignore when deployed statically or backend is offline
        console.info("Using embedded architectural materials library:", err.message);
      });
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const newFavs = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('thermoshelter_favorites', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const getDummyImage = (category: string, name: string, id: string) => {
    // Fallbacks if the backend somehow doesn't send image_url
    if (category === 'structural') return 'https://images.unsplash.com/photo-1588614644596-f000311f9999?w=600&q=80';
    if (category === 'insulation') return 'https://images.unsplash.com/photo-1628186178788-b220302dc8fc?w=600&q=80';
    if (category === 'glazing') return 'https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?w=600&q=80';
    return 'https://images.unsplash.com/photo-1588614644596-f000311f9999?w=600&q=80';
  };

  // Define which materials belong to which tier
  const tierMapping: Record<string, string[]> = {
    'emergency': ['eps', 'hollow_polymer', 'galvanized', 'solar_absorbent', 'single_clear', 'polyurethane_foam', 'mineral_wool', 'radiant_barrier', 'timber_frame', 'steel_frame', 'double_glazed', 'reflective_glass'],
    'community': ['pir', 'eps', 'hempcrete', 'low_e_alu', 'cool_roof', 'single_clear', 'mud_brick', 'aac_blocks', 'xps_insulation', 'triple_glazed'],
    'permanent': ['hempcrete', 'aerogel', 'cool_roof', 'low_e_double_glazed', 'rammed_earth', 'pcm_panels', 'smart_glass']
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-cyan-400 animate-spin"></div>
      </div>
    );
  }

  if (error || !materials) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-white">
        <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl text-center">
          <p className="text-red-400 font-medium">{error || "Failed to load"}</p>
        </div>
      </div>
    );
  }

  // Filter materials by active tab and selected tier
  const tabMaterials = materials[activeTab] || [];
  const currentMaterials = tabMaterials.filter(mat => {
    if (tierFilter === 'all') return true;
    return tierMapping[tierFilter].includes(mat.id);
  });

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700 overflow-y-auto scrollbar-hide pb-24">
      <h1 className="text-4xl font-semibold mb-8 text-white">Building Materials Catalog</h1>
      
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 mb-10">
        {/* Tier Filter */}
        <div className="flex flex-wrap gap-3">
          {['all', 'emergency', 'community', 'permanent'].map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier as any)}
              className={`px-6 py-2 rounded-full text-sm font-semibold capitalize transition-all border ${
                tierFilter === tier 
                ? 'bg-white text-black border-white' 
                : 'bg-black/40 text-white/60 border-white/20 hover:border-white/50 hover:text-white'
              }`}
            >
              {tier === 'all' ? 'All Tiers' : `${tier} Shelter`}
            </button>
          ))}
        </div>

        {/* Category Tabs */}
        <div className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-2 flex flex-wrap gap-2 shadow-lg">
          <button
            onClick={() => setActiveTab('structural')}
            className={`flex-1 min-w-[150px] py-3 px-6 rounded-xl text-center font-medium transition-all ${
              activeTab === 'structural' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,255,255,0.4)]' : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            Structural & Masonry
          </button>
          <button
            onClick={() => setActiveTab('insulation')}
            className={`flex-1 min-w-[150px] py-3 px-6 rounded-xl text-center font-medium transition-all ${
              activeTab === 'insulation' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,255,255,0.4)]' : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            Thermal Insulation
          </button>
          <button
            onClick={() => setActiveTab('glazing')}
            className={`flex-1 min-w-[150px] py-3 px-6 rounded-xl text-center font-medium transition-all ${
              activeTab === 'glazing' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,255,255,0.4)]' : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            Glazing & Windows
          </button>
          <button
            onClick={() => setActiveTab('roofing')}
            className={`flex-1 min-w-[150px] py-3 px-6 rounded-xl text-center font-medium transition-all ${
              activeTab === 'roofing' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,255,255,0.4)]' : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            Roofing
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentMaterials.length === 0 ? (
          <div className="col-span-full py-12 text-center text-white/50 border border-white/10 border-dashed rounded-3xl bg-black/20">
            No materials in this category are recommended for {tierFilter} shelters.
          </div>
        ) : (
          currentMaterials.map((mat) => (
            <div 
              key={mat.id} 
              onClick={() => setSelectedMaterial(mat)}
              className="glass-card-subtle overflow-hidden hover:border-[#FF5722]/50 transition-all cursor-pointer group flex flex-col h-full"
            >
            <div className="h-48 w-full overflow-hidden relative bg-black/50">
              <img 
                src={mat.image_url || getDummyImage(activeTab, mat.name, mat.id)} 
                alt={mat.name} 
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getDummyImage(activeTab, mat.name, mat.id);
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-80 group-hover:opacity-100" 
              />
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white uppercase tracking-wider border border-white/10">
                {activeTab}
              </div>
              <button
                onClick={(e) => toggleFavorite(mat.id, e)}
                className={`absolute top-4 left-4 p-2 rounded-full backdrop-blur-md transition-colors border ${
                  favorites.includes(mat.id) 
                    ? 'bg-red-500/80 border-red-400 text-white' 
                    : 'bg-black/60 border-white/10 text-white/50 hover:text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={favorites.includes(mat.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              </button>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <h2 className="text-xl font-bold text-white mb-4">{mat.name}</h2>
              
              <div className="space-y-3 flex-1">
                {mat.r_value !== undefined && mat.r_value !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-white/50"><Shield size={16} /> R-Value (per inch)</div>
                    <div className="text-white font-medium">R-{mat.r_value.toFixed(1)}</div>
                  </div>
                )}
                {mat.u_value !== undefined && mat.u_value !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-white/50"><ThermometerSun size={16} /> U-Value</div>
                    <div className="text-white font-medium">{mat.u_value.toFixed(2)} W/m²K</div>
                  </div>
                )}
                {mat.shgc !== undefined && mat.shgc !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-white/50"><ThermometerSun size={16} /> SHGC</div>
                    <div className="text-white font-medium">{mat.shgc.toFixed(2)}</div>
                  </div>
                )}
                {mat.density_kg_m3 !== undefined && mat.density_kg_m3 !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-white/50"><Layers size={16} /> Density</div>
                    <div className="text-white font-medium">{mat.density_kg_m3} kg/m³</div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="text-xs text-white/50 uppercase tracking-widest font-medium">Market Rate</div>
                <div className="flex items-center gap-1 text-cyan-400 font-bold text-lg">
                  ₹{mat.cost_per_m2_inr.toLocaleString()} <span className="text-xs text-white/50 font-normal">/ m²</span>
                </div>
              </div>
            </div>
          </div>
        )))}
      </div>

      {/* Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedMaterial(null)}>
          <div 
            className="bg-[#0f1115] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-64 w-full relative">
              <img 
                src={selectedMaterial.image_url || getDummyImage(activeTab, selectedMaterial.name, selectedMaterial.id)} 
                alt={selectedMaterial.name} 
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getDummyImage(activeTab, selectedMaterial.name, selectedMaterial.id);
                }}
                className="w-full h-full object-cover" 
              />
              <button 
                onClick={() => setSelectedMaterial(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 backdrop-blur-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-xs text-cyan-400 uppercase tracking-widest font-semibold mb-2">{selectedMaterial.category}</div>
                  <h2 className="text-3xl font-bold text-white">{selectedMaterial.name}</h2>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/50 uppercase tracking-widest font-medium mb-1">Market Rate</div>
                  <div className="text-2xl font-bold text-white">₹{selectedMaterial.cost_per_m2_inr.toLocaleString()} <span className="text-base text-white/50 font-normal">/ m²</span></div>
                </div>
              </div>
              
              <div className="text-white/80 leading-relaxed mb-8 text-lg">
                {selectedMaterial.description || selectedMaterial.desc || "High-performance bioclimatic envelope material specified for regional building assembly."}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white/5 rounded-2xl border border-white/5">
                {selectedMaterial.r_value !== undefined && selectedMaterial.r_value !== null && (
                  <div>
                    <div className="text-white/50 text-xs mb-1 uppercase tracking-wider">R-Value</div>
                    <div className="text-white font-medium text-lg">{selectedMaterial.r_value.toFixed(1)}</div>
                  </div>
                )}
                {selectedMaterial.u_value !== undefined && selectedMaterial.u_value !== null && (
                  <div>
                    <div className="text-white/50 text-xs mb-1 uppercase tracking-wider">U-Value</div>
                    <div className="text-white font-medium text-lg">{selectedMaterial.u_value.toFixed(2)}</div>
                  </div>
                )}
                {selectedMaterial.shgc !== undefined && selectedMaterial.shgc !== null && (
                  <div>
                    <div className="text-white/50 text-xs mb-1 uppercase tracking-wider">SHGC</div>
                    <div className="text-white font-medium text-lg">{selectedMaterial.shgc.toFixed(2)}</div>
                  </div>
                )}
                {selectedMaterial.density_kg_m3 !== undefined && selectedMaterial.density_kg_m3 !== null && (
                  <div>
                    <div className="text-white/50 text-xs mb-1 uppercase tracking-wider">Density</div>
                    <div className="text-white font-medium text-lg">{selectedMaterial.density_kg_m3} <span className="text-sm">kg/m³</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
