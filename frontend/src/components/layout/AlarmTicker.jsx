import React from 'react';
import { useAppStore } from '../../store/appStore';
import { AlertCircle, AlertTriangle, Clock } from 'lucide-react';

export function AlarmTicker() {
  const riskLevel = useAppStore((state) => state.riskLevel);
  const currentRiskEvent = useAppStore((state) => state.currentRiskEvent);
  const telemetry = useAppStore((state) => state.telemetry);

  const isActive = riskLevel === 'Warning' || riskLevel === 'Critical';

  if (!isActive || !currentRiskEvent) {
    return (
      <div className="h-0 overflow-hidden transition-all duration-300 bg-[#0D1117]" />
    );
  }

  const isCritical = riskLevel === 'Critical';
  const tag = telemetry.basis_weight_risk !== 'Nominal' ? 'BW-001' : 'MC-001';

  return (
    <div
      className={`h-[34px] px-4 flex items-center justify-between font-mono text-xs border-b transition-all duration-300 z-20 ${
        isCritical
          ? 'bg-red-950/90 border-red-600/80 text-red-200 animate-pulse-subtle'
          : 'bg-amber-950/80 border-amber-600/70 text-amber-200'
      }`}
    >
      <div className="flex items-center space-x-3 truncate">
        {/* Priority Badge */}
        <div
          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            isCritical ? 'bg-red-600 text-white shadow-[0_0_10px_#f85149]' : 'bg-amber-500 text-black'
          }`}
        >
          {isCritical ? <AlertCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
          <span>{isCritical ? 'PRIORITY 1 — CRITICAL' : 'PRIORITY 2 — WARNING'}</span>
        </div>

        {/* Tag & Timestamp */}
        <span className="text-gray-300 font-bold">[{new Date().toLocaleTimeString()}]</span>
        <span className="bg-[#0D1117]/60 px-1.5 py-0.5 rounded border border-white/10 text-white font-bold">
          {tag}
        </span>

        {/* Message */}
        <span className="truncate font-medium text-gray-100">
          {currentRiskEvent.likely_cause || `${currentRiskEvent.deviation_direction} — Limit breach predicted.`}
        </span>
      </div>

      {/* Countdown Timer */}
      {currentRiskEvent.seconds_to_breach !== null && currentRiskEvent.seconds_to_breach !== undefined && (
        <div className="flex items-center space-x-1.5 font-bold text-xs bg-[#0D1117]/80 px-3 py-1 rounded border border-white/20 ml-2 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span>PROJECTED BREACH IN: <span className="text-amber-400 font-extrabold">{currentRiskEvent.seconds_to_breach}s</span></span>
        </div>
      )}
    </div>
  );
}
