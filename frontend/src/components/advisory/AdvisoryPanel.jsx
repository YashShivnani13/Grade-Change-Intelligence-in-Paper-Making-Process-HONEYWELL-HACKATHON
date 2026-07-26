import React from 'react';
import { useAppStore } from '../../store/appStore';
import { ReasoningTimeline } from './ReasoningTimeline';
import { AgentThoughtStream } from './AgentThoughtStream';
import { DiagnosisBlock } from './DiagnosisBlock';
import { RecommendationCard } from './RecommendationCard';
import { WhatIfPanel } from './WhatIfPanel';
import { TransitionMemoryLibrary } from './TransitionMemoryLibrary';
import { EventLog } from './EventLog';
import { Bot, Database, ListFilter, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';

export function AdvisoryPanel() {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const riskLevel = useAppStore((state) => state.riskLevel);
  const currentRiskEvent = useAppStore((state) => state.currentRiskEvent);

  const isNominal = riskLevel === 'Nominal';
  const isWarning = riskLevel === 'Warning';
  const isCritical = riskLevel === 'Critical';

  return (
    <aside className="w-full lg:w-[32%] flex flex-col space-y-2 p-2 bg-[#0D1117] border-l border-[#30363D] overflow-y-auto h-full select-none">
      {/* Risk Status Header Badge */}
      <div
        className={`p-2.5 rounded border flex items-center justify-between font-mono transition-all ${
          isCritical
            ? 'bg-red-950/80 border-red-600 text-red-200 shadow-[0_0_15px_rgba(248,51,73,0.3)] animate-pulse-subtle'
            : isWarning
            ? 'bg-amber-950/70 border-amber-600 text-amber-200'
            : 'bg-[#161B22] border-[#30363D] text-emerald-400'
        }`}
      >
        <div className="flex items-center space-x-2">
          {isCritical ? (
            <AlertCircle className="w-5 h-5 text-red-400 animate-bounce" />
          ) : isWarning ? (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          ) : (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          )}
          <div>
            <div className="font-extrabold text-xs tracking-wider uppercase">
              {isCritical ? 'CRITICAL DEVIATION RISK' : isWarning ? 'WARNING — RISK DETECTED' : 'SYSTEM NOMINAL'}
            </div>
            <div className="text-[10px] opacity-80">
              {isNominal
                ? 'MD Control Active. Parameters within safe corridor.'
                : `Projected breach in ${currentRiskEvent?.seconds_to_breach || 28}s`}
            </div>
          </div>
        </div>

        <span className="text-[10px] bg-[#0D1117] px-2 py-0.5 rounded border border-current font-bold uppercase">
          {riskLevel}
        </span>
      </div>

      {/* Navigation Tabs (Copilot Agent / AI Memory / Audit Log) */}
      <div className="grid grid-cols-3 gap-1 font-mono text-[11px] font-bold">
        <button
          onClick={() => setActiveTab('COPILOT')}
          className={`flex items-center justify-center space-x-1 py-1.5 rounded border transition ${
            activeTab === 'COPILOT'
              ? 'bg-[#58A6FF]/20 text-[#58A6FF] border-[#58A6FF] shadow-[0_0_8px_rgba(88,166,255,0.3)]'
              : 'bg-[#161B22] text-gray-400 border-[#30363D] hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>COPILOT</span>
        </button>

        <button
          onClick={() => setActiveTab('MEMORY')}
          className={`flex items-center justify-center space-x-1 py-1.5 rounded border transition ${
            activeTab === 'MEMORY'
              ? 'bg-[#58A6FF]/20 text-[#58A6FF] border-[#58A6FF] shadow-[0_0_8px_rgba(88,166,255,0.3)]'
              : 'bg-[#161B22] text-gray-400 border-[#30363D] hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>AI MEMORY</span>
        </button>

        <button
          onClick={() => setActiveTab('LOG')}
          className={`flex items-center justify-center space-x-1 py-1.5 rounded border transition ${
            activeTab === 'LOG'
              ? 'bg-[#58A6FF]/20 text-[#58A6FF] border-[#58A6FF] shadow-[0_0_8px_rgba(88,166,255,0.3)]'
              : 'bg-[#161B22] text-gray-400 border-[#30363D] hover:text-white'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>LOG</span>
        </button>
      </div>

      {/* TAB CONTENT 1: COPILOT AGENT */}
      {activeTab === 'COPILOT' && (
        <div className="space-y-2 flex-1 overflow-y-auto">
          {/* 6-Stage Reasoning Timeline */}
          <ReasoningTimeline />

          {/* Live Agent Thought Stream */}
          <AgentThoughtStream />

          {/* Diagnosis & Recommendation Cards when Risk Active */}
          {!isNominal && currentRiskEvent && (
            <>
              <DiagnosisBlock />
              <RecommendationCard />
              <WhatIfPanel />
            </>
          )}

          {/* Nominal Status Prompt */}
          {isNominal && (
            <div className="bg-[#161B22] border border-[#30363D] rounded p-4 text-center space-y-2 my-2 font-mono">
              <Bot className="w-8 h-8 text-[#58A6FF] mx-auto opacity-80 animate-pulse" />
              <div className="text-xs text-gray-200 font-bold">AI Copilot Actively Monitoring</div>
              <div className="text-[10px] text-[#8B949E] leading-relaxed font-sans">
                MD Multivariable Control is holding quality parameters within dead-band limits. Click <strong>[Disturbance]</strong> above to test AI anomaly detection and reasoning.
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: AI MEMORY LIBRARY */}
      {activeTab === 'MEMORY' && <TransitionMemoryLibrary />}

      {/* TAB CONTENT 3: AUDIT LOG */}
      {activeTab === 'LOG' && <EventLog />}
    </aside>
  );
}
