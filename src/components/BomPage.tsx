import React, { useContext } from 'react';
import { AppContext } from '../App';
import { Link } from 'react-router-dom';
import { IndianRupee, AlertTriangle, CheckCircle, Truck, Package, HardHat, ShieldCheck, ShoppingCart } from 'lucide-react';
import ShoppingModal from './ShoppingModal';

export default function BomPage() {
  const { blueprintData } = useContext(AppContext);
  const [isShoppingOpen, setIsShoppingOpen] = React.useState(false);

  // Safely extract the budget data whether it's directly on blueprintData or nested
  const budget = blueprintData?.budget || blueprintData?.architecture?.budget;
  const materials = blueprintData?.materials_selected || blueprintData?.architecture?.materials_selected;

  if (!budget) {
    return (
      <div className="flex-1 p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700 overflow-y-auto">
        <h1 className="text-4xl font-semibold mb-8 text-white">BOM & Procurement</h1>
        <div className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 flex items-center justify-center shadow-sm min-h-[500px]">
          <div className="text-white/50 flex flex-col items-center gap-4">
            <span className="text-lg">No blueprint generated yet.</span>
            <Link to="/preferences" className="px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors">
              Go to Preferences to Generate
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { breakdown, location_premium, total_estimated_inr, user_budget_inr, within_budget } = budget;

  // Format currency
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const trades = [
    { key: 'structural_masonry_inr', label: blueprintData?.building_type === 'emergency' ? 'Wall System (Panels)' : 'Structural Masonry', icon: <Package size={18} /> },
    { key: 'rcc_superstructure_inr', label: blueprintData?.building_type === 'emergency' ? 'Structural Frame (Modular)' : 'RCC Superstructure', icon: <HardHat size={18} /> },
    { key: 'insulation_inr', label: 'Insulation System', icon: <ShieldCheck size={18} /> },
    { key: 'glazing_windows_inr', label: 'Glazing & Windows', icon: <Package size={18} /> },
    { key: 'doors_inr', label: 'Doors & Hardware', icon: <Package size={18} /> },
    { key: 'roofing_inr', label: 'Roofing System', icon: <Package size={18} /> },
    { key: 'foundation_inr', label: 'Foundation & Earthwork', icon: <HardHat size={18} /> },
    { key: 'flooring_tiling_inr', label: 'Flooring & Tiling', icon: <Package size={18} /> },
    { key: 'plastering_inr', label: 'Plastering', icon: <Package size={18} /> },
    { key: 'painting_finishing_inr', label: 'Painting & Finishing', icon: <Package size={18} /> },
    { key: 'electrical_inr', label: 'Electrical Wiring & DBs', icon: <Package size={18} /> },
    { key: 'plumbing_sanitaryware_inr', label: 'Plumbing & Sanitaryware', icon: <Package size={18} /> },
    { key: 'waterproofing_inr', label: 'Waterproofing', icon: <ShieldCheck size={18} /> },
  ];

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700 overflow-y-auto scrollbar-hide pb-24">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-semibold text-white">Bill of Materials (BOM) & Procurement</h1>
        
        <button 
          onClick={() => setIsShoppingOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium px-6 py-3 rounded-full transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5"
        >
          <ShoppingCart size={20} />
          <span>Shopping / Procurement</span>
        </button>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={`p-6 rounded-3xl border ${within_budget ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'} flex flex-col justify-center`}>
          <div className="flex items-center gap-2 mb-2">
            {within_budget ? <CheckCircle className="text-green-400" size={24} /> : <AlertTriangle className="text-red-400" size={24} />}
            <h2 className="text-xl font-medium text-white/90">Budget Status</h2>
          </div>
          <div className="flex justify-between items-end mt-2">
            <div>
              <div className="text-sm text-white/60 mb-1">Estimated Cost</div>
              <div className="text-3xl font-bold text-white">{formatINR(total_estimated_inr)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/60 mb-1">Your Budget</div>
              <div className="text-xl font-medium text-white/80">{formatINR(user_budget_inr)}</div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4 text-white/70">
            <Truck size={20} />
            <h2 className="text-lg font-medium">Logistics & Supply Chain</h2>
          </div>
          <div className="mb-2">
            <span className="text-white/50 text-sm">Zone:</span>
            <span className="text-white ml-2 font-medium capitalize">{location_premium.zone.replace('_', ' ')}</span>
          </div>
          <div className="mb-2">
            <span className="text-white/50 text-sm">Transport Premium:</span>
            <span className="text-cyan-400 ml-2 font-bold">+{Math.round((location_premium.multiplier - 1) * 100)}%</span>
          </div>
          <p className="text-sm text-white/60 mt-4 leading-relaxed line-clamp-3">
            {location_premium.reason}
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4 text-white/70">
            <ShieldCheck size={20} />
            <h2 className="text-lg font-medium">Core Material Selections</h2>
          </div>
          <ul className="space-y-3">
            {materials && (
              <>
                <li className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/50 text-sm">Structural</span>
                  <span className="text-white text-sm font-medium">{materials.structural?.name || 'Standard'}</span>
                </li>
                <li className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/50 text-sm">Insulation</span>
                  <span className="text-white text-sm font-medium">{materials.insulation?.name || 'Standard'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-white/50 text-sm">Glazing</span>
                  <span className="text-white text-sm font-medium">{materials.glazing?.name || 'Standard'}</span>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* BOQ Table */}
      <div className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-white/10 bg-white/5">
          <h2 className="text-2xl font-medium text-white/90">Construction Trades Breakdown (BOQ)</h2>
          <p className="text-white/50 text-sm mt-1">Itemized estimates including local labor and logistics multipliers.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/20">
                <th className="p-4 text-white/50 font-medium text-sm">Trade / Item</th>
                <th className="p-4 text-white/50 font-medium text-sm text-right">Estimated Cost (INR)</th>
                <th className="p-4 text-white/50 font-medium text-sm text-right">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {trades.filter(t => (breakdown[t.key] || 0) > 0).map((trade, idx) => {
                const cost = breakdown[trade.key] || 0;
                const percentage = ((cost / total_estimated_inr) * 100).toFixed(1);
                
                return (
                  <tr key={trade.key} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? 'bg-transparent' : 'bg-black/10'}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-white/30">{trade.icon}</div>
                        <span className="text-white/80 font-medium">{trade.label}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right text-white font-mono">{formatINR(cost)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-white/10 h-2 rounded-full overflow-hidden">
                          <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${Math.min(100, Number(percentage))}%` }}></div>
                        </div>
                        <span className="text-white/60 text-xs w-8">{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {/* Special Fees / Labor */}
              <tr className="border-t border-white/20 bg-black/30">
                <td className="p-4 text-white/70 font-medium pl-10">Construction Labor</td>
                <td className="p-4 text-right text-white/90 font-mono">{formatINR(breakdown.construction_labor_inr)}</td>
                <td className="p-4 text-right text-white/50 text-sm">{((breakdown.construction_labor_inr / total_estimated_inr) * 100).toFixed(1)}%</td>
              </tr>
              <tr className="bg-black/30">
                <td className="p-4 text-white/70 font-medium pl-10">Professional Fees (Arch/Eng)</td>
                <td className="p-4 text-right text-white/90 font-mono">{formatINR(breakdown.professional_fees_inr)}</td>
                <td className="p-4 text-right text-white/50 text-sm">{((breakdown.professional_fees_inr / total_estimated_inr) * 100).toFixed(1)}%</td>
              </tr>
              <tr className="bg-black/30 border-b border-white/20">
                <td className="p-4 text-yellow-500/80 font-medium pl-10 flex items-center gap-2">
                  Contingency Buffer <AlertTriangle size={14} />
                </td>
                <td className="p-4 text-right text-yellow-500/90 font-mono">{formatINR(breakdown.contingency_buffer_inr)}</td>
                <td className="p-4 text-right text-yellow-500/50 text-sm">{((breakdown.contingency_buffer_inr / total_estimated_inr) * 100).toFixed(1)}%</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-cyan-500/10">
                <td className="p-6 font-bold text-lg text-white">Total Estimated Construction Cost</td>
                <td className="p-6 text-right font-bold text-2xl text-cyan-400 font-mono">{formatINR(total_estimated_inr)}</td>
                <td className="p-6"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <ShoppingModal 
        isOpen={isShoppingOpen}
        onClose={() => setIsShoppingOpen(false)}
        materials={materials}
        buildingType={blueprintData?.building_type || 'emergency'}
      />
    </div>
  );
}
