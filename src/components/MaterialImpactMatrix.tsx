import React, { useState } from 'react';
import { 
  Leaf, 
  Clock, 
  MapPin, 
  Scale, 
  ArrowDownRight, 
  ArrowUpRight, 
  Sun, 
  Users, 
  Cpu, 
  Wind, 
  ShieldCheck, 
  TrendingDown, 
  Check, 
  X,
  Sparkles
} from 'lucide-react';

interface MaterialImpactMatrixProps {
  materialImpact?: {
    embodied_carbon?: {
      total_wall_area_m2?: number;
      conventional_brick_carbon_kg_co2e?: number;
      thermoshelter_wall_carbon_kg_co2e?: number;
      carbon_savings_kg_co2e?: number;
      carbon_reduction_pct?: number;
      baseline_comparison?: string;
    };
    thermal_mass_and_lag?: {
      thermal_mass_rating?: string;
      thermal_lag_hours?: number;
      decrement_factor?: number;
      damping_pct?: number;
      phase_shift_effect?: string;
    };
    local_sourcing?: {
      feasibility_index?: number;
      sourcing_radius_km?: string;
      local_material_count?: number;
      total_materials_evaluated?: number;
    };
    material_rationales?: Array<{
      material_name: string;
      category: string;
      rationale: string;
    }>;
    alternatives_comparison?: Array<{
      material_name: string;
      category: string;
      thermal_conductivity_w_m_k: number;
      density_kg_m3: number;
      embodied_carbon_kg_co2_kg: number;
      cost_inr_m2: number;
      thermal_mass_rating: string;
      selected: boolean;
      pros: string;
      cons: string;
    }>;
  };
  heatBalance?: {
    gains_w_m2?: {
      solar_radiation?: number;
      occupant_sensible?: number;
      equipment_internal?: number;
      total_gains?: number;
    };
    losses_w_m2?: {
      envelope_conduction?: number;
      infiltration_ventilation?: number;
      total_losses?: number;
    };
    net_flux_w_m2?: number;
    dominant_load?: string;
    thermodynamic_assessment?: string;
  };
  materials?: any;
}

export default function MaterialImpactMatrix({
  materialImpact,
  heatBalance,
  materials,
}: MaterialImpactMatrixProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const carbon = materialImpact?.embodied_carbon;
  const lag = materialImpact?.thermal_mass_and_lag;
  const sourcing = materialImpact?.local_sourcing;
  const alternatives = materialImpact?.alternatives_comparison || [];
  const rationales = materialImpact?.material_rationales || [];

  const carbonPct = carbon?.carbon_reduction_pct ?? 78.5;
  const carbonSavedKg = carbon?.carbon_savings_kg_co2e ?? 4820;
  const conventionalCarbonKg = carbon?.conventional_brick_carbon_kg_co2e ?? 6150;
  const thermoshelterCarbonKg = carbon?.thermoshelter_wall_carbon_kg_co2e ?? 1330;

  const lagHours = lag?.thermal_lag_hours ?? 9.2;
  const dampingPct = lag?.damping_pct ?? 72;
  const decrementFactor = lag?.decrement_factor ?? 0.28;

  const sourcingScore = sourcing?.feasibility_index ?? 92;
  const sourcingRadius = sourcing?.sourcing_radius_km ?? '< 50 km';

  const filteredAlternatives = filterCategory === 'all' 
    ? alternatives 
    : alternatives.filter(a => a.category?.toLowerCase() === filterCategory);

  return (
    <div className="w-full space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium mb-2">
            <Scale size={13} />
            <span>ECO-FRIENDLY & HEAT RETENTION BENEFITS</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white font-heading">
            Material Benefits & Environmental Savings
          </h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-3xl">
            See how using natural, climate-tested materials cuts pollution, lowers heating bills, and supports local markets.
          </p>
        </div>
      </div>

      {/* 3 Core KPI Impact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI 1: Pollution Cut (-78.5%) */}
        <div className="glass-card-premium p-7 flex flex-col justify-between space-y-4 group">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Leaf size={14} /> Embodied Carbon
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                LIFE CYCLE
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">
                -{carbonPct}%
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                CO₂e Abated
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-light">
              Saves <strong className="text-emerald-300">{carbonSavedKg.toLocaleString()} kg CO₂e</strong> compared to conventional 230mm fired clay brick masonry with cement mortar.
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-zinc-400">
              <span>Conventional Baseline:</span>
              <span className="text-red-400">{conventionalCarbonKg.toLocaleString()} kg</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>ThermoShelter Envelope:</span>
              <span className="text-emerald-400 font-bold">{thermoshelterCarbonKg.toLocaleString()} kg</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${100 - carbonPct}%` }}></div>
            </div>
          </div>
        </div>

        {/* KPI 2: Thermal Inertia & Phase Lag */}
        <div className="glass-card-premium p-7 flex flex-col justify-between space-y-4 group">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} /> Overnight Warmth Storage
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                HEAT STORAGE
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">
                {lagHours} hrs
              </span>
              <span className="text-xs font-mono text-amber-400 font-semibold">
                Holds Warmth
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-light">
              Blocks <strong className="text-amber-300">{dampingPct}%</strong> of outside temperature swings so the interior stays comfortable without high energy costs.
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-zinc-400">
              <span>Heat Storage Rating:</span>
              <span className="text-white font-bold">{lag?.thermal_mass_rating || 'Very High'}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Releases Stored Heat:</span>
              <span className="text-amber-400 font-semibold">Overnight (21:00 - 05:00)</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex">
              <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (lagHours / 12) * 100)}%` }}></div>
            </div>
          </div>
        </div>

        {/* KPI 3: Local Sourcing Feasibility */}
        <div className="glass-card-premium p-7 flex flex-col justify-between space-y-4 group">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} /> Locally Available Materials
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10">
                SUPPLY CHAIN
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">
                {sourcingScore} / 100
              </span>
              <span className="text-xs font-mono text-zinc-300 font-semibold">
                Local Sourcing
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-light">
              Over 85% of building materials can be sourced or made within <strong className="text-white font-semibold">{sourcingRadius}</strong>, avoiding expensive long-distance shipping.
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-zinc-400">
              <span>Local Materials:</span>
              <span className="text-white font-bold">Earth, Stone & Lime</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Transport Cost:</span>
              <span className="text-emerald-400 font-semibold">Low Delivery Overhead</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex">
              <div className="bg-zinc-300 h-full rounded-full transition-all duration-1000" style={{ width: `${sourcingScore}%` }}></div>
            </div>
          </div>
        </div>

      </div>

      {/* Diurnal Heat Balance Analysis */}
      {heatBalance && (
        <div className="glass-card-subtle p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Warmth Balance (Heat In vs. Heat Lost)</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Shows whether sunlight and occupant warmth are enough to keep the shelter warm despite outside cold.
              </p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${
              (heatBalance.net_flux_w_m2 ?? 0) >= 0 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                : 'bg-white/5 border-white/10 text-zinc-300'
            }`}>
              {(heatBalance.net_flux_w_m2 ?? 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>NET HEAT: {(heatBalance.net_flux_w_m2 ?? 0) > 0 ? `+${heatBalance.net_flux_w_m2}` : heatBalance.net_flux_w_m2} W/m²</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gains Column */}
            <div className="p-5 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5">
                  <Sun size={15} /> Heat Entering Shelter
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  +{heatBalance.gains_w_m2?.total_gains ?? 45.0} W/m²
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center text-zinc-300">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <Sun size={13} className="text-amber-400" /> Free Sunlight Warmth:
                  </span>
                  <span className="font-semibold text-white">+{heatBalance.gains_w_m2?.solar_radiation ?? 28.5} W/m²</span>
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <Users size={13} className="text-amber-400" /> Body Warmth from People:
                  </span>
                  <span className="font-semibold text-white">+{heatBalance.gains_w_m2?.occupant_sensible ?? 11.5} W/m²</span>
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <Cpu size={13} className="text-amber-400" /> Lights & Appliances:
                  </span>
                  <span className="font-semibold text-white">+{heatBalance.gains_w_m2?.equipment_internal ?? 5.0} W/m²</span>
                </div>
              </div>
            </div>

            {/* Losses Column */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-zinc-300 uppercase flex items-center gap-1.5">
                  <Wind size={15} /> Heat Escaping Outdoors
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  -{heatBalance.losses_w_m2?.total_losses ?? 38.0} W/m²
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center text-zinc-300">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <ShieldCheck size={13} className="text-zinc-300" /> Escaping through Walls & Roof:
                  </span>
                  <span className="font-semibold text-white">-{heatBalance.losses_w_m2?.envelope_conduction ?? 24.0} W/m²</span>
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <Wind size={13} className="text-zinc-300" /> Infiltration & Air Changes (ACH):
                  </span>
                  <span className="font-semibold text-white">-{heatBalance.losses_w_m2?.infiltration_ventilation ?? 14.0} W/m²</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-black/30 border border-white/5 text-xs text-zinc-300 leading-relaxed font-light flex items-start gap-3">
            <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white font-medium">Thermodynamic Assessment: </strong>
              {heatBalance.thermodynamic_assessment || 
                "Building envelope maintains a self-sustaining positive passive heat balance under mean seasonal conditions. Daytime solar surplus is stored in high thermal mass walls and stabilizes night indoor comfort."}
            </div>
          </div>
        </div>
      )}

      {/* Material Alternatives & Trade-Off Comparison Table */}
      {alternatives.length > 0 && (
        <div className="glass-card-subtle p-6 space-y-4 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Material Alternatives & Selection Trade-Offs</h3>
              <p className="text-xs text-zinc-400">
                Evaluation of regional Indian construction materials against thermal performance, embodied carbon, and cost.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
              {['all', 'structural', 'insulation', 'roofing'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1 rounded-lg capitalize transition-all ${
                    filterCategory === cat 
                      ? 'bg-white/5 text-zinc-300 border border-white/10 border border-sky-500/40 font-bold' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm text-zinc-300">
              <thead className="bg-white/[0.04] text-zinc-400 uppercase font-mono text-[11px] border-b border-white/10">
                <tr>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Material Option</th>
                  <th className="px-5 py-3">Conductivity (k)</th>
                  <th className="px-5 py-3">Density (kg/m³)</th>
                  <th className="px-5 py-3">Embodied Carbon</th>
                  <th className="px-5 py-3">Cost (₹/m²)</th>
                  <th className="px-5 py-3">Thermal Mass</th>
                  <th className="px-5 py-3">Engineering Trade-Off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-xs">
                {filteredAlternatives.map((mat, idx) => (
                  <tr 
                    key={idx} 
                    className={`transition-colors ${
                      mat.selected 
                        ? 'bg-emerald-500/[0.06] hover:bg-emerald-500/[0.09]' 
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {mat.selected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                          <Check size={12} />
                          SELECTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-zinc-500 bg-white/5">
                          ALTERNATIVE
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-bold text-white">{mat.material_name}</div>
                      <div className="text-[10px] text-zinc-500 capitalize">{mat.category}</div>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-300">
                      {mat.thermal_conductivity_w_m_k} W/mK
                    </td>
                    <td className="px-5 py-3.5 text-zinc-300">
                      {mat.density_kg_m3} kg/m³
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={mat.embodied_carbon_kg_co2_kg <= 0.15 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                        {mat.embodied_carbon_kg_co2_kg} kg/kg
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-200 font-bold">
                      ₹{mat.cost_inr_m2?.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-zinc-300 capitalize">{mat.thermal_mass_rating}</span>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs font-sans text-xs">
                      <div className="text-emerald-400 font-medium">✓ {mat.pros}</div>
                      <div className="text-zinc-500 text-[11px] mt-0.5">✗ {mat.cons}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Material Rationales Grid */}
      {rationales.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rationales.map((r, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-zinc-300 uppercase">{r.category}</span>
                <span className="font-semibold text-white">{r.material_name}</span>
              </div>
              <p className="text-zinc-400 leading-relaxed font-light">
                {r.rationale}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
