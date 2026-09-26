import React, { useState } from 'react';
import { Clock, Users, Wrench, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import { ASSEMBLY_STEPS } from '../data/shelterData';

interface AssemblyGuideProps {
  onHighlightAssembly?: (step: number) => void;
}

export const AssemblyGuide: React.FC<AssemblyGuideProps> = ({ onHighlightAssembly }) => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const totalTimeMinutes = ASSEMBLY_STEPS.reduce((acc, s) => acc + s.durationMinutes, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
            <span>Disaster Relief Field Protocol</span>
            <span aria-hidden="true">·</span>
            <span>Zero Wet Curing</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Rapid Field Deployment Assembly Sequence
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete turnkey erection timeline executed by a 4-person untrained relief crew with handheld tools.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Target Assembly Time</span>
            </div>
            <div className="text-lg font-bold font-mono text-white tabular-nums">
              {(totalTimeMinutes / 60).toFixed(1)} Hours ({totalTimeMinutes} min)
            </div>
          </div>

          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Crew Size</span>
            </div>
            <div className="text-lg font-bold font-mono text-white tabular-nums">
              4 Operators
            </div>
          </div>
        </div>
      </div>

      {/* Step Carousel Selector */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {ASSEMBLY_STEPS.map(s => {
          const isSelected = activeStep === s.step;
          return (
            <button
              key={s.step}
              onClick={() => {
                setActiveStep(s.step);
                onHighlightAssembly?.(s.step);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-sky-950/60 border-sky-500 shadow-lg shadow-sky-950/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className={`font-mono font-bold ${isSelected ? 'text-sky-400' : 'text-slate-400'}`}>
                  Phase 0{s.step}
                </span>
                <span className="text-slate-400 font-mono tabular-nums">{s.durationMinutes}m</span>
              </div>
              <div className="text-xs font-semibold text-white truncate">
                {s.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Phase Deep Dive Card */}
      {(() => {
        const step = ASSEMBLY_STEPS.find(s => s.step === activeStep)!;
        return (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-sky-400 font-semibold">
                  Field Phase 0{step.step} of 05
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {step.title}
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span>{step.durationMinutes} Minutes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>{step.crewSize} Crew</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed">
              {step.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Critical Quality & Safety Verification</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  {step.keyVerification}
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
                  <Wrench className="w-4 h-4" />
                  <span>Required Field Tooling</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  {step.toolRequired}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                disabled={activeStep === 1}
                onClick={() => {
                  setActiveStep(prev => Math.max(1, prev - 1));
                  onHighlightAssembly?.(activeStep - 1);
                }}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                  activeStep === 1
                    ? 'text-slate-600 bg-slate-900 cursor-not-allowed'
                    : 'text-slate-300 bg-slate-800 hover:bg-slate-700'
                }`}
              >
                Previous Phase
              </button>

              <button
                disabled={activeStep === ASSEMBLY_STEPS.length}
                onClick={() => {
                  setActiveStep(prev => Math.min(ASSEMBLY_STEPS.length, prev + 1));
                  onHighlightAssembly?.(activeStep + 1);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                  activeStep === ASSEMBLY_STEPS.length
                    ? 'text-slate-600 bg-slate-900 cursor-not-allowed'
                    : 'text-white bg-sky-600 hover:bg-sky-500'
                }`}
              >
                <span>Next Phase</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
