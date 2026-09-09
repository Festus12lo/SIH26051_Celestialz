import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { ShoppingCart, ExternalLink, ShieldCheck, TrendingDown, ArrowLeft } from 'lucide-react';
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
      name: "IndiaMART",
      pricePerUnit: Math.round(basePrice * 0.95),
      deliveryDays: 5,
      rating: 4.2,
      isVerified: true
    },
    {
      name: "TradeIndia",
      pricePerUnit: Math.round(basePrice * 1.05),
      deliveryDays: 3,
      rating: 4.5,
      isVerified: true
    },
    {
      name: "BuildSupply",
      pricePerUnit: Math.round(basePrice * 0.98),
      deliveryDays: 7,
      rating: 4.8,
      isVerified: true
    }
  ].sort((a, b) => a.pricePerUnit - b.pricePerUnit);
};

export default function ShoppingPage() {
  const { blueprintData } = useContext(AppContext);
  const [materialDetails, setMaterialDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fallback to empty if not generated
  const materialsSelected = blueprintData?.materials;
  
  useEffect(() => {
    if (!materialsSelected) {
      setLoading(false);
      return;
    }

    // Fetch the actual material data from our backend to get prices and descriptions
    const fetchMaterials = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/materials');
        const dbMaterials = await res.json();
        
        const selectedIds = [
          materialsSelected.structural?.id,
          materialsSelected.insulation?.id,
          materialsSelected.glazing?.id
        ].filter(Boolean);

        const matched = dbMaterials.filter((m: any) => selectedIds.includes(m.id));
        setMaterialDetails(matched);
      } catch (e) {
        console.error("Failed to fetch material details", e);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [materialsSelected]);

  if (!blueprintData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700 bg-[#ECFDF5]">
        <ShoppingCart size={48} className="text-[#059669] mb-4 opacity-50" />
        <h1 className="text-4xl font-semibold tracking-tight text-[#064E3B] mb-4 font-['Rubik']">Procurement Hub</h1>
        <p className="text-lg text-[#064E3B]/70 max-w-xl font-['Nunito_Sans']">Generate a blueprint first to see required materials and vendor comparisons.</p>
        <Link to="/preferences" className="mt-8 px-8 py-3 bg-[#059669] text-white font-bold rounded-xl hover:bg-[#047857] transition-colors shadow-lg">
          Generate Blueprint
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[#ECFDF5] text-[#064E3B] font-['Nunito_Sans'] overflow-y-auto pb-24">
      {/* Hero Section */}
      <div className="bg-[#059669] text-white pt-20 pb-12 px-8 shadow-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
             <Link to="/floorplan" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 text-sm font-medium transition-colors">
               <ArrowLeft size={16} /> Back to Floorplan
             </Link>
             <h1 className="text-4xl md:text-5xl font-bold font-['Rubik'] tracking-tight">Material Procurement</h1>
             <p className="text-[#A7F3D0] mt-2 text-lg">Compare real-time B2B prices for your selected shelter materials.</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4">
             <div className="bg-[#EA580C] p-3 rounded-xl"><ShoppingCart size={24} className="text-white" /></div>
             <div>
               <div className="text-sm text-white/80">Total Items</div>
               <div className="text-2xl font-bold">{materialDetails.length} Materials</div>
             </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-8 mt-12">
        {loading ? (
          <div className="flex justify-center items-center py-20">
             <div className="w-10 h-10 border-4 border-[#059669]/30 border-t-[#059669] rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {materialDetails.map((material, idx) => {
              const suppliers = mockSuppliers(material.cost_per_m2_inr);
              const bestPrice = suppliers[0].pricePerUnit;
              const savings = material.cost_per_m2_inr - bestPrice;
              
              return (
                <div key={idx} className="bg-white rounded-3xl shadow-sm border border-[#A7F3D0]/50 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row">
                    {/* Material Info */}
                    <div className="p-8 lg:w-1/3 bg-[#FAFAFA] border-r border-[#E8F1F3] flex flex-col justify-center">
                      <div className="w-full aspect-video rounded-xl overflow-hidden mb-6 bg-gray-100 shadow-inner">
                         {material.image_url ? (
                           <img src={material.image_url} alt={material.name} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                         )}
                      </div>
                      <h3 className="text-2xl font-bold font-['Rubik'] mb-2">{material.name}</h3>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F1F3] text-[#475569] rounded-full text-xs font-bold uppercase tracking-wider mb-4 w-max">
                        {material.category}
                      </div>
                      <p className="text-sm text-[#475569] leading-relaxed line-clamp-3">
                        {material.description || `High quality ${material.category} suitable for architectural applications.`}
                      </p>
                    </div>

                    {/* Suppliers */}
                    <div className="p-8 lg:w-2/3 flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-lg font-bold font-['Rubik'] text-[#064E3B]">Available Suppliers</h4>
                        {savings > 0 && (
                          <div className="inline-flex items-center gap-1.5 text-[#059669] font-bold text-sm bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0]">
                            <TrendingDown size={16} /> Save up to ₹{savings}/m²
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {suppliers.map((sup, sIdx) => (
                          <div key={sIdx} className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:bg-gray-50 ${sIdx === 0 ? 'border-[#059669] bg-[#ECFDF5]/30' : 'border-[#E8F1F3]'}`}>
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-400 text-xl flex-shrink-0">
                                {sup.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[#064E3B] text-lg">{sup.name}</span>
                                  {sup.isVerified && <ShieldCheck size={16} className="text-[#059669]" title="Verified Supplier" />}
                                </div>
                                <div className="text-sm text-[#475569] mt-1">
                                  ⭐ {sup.rating} • {sup.deliveryDays} Days Delivery
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                              <div className="text-right">
                                <div className="text-2xl font-bold text-[#064E3B]">₹{sup.pricePerUnit}</div>
                                <div className="text-xs text-[#475569]">per m²</div>
                              </div>
                              <button className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${sIdx === 0 ? 'bg-[#EA580C] text-white hover:bg-[#C2410C] shadow-md hover:shadow-lg' : 'bg-white border border-gray-200 text-[#064E3B] hover:bg-gray-50'}`}>
                                Buy <ExternalLink size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
