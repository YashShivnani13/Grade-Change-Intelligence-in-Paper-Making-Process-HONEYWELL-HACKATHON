import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { BrainCircuit } from 'lucide-react';

// Phase color mapping
const PHASE_COLORS = {
  MONITORING: 'text-emerald-400',
  DETECTING:  'text-amber-400',
  SEARCHING:  'text-blue-300',
  REASONING:  'text-purple-400',
  WAITING:    'text-[#58A6FF]',
  LEARNING:   'text-emerald-300',
  STABILIZING:'text-emerald-400',
};

const PHASE_DOT_COLORS = {
  MONITORING: 'bg-emerald-400',
  DETECTING:  'bg-amber-400',
  SEARCHING:  'bg-blue-300',
  REASONING:  'bg-purple-400',
  WAITING:    'bg-[#58A6FF]',
  LEARNING:   'bg-emerald-300',
  STABILIZING:'bg-emerald-400',
};

export function AgentThoughtStream() {
  const agentThoughts = useAppStore((state) => state.agentThoughts);
  const agentStage = useAppStore((state) => state.agentStage);
  const learningInProgress = useAppStore((state) => state.learningInProgress);
  const scrollRef = useRef(null);

  // Auto-scroll to top when new thoughts appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [agentThoughts.length]);

  const statusLabel = learningInProgress
    ? '⚡ LEARNING IN PROGRESS'
    : agentStage === 'WAITING'
    ? '⏳ AWAITING OPERATOR'
    : agentStage === 'STABILIZING'
    ? '📡 MONITORING RESPONSE'
    : 'LIVE THINKING';

  return (
    <div className="bg-[#0D1117] border border-[#30363D] rounded p-2.5 flex flex-col font-mono text-xs select-none">
      <div className="flex items-center justify-between text-[#8B949E] text-[10px] font-bold tracking-wider uppercase border-b border-[#30363D] pb-1.5 mb-1.5">
        <div className="flex items-center space-x-1.5 text-[#58A6FF]">
          <BrainCircuit className={`w-3.5 h-3.5 ${learningInProgress ? 'animate-spin' : 'animate-pulse'}`} />
          <span>AI COPILOT ACTIVITY LOG</span>
        </div>
        <span className={`font-normal text-[9px] ${learningInProgress ? 'text-emerald-400 animate-pulse' : 'text-gray-500'}`}>
          {statusLabel}
        </span>
      </div>

      <div ref={scrollRef} className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
        {agentThoughts.map((th, idx) => {
          const phase = th.phase || 'MONITORING';
          const dotColor = PHASE_DOT_COLORS[phase] || 'bg-gray-500';
          const textColor = PHASE_COLORS[phase] || 'text-gray-400';
          const isLatest = idx === 0;

          return (
            <div
              key={th.id}
              className={`flex items-start space-x-2 p-1.5 rounded border text-[10.5px] leading-snug transition-all duration-300 ${
                isLatest
                  ? 'bg-[#161B22] border-[#58A6FF]/30 shadow-[0_0_6px_rgba(88,166,255,0.1)]'
                  : 'bg-[#0D1117] border-[#30363D]/40 opacity-75'
              }`}
            >
              {/* Phase indicator dot */}
              <div className="flex items-center pt-0.5 shrink-0">
                <div className={`w-1.5 h-1.5 rounded-full ${dotColor} ${isLatest ? 'animate-pulse' : ''}`} />
              </div>
              {/* Timestamp */}
              <span className="text-[#8B949E] shrink-0 text-[9px]">{th.timestamp}</span>
              {/* Icon */}
              <span className="shrink-0">{th.icon}</span>
              {/* Message */}
              <span className={`font-sans ${isLatest ? 'text-gray-100' : 'text-gray-400'}`}>
                {th.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
