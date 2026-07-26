import React from 'react';
import { useAppStore } from '../../store/appStore';
import { formatValue } from '../../utils/formatting';

export function ProcessFlowDiagram() {
  const telemetry = useAppStore((state) => state.telemetry);
  const riskLevel = useAppStore((state) => state.riskLevel);

  const isRamping = telemetry.transition_phase === 'RAMPING';
  const isDryerRisk = telemetry.basis_weight_risk !== 'Nominal' || telemetry.moisture_risk !== 'Nominal';

  return (
    <div className="bg-[#161B22] border-b border-[#30363D] px-4 py-2 flex items-center justify-between font-mono text-xs select-none min-h-[70px]">
      <div className="flex items-center space-x-2 text-[#8B949E] text-[11px] font-bold tracking-wider uppercase pr-2 border-r border-[#30363D]">
        <span>PROCESS FLOW</span>
        <span className="text-gray-500 font-normal">(PFD)</span>
      </div>

      {/* SVG Diagram Container */}
      <div className="flex-1 px-4 overflow-x-auto">
        <svg className="w-full h-[54px] min-w-[650px]" viewBox="0 0 800 60" fill="none">
          {/* Connecting Flow Lines */}
          <line x1="120" y1="30" x2="250" y2="30" stroke="#30363D" strokeWidth="3" />
          <line x1="250" y1="30" x2="380" y2="30" stroke="#30363D" strokeWidth="3" />
          <line x1="380" y1="30" x2="510" y2="30" stroke="#30363D" strokeWidth="3" />
          <line x1="510" y1="30" x2="640" y2="30" stroke="#30363D" strokeWidth="3" />

          {/* Animated Ramping Pulse Lines */}
          {isRamping && (
            <>
              <line x1="120" y1="30" x2="250" y2="30" stroke="#58A6FF" strokeWidth="3" className="animate-flow-line" />
              <line x1="250" y1="30" x2="380" y2="30" stroke="#58A6FF" strokeWidth="3" className="animate-flow-line" />
              <line x1="380" y1="30" x2="510" y2="30" stroke="#58A6FF" strokeWidth="3" className="animate-flow-line" />
              <line x1="510" y1="30" x2="640" y2="30" stroke="#58A6FF" strokeWidth="3" className="animate-flow-line" />
            </>
          )}

          {/* NODE 1: HEADBOX */}
          <g transform="translate(40, 10)">
            <rect x="0" y="0" width="110" height="40" rx="4" fill="#0D1117" stroke="#30363D" strokeWidth="1.5" />
            <circle cx="14" cy="20" r="5" fill="#3FB950" />
            <text x="26" y="17" fill="#E6EDF3" fontSize="11" fontWeight="bold">HEADBOX</text>
            <text x="26" y="31" fill="#8B949E" fontSize="9">SP-101: {formatValue(telemetry.pv_stock_flow)} L/m</text>
          </g>

          {/* NODE 2: FORMING */}
          <g transform="translate(195, 10)">
            <rect x="0" y="0" width="110" height="40" rx="4" fill="#0D1117" stroke="#30363D" strokeWidth="1.5" />
            <circle cx="14" cy="20" r="5" fill="#3FB950" />
            <text x="26" y="17" fill="#E6EDF3" fontSize="11" fontWeight="bold">FORMING</text>
            <text x="26" y="31" fill="#8B949E" fontSize="9">Wire Section</text>
          </g>

          {/* NODE 3: PRESS */}
          <g transform="translate(350, 10)">
            <rect x="0" y="0" width="110" height="40" rx="4" fill="#0D1117" stroke="#30363D" strokeWidth="1.5" />
            <circle cx="14" cy="20" r="5" fill="#3FB950" />
            <text x="26" y="17" fill="#E6EDF3" fontSize="11" fontWeight="bold">PRESS</text>
            <text x="26" y="31" fill="#8B949E" fontSize="9">Felts Section</text>
          </g>

          {/* NODE 4: DRYER (Highlighted on risk) */}
          <g transform="translate(505, 10)">
            <rect
              x="0"
              y="0"
              width="110"
              height="40"
              rx="4"
              fill={isDryerRisk ? (riskLevel === 'Critical' ? '#450a0a' : '#451a03') : '#0D1117'}
              stroke={isDryerRisk ? (riskLevel === 'Critical' ? '#f85149' : '#d29922') : '#30363D'}
              strokeWidth={isDryerRisk ? '2' : '1.5'}
            />
            <circle cx="14" cy="20" r="5" fill={isDryerRisk ? (riskLevel === 'Critical' ? '#f85149' : '#d29922') : '#3FB950'} className={isDryerRisk ? 'animate-pulse' : ''} />
            <text x="26" y="17" fill={isDryerRisk ? (riskLevel === 'Critical' ? '#fca5a5' : '#fcd34d') : '#E6EDF3'} fontSize="11" fontWeight="bold">
              DRYER {isDryerRisk ? '⚠' : ''}
            </text>
            <text x="26" y="31" fill="#8B949E" fontSize="9">SP-201: {formatValue(telemetry.pv_steam_pressure)} kPa</text>
          </g>

          {/* NODE 5: SCANNER */}
          <g transform="translate(660, 10)">
            <rect x="0" y="0" width="125" height="40" rx="4" fill="#0D1117" stroke="#30363D" strokeWidth="1.5" />
            <circle cx="14" cy="20" r="5" fill="#3FB950" />
            <text x="26" y="17" fill="#E6EDF3" fontSize="11" fontWeight="bold">SCANNER</text>
            <text x="26" y="31" fill="#8B949E" fontSize="9">
              BW: {formatValue(telemetry.pv_basis_weight)} | MC: {formatValue(telemetry.pv_moisture)}%
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
