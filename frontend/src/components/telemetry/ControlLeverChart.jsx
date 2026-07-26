import React from 'react';
import { useAppStore } from '../../store/appStore';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TAGS, UNITS } from '../../constants';

export function ControlLeverChart() {
  const telemetryHistory = useAppStore((state) => state.telemetryHistory);
  const telemetry = useAppStore((state) => state.telemetry);

  // Compute actuator gap
  const flowGap = Math.abs(telemetry.sp_stock_flow - telemetry.pv_stock_flow);
  const steamGap = Math.abs(telemetry.sp_steam_pressure - telemetry.pv_steam_pressure);
  const hasLag = steamGap > 3.0 || flowGap > 5.0;

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded p-3 flex flex-col h-full select-none">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {/* Blinking LED Liveness Indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="font-mono font-bold text-xs text-white uppercase tracking-wider">
            CONTROL LEVERS TELEMETRY (SP vs PV ACTUATOR LAG)
          </span>
        </div>

        {/* Lag Alert Indicator */}
        {hasLag && (
          <div className="flex items-center space-x-1 text-[10px] font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-600/60 px-2 py-0.5 rounded animate-pulse">
            <span>⚠ ACTUATOR LAG: STEAM GAP {steamGap.toFixed(1)} kPa</span>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center space-x-4 text-[10px] font-mono">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-[#58A6FF]"></span>
            <span className="text-[#58A6FF]">{TAGS.STOCK_FLOW}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-[#F0883E]"></span>
            <span className="text-[#F0883E]">{TAGS.STEAM_PRESSURE}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-[#BC8CFF]"></span>
            <span className="text-[#BC8CFF]">{TAGS.MACHINE_SPEED}</span>
          </div>
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

            {/* Left Y Axis: Stock Flow & Steam Pressure */}
            <YAxis
              yAxisId="left"
              domain={[40, 140]}
              stroke="#8B949E"
              tick={{ fill: '#E6EDF3', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            />

            {/* Right Y Axis: Machine Speed */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[700, 950]}
              stroke="#BC8CFF"
              tick={{ fill: '#BC8CFF', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              unit=" m/min"
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

            {/* Stock Flow SP (Dashed) & PV (Solid) */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="sp_stock_flow"
              name="SP Stock Flow"
              stroke="#58A6FF"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="pv_stock_flow"
              name="PV Stock Flow"
              stroke="#58A6FF"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            {/* Steam Pressure SP (Dashed) & PV (Solid) */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="sp_steam_pressure"
              name="SP Steam Pressure"
              stroke="#F0883E"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="pv_steam_pressure"
              name="PV Steam Pressure"
              stroke="#F0883E"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            {/* Machine Speed SP (Dashed) & PV (Solid) */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="sp_machine_speed"
              name="SP Machine Speed"
              stroke="#BC8CFF"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="pv_machine_speed"
              name="PV Machine Speed"
              stroke="#BC8CFF"
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
