import React from 'react';
import { useAppStore } from '../../store/appStore';
import { formatValue } from '../../utils/formatting';
import { TAGS, UNITS, GRADE_SPECS } from '../../constants';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

export function SummaryCards() {
  const telemetry = useAppStore((state) => state.telemetry);
  const targetSpec = GRADE_SPECS[telemetry.target_grade || 'B'] || GRADE_SPECS.B;

  // Calculate percentage deviations
  const bwTarget = targetSpec.bw_target;
  const mcTarget = targetSpec.moisture_target;

  const bwDev = ((telemetry.pv_basis_weight - bwTarget) / bwTarget) * 100;
  const mcDev = ((telemetry.pv_moisture - mcTarget) / mcTarget) * 100;

  const isRamping = telemetry.transition_phase === 'RAMPING';

  // Helper for deviation color styling
  const getDevColor = (devPct) => {
    const abs = Math.abs(devPct);
    if (abs >= 2.5) return 'text-red-400 font-bold';
    if (abs >= 2.0) return 'text-amber-400 font-bold';
    return 'text-emerald-400 font-semibold';
  };

  const getDevBadgeBg = (devPct) => {
    const abs = Math.abs(devPct);
    if (abs >= 2.5) return 'bg-red-950/80 border-red-700/80';
    if (abs >= 2.0) return 'bg-amber-950/70 border-amber-700/70';
    return 'bg-emerald-950/50 border-emerald-800/50';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-2 bg-[#0D1117] select-none">
      {/* CARD 1: GRADE TRANSITION */}
      <div className="bg-[#161B22] border border-[#30363D] rounded p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-[#8B949E] uppercase font-semibold">
          <span>CURRENT GRADE</span>
          <span className="text-gray-500 font-normal">QCS</span>
        </div>
        <div className="my-1 flex items-baseline space-x-2 font-mono text-xl font-bold text-white">
          <span>{telemetry.current_grade || 'A'}</span>
          <span className="text-[#58A6FF] text-base">→</span>
          <span className="text-[#58A6FF]">{telemetry.target_grade || 'B'}</span>
        </div>
        <div className="text-[10px] text-[#8B949E] truncate">
          Phase: <span className="text-gray-300 font-medium">{telemetry.transition_phase || 'STEADY'}</span>
        </div>
      </div>

      {/* CARD 2: BASIS WEIGHT (BW-001) */}
      <div className={`bg-[#161B22] border rounded p-2.5 flex flex-col justify-between transition-colors ${
        Math.abs(bwDev) >= 2.5 ? 'border-red-600/80 bg-red-950/20' : 'border-[#30363D]'
      }`}>
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-gray-200">{TAGS.BASIS_WEIGHT}</span>
          <span className="text-[#8B949E] text-[10px] uppercase font-mono">Basis Weight</span>
        </div>
        <div className="my-1 flex items-baseline justify-between font-mono">
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-white">{formatValue(telemetry.pv_basis_weight)}</span>
            <span className="text-xs text-[#8B949E]">{UNITS.BASIS_WEIGHT}</span>
          </div>
          <div className={`px-1.5 py-0.5 rounded border text-[10px] font-mono flex items-center space-x-0.5 ${getDevBadgeBg(bwDev)} ${getDevColor(bwDev)}`}>
            {bwDev > 0.2 ? <TrendingUp className="w-3 h-3" /> : bwDev < -0.2 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            <span>{bwDev >= 0 ? `+${bwDev.toFixed(1)}%` : `${bwDev.toFixed(1)}%`}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#8B949E] font-mono">
          <span>SP: {formatValue(bwTarget)}</span>
          <div className="flex items-center space-x-1 text-gray-400">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '3s' }} />
            <span>Scan: {telemetry.scan_age_seconds ? telemetry.scan_age_seconds.toFixed(1) : '0.8'}s</span>
          </div>
        </div>
      </div>

      {/* CARD 3: MOISTURE (MC-001) */}
      <div className={`bg-[#161B22] border rounded p-2.5 flex flex-col justify-between transition-colors ${
        Math.abs(mcDev) >= 2.5 ? 'border-red-600/80 bg-red-950/20' : 'border-[#30363D]'
      }`}>
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-gray-200">{TAGS.MOISTURE}</span>
          <span className="text-[#8B949E] text-[10px] uppercase font-mono">Moisture</span>
        </div>
        <div className="my-1 flex items-baseline justify-between font-mono">
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-white">{formatValue(telemetry.pv_moisture)}</span>
            <span className="text-xs text-[#8B949E]">{UNITS.MOISTURE}</span>
          </div>
          <div className={`px-1.5 py-0.5 rounded border text-[10px] font-mono flex items-center space-x-0.5 ${getDevBadgeBg(mcDev)} ${getDevColor(mcDev)}`}>
            {mcDev > 0.2 ? <TrendingUp className="w-3 h-3" /> : mcDev < -0.2 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            <span>{mcDev >= 0 ? `+${mcDev.toFixed(1)}%` : `${mcDev.toFixed(1)}%`}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#8B949E] font-mono">
          <span>SP: {formatValue(mcTarget)}</span>
          <div className="flex items-center space-x-1 text-gray-400">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '3s' }} />
            <span>Scan: {telemetry.scan_age_seconds ? telemetry.scan_age_seconds.toFixed(1) : '0.8'}s</span>
          </div>
        </div>
      </div>

      {/* CARD 4: STOCK FLOW (SP-101) */}
      <div className="bg-[#161B22] border border-[#30363D] rounded p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-[#58A6FF]">{TAGS.STOCK_FLOW}</span>
          <span className="text-[#8B949E] text-[10px] uppercase font-mono">Stock Flow</span>
        </div>
        <div className="my-1 flex items-baseline space-x-1 font-mono">
          <span className="text-2xl font-bold text-white">{formatValue(telemetry.pv_stock_flow)}</span>
          <span className="text-xs text-[#8B949E]">{UNITS.STOCK_FLOW}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#8B949E] font-mono">
          <span>SP: {formatValue(telemetry.sp_stock_flow)}</span>
          {isRamping && (
            <span className="bg-[#58A6FF]/20 text-[#58A6FF] border border-[#58A6FF]/40 px-1 rounded text-[9px] font-bold animate-pulse">
              RAMPING
            </span>
          )}
        </div>
      </div>

      {/* CARD 5: STEAM PRESSURE (SP-201) */}
      <div className="bg-[#161B22] border border-[#30363D] rounded p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-amber-400">{TAGS.STEAM_PRESSURE}</span>
          <span className="text-[#8B949E] text-[10px] uppercase font-mono">Steam Press.</span>
        </div>
        <div className="my-1 flex items-baseline space-x-1 font-mono">
          <span className="text-2xl font-bold text-white">{formatValue(telemetry.pv_steam_pressure)}</span>
          <span className="text-xs text-[#8B949E]">{UNITS.STEAM_PRESSURE}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#8B949E] font-mono">
          <span>SP: {formatValue(telemetry.sp_steam_pressure)}</span>
          {isRamping && (
            <span className="bg-amber-950/80 text-amber-400 border border-amber-600/60 px-1 rounded text-[9px] font-bold animate-pulse">
              RAMPING
            </span>
          )}
        </div>
      </div>

      {/* CARD 6: MACHINE SPEED (MS-001) */}
      <div className="bg-[#161B22] border border-[#30363D] rounded p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-purple-400">{TAGS.MACHINE_SPEED}</span>
          <span className="text-[#8B949E] text-[10px] uppercase font-mono">Machine Speed</span>
        </div>
        <div className="my-1 flex items-baseline space-x-1 font-mono">
          <span className="text-2xl font-bold text-white">{formatValue(telemetry.pv_machine_speed)}</span>
          <span className="text-xs text-[#8B949E]">{UNITS.MACHINE_SPEED}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#8B949E] font-mono">
          <span>SP: {formatValue(telemetry.sp_machine_speed)}</span>
          {isRamping && (
            <span className="bg-purple-950/80 text-purple-400 border border-purple-600/60 px-1 rounded text-[9px] font-bold animate-pulse">
              RAMPING
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
