import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Eye, AlertTriangle, Search, Lightbulb, Clock, GraduationCap, Activity } from 'lucide-react';

const STAGES = [
  {
    key: 'MONITORING',
    label: 'Monitoring',
    icon: Eye,
    desc: 'Watching process in real time',
    color: 'emerald',
  },
  {
    key: 'DETECTING',
    label: 'Detecting',
    icon: AlertTriangle,
    desc: 'Trend deviation identified',
    color: 'amber',
  },
  {
    key: 'SEARCHING',
    label: 'Searching',
    icon: Search,
    desc: 'Finding similar transitions',
    color: 'blue',
  },
  {
    key: 'REASONING',
    label: 'Reasoning',
    icon: Lightbulb,
    desc: 'Building recommendation',
    color: 'purple',
  },
  {
    key: 'WAITING',
    label: 'Confirming',
    icon: Clock,
    desc: 'Waiting for operator',
    color: 'sky',
  },
  {
    key: 'LEARNING',
    label: 'Learning',
    icon: GraduationCap,
    desc: 'Updating knowledge base',
    color: 'emerald',
  },
];

// Covers both LEARNING and STABILIZING under LEARNING stage
function resolveStageKey(agentStage) {
  if (agentStage === 'STABILIZING') return 'LEARNING';
  return agentStage;
}

const COLOR_MAP = {
  emerald: {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.3)]',
    done: 'bg-emerald-950/30 text-emerald-600 border-emerald-900/40',
    icon: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  amber: {
    active: 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]',
    done: 'bg-amber-950/30 text-amber-600 border-amber-900/40',
    icon: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  blue: {
    active: 'bg-blue-500/20 text-blue-300 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]',
    done: 'bg-blue-950/30 text-blue-600 border-blue-900/40',
    icon: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  purple: {
    active: 'bg-purple-500/20 text-purple-300 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]',
    done: 'bg-purple-950/30 text-purple-600 border-purple-900/40',
    icon: 'text-purple-400',
    dot: 'bg-purple-400',
  },
  sky: {
    active: 'bg-[#58A6FF]/20 text-[#58A6FF] border-[#58A6FF] shadow-[0_0_8px_rgba(88,166,255,0.3)]',
    done: 'bg-blue-950/30 text-blue-600 border-blue-900/40',
    icon: 'text-[#58A6FF]',
    dot: 'bg-[#58A6FF]',
  },
};

export function ReasoningTimeline() {
  const agentStage = useAppStore((state) => state.agentStage);
  const agentStageTimestamp = useAppStore((state) => state.agentStageTimestamp);
  const learningInProgress = useAppStore((state) => state.learningInProgress);
  const learningResult = useAppStore((state) => state.learningResult);

  const resolvedStage = resolveStageKey(agentStage);
  const activeIdx = STAGES.findIndex((s) => s.key === resolvedStage);

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded p-2 text-xs font-mono select-none">
      {/* Header */}
      <div className="flex items-center justify-between text-[10px] text-[#8B949E] uppercase font-bold tracking-wider mb-2">
        <span className="text-[#58A6FF]">AI REASONING PIPELINE</span>
        <span className={`font-semibold ${
          agentStage === 'LEARNING' || agentStage === 'STABILIZING'
            ? 'text-emerald-400 animate-pulse'
            : agentStage === 'WAITING'
            ? 'text-[#58A6FF]'
            : agentStage === 'MONITORING'
            ? 'text-emerald-500'
            : 'text-amber-400 animate-pulse'
        }`}>
          {agentStage === 'STABILIZING' ? 'LEARNING' : agentStage}
        </span>
      </div>

      {/* Stage pills — horizontal strip */}
      <div className="grid grid-cols-6 gap-1 mb-2">
        {STAGES.map((stg, idx) => {
          const Icon = stg.icon;
          const isActive = idx === activeIdx;
          const isCompleted = idx < activeIdx;
          const colors = COLOR_MAP[stg.color];

          return (
            <div
              key={stg.key}
              className={`flex flex-col items-center justify-center p-1 rounded border text-center transition-all duration-500 ${
                isActive
                  ? `${colors.active} ${idx > 0 ? 'animate-pulse-subtle' : ''} font-bold`
                  : isCompleted
                  ? colors.done
                  : 'bg-[#0D1117] text-gray-600 border-[#30363D]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 mb-0.5 ${isActive ? colors.icon : ''} ${isActive && idx > 0 ? 'animate-bounce' : ''}`} />
              <span className="text-[8.5px] font-mono whitespace-nowrap leading-none">{stg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Current stage description */}
      {activeIdx >= 0 && (
        <div className={`text-[10px] text-center py-1 px-2 rounded transition-all duration-300 ${
          agentStage === 'MONITORING'
            ? 'text-emerald-400 bg-emerald-950/20 border border-emerald-900/30'
            : agentStage === 'WAITING'
            ? 'text-[#58A6FF] bg-blue-950/20 border border-blue-900/30'
            : agentStage === 'LEARNING' || agentStage === 'STABILIZING'
            ? 'text-emerald-300 bg-emerald-950/20 border border-emerald-900/30'
            : 'text-amber-300 bg-amber-950/20 border border-amber-900/30'
        }`}>
          {STAGES[activeIdx]?.desc}
        </div>
      )}

      {/* Learning result flash */}
      {learningResult && !learningInProgress && (
        <div className="mt-1.5 bg-emerald-950/30 border border-emerald-800/50 rounded p-1.5 text-[10px] text-emerald-300 text-center animate-pulse-subtle">
          ✓ Memory updated • Confidence {Math.round(learningResult.oldConfidence * 100)}% → {Math.round(learningResult.newConfidence * 100)}%
        </div>
      )}
    </div>
  );
}
