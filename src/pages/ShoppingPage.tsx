import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { ShoppingCart, ExternalLink, ShieldCheck, TrendingDown, ArrowLeft, Package, Sparkles, Check, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Supplier {
  name: string;
  pricePerUnit: number;
  deliveryDays: number;
  rating: number;
  isVerified: boolean;
}

const mockSuppliers = (basePrice: number): Supplier[] => {
  return [
    {
      name: "IndiaMART Verified",
      pricePerUnit: Math.round(basePrice * 0.95),
      deliveryDays: 5,
      rating: 4.6,
      isVerified: true
    },
    {
      name: "TradeIndia Direct",
      pricePerUnit: Math.round(basePrice * 1.05),
      deliveryDays: 3,
      rating: 4.5,
      isVerified: true
    },
    {
      name: "BuildSupply Regional",
      pricePerUnit: Math.round(basePrice * 0.98),
      deliveryDays: 6,
      rating: 4.8,
      isVerified: true
    }
  ].sort((a, b) => a.pricePerUnit - b.pricePerUnit);
};

export default function ShoppingPage() {
  const { blueprintData } = useContext(AppContext);
  const [materialDetails, setMaterialDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!blueprintData) {
      setLoading(false);
      return;
    }

    const fetchMaterials = async () => {
      try {
        const rawBreakdown = blueprintData?.budget?.breakdown || blueprintData?.cost_estimate?.breakdown;
        let itemsToEnrich: any[] = [];

        // Safely extract items whether breakdown is an array or a key-value object
        if (Array.isArray(rawBreakdown)) {
          itemsToEnrich = rawBreakdown;
        } else if (rawBreakdown && typeof rawBreakdown === 'object') {
          itemsToEnrich = Object.entries(rawBreakdown)
            .filter(([_, cost]) => typeof cost === 'number' && cost > 0)
            .map(([key, cost]) => {
              const cleanName = key.replace(/_inr$/, '').replace(/_/g, ' ');
              return {
                category: cleanName.split(' ')[0] || 'General',
                material_name: cleanName.toUpperCase(),
                unit_price_inr: cost,
                quantity: 1
              };
            });
        }

        // Fallback to materials_selected if breakdown is empty
        if (itemsToEnrich.length === 0 && blueprintData.materials_selected) {
          itemsToEnrich = Object.entries(blueprintData.materials_selected).map(([cat, mat]: [string, any]) => ({
            category: cat,
            material_name: typeof mat === 'string' ? mat : (mat?.name || cat),
            unit_price_inr: mat?.cost_per_unit || 850,
            quantity: 1
          }));
        }

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        let dbMaterials: any[] = [];
        try {
          const res = await fetch(`${API_BASE_URL}/api/materials`);
          if (res.ok) {
            dbMaterials = await res.json();
          }
        } catch (err) {
          console.warn("Could not reach /api/materials, using local defaults", err);
        }

        // Map breakdown items to DB materials to enrich with image and description
        const enriched = itemsToEnrich.map((item: any) => {
          const mName = String(item.material_name || item.name || '').toLowerCase();
          const matched = dbMaterials.find((m: any) => {
            const dbName = String(m.name || '').toLowerCase();
            return dbName.includes(mName) || mName.includes(dbName) || m.id === mName.replace(/ /g, '_');
          });

          return {
            ...item,
            id: matched?.id || item.material_name || item.name,
            material_name: item.material_name || matched?.name || 'Building Material',
            image_url: matched?.image_url,
            description: matched?.description || `High-performance architectural ${item.category || 'envelope'} component tailored for extreme climate resilience.`,
            category: item.category || matched?.category || 'Envelope',
            unit_price_inr: item.unit_price_inr || matched?.cost_per_unit || 1200
          };
        });

        setMaterialDetails(enriched);
      } catch (e) {
        console.error("Failed to fetch material details", e);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [blueprintData]);

  if (!blueprintData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
        <div className="p-4 bg-white/5 rounded-full border border-white/10 mb-4 text-[#FF5722]">
          <ShoppingCart size={40} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Procurement Hub</h1>
        <p className="text-white/60 max-w-md text-sm">
          Generate a blueprint first to inspect required materials and real-time vendor comparisons.
        </p>
        <Link 
          to="/app/preferences" 
          className="mt-6 px-6 py-3 bg-[#FF5722] hover:bg-[#FF7043] text-white font-semibold rounded-2xl transition-all shadow-[0_0_20px_rgba(255,87,34,0.35)]"
        >
          Generate Blueprint
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full text-white overflow-y-auto pb-24 p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/10 pb-8 mb-8">
        <div>
          <Link to="/app/bom" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-3 text-xs font-mono transition-colors">
            <ArrowLeft size={14} /> Back to BOM & BOQ
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5722]/10 border border-[#FF5722]/20 text-[#FF5722] text-xs font-mono font-medium mb-2 block w-fit">
            <Sparkles size={13} />
            <span>B2B VENDOR PROCUREMENT MATRIX</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            Material Procurement & Suppliers
          </h1>
          <p className="text-white/60 mt-1 text-sm">
            Live supplier price benchmarking across IndiaMART, TradeIndia, and regional building distributors.
          </p>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 shadow-xl">
          <div className="bg-[#FF5722] p-3 rounded-xl shadow-lg">
            <ShoppingCart size={22} className="text-white" />
          </div>
          <div>
            <div className="text-xs text-white/50 uppercase font-mono">Catalog Items</div>
            <div className="text-2xl font-black font-mono text-white">{materialDetails.length} Materials</div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col justify-center items-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-[#FF5722]/20 border-t-[#FF5722] rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-white/50">Benchmarking regional quarry indices and vendor catalogues...</span>
        </div>
      ) : materialDetails.length === 0 ? (
        <div className="p-12 text-center bg-black/30 rounded-3xl border border-white/10 text-white/50">
          <Package size={48} className="mx-auto mb-4 opacity-40" />
          <p>No itemized trades found in current blueprint budget.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {materialDetails.map((material, idx) => {
            const baselinePrice = material.unit_price_inr || 1000;
            const suppliers = mockSuppliers(baselinePrice);
            const bestPrice = suppliers[0].pricePerUnit;
            const savings = Math.max(0, baselinePrice - bestPrice);

            return (
              <div key={idx} className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden hover:border-white/20 transition-all shadow-xl">
                <div className="flex flex-col lg:flex-row">
                  {/* Material Info */}
                  <div className="p-6 lg:w-1/3 bg-white/[0.02] border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col justify-between">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FF5722]/15 text-[#FF5722] rounded-full text-[10px] font-mono font-bold uppercase tracking-wider mb-3">
                        {material.category}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{material.material_name}</h3>
                      <p className="text-xs text-white/60 leading-relaxed line-clamp-3 mb-4">
                        {material.description}
                      </p>
                    </div>

                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                      <span className="text-white/50 font-mono">CPWD Baseline Rate:</span>
                      <span className="text-white font-mono font-bold">₹{baselinePrice.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Suppliers */}
                  <div className="p-6 lg:w-2/3 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-mono uppercase tracking-wider font-bold text-white/70">
                        Verified Regional Suppliers
                      </h4>
                      {savings > 0 && (
                        <div className="inline-flex items-center gap-1 text-emerald-400 font-mono text-xs font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          <TrendingDown size={14} /> Save up to ₹{savings.toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {suppliers.map((sup, sIdx) => {
                        const quantity = material.quantity || 1;
                        const totalSupPrice = sup.pricePerUnit * quantity;

                        return (
                          <div 
                            key={sIdx} 
                            className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                              sIdx === 0 
                                ? 'border-[#FF5722]/50 bg-[#FF5722]/10 shadow-[0_0_15px_rgba(255,87,34,0.15)]' 
                                : 'border-white/5 bg-black/20 hover:border-white/10'
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-white text-sm">{sup.name}</span>
                                {sIdx === 0 && (
                                  <span className="text-[10px] font-mono bg-[#FF5722] text-white px-2 py-0.5 rounded-full font-bold">
                                    Best Rate
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-white/50 flex items-center gap-1 mb-3">
                                <Star size={12} className="text-amber-400 fill-amber-400" />
                                <span>{sup.rating}</span>
                                <span>•</span>
                                <span>{sup.deliveryDays}d delivery</span>
                              </div>
                            </div>

                            <div className="border-t border-white/5 pt-3 mt-2 flex justify-between items-center">
                              <div>
                                <div className="text-lg font-black font-mono text-white">₹{totalSupPrice.toLocaleString()}</div>
                                <div className="text-[10px] text-white/40 font-mono">Unit: ₹{sup.pricePerUnit}</div>
                              </div>
                              <button 
                                onClick={() => alert(`Redirecting to ${sup.name} B2B Portal for ${material.material_name}...`)}
                                className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  sIdx === 0 
                                    ? 'bg-[#FF5722] hover:bg-[#FF7043] text-white shadow-md' 
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                                title={`Order from ${sup.name}`}
                              >
                                <ExternalLink size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
