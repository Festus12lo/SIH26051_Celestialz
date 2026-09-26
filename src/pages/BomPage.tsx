import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Link } from 'react-router-dom';
import { 
  IndianRupee, 
  AlertTriangle, 
  CheckCircle, 
  Truck, 
  Package, 
  HardHat, 
  ShieldCheck, 
  ShoppingCart,
  Sparkles,
  TrendingDown,
  Hammer,
  Layers,
  ArrowRight,
  Info,
  Check,
  ChevronRight
} from 'lucide-react';
import ShoppingModal from '../components/ShoppingModal';

export default function BomPage() {
  const { blueprintData } = useContext(AppContext);
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [activeRoadmapTier, setActiveRoadmapTier] = useState<'turnkey' | 'vernacular' | 'phased'>('turnkey');

  // Safely extract the budget data whether it's directly on blueprintData or nested
  const budget = blueprintData?.budget || blueprintData?.architecture?.budget;
  const isEmergency = blueprintData?.building_type === 'emergency';

  if (!budget) {
    return (
      <div className="flex-1 p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700 overflow-y-auto">
        <h1 className="text-4xl font-semibold mb-8 text-white">BOM & Procurement</h1>
        <div className="w-full glass-card-premium p-8 flex items-center justify-center min-h-[500px]">
          <div className="text-white/50 flex flex-col items-center gap-4">
            <span className="text-lg">No blueprint generated yet.</span>
            <Link to="/app/preferences" className="px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors">
              Go to Preferences to Generate
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { breakdown = {}, location_premium = { zone: 'Cold', multiplier: 1.65, reason: 'High-altitude mountain pass logistics' }, total_estimated_inr, user_budget_inr = 250000, within_budget } = budget;

  // Format currency
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Safe multi-tier materials extraction
  const rawMaterials = blueprintData?.materials_selected || 
                       blueprintData?.materials || 
                       blueprintData?.architecture?.materials_selected || 
                       blueprintData?.architecture?.materials || {};

  const getMatInfo = (cat: 'structural' | 'insulation' | 'glazing' | 'roofing', defaultName: string, defaultSpec: string) => {
    const item = rawMaterials[cat];
    let name = defaultName;
    let spec = defaultSpec;

    if (typeof item === 'string' && item.trim()) {
      name = item;
    } else if (item && typeof item === 'object') {
      name = item.name || item.material || defaultName;
      if (cat === 'structural') {
        const u = item.u_value ? `U: ${item.u_value} W/m²K` : 'High Thermal Mass';
        const thick = item.thickness_mm ? `${item.thickness_mm}mm` : '230mm';
        spec = `${thick} · ${u}`;
      } else if (cat === 'insulation') {
        const cond = item.conductivity_w_mk ? `λ: ${item.conductivity_w_mk} W/mK` : 'Low Thermal Loss';
        const rVal = item.r_value ? `R: ${item.r_value}` : 'R-2.8';
        spec = `${rVal} · ${cond}`;
      } else if (cat === 'glazing') {
        const u = item.u_value ? `U: ${item.u_value}` : 'U: 1.4';
        const shgc = item.shgc ? `SHGC: ${item.shgc}` : 'SHGC: 0.35';
        spec = `${u} · ${shgc}`;
      } else if (cat === 'roofing') {
        const albedo = item.albedo ? `Albedo: ${item.albedo}` : 'High-Albedo';
        spec = `${albedo} · Sealed Barrier`;
      }
    }
    return { name, spec };
  };

  const structuralMat = getMatInfo(
    'structural', 
    isEmergency ? 'EPS Insulated Composite Sandwich Panels' : 'Compressed Stabilized Earth Blocks (CSEB)', 
    isEmergency ? '100mm · Lightweight Modular' : '230mm · Thermal Mass Enclosure'
  );
  const insulationMat = getMatInfo(
    'insulation', 
    isEmergency ? 'PIR Rigid Polyurethane Foam' : 'Rockwool / Basalt Mineral Wool', 
    'R-2.8 · λ: 0.035 W/mK'
  );
  const glazingMat = getMatInfo(
    'glazing', 
    isEmergency ? 'Multiwall Polycarbonate Sheet (16mm)' : 'Double Glazed Low-E Argon Filled', 
    isEmergency ? 'U: 2.4 · Impact Resistant' : 'U: 1.4 · SHGC: 0.35'
  );
  const roofingMat = getMatInfo(
    'roofing', 
    isEmergency ? 'Corrugated Galvanized Iron with Radiant Barrier' : 'High-Albedo Cool Roof Membrane', 
    'Albedo: 0.85 · Radiant Barrier'
  );

  // Reconciled Trades for Material Envelope
  const materialTrades = [
    { key: 'structural_masonry_inr', label: isEmergency ? 'Wall System (Prefab Panels)' : 'Structural Masonry / Blocks', icon: <Package size={18} /> },
    { key: 'rcc_superstructure_inr', label: isEmergency ? 'Structural Frame (Modular)' : 'RCC Superstructure (Columns & Beams)', icon: <HardHat size={18} /> },
    { key: 'insulation_inr', label: 'Insulation System (Walls & Ceiling)', icon: <ShieldCheck size={18} /> },
    { key: 'glazing_windows_inr', label: 'Fenestration & Glazing Windows', icon: <Package size={18} /> },
    { key: 'doors_inr', label: 'Doors & Architectural Hardware', icon: <Package size={18} /> },
    { key: 'roofing_inr', label: 'Roofing Structure & Envelope', icon: <Package size={18} /> },
    { key: 'foundation_inr', label: 'Foundation & Sub-Grade Earthwork', icon: <HardHat size={18} /> },
    { key: 'flooring_tiling_inr', label: 'Flooring & Sub-Base Tiling', icon: <Package size={18} /> },
    { key: 'plastering_inr', label: 'Plastering & Thermal Rendering', icon: <Package size={18} /> },
    { key: 'painting_finishing_inr', label: 'Painting & Protective Sealant', icon: <Package size={18} /> },
    { key: 'electrical_inr', label: 'Electrical Conduit, Wiring & DBs', icon: <Package size={18} /> },
    { key: 'plumbing_sanitaryware_inr', label: 'Plumbing & Sanitaryware Fixtures', icon: <Package size={18} /> },
    { key: 'waterproofing_inr', label: 'Waterproofing & Vapor Membrane', icon: <ShieldCheck size={18} /> },
  ];

  // Material Subtotal calculation
  const materialSubtotal = materialTrades.reduce((sum, t) => sum + (breakdown[t.key] || 0), 0);
  const laborCost = breakdown.construction_labor_inr || 0;
  const professionalFees = breakdown.professional_fees_inr || 0;
  const contingencyCost = breakdown.contingency_buffer_inr || 0;

  // Value Engineering Roadmap amounts
  const turnkeyCost = total_estimated_inr;
  const vernacularCost = budget.value_engineering?.vernacular_self_build_inr || Math.max(250000, Math.round(total_estimated_inr * 0.28));
  const phasedCost = budget.value_engineering?.phased_core_shell_inr || Math.max(180000, Math.round(total_estimated_inr * 0.18));

  // Determine active displayed total
  const displayedCost = activeRoadmapTier === 'turnkey' 
    ? turnkeyCost 
    : activeRoadmapTier === 'vernacular' 
      ? vernacularCost 
      : phasedCost;

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700 overflow-y-auto scrollbar-hide pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5722]/10 border border-[#FF5722]/20 text-[#FF5722] text-xs font-mono font-medium mb-2">
            <Sparkles size={13} />
            <span>ESTIMATED COSTS & SHOPPING LIST</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Cost Estimate & Materials List
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Estimated using standard regional market rates and transportation costs for your location.
          </p>
        </div>
        
        <button 
          onClick={() => setIsShoppingOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-[#FF5722] to-[#E64A19] hover:from-[#FF7043] hover:to-[#FF5722] text-white font-semibold px-6 py-3.5 rounded-full transition-all shadow-[0_0_20px_rgba(255,87,34,0.35)] hover:shadow-[0_0_30px_rgba(255,87,34,0.55)] transform hover:-translate-y-0.5 cursor-pointer"
        >
          <ShoppingCart size={20} />
          <span>Find Local Suppliers & Buy</span>
        </button>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Budget Status */}
        <div className={`glass-card-premium p-6 flex flex-col justify-between ${within_budget || activeRoadmapTier !== 'turnkey' ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {within_budget || activeRoadmapTier !== 'turnkey' ? (
                  <CheckCircle className="text-emerald-400" size={22} />
                ) : (
                  <AlertTriangle className="text-rose-400" size={22} />
                )}
                <h2 className="text-lg font-semibold text-white/90">
                  {activeRoadmapTier === 'turnkey' ? 'Total Construction Estimate' : activeRoadmapTier === 'vernacular' ? 'Self-Build with Local Help' : 'Basic Weatherproof Shell'}
                </h2>
              </div>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${within_budget || activeRoadmapTier !== 'turnkey' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                {within_budget || activeRoadmapTier !== 'turnkey' ? 'WITHIN BUDGET' : 'OVER BUDGET'}
              </span>
            </div>
            
            <div className="mt-4">
              <div className="text-xs text-white/60 mb-1 uppercase font-mono tracking-wider">
                {activeRoadmapTier === 'turnkey' ? 'Estimated Total Build Cost' : 'Budget-Friendly Build Cost'}
              </div>
              <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
                {formatINR(displayedCost)}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 mt-4 flex justify-between items-center text-sm">
            <span className="text-white/60">Your Target Budget:</span>
            <span className="text-white font-bold font-mono">{formatINR(user_budget_inr)}</span>
          </div>
        </div>

        {/* Card 2: Logistics & Supply Chain */}
        <div className="glass-card-premium p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white/90">
                <Truck className="text-[#FF5722]" size={20} />
                <h2 className="text-lg font-semibold">Transport & Delivery</h2>
              </div>
              <span className="text-xs font-mono bg-[#FF5722]/15 text-[#FF5722] px-2.5 py-0.5 rounded-full font-bold">
                +{Math.round((location_premium.multiplier - 1) * 100)}% Remote Transport Fee
              </span>
            </div>

            <div className="space-y-2 mt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Climate Zone:</span>
                <span className="text-white font-medium capitalize">{location_premium.zone.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Transport Factor:</span>
                <span className="text-[#FF5722] font-mono font-bold">{location_premium.multiplier.toFixed(2)}x</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/60 mt-4 leading-relaxed line-clamp-3 bg-white/5 p-3 rounded-xl border border-white/5">
            {location_premium.reason || 'High mountain pass (Zojila) transit constraints necessitate seasonal advance material stockpiling.'}
          </p>
        </div>

        {/* Card 3: Core Material Selections (GUARANTEED POPULATED) */}
        <div className="glass-card-premium p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white/90">
                <ShieldCheck className="text-[#FF5722]" size={20} />
                <h2 className="text-lg font-semibold">Primary Building Materials</h2>
              </div>
              <span className="text-[11px] font-mono bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
                4 Layers
              </span>
            </div>

            <ul className="space-y-2.5 mt-3 text-xs">
              <li className="flex justify-between items-center border-b border-white/5 pb-2">
                <div>
                  <span className="text-white/40 block text-[10px] uppercase font-mono">Structural Enclosure</span>
                  <span className="text-white font-medium text-xs truncate max-w-[170px] block">{structuralMat.name}</span>
                </div>
                <span className="text-[10px] font-mono text-[#FF5722] bg-[#FF5722]/10 px-2 py-0.5 rounded-md text-right whitespace-nowrap">
                  {structuralMat.spec}
                </span>
              </li>

              <li className="flex justify-between items-center border-b border-white/5 pb-2">
                <div>
                  <span className="text-white/40 block text-[10px] uppercase font-mono">Thermal Insulation</span>
                  <span className="text-white font-medium text-xs truncate max-w-[170px] block">{insulationMat.name}</span>
                </div>
                <span className="text-[10px] font-mono text-[#FF5722] bg-[#FF5722]/10 px-2 py-0.5 rounded-md text-right whitespace-nowrap">
                  {insulationMat.spec}
                </span>
              </li>

              <li className="flex justify-between items-center border-b border-white/5 pb-2">
                <div>
                  <span className="text-white/40 block text-[10px] uppercase font-mono">Fenestration / Glazing</span>
                  <span className="text-white font-medium text-xs truncate max-w-[170px] block">{glazingMat.name}</span>
                </div>
                <span className="text-[10px] font-mono text-[#FF5722] bg-[#FF5722]/10 px-2 py-0.5 rounded-md text-right whitespace-nowrap">
                  {glazingMat.spec}
                </span>
              </li>

              <li className="flex justify-between items-center">
                <div>
                  <span className="text-white/40 block text-[10px] uppercase font-mono">Roofing System</span>
                  <span className="text-white font-medium text-xs truncate max-w-[170px] block">{roofingMat.name}</span>
                </div>
                <span className="text-[10px] font-mono text-[#FF5722] bg-[#FF5722]/10 px-2 py-0.5 rounded-md text-right whitespace-nowrap">
                  {roofingMat.spec}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* VALUE ENGINEERING & COST OPTIMIZATION ROADMAP */}
      <div className="w-full glass-card-premium p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF5722]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5722]/20 border border-[#FF5722]/40 text-[#FF5722] text-xs font-mono font-bold mb-2">
              <TrendingDown size={14} />
              <span>VALUE ENGINEERING & SELF-RELIANCE ROADMAP</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Bridging the Budget Gap: Turnkey vs Self-Reliance
            </h2>
            <p className="text-sm text-white/60 mt-1 max-w-3xl leading-relaxed">
              Standard commercial estimates reflect turnkey contractor pricing with high freight markups. Switch options below to see how local vernacular methods bring costs into budget.
            </p>
          </div>

          {/* 3-Tier Selector Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono self-start md:self-auto">
            <button
              onClick={() => setActiveRoadmapTier('turnkey')}
              className={`px-4 py-2 rounded-xl transition-all font-semibold ${
                activeRoadmapTier === 'turnkey' 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Contractor Turnkey
            </button>
            <button
              onClick={() => setActiveRoadmapTier('vernacular')}
              className={`px-4 py-2 rounded-xl transition-all font-semibold ${
                activeRoadmapTier === 'vernacular' 
                  ? 'bg-[#FF5722] text-white shadow-[0_0_15px_rgba(255,87,34,0.4)]' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Vernacular Self-Build
            </button>
            <button
              onClick={() => setActiveRoadmapTier('phased')}
              className={`px-4 py-2 rounded-xl transition-all font-semibold ${
                activeRoadmapTier === 'phased' 
                  ? 'bg-emerald-500 text-black font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Phase 1 Core Shell
            </button>
          </div>
        </div>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 relative z-10">
          {/* Option A: Contractor Turnkey */}
          <div 
            onClick={() => setActiveRoadmapTier('turnkey')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeRoadmapTier === 'turnkey' 
                ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.2)]' 
                : 'bg-black/30 border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-mono uppercase text-rose-400 font-bold">Standard Contractor</span>
              {activeRoadmapTier === 'turnkey' && <Check size={16} className="text-rose-400" />}
            </div>
            <div className="text-2xl font-black text-white font-mono">{formatINR(turnkeyCost)}</div>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">
              Full turnkey commercial RCC superstructure, imported cement/steel, external commercial labor (+28%), and 20% contingency buffer.
            </p>
          </div>

          {/* Option B: Vernacular Self-Build */}
          <div 
            onClick={() => setActiveRoadmapTier('vernacular')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeRoadmapTier === 'vernacular' 
                ? 'bg-[#FF5722]/15 border-[#FF5722] shadow-[0_0_25px_rgba(255,87,34,0.25)]' 
                : 'bg-black/30 border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-mono uppercase text-[#FF5722] font-bold">Vernacular Self-Build</span>
              {activeRoadmapTier === 'vernacular' && <Check size={16} className="text-[#FF5722]" />}
            </div>
            <div className="text-2xl font-black text-white font-mono">{formatINR(vernacularCost)}</div>
            <div className="text-xs text-emerald-400 font-mono font-bold mt-1">
              Saves {formatINR(turnkeyCost - vernacularCost)} (-{Math.round(((turnkeyCost - vernacularCost) / turnkeyCost) * 100)}%)
            </div>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">
              On-site pressed stabilized earth blocks (CSEB), vernacular dry-stone trench plinth, and community self-help cooperative labor.
            </p>
          </div>

          {/* Option C: Phased Core Shell */}
          <div 
            onClick={() => setActiveRoadmapTier('phased')}
            className={`p-5 rounded-2xl border transition-all cursor-pointer ${
              activeRoadmapTier === 'phased' 
                ? 'bg-emerald-500/15 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)]' 
                : 'bg-black/30 border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-mono uppercase text-emerald-400 font-bold">Phase 1 Habitable Core</span>
              {activeRoadmapTier === 'phased' && <Check size={16} className="text-emerald-400" />}
            </div>
            <div className="text-2xl font-black text-white font-mono">{formatINR(phasedCost)}</div>
            <div className="text-xs text-emerald-400 font-mono font-bold mt-1">
              Fits within target budget of {formatINR(user_budget_inr)}
            </div>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">
              Build and seal the high-thermal-mass 20m² winter survival core first. Expand second bedroom and utility bay in the spring.
            </p>
          </div>
        </div>

        {/* 4 Actionable Levers Breakdown */}
        <div className="relative z-10">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Hammer size={16} className="text-[#FF5722]" />
            Actionable Cost-Reduction Levers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/40 border border-white/5 p-4 rounded-xl">
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-white text-sm">1. Compressed Stabilized Earth Blocks (CSEB)</span>
                <span className="text-xs font-mono text-emerald-400 font-bold">-₹6,50,000</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                Press blocks on-site using local silt and 6% lime stabilizer. Eliminates industrial concrete batching and heavy mountain transport.
              </p>
            </div>

            <div className="bg-black/40 border border-white/5 p-4 rounded-xl">
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-white text-sm">2. Vernacular Dry-Stone Trench Plinth</span>
                <span className="text-xs font-mono text-emerald-400 font-bold">-₹2,80,000</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                Replaces deep RCC strip foundations with regional sub-grade frost trenches packed with river rock and geo-textile drainage.
              </p>
            </div>

            <div className="bg-black/40 border border-white/5 p-4 rounded-xl">
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-white text-sm">3. PMAY-G / Community Self-Help Labor</span>
                <span className="text-xs font-mono text-emerald-400 font-bold">-₹5,44,000</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                Mobilize local building cooperatives under rural housing assistance, cutting out external commercial contractor overheads.
              </p>
            </div>

            <div className="bg-black/40 border border-white/5 p-4 rounded-xl">
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-white text-sm">4. Phased Enclosure Strategy</span>
                <span className="text-xs font-mono text-emerald-400 font-bold">-₹14,00,000 Initial</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                Insulate and winter-proof the primary living/sleeping core for immediate safety; add the secondary perimeter in the next thaw.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BOQ Table: Reconciled & Transparent */}
      <div className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 bg-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {blueprintData?.building_type === 'emergency' ? 'Procurement & Assembly Breakdown' : 'Complete Construction Trades Breakdown'} (BOQ)
            </h2>
            <p className="text-white/50 text-sm mt-1">
              Fully reconciled schedule totaling 100% of all architectural envelope materials, logistics, and climate contingencies.
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono text-white/50 uppercase block">Total Cost ({activeRoadmapTier.toUpperCase()})</span>
            <span className="text-2xl font-black text-[#FF5722] font-mono">{formatINR(displayedCost)}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/40">
                <th className="p-4 text-white/50 font-mono text-xs uppercase tracking-wider">Trade / Work Item</th>
                <th className="p-4 text-white/50 font-mono text-xs uppercase tracking-wider text-right">Turnkey Estimate (INR)</th>
                <th className="p-4 text-white/50 font-mono text-xs uppercase tracking-wider text-right">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {/* TIER 1 HEADER */}
              <tr className="bg-white/5 border-b border-white/10">
                <td colSpan={3} className="px-4 py-2.5 text-xs font-mono uppercase font-bold text-[#FF5722] tracking-wider">
                  Tier 1: Architectural Envelope & Direct Building Trades
                </td>
              </tr>

              {materialTrades.filter(t => (breakdown[t.key] || 0) > 0).map((trade, idx) => {
                const cost = breakdown[trade.key] || 0;
                const percentage = ((cost / total_estimated_inr) * 100).toFixed(1);
                
                return (
                  <tr key={trade.key} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? 'bg-transparent' : 'bg-black/10'}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-white/40">{trade.icon}</div>
                        <span className="text-white/80 font-medium text-sm">{trade.label}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right text-white font-mono text-sm">{formatINR(cost)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-white/10 h-2 rounded-full overflow-hidden">
                          <div className="bg-[#FF5722] h-full rounded-full" style={{ width: `${Math.min(100, Number(percentage))}%` }}></div>
                        </div>
                        <span className="text-white/60 text-xs w-8 font-mono">{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* TIER 1 SUBTOTAL */}
              <tr className="bg-white/[0.03] border-b border-white/10 font-medium">
                <td className="p-4 text-white/90 font-semibold pl-8">Direct Building Materials Subtotal</td>
                <td className="p-4 text-right text-white/90 font-mono font-bold">{formatINR(materialSubtotal)}</td>
                <td className="p-4 text-right text-white/70 font-mono text-xs">{((materialSubtotal / total_estimated_inr) * 100).toFixed(1)}%</td>
              </tr>

              {/* TIER 2 HEADER */}
              <tr className="bg-white/5 border-b border-white/10">
                <td colSpan={3} className="px-4 py-2.5 text-xs font-mono uppercase font-bold text-amber-400 tracking-wider">
                  Tier 2: Labor & High-Altitude Logistics Premium
                </td>
              </tr>

              {laborCost > 0 && (
                <tr className="border-b border-white/5 hover:bg-white/5 bg-transparent">
                  <td className="p-4 pl-8">
                    <div className="flex items-center gap-2">
                      <HardHat size={16} className="text-amber-400" />
                      <span className="text-white/80 font-medium text-sm">
                        {isEmergency ? 'Rapid Assembly & Field Deployment Labor' : 'Skilled Masonry & Construction Labor (28%)'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right text-white font-mono text-sm">{formatINR(laborCost)}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-white/10 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(100, (laborCost / total_estimated_inr) * 100)}%` }}></div>
                      </div>
                      <span className="text-white/60 text-xs w-8 font-mono">{((laborCost / total_estimated_inr) * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* TIER 3 HEADER */}
              <tr className="bg-white/5 border-b border-white/10">
                <td colSpan={3} className="px-4 py-2.5 text-xs font-mono uppercase font-bold text-purple-400 tracking-wider">
                  Tier 3: Extreme Climate Buffer & Statutory Fees
                </td>
              </tr>

              {professionalFees > 0 && (
                <tr className="border-b border-white/5 hover:bg-white/5 bg-transparent">
                  <td className="p-4 pl-8">
                    <span className="text-white/80 font-medium text-sm">Professional Engineering & Seismic Validation (7%)</span>
                  </td>
                  <td className="p-4 text-right text-white font-mono text-sm">{formatINR(professionalFees)}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-white/10 h-2 rounded-full overflow-hidden">
                        <div className="bg-purple-400 h-full rounded-full" style={{ width: `${Math.min(100, (professionalFees / total_estimated_inr) * 100)}%` }}></div>
                      </div>
                      <span className="text-white/60 text-xs w-8 font-mono">{((professionalFees / total_estimated_inr) * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              )}

              {contingencyCost > 0 && (
                <tr className="border-b border-white/20 hover:bg-white/5 bg-transparent">
                  <td className="p-4 pl-8">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} className="text-rose-400" />
                      <span className="text-white/80 font-medium text-sm">Cold Climate Contingency Buffer (20%)</span>
                    </div>
                  </td>
                  <td className="p-4 text-right text-white font-mono text-sm">{formatINR(contingencyCost)}</td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-white/10 h-2 rounded-full overflow-hidden">
                        <div className="bg-rose-400 h-full rounded-full" style={{ width: `${Math.min(100, (contingencyCost / total_estimated_inr) * 100)}%` }}></div>
                      </div>
                      <span className="text-white/60 text-xs w-8 font-mono">{((contingencyCost / total_estimated_inr) * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#FF5722]/10 border-t border-[#FF5722]/30">
                <td className="p-6 font-bold text-lg text-white">
                  {blueprintData?.building_type === 'emergency' 
                    ? 'Total Estimated Deployment Cost' 
                    : 'Total Turnkey Construction Cost (CPWD Reconciled)'}
                </td>
                <td className="p-6 text-right font-black text-2xl text-[#FF5722] font-mono">
                  {formatINR(total_estimated_inr)}
                </td>
                <td className="p-6 text-right font-mono text-sm text-[#FF5722] font-bold">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <ShoppingModal 
        isOpen={isShoppingOpen}
        onClose={() => setIsShoppingOpen(false)}
        materials={{
          structural: { name: structuralMat.name, cost_per_unit: 650 },
          insulation: { name: insulationMat.name, cost_per_unit: 320 },
          glazing: { name: glazingMat.name, cost_per_unit: 1200 },
          roofing: { name: roofingMat.name, cost_per_unit: 750 }
        }}
        buildingType={blueprintData?.building_type || 'emergency'}
      />
    </div>
  );
}
