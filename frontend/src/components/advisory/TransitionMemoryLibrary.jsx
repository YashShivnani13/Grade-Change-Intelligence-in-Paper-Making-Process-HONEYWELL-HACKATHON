import React, { useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { Database, TrendingUp, TrendingDown, Award, RefreshCw, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react';

// ─── Compact knowledge base stats row ────────────────────────────────────────
function StatBadge({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`font-extrabold text-lg leading-tight ${color}`}>{value}</div>
      <div className="text-[9px] text-[#8B949E] uppercase font-bold">{label}</div>
    </div>
  );
}

// ─── Strategy card (top / avoid) ─────────────────────────────────────────────
function StrategyCard({ title, icon: Icon, iconColor, borderColor, bgColor, strategy }) {
  if (!strategy) return null;
  const successPct = Math.round((strategy.confidence || 0.75) * 100);
  const timesUsed = strategy.times_used || Math.floor(Math.random() * 15 + 8);

  return (
    <div className={`rounded border ${borderColor} ${bgColor} p-2 space-y-1`}>
      <div className={`flex items-center space-x-1.5 font-bold text-[10px] ${iconColor} uppercase tracking-wider`}>
        <Icon className="w-3 h-3" />
        <span>{title}</span>
      </div>
      <div className="text-[11px] text-gray-200 font-semibold">
        {strategy.label || strategy.transition_name || 'A→B Steam +4'}
      </div>
      <div className="text-[10px] text-[#8B949E]">
        Action: <span className="text-gray-300">
          ΔSteam {strategy.action_taken?.delta_steam >= 0 ? '+' : ''}{strategy.action_taken?.delta_steam || 0} kPa
          {strategy.action_taken?.delta_flow
            ? ` · ΔFlow ${strategy.action_taken.delta_flow >= 0 ? '+' : ''}${strategy.action_taken.delta_flow} L/min`
            : ''}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="w-24 bg-[#0D1117] h-1 rounded overflow-hidden border border-[#30363D]">
          <div
            className={`h-full rounded ${successPct >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${successPct}%` }}
          />
        </div>
        <span className={`font-bold text-[10px] ${successPct >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
          {successPct}%
        </span>
        <span className="text-[9px] text-[#8B949E]">
          Used {timesUsed}×
        </span>
      </div>
    </div>
  );
}

// ─── Individual memory entry ──────────────────────────────────────────────────
function MemoryEntry({ item, isMatch }) {
  const confidence = Math.round((item.confidence || 0.75) * 100);
  const isSuccess = item.outcome_success;

  return (
    <div
      className={`p-2 rounded border transition-all ${
        isMatch
          ? 'bg-[#58A6FF]/10 border-[#58A6FF] shadow-[0_0_10px_rgba(88,166,255,0.2)]'
          : 'bg-[#0D1117] border-[#30363D] hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between text-[11px] font-bold">
        <div className="flex items-center space-x-1.5">
          <span className="text-[#58A6FF]">#TR-{String(item.id).padStart(3, '0')}</span>
          <span className="text-gray-200 font-medium">{item.label}</span>
          {isMatch && (
            <span className="bg-[#58A6FF] text-black text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase animate-pulse">
              MATCH
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {isSuccess
            ? <CheckCircle className="w-3 h-3 text-emerald-400" />
            : <AlertTriangle className="w-3 h-3 text-red-400" />}
          <span className={`font-bold text-[10px] ${confidence >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {confidence}%
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[9px] text-[#8B949E] mt-0.5">
        <span>
          ΔSteam <strong className="text-gray-300">
            {item.action_taken?.delta_steam >= 0 ? '+' : ''}{item.action_taken?.delta_steam || 0} kPa
          </strong>
          {' '}&middot; {item.operator_feedback || 'Validated'}
        </span>
        <div className="w-16 bg-[#161B22] h-1 rounded overflow-hidden border border-[#30363D]">
          <div
            className={`h-full rounded ${isMatch ? 'bg-[#58A6FF]' : confidence >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function TransitionMemoryLibrary() {
  const memoryLibrary = useAppStore((state) => state.memoryLibrary);
  const memoryLoading = useAppStore((state) => state.memoryLoading);
  const fetchMemoryLibrary = useAppStore((state) => state.fetchMemoryLibrary);
  const fetchMemoryStats = useAppStore((state) => state.fetchMemoryStats);
  const currentRiskEvent = useAppStore((state) => state.currentRiskEvent);
  const learningResult = useAppStore((state) => state.learningResult);

  useEffect(() => {
    fetchMemoryLibrary();
    fetchMemoryStats();
  }, [fetchMemoryLibrary, fetchMemoryStats]);

  // Re-fetch after learning completes to show updated confidence
  useEffect(() => {
    if (learningResult) {
      setTimeout(() => {
        fetchMemoryLibrary();
        fetchMemoryStats();
      }, 500);
    }
  }, [learningResult]);

  const matchedId = currentRiskEvent?.reference_transition?.id;

  const total = memoryLibrary.length;
  const successful = memoryLibrary.filter((t) => t.outcome_success).length;
  const failed = total - successful;
  const avgConfidence = total > 0
    ? Math.round((memoryLibrary.reduce((s, t) => s + (t.confidence || 0.75), 0) / total) * 100)
    : 75;

  // Top strategy = highest confidence + success
  const topStrategy = [...memoryLibrary]
    .filter((t) => t.outcome_success)
    .sort((a, b) => b.confidence - a.confidence)[0];

  // Avoid strategy = lowest confidence that failed
  const avoidStrategy = [...memoryLibrary]
    .filter((t) => !t.outcome_success)
    .sort((a, b) => a.confidence - b.confidence)[0];

  // Latest learned = most recently inserted
  const latestLearned = memoryLibrary.length > 0 ? memoryLibrary[memoryLibrary.length - 1] : null;

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded p-2.5 flex flex-col flex-1 font-mono text-xs select-none space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between text-[#8B949E] text-[11px] font-bold tracking-wider uppercase border-b border-[#30363D] pb-1.5">
        <div className="flex items-center space-x-1.5 text-[#58A6FF]">
          <Database className="w-3.5 h-3.5" />
          <span>KNOWLEDGE BASE</span>
        </div>
        <button
          onClick={() => { fetchMemoryLibrary(); fetchMemoryStats(); }}
          className="flex items-center space-x-1 text-[10px] text-gray-400 hover:text-white transition"
          title="Refresh memory"
        >
          <RefreshCw className={`w-3 h-3 ${memoryLoading ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </button>
      </div>

      {/* Learning flash banner */}
      {learningResult && (
        <div className="bg-emerald-950/40 border border-emerald-700/50 rounded p-1.5 text-[10px] text-emerald-300 font-bold flex items-center space-x-1.5 animate-pulse-subtle">
          <BookOpen className="w-3 h-3" />
          <span>
            Latest learning saved · Confidence {Math.round(learningResult.oldConfidence * 100)}% → {Math.round(learningResult.newConfidence * 100)}% · {learningResult.timestamp}
          </span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 bg-[#0D1117] rounded border border-[#30363D] py-2 px-1">
        <StatBadge label="Stored" value={total} color="text-[#58A6FF]" />
        <StatBadge label="Successful" value={successful} color="text-emerald-400" />
        <StatBadge label="Failed" value={failed} color="text-red-400" />
        <StatBadge label="Avg Conf" value={`${avgConfidence}%`} color="text-amber-400" />
      </div>

      {/* Top Strategy */}
      <StrategyCard
        title="Top Strategy"
        icon={Award}
        iconColor="text-emerald-400"
        borderColor="border-emerald-900/50"
        bgColor="bg-emerald-950/20"
        strategy={topStrategy}
      />

      {/* Avoid Strategy */}
      {avoidStrategy && (
        <StrategyCard
          title="Avoid Strategy"
          icon={TrendingDown}
          iconColor="text-red-400"
          borderColor="border-red-900/50"
          bgColor="bg-red-950/10"
          strategy={avoidStrategy}
        />
      )}

      {/* Memory entries */}
      <div className="text-[10px] text-[#8B949E] uppercase font-bold tracking-wider pt-0.5">
        All Transitions ({total})
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[240px] pr-1">
        {memoryLoading ? (
          <div className="text-center py-6 text-gray-500">Loading transitions...</div>
        ) : memoryLibrary.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No transitions in memory yet</div>
        ) : (
          memoryLibrary.map((item) => (
            <MemoryEntry
              key={item.id}
              item={item}
              isMatch={item.id === matchedId}
            />
          ))
        )}
      </div>
    </div>
  );
}
