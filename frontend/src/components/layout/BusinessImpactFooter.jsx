import React from 'react';
import { useAppStore } from '../../store/appStore';
import { formatSeconds } from '../../utils/formatting';
import { Award, Zap, TrendingDown, CheckCheck } from 'lucide-react';

export function BusinessImpactFooter() {
  const kpi = useAppStore((state) => state.kpi);

  const acceptanceRatePct = kpi.advisoriesTotal > 0
    ? Math.round((kpi.advisoriesAccepted / kpi.advisoriesTotal) * 100)
    : 73;

  const timeReductionPct = Math.round(
    ((kpi.baselineStabilizationSeconds - kpi.avgStabilizationSeconds) / kpi.baselineStabilizationSeconds) * 100
  );

  return (
    <footer className="h-[46px] bg-[#161B22] border-t border-[#30363D] px-4 flex items-center justify-between text-xs font-mono select-none z-30">
      {/* Left: Section Header */}
      <div className="flex items-center space-x-2 text-[#8B949E] text-[11px] font-bold tracking-wider uppercase border-r border-[#30363D] pr-3">
        <Award className="w-4 h-4 text-emerald-400" />
        <span>BUSINESS IMPACT & ROI</span>
      </div>

      {/* Center: Key Metrics */}
      <div className="flex items-center space-x-6 text-[11px]">
        {/* Metric 1: Transitions */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[#8B949E]">Transitions This Shift:</span>
          <span className="font-bold text-white bg-[#0D1117] px-2 py-0.5 rounded border border-[#30363D]">
            {kpi.transitionCount}
          </span>
        </div>

        {/* Metric 2: Avg Stabilization Time */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[#8B949E]">Avg Stabilization:</span>
          <div className="flex items-center space-x-1 bg-[#0D1117] px-2 py-0.5 rounded border border-[#30363D]">
            <span className="font-bold text-emerald-400">{formatSeconds(kpi.avgStabilizationSeconds)}</span>
            <span className="text-[10px] text-gray-400 font-normal">vs {formatSeconds(kpi.baselineStabilizationSeconds)} baseline</span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1 rounded border border-emerald-800/60">
              -{timeReductionPct}%
            </span>
          </div>
        </div>

        {/* Metric 3: Cull Saved */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[#8B949E]">Est. Cull/Broke Saved:</span>
          <div className="flex items-center space-x-1 font-bold text-[#58A6FF] bg-[#0D1117] px-2 py-0.5 rounded border border-[#30363D]">
            <Zap className="w-3 h-3 fill-current" />
            <span>~{kpi.cullSavedTonnes.toFixed(1)} tonnes</span>
          </div>
        </div>

        {/* Metric 4: Advisory Acceptance Rate */}
        <div className="hidden lg:flex items-center space-x-1.5">
          <span className="text-[#8B949E]">Advisories Accepted:</span>
          <div className="flex items-center space-x-1 font-bold text-gray-200 bg-[#0D1117] px-2 py-0.5 rounded border border-[#30363D]">
            <CheckCheck className="w-3.5 h-3.5 text-[#58A6FF]" />
            <span>{kpi.advisoriesAccepted}/{kpi.advisoriesTotal} ({acceptanceRatePct}%)</span>
          </div>
        </div>
      </div>

      {/* Right: Honeywell System Tag */}
      <div className="hidden md:flex items-center text-[10px] text-gray-500 font-mono border-l border-[#30363D] pl-3">
        <span>Honeywell Experion® APC Layer</span>
      </div>
    </footer>
  );
}
