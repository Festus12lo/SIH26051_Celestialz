import React, { useState } from 'react';
import { ShoppingCart, X, ExternalLink, ArrowRight, TrendingDown, Star, Zap, Package, Check } from 'lucide-react';

interface Vendor {
  name: string;
  price: number;
  delivery_days: number;
  rating: number;
  link: string;
  id: string; // added to identify for cart
}

interface ShoppingMaterial {
  category: string;
  materialName: string;
  vendors: Vendor[];
}

export default function ShoppingModal({ isOpen, onClose, materials, buildingType }: { isOpen: boolean, onClose: () => void, materials: any, buildingType: string }) {
  const [cart, setCart] = useState<{vendorId: string, price: number}[]>([]);

  if (!isOpen) return null;

  // Generate dummy vendor data based on the selected materials
  const generateVendors = (basePrice: number, prefix: string, bType: string): Vendor[] => {
    if (bType === 'emergency') {
      return [
        {
          id: `${prefix}-v1`,
          name: 'UNHCR Bulk Tents',
          price: basePrice * 0.8,
          delivery_days: 2,
          rating: 4.8,
          link: 'https://www.unhcr.org/what-we-do/how-we-work/procurement'
        },
        {
          id: `${prefix}-v2`,
          name: 'IKEA Foundation (Better Shelter)',
          price: basePrice * 1.0,
          delivery_days: 3,
          rating: 4.9,
          link: 'https://bettershelter.org/'
        },
        {
          id: `${prefix}-v3`,
          name: 'ReliefWeb Logisitics',
          price: basePrice * 0.9,
          delivery_days: 1,
          rating: 4.5,
          link: 'https://reliefweb.int/topics/logistics'
        }
      ];
    }
    return [
      {
        id: `${prefix}-v1`,
        name: 'IndiaMART Direct',
        price: basePrice * 0.9,
        delivery_days: 7,
        rating: 4.2,
        link: 'https://indiamart.com/search'
      },
      {
        id: `${prefix}-v2`,
        name: 'Amazon Business',
        price: basePrice * 1.1,
        delivery_days: 2,
        rating: 4.8,
        link: 'https://business.amazon.in/'
      },
      {
        id: `${prefix}-v3`,
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
      category: buildingType === 'emergency' ? 'Modular Shell' : 'Structural',
      materialName: materials.structural.name,
      vendors: generateVendors(materials.structural.cost_per_unit || 500, 'struct', buildingType)
    });
  }
  if (materials?.insulation) {
    shoppingItems.push({
      category: 'Insulation',
      materialName: materials.insulation.name,
      vendors: generateVendors(materials.insulation.cost_per_unit || 300, 'insul', buildingType)
    });
  }
  if (materials?.glazing) {
    shoppingItems.push({
      category: 'Glazing',
      materialName: materials.glazing.name,
      vendors: generateVendors(materials.glazing.cost_per_unit || 1200, 'glaze', buildingType)
    });
  }
  if (materials?.roofing) {
    shoppingItems.push({
      category: 'Roofing',
      materialName: materials.roofing.name,
      vendors: generateVendors(materials.roofing.cost_per_unit || 800, 'roof', buildingType)
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

  const toggleCart = (vendorId: string, price: number) => {
    setCart(prev => {
      if (prev.some(item => item.vendorId === vendorId)) {
        return prev.filter(item => item.vendorId !== vendorId);
      } else {
        return [...prev, { vendorId, price }];
      }
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-white/10 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] relative">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#FF5722]/20 text-[#FF5722] rounded-full">
              <ShoppingCart size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">Procurement & Shopping Options</h2>
              <p className="text-white/50 text-sm">Compare vendors for your selected {buildingType} shelter materials</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors cursor-pointer">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-zinc-900 flex-1 pb-24">
          {shoppingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-white/50 bg-black/20 rounded-2xl border border-dashed border-white/20">
              <Package size={48} className="mb-4 text-white/20" />
              <p>No major materials identified for direct procurement yet.</p>
            </div>
          ) : (
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
                      {sortedVendors.map((vendor, vIdx) => {
                        const inCart = cart.some(c => c.vendorId === vendor.id);
                        return (
                          <div key={vIdx} className={`p-4 rounded-xl border ${vIdx === 0 ? 'border-[#FF5722]/50 bg-[#FF5722]/5' : 'border-white/10 bg-zinc-800/30'} flex flex-col relative`}>
                            {vIdx === 0 && (
                              <div className="absolute -top-3 left-4 bg-[#FF5722] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
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
    
                            <div className="flex gap-2">
                              <button 
                                onClick={() => toggleCart(vendor.id, vendor.price)}
                                className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-all cursor-pointer ${
                                  inCart
                                    ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                                    : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white'
                                }`}
                              >
                                {inCart ? <><Check size={16} /> Added</> : 'Add to List'}
                              </button>
                              <a 
                                href={vendor.link}
                                target="_blank"
                                rel="noreferrer"
                                className={`px-4 py-2.5 rounded-lg flex items-center justify-center transition-all ${
                                  vIdx === 0 
                                    ? 'bg-[#FF5722] hover:bg-[#FF7043] text-white' 
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                                title="Go to vendor site"
                              >
                                <ExternalLink size={16} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Cart Footer */}
        {cart.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-900 border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center max-w-5xl mx-auto">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#FF5722]/20 text-[#FF5722] flex items-center justify-center border border-[#FF5722]/30">
                  <span className="font-bold">{cart.length}</span>
                </div>
                <div>
                  <div className="text-white/50 text-sm font-medium uppercase tracking-wider">Total Est. Cart</div>
                  <div className="text-2xl font-bold text-white font-mono">₹{cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
              <button 
                onClick={() => alert("Proceeding to checkout with internal procurement system...")}
                className="bg-[#FF5722] hover:bg-[#FF7043] text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(255,87,34,0.35)] hover:shadow-[0_0_25px_rgba(255,87,34,0.55)] cursor-pointer"
              >
                Procure Items <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
