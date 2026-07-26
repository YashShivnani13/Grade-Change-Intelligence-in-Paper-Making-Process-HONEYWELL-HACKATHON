import React from 'react';
import { useAppStore } from '../../store/appStore';
import { formatSeconds } from '../../utils/formatting';
import { Play, AlertOctagon, RotateCcw, Zap } from 'lucide-react';

export function TransitionPhaseBar() {
  const telemetry = useAppStore((state) => state.telemetry);
  const phase = telemetry.transition_phase || 'STEADY_A';
  const elapsed = telemetry.transition_seconds_elapsed || 0;

  // Simulator API action trigger helper
  const triggerSimulatorAction = async (action, params = {}) => {
    try {
      await fetch('http://127.0.0.1:8000/api/simulator/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params }),
      });
    } catch (e) {
      console.error('Failed to trigger simulator action:', e);
    }
  };

  const handleReset = async () => {
    try {
      await fetch('http://127.0.0.1:8000/api/simulator/reset', { method: 'POST' });
    } catch (e) {
      console.error('Failed to reset simulator:', e);
    }
  };

  const phases = [
    { key: 'STEADY_A', label: 'Steady Grade A' },
    { key: 'RAMPING', label: 'APC Ramping' },
    { key: 'STABILIZING', label: 'Stabilizing' },
    { key: 'STEADY_B', label: 'Steady Grade B' },
  ];

  const getPhaseIndex = (p) => {
    switch (p) {
      case 'STEADY_A': return 0;
      case 'RAMPING': return 1;
      case 'STABILIZING': return 2;
      case 'STEADY_B': return 3;
      default: return 0;
    }
  };

  const currentIdx = getPhaseIndex(phase);

  return (
    <div className="bg-[#0D1117] border-b border-[#30363D] px-4 py-1.5 flex flex-wrap items-center justify-between font-mono text-xs select-none min-h-[36px]">
      {/* Left: Phase Progress Bar */}
      <div className="flex items-center space-x-3 flex-1 min-w-[320px]">
        <span className="text-[#8B949E] text-[11px] font-semibold uppercase tracking-wider">PHASE:</span>
        <div className="flex items-center space-x-1.5 flex-1 max-w-[480px]">
          {phases.map((p, idx) => {
            const isActive = idx === currentIdx;
            const isCompleted = idx < currentIdx;
            return (
              <React.Fragment key={p.key}>
                <div
                  className={`flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    isActive
                      ? 'bg-[#58A6FF]/20 text-[#58A6FF] border border-[#58A6FF]/60 shadow-[0_0_8px_rgba(88,166,255,0.3)]'
                      : isCompleted
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                      : 'bg-[#161B22] text-gray-500 border border-[#30363D]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#58A6FF] animate-ping' : isCompleted ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  <span>{p.label}</span>
                </div>
                {idx < phases.length - 1 && (
                  <div className={`h-[2px] flex-1 transition-all ${idx < currentIdx ? 'bg-emerald-500' : 'bg-[#30363D]'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Elapsed Transition Timer */}
        <div className="text-[11px] text-[#8B949E] pl-2 border-l border-[#30363D] whitespace-nowrap">
          Elapsed: <strong className="text-white font-mono">{formatSeconds(elapsed)}</strong>
        </div>
      </div>

      {/* Right: Pitch Scenario Triggers for Evaluator Testing */}
      <div className="flex items-center space-x-2 text-[11px] font-medium pt-1 sm:pt-0">
        <span className="text-gray-500 text-[10px] uppercase font-semibold hidden md:inline">DEMO TRIGGERS:</span>
        <button
          onClick={() => triggerSimulatorAction('grade_change', { from_grade: 'A', to_grade: 'B' })}
          className="flex items-center space-x-1 bg-[#161B22] hover:bg-[#21262D] text-[#58A6FF] border border-[#30363D] px-2 py-1 rounded transition"
          title="Initiate Grade Change from Grade A to Grade B"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Grade A→B</span>
        </button>

        <button
          onClick={() => triggerSimulatorAction('inject_disturbance')}
          className="flex items-center space-x-1 bg-[#161B22] hover:bg-amber-950/50 text-amber-400 border border-amber-800/60 px-2 py-1 rounded transition"
          title="Inject Pulp Consistency Drop Disturbance"
        >
          <Zap className="w-3 h-3" />
          <span>Disturbance</span>
        </button>

        <button
          onClick={() => triggerSimulatorAction('bad_operator')}
          className="flex items-center space-x-1 bg-[#161B22] hover:bg-red-950/50 text-red-400 border border-red-800/60 px-2 py-1 rounded transition"
          title="Simulate Incorrect Operator Manual Steam Drop"
        >
          <AlertOctagon className="w-3 h-3" />
          <span>Bad Action</span>
        </button>

        <button
          onClick={handleReset}
          className="flex items-center space-x-1 bg-[#161B22] hover:bg-[#21262D] text-gray-300 border border-[#30363D] px-2 py-1 rounded transition"
          title="Reset to Grade A Steady State"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
