import React, { useState, useMemo } from 'react';
import { Package, Truck, Wrench, Download, Filter, Scale } from 'lucide-react';
import { BOM_DATA } from '../data/shelterData';

export const BOMView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const set = new Set(BOM_DATA.map(i => i.category));
    return ['all', ...Array.from(set)];
  }, []);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') return BOM_DATA;
    return BOM_DATA.filter(i => i.category === selectedCategory);
  }, [selectedCategory]);

  const totalWeight = useMemo(() => {
    return BOM_DATA.reduce((acc, curr) => acc + curr.totalWeightKg, 0);
  }, []);

  const totalParts = useMemo(() => {
    return BOM_DATA.reduce((acc, curr) => acc + curr.qty, 0);
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
            <span>Engineering Procurement</span>
            <span aria-hidden="true">·</span>
            <span>Archetype 1 Deployment Kit</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Bill of Materials & Logistics Payload
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Standard 24 m² emergency thermal shelter kit packaged for C-130 air-drop or 20ft ISO intermodal shipping.
          </p>
        </div>

        {/* Payload Logistics Summary Cards */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Scale className="w-3.5 h-3.5 text-sky-400" />
              <span>Gross Weight</span>
            </div>
            <div className="text-lg font-bold font-mono text-white tabular-nums">
              {totalWeight.toFixed(1)} kg
            </div>
          </div>

          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Flat-Pack Volume</span>
            </div>
            <div className="text-lg font-bold font-mono text-white tabular-nums">
              6.8 m³
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 mr-2 shrink-0">Filter System:</span>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap capitalize ${
              selectedCategory === cat
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* BOM Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <th className="py-3 px-4 font-semibold">Subsystem Category</th>
                <th className="py-3 px-4 font-semibold">Component & Specification</th>
                <th className="py-3 px-3 font-semibold text-center">Qty</th>
                <th className="py-3 px-3 font-semibold text-right">Unit Wt (kg)</th>
                <th className="py-3 px-3 font-semibold text-right">Total Wt (kg)</th>
                <th className="py-3 px-4 font-semibold">Field Assembly Tool</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono tabular-nums">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-sans font-medium text-sky-400">
                    {item.category}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <div className="text-white font-medium">{item.item}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.specification}</div>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-white">
                    {item.qty} {item.unit}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300">
                    {item.unitWeightKg.toFixed(1)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-white">
                    {item.totalWeightKg.toFixed(1)}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-400 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{item.fieldTool}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field Assembly Tool Kit Note */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-slate-300">
        <div>
          <span className="font-semibold text-white">Zero Wet Curing Mandate: </span>
          <span>
            Entire shelter requires zero cement, zero mortar, and zero wet grout. All connections use G8.8 high-tensile bolts, cam latches, and helical earth anchors driven with standard 18V cordless drivers and torque levers.
          </span>
        </div>
        <div className="text-slate-400 text-xs shrink-0 font-mono">
          Assembly Tool Weight: 14.5 kg (included)
        </div>
      </div>
    </div>
  );
};
