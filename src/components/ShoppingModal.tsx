import React, { useState } from 'react';
import { ShoppingCart, X, ExternalLink, ArrowRight, TrendingDown, Star, Zap } from 'lucide-react';

interface Vendor {
  name: string;
  price: number;
  delivery_days: number;
  rating: number;
  link: string;
}

interface ShoppingMaterial {
  category: string;
  materialName: string;
  vendors: Vendor[];
}

export default function ShoppingModal({ isOpen, onClose, materials, buildingType }: { isOpen: boolean, onClose: () => void, materials: any, buildingType: string }) {
  if (!isOpen) return null;

  // Generate dummy vendor data based on the selected materials
  const generateVendors = (basePrice: number): Vendor[] => {
    return [
      {
        name: 'IndiaMART Direct',
        price: basePrice * 0.9,
        delivery_days: 7,
        rating: 4.2,
        link: 'https://indiamart.com/search'
      },
      {
        name: 'Amazon Business',
        price: basePrice * 1.1,
        delivery_days: 2,
        rating: 4.8,
        link: 'https://business.amazon.in/'
      },
      {
        name: 'BuildSupply Local',
        price: basePrice,
        delivery_days: 4,
        rating: 4.5,
        link: 'https://buildsupply.com/'
      }
    ];
  };

  const shoppingItems: ShoppingMaterial[] = [];
  
  if (materials?.structural) {
    shoppingItems.push({
      category: 'Structural',
      materialName: materials.structural.name,
      vendors: generateVendors(materials.structural.cost_per_unit || 500)
    });
  }
  if (materials?.insulation) {
    shoppingItems.push({
      category: 'Insulation',
      materialName: materials.insulation.name,
      vendors: generateVendors(materials.insulation.cost_per_unit || 300)
    });
  }
  if (materials?.glazing) {
    shoppingItems.push({
      category: 'Glazing',
      materialName: materials.glazing.name,
      vendors: generateVendors(materials.glazing.cost_per_unit || 1200)
    });
  }
  if (materials?.roofing) {
    shoppingItems.push({
      category: 'Roofing',
      materialName: materials.roofing.name,
      vendors: generateVendors(materials.roofing.cost_per_unit || 800)
    });
  }

  const getPriorityBadge = (vendor: Vendor, buildingType: string) => {
    if (buildingType === 'emergency' && vendor.delivery_days <= 3) {
      return <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full flex items-center gap-1"><Zap size={12}/> Fastest</span>;
    }
    if (buildingType === 'permanent' && vendor.rating >= 4.7) {
      return <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full flex items-center gap-1"><Star size={12}/> Top Rated</span>;
    }
    if (buildingType === 'community' && vendor.price === Math.min(...shoppingItems[0]?.vendors.map(v => v.price) || [])) {
      return <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full flex items-center gap-1"><TrendingDown size={12}/> Best Value</span>;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-white/10 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-full">
              <ShoppingCart size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">Procurement & Shopping Options</h2>
              <p className="text-white/50 text-sm">Compare vendors for your selected {buildingType} shelter materials</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-zinc-900 flex-1">
          <div className="space-y-8">
            {shoppingItems.map((item, idx) => {
              // Sort vendors based on building type priority
              const sortedVendors = [...item.vendors].sort((a, b) => {
                if (buildingType === 'emergency') return a.delivery_days - b.delivery_days; // Speed
                if (buildingType === 'permanent') return b.rating - a.rating; // Quality
                return a.price - b.price; // Cost (Community)
              });

              return (
                <div key={idx} className="bg-black/40 border border-white/5 rounded-2xl p-6">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <h3 className="text-white/50 text-sm uppercase tracking-wider font-semibold mb-1">{item.category}</h3>
                      <h4 className="text-xl text-white font-medium">{item.materialName}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {sortedVendors.map((vendor, vIdx) => (
                      <div key={vIdx} className={`p-4 rounded-xl border ${vIdx === 0 ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/10 bg-zinc-800/30'} flex flex-col relative`}>
                        {vIdx === 0 && (
                          <div className="absolute -top-3 left-4 bg-cyan-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            Recommended Match
                          </div>
                        )}
                        <div className="flex justify-between items-start mt-2 mb-4">
                          <h5 className="text-white font-medium">{vendor.name}</h5>
                          {getPriorityBadge(vendor, buildingType)}
                        </div>
                        
                        <div className="space-y-2 mb-6 flex-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/50">Unit Price</span>
                            <span className="text-white font-mono">₹{vendor.price.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/50">Delivery</span>
                            <span className="text-white">{vendor.delivery_days} Days</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/50">Rating</span>
                            <span className="text-yellow-500 flex items-center gap-1">{vendor.rating} <Star size={12} fill="currentColor"/></span>
                          </div>
                        </div>

                        <a 
                          href={vendor.link}
                          target="_blank"
                          rel="noreferrer"
                          className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${
                            vIdx === 0 
                              ? 'bg-cyan-500 hover:bg-cyan-400 text-black' 
                              : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                        >
                          Buy Now <ExternalLink size={16} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
