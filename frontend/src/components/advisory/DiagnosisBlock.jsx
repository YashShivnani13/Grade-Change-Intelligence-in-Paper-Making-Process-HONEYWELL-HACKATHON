import React from 'react';
import { useAppStore } from '../../store/appStore';
import { HelpCircle } from 'lucide-react';

export function DiagnosisBlock() {
  const currentRiskEvent = useAppStore((state) => state.currentRiskEvent);

  if (!currentRiskEvent) return null;

  const contributing = currentRiskEvent.contributing_variables || [
    { name: 'Steam Lag', contribution_pct: 48 },
    { name: 'BW Rate', contribution_pct: 31 },
    { name: 'Flow Overshoot', contribution_pct: 21 },
  ];

  return (
    <div className="bg-[#0D1117] border border-[#30363D] rounded p-3 text-xs font-mono space-y-2">
      <div className="flex items-center justify-between text-[#58A6FF] font-bold tracking-wider text-[11px] uppercase border-b border-[#30363D] pb-1.5">
        <div className="flex items-center space-x-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>DIAGNOSIS & CAUSE ATTRIBUTION</span>
        </div>
        <span className="text-[10px] text-[#8B949E] font-normal">XAI RATIONALE</span>
      </div>

      {/* Contributing Variables Horizontal Bars */}
      <div className="space-y-1.5 py-1">
        {contributing.map((item, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-300 font-medium">{item.name}</span>
              <span className="text-gray-400 font-bold">{item.contribution_pct}%</span>
            </div>
            <div className="w-full bg-[#161B22] h-1.5 rounded overflow-hidden border border-[#30363D]">
              <div
                className="bg-[#58A6FF] h-full rounded transition-all duration-500"
                style={{ width: `${item.contribution_pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Plain Language Cause Sentence */}
      <div className="bg-[#161B22] p-2 rounded border border-[#30363D] text-[11px] text-gray-200 leading-snug font-sans italic">
        "{currentRiskEvent.likely_cause || 'Steam pressure response lagging stock flow ramp, causing Basis Weight to drift high.'}"
      </div>
    </div>
  );
}
