import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { formatDelta } from '../../utils/formatting';
import { Play, Sliders } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export function WhatIfPanel() {
  const whatifVisible = useAppStore((state) => state.whatifVisible);
  const currentRiskEvent = useAppStore((state) => state.currentRiskEvent);
  const whatifResult = useAppStore((state) => state.whatifResult);
  const whatifLoading = useAppStore((state) => state.whatifLoading);
  const setWhatIfLoading = useAppStore((state) => state.setWhatIfLoading);
  const setWhatIfResult = useAppStore((state) => state.setWhatIfResult);

  const defaultSteam = currentRiskEvent?.recommendation?.delta_steam || 4.0;
  const defaultFlow = currentRiskEvent?.recommendation?.delta_flow || 0.0;

  const [deltaSteam, setDeltaSteam] = useState(defaultSteam);
  const [deltaFlow, setDeltaFlow] = useState(defaultFlow);

  if (!whatifVisible) return null;

  const handleProject = async () => {
    try {
      setWhatIfLoading(true);
      const res = await fetch('http://127.0.0.1:8000/api/advisory/whatif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delta_steam: Number(deltaSteam),
          delta_flow: Number(deltaFlow),
        }),
      });
      const data = await res.json();
      setWhatIfResult(data.trajectory || []);
    } catch (e) {
      console.error('Failed to project what-if trajectory:', e);
      setWhatIfLoading(false);
    }
  };

  return (
    <div className="bg-[#0D1117] border border-[#58A6FF]/40 rounded p-3 text-xs font-mono space-y-3 animate-pulse-subtle select-none">
      <div className="flex items-center justify-between text-[#58A6FF] font-bold text-[11px] uppercase tracking-wider border-b border-[#30363D] pb-1.5">
        <div className="flex items-center space-x-1.5">
          <Sliders className="w-4 h-4" />
          <span>WHAT-IF DECISION SUPPORT SANDBOX</span>
        </div>
        <span className="text-[10px] text-gray-400">SIMULATION ENGINE</span>
      </div>

      {/* Clamped Sliders for Actuator Deltas */}
      <div className="space-y-2.5">
        {/* Steam Pressure Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-300">Δ Steam Pressure (SP-201):</span>
            <span className="text-amber-400 font-bold">{formatDelta(Number(deltaSteam), 'kPa')}</span>
          </div>
          <input
            type="range"
            min="-10.0"
            max="10.0"
            step="0.5"
            value={deltaSteam}
            onChange={(e) => setDeltaSteam(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#161B22] rounded-lg appearance-none cursor-pointer accent-amber-400 border border-[#30363D]"
          />
        </div>

        {/* Stock Flow Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-300">Δ Stock Flow (SP-101):</span>
            <span className="text-[#58A6FF] font-bold">{formatDelta(Number(deltaFlow), 'L/m')}</span>
          </div>
          <input
            type="range"
            min="-15.0"
            max="15.0"
            step="0.5"
            value={deltaFlow}
            onChange={(e) => setDeltaFlow(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#161B22] rounded-lg appearance-none cursor-pointer accent-[#58A6FF] border border-[#30363D]"
          />
        </div>

        {/* Project Outcome Button */}
        <button
          onClick={handleProject}
          disabled={whatifLoading}
          className="w-full bg-[#161B22] hover:bg-[#21262D] text-[#58A6FF] border border-[#58A6FF]/60 font-bold py-1.5 px-3 rounded flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{whatifLoading ? 'SIMULATING...' : '▶ PROJECT FUTURE TRAJECTORY'}</span>
        </button>
      </div>

      {/* Mini Trajectory Projection Sparkline */}
      {whatifResult && whatifResult.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-[#30363D]">
          <div className="flex justify-between text-[10px] text-gray-300 font-bold">
            <span>PROJECTED RESPONSE (90s)</span>
            <span className="text-emerald-400">Est. Stabilization: ~88s</span>
          </div>

          <div className="w-full h-[80px] bg-[#161B22] rounded p-1 border border-[#30363D]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={whatifResult}>
                <XAxis dataKey="step" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D1117',
                    borderColor: '#30363D',
                    fontSize: '10px',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <Line type="monotone" dataKey="bw" name="Basis Weight" stroke="#FFFFFF" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="moisture" name="Moisture" stroke="#D29922" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
