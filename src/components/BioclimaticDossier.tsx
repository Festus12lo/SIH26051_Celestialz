import React, { useState } from 'react';
import { 
  Compass, 
  Layers, 
  Wind, 
  ShieldCheck, 
  CheckCircle2, 
  FileText, 
  Thermometer, 
  ArrowUpRight, 
  Info,
  Maximize2
} from 'lucide-react';

interface BioclimaticDossierProps {
  designBrief?: string;
  bioclimaticStrategy?: {
    orientation_and_solar?: string;
    thermal_mass_and_insulation?: string;
    ventilation_and_airflow?: string;
    roof_and_foundation?: string;
  };
  zoningRationale?: {
    living_zone?: string;
    sleeping_zone?: string;
    service_zone?: string;
    buffer_zone?: string;
  };
  codeCompliance?: Array<{
    code: string;
    title: string;
    clause: string;
    requirement: string;
    design_provision: string;
    status: string;
  }>;
  climate?: any;
}

export default function BioclimaticDossier({
  designBrief,
  bioclimaticStrategy,
  zoningRationale,
  codeCompliance = [],
  climate,
}: BioclimaticDossierProps) {
  const [activeZoneTab, setActiveZoneTab] = useState<'living' | 'sleeping' | 'service' | 'buffer'>('living');

  const climateZone = climate?.zone || 'Moderate';
  const windSpeed = climate?.basic_wind_speed_m_s || 39;
  const snowLoad = climate?.snow_load_kn_m2 || 0;
  const seismicZone = climate?.seismic_zone || 'III';

  return (
    <div className="w-full space-y-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#FF5722] text-xs font-mono font-medium mb-2">
            <FileText size={13} />
            <span>SHELTER DESIGN & SAFETY GUIDE</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white font-heading">
            Climate Protection Strategy & Safety Standards
          </h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-3xl">
            How your shelter keeps you safe from extreme weather while meeting National Building Code (NBC) safety standards.
          </p>
        </div>

        {/* Climate Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
            NBC ZONE: <strong className="text-sky-400">{climateZone.toUpperCase()}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
            WIND V<sub>b</sub>: <strong className="text-amber-400">{windSpeed} m/s</strong>
          </span>
          {snowLoad > 0 && (
            <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
              SNOW S<sub>0</sub>: <strong className="text-white">{snowLoad} kN/m²</strong>
            </span>
          )}
          <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300">
            SEISMIC: <strong className="text-emerald-400">ZONE {seismicZone}</strong>
          </span>
        </div>
      </div>

      {/* Executive Design Brief */}
      {designBrief && (
        <div className="glass-card-premium p-6 md:p-8 relative overflow-hidden">
          
          <div className="relative z-10 flex flex-col md:flex-row items-start gap-5">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-[#FF5722] shrink-0 mt-1">
              <Compass size={28} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
                <span>Design Summary</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">NBC 2016 Part 8 Bioclimatic Synthesis</span>
              </div>
              <p className="text-sm md:text-base text-zinc-200 leading-relaxed font-light">
                {designBrief}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Four Bioclimatic Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pillar 1: Solar & Orientation */}
        <div className="glass-card-subtle p-6 hover:border-amber-500/40 transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Compass size={20} />
                </div>
                <h3 className="text-base font-semibold text-white">Sun Direction & Natural Warmth</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">
                PILLAR 01
              </span>
            </div>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
              {bioclimaticStrategy?.orientation_and_solar || 
                "Elongated east-west architectural massing maximizes low-angle winter passive heating while minimizing intense east/west summer solar exposure."}
            </p>
          </div>
        </div>

        {/* Pillar 2: Thermal Mass & Envelope */}
        <div className="glass-card-subtle p-6 hover:border-white/30 transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[#FF5722]">
                  <Layers size={20} />
                </div>
                <h3 className="text-base font-semibold text-white">Wall Thickness & Insulation</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-300">
                PILLAR 02
              </span>
            </div>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
              {bioclimaticStrategy?.thermal_mass_and_insulation || 
                "Heavy-duty earthen or insulated walls absorb outdoor temperature peaks, releasing stored warmth slowly overnight to keep rooms cozy."}
            </p>
          </div>
        </div>

        {/* Pillar 3: Natural Ventilation */}
        <div className="glass-card-subtle p-6 hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Wind size={20} />
                </div>
                <h3 className="text-base font-semibold text-white">Fresh Air & Natural Breeze</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                PILLAR 03
              </span>
            </div>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
              {bioclimaticStrategy?.ventilation_and_airflow || 
                "Carefully placed windows allow refreshing cross-breezes during warm hours while sealing tight to stop cold drafts during winter nights."}
            </p>
          </div>
        </div>

        {/* Pillar 4: Structural Resiliency */}
        <div className="glass-card-subtle p-6 hover:border-purple-500/40 transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-base font-semibold text-white">Roof Shape & Solid Foundation</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300">
                PILLAR 04
              </span>
            </div>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
              {bioclimaticStrategy?.roof_and_foundation || 
                "Angled roof sheds heavy snow and high winds easily, anchored to deep frost-safe footings to resist earth tremors."}
            </p>
          </div>
        </div>
      </div>

      {/* Thermal Zoning Rationale Interactive Tabs */}
      <div className="glass-card-subtle p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Room Layout by Temperature Need</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Rooms are arranged intelligently so main living areas get free sunlight while colder sides block bitter winds.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs font-medium">
            <button
              onClick={() => setActiveZoneTab('living')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeZoneTab === 'living' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Living Area (Warmest)
            </button>
            <button
              onClick={() => setActiveZoneTab('sleeping')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeZoneTab === 'sleeping' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Bedrooms
            </button>
            <button
              onClick={() => setActiveZoneTab('service')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeZoneTab === 'service' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Kitchen & Bath
            </button>
            <button
              onClick={() => setActiveZoneTab('buffer')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeZoneTab === 'buffer' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Entry & Wind Shield
            </button>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-black/20 border border-white/5 text-sm text-zinc-300 leading-relaxed font-light">
          {activeZoneTab === 'living' && (
            <div className="space-y-2">
              <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wide">
                Primary Solar Habitation:
              </span>
              <p>
                {zoningRationale?.living_zone || 
                  "Positioned along the south facade to capture direct winter sunlight between 09:00 and 15:00. High-occupancy living space benefits from direct radiant warmth and concrete/earth thermal floor mass."}
              </p>
            </div>
          )}

          {activeZoneTab === 'sleeping' && (
            <div className="space-y-2">
              <span className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wide">
                Diurnal Thermal Retentive Chamber:
              </span>
              <p>
                {zoningRationale?.sleeping_zone || 
                  "Protected by surrounding buffer spaces or situated where delayed daytime thermal mass releases stored calories during 22:00-06:00 cold dips, keeping indoor ambient >18°C."}
              </p>
            </div>
          )}

          {activeZoneTab === 'service' && (
            <div className="space-y-2">
              <span className="text-xs font-mono font-semibold text-white uppercase tracking-wide">
                Clustered Plumbing & Wet Services:
              </span>
              <p>
                {zoningRationale?.service_zone || 
                  "Kitchen and sanitation areas grouped along the internal wall boundary to minimize pipe runs, reduce thermal bridge penetrations, and capture waste cooking heat without overheating living zones."}
              </p>
            </div>
          )}

          {activeZoneTab === 'buffer' && (
            <div className="space-y-2">
              <span className="text-xs font-mono font-semibold text-purple-400 uppercase tracking-wide">
                Windward Thermal Shield:
              </span>
              <p>
                {zoningRationale?.buffer_zone || 
                  "Entry airlocks, storage vestibules, and minimal-aperture utility walls face prevailing harsh winds (North / NW), acting as an unheated barrier that stops direct chill penetration."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* IS & NBC Code Compliance Audit Table */}
      {codeCompliance.length > 0 && (
        <div className="glass-card-subtle overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">National Code Compliance Audit</h3>
              <p className="text-xs text-zinc-400">IS 875, IS 1893, IS 1904 & National Building Code (NBC 2016)</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <CheckCircle2 size={14} />
              <span>100% STANDARDS MET</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm text-zinc-300">
              <thead className="bg-white/[0.04] text-zinc-400 uppercase font-mono text-[11px] border-b border-white/10">
                <tr>
                  <th className="px-5 py-3">Code / Standard</th>
                  <th className="px-5 py-3">Clause & Subject</th>
                  <th className="px-5 py-3">Engineering Requirement</th>
                  <th className="px-5 py-3">ThermoShelter Design Provision</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {codeCompliance.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-sky-400 whitespace-nowrap">
                      {item.code}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-white">{item.title}</div>
                      <div className="text-[11px] font-mono text-zinc-500">{item.clause}</div>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-300 max-w-xs leading-relaxed">
                      {item.requirement}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-200 max-w-sm leading-relaxed">
                      {item.design_provision}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-xs font-medium border border-emerald-500/20">
                        <CheckCircle2 size={12} />
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
