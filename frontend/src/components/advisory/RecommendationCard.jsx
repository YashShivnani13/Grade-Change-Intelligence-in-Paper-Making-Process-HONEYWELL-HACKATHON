import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { CheckCircle2, XCircle, Sliders, ShieldCheck, Target, Clock, TrendingUp, Package } from 'lucide-react';

function confidenceColor(pct) {
  if (pct >= 85) return 'text-emerald-400';
  if (pct >= 70) return 'text-amber-400';
  return 'text-red-400';
}

function confidenceBarColor(pct) {
  if (pct >= 85) return 'bg-emerald-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

export function RecommendationCard() {
  const currentRiskEvent = useAppStore((state) => state.currentRiskEvent);
  const toggleWhatIf = useAppStore((state) => state.toggleWhatIf);
  const recordFeedback = useAppStore((state) => state.recordFeedback);
  const isSubmittingFeedback = useAppStore((state) => state.isSubmittingFeedback);
  const learningInProgress = useAppStore((state) => state.learningInProgress);
  const agentStage = useAppStore((state) => state.agentStage);

  if (!currentRiskEvent || !currentRiskEvent.recommendation) return null;

  const rec = currentRiskEvent.recommendation;
  const reliability = currentRiskEvent.reliability_index || 0.83;
  const reliabilityPct = Math.round(reliability * 100);
  const refTrans = currentRiskEvent.reference_transition || {
    label: 'TR-047 (A→B 2024-11-12)',
    similarity_pct: 83,
  };

  // Build actionable steps from the deltas
  const actions = [];
  if (Math.abs(rec.delta_steam) > 0.01) {
    actions.push({
      num: actions.length + 1,
      label: rec.delta_steam > 0 ? 'Increase Steam Pressure' : 'Reduce Steam Pressure',
      value: `${rec.delta_steam > 0 ? '+' : ''}${rec.delta_steam.toFixed(1)} kPa`,
      tag: 'SP-201',
      color: 'text-amber-400',
    });
  }
  if (Math.abs(rec.delta_flow) > 0.01) {
    actions.push({
      num: actions.length + 1,
      label: rec.delta_flow > 0 ? 'Increase Stock Flow' : 'Reduce Stock Flow',
      value: `${rec.delta_flow > 0 ? '+' : ''}${rec.delta_flow.toFixed(1)} L/min`,
      tag: 'SP-101',
      color: 'text-blue-400',
    });
  } else {
    actions.push({
      num: actions.length + 1,
      label: 'Hold Stock Flow',
      value: 'No change',
      tag: 'SP-101',
      color: 'text-blue-400',
    });
  }
  if (Math.abs(rec.delta_speed || 0) > 0.01) {
    actions.push({
      num: actions.length + 1,
      label: 'Adjust Machine Speed',
      value: `${(rec.delta_speed || 0) > 0 ? '+' : ''}${(rec.delta_speed || 0).toFixed(0)} m/min`,
      tag: 'MS-001',
      color: 'text-purple-400',
    });
  } else {
    actions.push({
      num: actions.length + 1,
      label: 'Maintain Machine Speed',
      value: 'Steady',
      tag: 'MS-001',
      color: 'text-purple-400',
    });
  }

  // Estimate outcomes
  const secondsToBreach = currentRiskEvent.seconds_to_breach || 28;
  const estStabilize = Math.max(15, Math.round(secondsToBreach * 0.7 + 8));
  const estWasteKg = Math.round(estStabilize * 1.2 * 0.8 * 0.6);

  const isDisabled = isSubmittingFeedback || learningInProgress;
  const isLearning = agentStage === 'LEARNING' || agentStage === 'STABILIZING';

  const handleApply = async () => {
    try {
      useAppStore.setState({ isSubmittingFeedback: true });

      const res = await fetch('http://127.0.0.1:8000/api/advisory/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: currentRiskEvent.event_id,
          transition_id: refTrans.id || 47,
          feedback: 'Accepted',
          outcome_success: true,
        }),
      });
      const data = await res.json();

      await fetch('http://127.0.0.1:8000/api/simulator/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply_advisory',
          params: {
            delta_steam: rec.delta_steam,
            delta_flow: rec.delta_flow,
          },
        }),
      });

      recordFeedback(currentRiskEvent.event_id, 'Accepted', data.new_confidence || reliability);
    } catch (e) {
      console.error('Failed to apply advisory:', e);
      useAppStore.setState({ isSubmittingFeedback: false });
    }
  };

  const handleDismiss = async () => {
    try {
      useAppStore.setState({ isSubmittingFeedback: true });
      const res = await fetch('http://127.0.0.1:8000/api/advisory/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: currentRiskEvent.event_id,
          transition_id: refTrans.id || 47,
          feedback: 'Rejected',
        }),
      });
      const data = await res.json();
      recordFeedback(currentRiskEvent.event_id, 'Rejected', data.new_confidence || reliability);
    } catch (e) {
      console.error('Failed to dismiss advisory:', e);
      useAppStore.setState({ isSubmittingFeedback: false });
    }
  };

  // While learning is in progress, show the learning overlay
  if (isLearning) {
    return (
      <div className="bg-[#161B22] border-2 border-emerald-600/60 rounded p-3 text-xs font-mono space-y-2 shadow-[0_0_20px_rgba(52,211,153,0.2)] animate-pulse-subtle select-none">
        <div className="flex items-center space-x-2 text-emerald-300 font-bold text-[11px]">
          <ShieldCheck className="w-4 h-4 animate-pulse" />
          <span>
            {agentStage === 'STABILIZING' ? 'MONITORING PROCESS RESPONSE...' : 'UPDATING AI KNOWLEDGE BASE...'}
          </span>
        </div>
        <div className="space-y-1.5 text-[10px] text-gray-300">
          <div className="flex items-center space-x-2">
            <span className="text-emerald-400">✓</span>
            <span>Recommendation applied to process control loop</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={agentStage === 'STABILIZING' ? 'text-emerald-400' : 'text-gray-500'}>
              {agentStage === 'STABILIZING' ? '✓' : '◌'}
            </span>
            <span>Basis Weight stabilization in progress...</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-500">
            <span>◌</span>
            <span>Confidence calibration pending...</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-500">
            <span>◌</span>
            <span>Memory saved to knowledge base</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-[#0D1117] h-1.5 rounded overflow-hidden border border-[#30363D]">
          <div
            className="bg-emerald-500 h-full rounded animate-[scan-reload_3s_ease-in-out_infinite]"
            style={{ width: '60%' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#161B22] border-2 border-[#58A6FF]/60 rounded p-3 text-xs font-mono space-y-2.5 shadow-[0_0_15px_rgba(88,166,255,0.15)] select-none">
      {/* Header */}
      <div className="flex items-center justify-between text-[#58A6FF] font-bold text-[11px] tracking-wider uppercase border-b border-[#30363D] pb-1.5">
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-[#58A6FF]" />
          <span>RECOMMENDED ACTIONS</span>
        </div>
        <span className="text-[10px] text-[#8B949E] font-normal">
          Based on #{refTrans.label?.split(' ')[0] || 'TR-047'}
        </span>
      </div>

      {/* Actionable steps (not raw deltas) */}
      <div className="space-y-1.5">
        {actions.map((action) => (
          <div
            key={action.num}
            className="flex items-center justify-between bg-[#0D1117] p-2 rounded border border-[#30363D] hover:border-[#484F58] transition-colors"
          >
            <div className="flex items-center space-x-2">
              <span className="text-[#8B949E] font-bold w-4">{action.num}.</span>
              <div>
                <div className="text-gray-200 font-semibold text-[11px]">{action.label}</div>
                <div className="text-[9px] text-[#8B949E]">{action.tag}</div>
              </div>
            </div>
            <span className={`font-extrabold text-sm ${action.color}`}>{action.value}</span>
          </div>
        ))}
      </div>

      {/* Expected outcomes */}
      <div className="bg-[#0D1117] rounded border border-[#30363D] p-2 space-y-1">
        <div className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider mb-1">Expected Result</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="flex items-center justify-center space-x-1 text-emerald-400">
              <Clock className="w-3 h-3" />
              <span className="font-bold text-[11px]">{estStabilize}s</span>
            </div>
            <div className="text-[9px] text-[#8B949E]">Stabilize</div>
          </div>
          <div className="border-x border-[#30363D]">
            <div className="flex items-center justify-center space-x-1 text-amber-400">
              <Package className="w-3 h-3" />
              <span className="font-bold text-[11px]">~{estWasteKg} kg</span>
            </div>
            <div className="text-[9px] text-[#8B949E]">Waste saved</div>
          </div>
          <div>
            <div className={`flex items-center justify-center space-x-1 ${confidenceColor(reliabilityPct)}`}>
              <TrendingUp className="w-3 h-3" />
              <span className="font-bold text-[11px]">{reliabilityPct}%</span>
            </div>
            <div className="text-[9px] text-[#8B949E]">Confidence</div>
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="space-y-0.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-[#8B949E]">Advisory Confidence</span>
          <span className={`font-bold ${confidenceColor(reliabilityPct)}`}>{reliabilityPct}%</span>
        </div>
        <div className="w-full bg-[#0D1117] h-1.5 rounded overflow-hidden border border-[#30363D]">
          <div
            className={`${confidenceBarColor(reliabilityPct)} h-full rounded transition-all duration-700`}
            style={{ width: `${reliabilityPct}%` }}
          />
        </div>
        <div className="text-[9px] text-[#8B949E]">
          Ref: <span className="text-[#58A6FF]">{refTrans.label}</span>
          {' '} · Similarity: <span className="text-gray-300">{refTrans.similarity_pct}%</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-1.5 pt-0.5">
        <button
          onClick={handleApply}
          disabled={isDisabled}
          className="w-full bg-[#58A6FF] hover:bg-[#388bfd] text-black font-extrabold text-sm py-2.5 px-4 rounded shadow-[0_0_15px_rgba(88,166,255,0.4)] flex items-center justify-center space-x-2 transition transform active:scale-95 animate-pulse-subtle disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-4 h-4 fill-black text-white" />
          <span>Apply Recommendation</span>
        </button>

        <div className="flex items-center justify-between text-[11px]">
          <button
            onClick={toggleWhatIf}
            className="flex items-center space-x-1 text-[#58A6FF] hover:underline font-semibold"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulate first (What-If)</span>
          </button>

          <button
            onClick={handleDismiss}
            disabled={isDisabled}
            className="flex items-center space-x-1 text-red-400 hover:text-red-300 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Dismiss</span>
          </button>
        </div>
      </div>
    </div>
  );
}
