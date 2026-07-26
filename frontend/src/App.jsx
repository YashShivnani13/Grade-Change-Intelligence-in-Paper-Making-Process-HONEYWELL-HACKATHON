import React from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Header } from './components/layout/Header';
import { ProcessFlowDiagram } from './components/process/ProcessFlowDiagram';
import { AlarmTicker } from './components/layout/AlarmTicker';
import { TransitionPhaseBar } from './components/layout/TransitionPhaseBar';
import { SummaryCards } from './components/telemetry/SummaryCards';
import { QualityOutputChart } from './components/telemetry/QualityOutputChart';
import { ControlLeverChart } from './components/telemetry/ControlLeverChart';
import { AdvisoryPanel } from './components/advisory/AdvisoryPanel';
import { BusinessImpactFooter } from './components/layout/BusinessImpactFooter';

export default function App() {
  // Connect to backend WebSocket telemetry stream
  useWebSocket();

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0D1117] text-[#E6EDF3] overflow-hidden select-none font-sans">
      {/* BAND 1 — Header Bar */}
      <Header />

      {/* PROCESS FLOW DIAGRAM (PFD) */}
      <ProcessFlowDiagram />

      {/* ALARM TICKER BANNER (Collapsible) */}
      <AlarmTicker />

      {/* TRANSITION PHASE PROGRESS BAR */}
      <TransitionPhaseBar />

      {/* BAND 2 — KPI SUMMARY CARDS */}
      <SummaryCards />

      {/* BAND 3 — MAIN CONTENT AREA (Left 70% Telemetry, Right 30% Advisory) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2 gap-2 min-h-0">
        {/* LEFT COLUMN (70%): Quality Output Chart + Control Lever Chart */}
        <div className="flex-1 flex flex-col gap-2 h-full overflow-hidden">
          <div className="flex-1 min-h-0">
            <QualityOutputChart />
          </div>
          <div className="flex-1 min-h-0">
            <ControlLeverChart />
          </div>
        </div>

        {/* RIGHT COLUMN (30%): Advisory Engine Panel */}
        <AdvisoryPanel />
      </div>

      {/* BAND 4 — BUSINESS IMPACT FOOTER BAR */}
      <BusinessImpactFooter />
    </div>
  );
}
