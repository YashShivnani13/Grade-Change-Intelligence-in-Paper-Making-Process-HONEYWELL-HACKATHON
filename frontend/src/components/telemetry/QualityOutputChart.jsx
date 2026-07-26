import React from 'react';
import { useAppStore } from '../../store/appStore';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { TAGS, UNITS, GRADE_SPECS } from '../../constants';

export function QualityOutputChart() {
  const telemetryHistory = useAppStore((state) => state.telemetryHistory);
  const telemetry = useAppStore((state) => state.telemetry);
  const currentRiskEvent = useAppStore((state) => state.currentRiskEvent);

  const targetSpec = GRADE_SPECS[telemetry.target_grade || 'B'] || GRADE_SPECS.B;
  const bwTarget = targetSpec.bw_target;
  const mcTarget = targetSpec.moisture_target;

  const bwUpperLimit = bwTarget * (1 + targetSpec.bw_tolerance_pct / 100);
  const bwLowerLimit = bwTarget * (1 - targetSpec.bw_tolerance_pct / 100);

  const isRiskActive = telemetry.basis_weight_risk !== 'Nominal' || telemetry.moisture_risk !== 'Nominal';

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded p-3 flex flex-col h-full select-none">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {/* Blinking LED Liveness Indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono font-bold text-xs text-white uppercase tracking-wider">
            QUALITY OUTPUTS TELEMETRY
          </span>
          <span className="text-[10px] text-[#8B949E] font-mono">
            ({TAGS.BASIS_WEIGHT} & {TAGS.MOISTURE})
          </span>
        </div>

        {/* Legend / Info */}
        <div className="flex items-center space-x-4 text-[10px] font-mono">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-white"></span>
            <span className="text-gray-300">{TAGS.BASIS_WEIGHT} ({UNITS.BASIS_WEIGHT})</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-amber-400"></span>
            <span className="text-amber-400">{TAGS.MOISTURE} ({UNITS.MOISTURE})</span>
          </div>
          {currentRiskEvent?.reference_transition && (
            <div className="flex items-center space-x-1 bg-[#58A6FF]/20 px-1.5 py-0.5 rounded border border-[#58A6FF]/40 text-[#58A6FF]">
              <span className="w-2.5 stroke-dasharray-2 bg-[#58A6FF] h-0.5"></span>
              <span>REF: {currentRiskEvent.reference_transition.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 w-full min-h-[160px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={telemetryHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />

            <XAxis
              dataKey="timestamp"
              tickFormatter={(t) => (typeof t === 'number' ? `${t}s` : t)}
              stroke="#484F58"
              tick={{ fill: '#8B949E', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            />

            {/* Left Y Axis: Basis Weight */}
            <YAxis
              yAxisId="left"
              domain={[Math.floor(bwTarget - 10), Math.ceil(bwTarget + 10)]}
              stroke="#8B949E"
              tick={{ fill: '#E6EDF3', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              unit=" g/m²"
            />

            {/* Right Y Axis: Moisture */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[3.0, 9.0]}
              stroke="#D29922"
              tick={{ fill: '#D29922', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              unit="%"
            />

            <Tooltip
              contentStyle={{
                backgroundColor: '#0D1117',
                borderColor: '#30363D',
                borderRadius: '4px',
                color: '#E6EDF3',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono',
              }}
            />

            {/* ±2.5% Tolerance Limit Lines */}
            <ReferenceLine
              yAxisId="left"
              y={bwUpperLimit}
              stroke="#F85149"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: `+2.5% (${bwUpperLimit.toFixed(1)})`, fill: '#F85149', fontSize: 9, position: 'right' }}
            />
            <ReferenceLine
              yAxisId="left"
              y={bwLowerLimit}
              stroke="#F85149"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: `-2.5% (${bwLowerLimit.toFixed(1)})`, fill: '#F85149', fontSize: 9, position: 'right' }}
            />

            {/* Basis Weight Line */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="pv_basis_weight"
              name={TAGS.BASIS_WEIGHT}
              stroke="#FFFFFF"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            {/* Moisture Line */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="pv_moisture"
              name={TAGS.MOISTURE}
              stroke="#D29922"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
