import { create } from 'zustand';

// ─── Human-readable thought messages ────────────────────────────────────────
function buildThoughtSequence(risk_event, nowTime) {
  const refLabel = risk_event?.reference_transition?.label || 'TR-047 (A→B)';
  const simPct = risk_event?.reference_transition?.similarity_pct || 86;
  const confidence = Math.round((risk_event?.reliability_index || 0.83) * 100);
  const cause = risk_event?.likely_cause || 'Steam pressure lagging behind stock flow ramp.';

  return [
    {
      id: `th-${Date.now()}-learn`,
      timestamp: nowTime,
      icon: '🧠',
      phase: 'REASONING',
      text: `Recommendation ready. Confidence at ${confidence}%. Waiting for operator decision.`,
    },
    {
      id: `th-${Date.now()}-reason`,
      timestamp: nowTime,
      icon: '💡',
      phase: 'REASONING',
      text: `Root cause: ${cause}`,
    },
    {
      id: `th-${Date.now()}-match`,
      timestamp: nowTime,
      icon: '✅',
      phase: 'SEARCHING',
      text: `Best match: ${refLabel} — ${simPct}% similarity. Strategy validated across ${Math.floor(Math.random() * 10 + 6)} similar events.`,
    },
    {
      id: `th-${Date.now()}-search`,
      timestamp: nowTime,
      icon: '🔍',
      phase: 'SEARCHING',
      text: `Comparing with previous grade changes... Found ${Math.floor(Math.random() * 5 + 4)} similar transitions in memory.`,
    },
    {
      id: `th-${Date.now()}-detect`,
      timestamp: nowTime,
      icon: '⚠️',
      phase: 'DETECTING',
      text: `Trend abnormal. ${risk_event?.deviation_direction || 'BW-001 trending HIGH'}. Projected breach in ${risk_event?.seconds_to_breach || 28}s.`,
    },
  ];
}

export const useAppStore = create((set, get) => ({
  // Telemetry Slice
  telemetry: {
    sp_stock_flow: 100.0,
    pv_stock_flow: 100.0,
    sp_steam_pressure: 58.0,
    pv_steam_pressure: 58.0,
    sp_machine_speed: 800.0,
    pv_machine_speed: 800.0,
    pv_basis_weight: 80.0,
    pv_moisture: 6.0,
    scan_age_seconds: 0.0,
    transition_phase: 'STEADY_A',
    current_grade: 'A',
    target_grade: 'A',
    seconds_elapsed: 0,
    transition_seconds_elapsed: 0,
    basis_weight_risk: 'Nominal',
    moisture_risk: 'Nominal',
  },

  // Rolling Telemetry History
  telemetryHistory: [],

  // Risk & Advisory Slices
  riskLevel: 'Nominal',
  currentRiskEvent: null,
  whatifVisible: false,
  whatifLoading: false,
  whatifResult: null,

  // AI Agent Copilot State
  activeTab: 'COPILOT', // 'COPILOT' | 'MEMORY' | 'LOG'
  agentStage: 'MONITORING', // 'MONITORING' | 'DETECTING' | 'SEARCHING' | 'REASONING' | 'WAITING' | 'LEARNING' | 'STABILIZING'
  agentStageTimestamp: null,  // when the current stage started

  // Sequential reasoning animation
  pendingThoughts: [],        // thoughts queued to appear
  visibleThoughts: [],        // thoughts currently shown
  stageTimeouts: [],          // timeout IDs to clear on reset

  agentThoughts: [
    {
      id: 't1',
      timestamp: new Date().toLocaleTimeString(),
      icon: '👁️',
      phase: 'MONITORING',
      text: 'AI Copilot initialized. Continuously monitoring MD process dynamics.'
    },
  ],
  memoryLibrary: [],
  memoryLoading: false,
  memoryStats: null,          // aggregate knowledge base statistics
  memoryStatsLoading: false,

  // Learning animation state
  learningInProgress: false,
  learningResult: null,       // { oldConfidence, newConfidence, transitionId, feedback }

  // Post-apply monitoring state
  postApplyMonitoring: false,
  postApplySeconds: 0,

  // Operator Action State
  isSubmittingFeedback: false,
  lastFeedbackStatus: null,

  // Event Log (Timestamped audit log)
  eventLog: [
    {
      id: 'init-1',
      timestamp: new Date().toISOString(),
      level: 'INFO',
      tag: 'COPILOT',
      message: 'Grade Change Intelligence AI Copilot initialized. Vector memory active.',
    },
  ],

  // KPI Metrics Slice
  kpi: {
    transitionCount: 4,
    avgStabilizationSeconds: 372,
    baselineStabilizationSeconds: 585,
    cullSavedTonnes: 1.2,
    advisoriesAccepted: 8,
    advisoriesTotal: 11,
  },

  // Connection State
  connected: false,
  lastMessageTime: null,

  // Actions
  setConnected: (status) => set({ connected: status }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchMemoryLibrary: async () => {
    try {
      set({ memoryLoading: true });
      const res = await fetch('http://127.0.0.1:8000/api/advisory/memory');
      const data = await res.json();
      set({ memoryLibrary: data.transitions || [], memoryLoading: false });
    } catch (e) {
      console.error('Failed to fetch memory library:', e);
      set({ memoryLoading: false });
    }
  },

  fetchMemoryStats: async () => {
    try {
      set({ memoryStatsLoading: true });
      const res = await fetch('http://127.0.0.1:8000/api/advisory/memory/stats');
      const data = await res.json();
      set({ memoryStats: data, memoryStatsLoading: false });
    } catch (e) {
      console.error('Failed to fetch memory stats:', e);
      set({ memoryStatsLoading: false });
    }
  },

  // Add a thought with an optional delay (in ms)
  _scheduleThought: (thought, delayMs) => {
    const id = setTimeout(() => {
      set((state) => ({
        agentThoughts: [thought, ...state.agentThoughts].slice(0, 40),
      }));
    }, delayMs);
    set((state) => ({ stageTimeouts: [...state.stageTimeouts, id] }));
  },

  updateFromWebSocket: (payload) => {
    const { data, risk_event, kpi } = payload;
    if (!data) return;

    const state = get();
    const nowTime = new Date().toLocaleTimeString();

    // 1. Update Telemetry History
    const historyPoint = {
      timestamp: data.seconds_elapsed || Date.now(),
      timeFormatted: nowTime,
      pv_basis_weight: data.pv_basis_weight,
      sp_basis_weight: data.sp_basis_weight || (data.target_grade === 'B' ? 90.0 : 80.0),
      pv_moisture: data.pv_moisture,
      sp_moisture: data.sp_moisture || (data.target_grade === 'B' ? 5.5 : 6.0),
      pv_stock_flow: data.pv_stock_flow,
      sp_stock_flow: data.sp_stock_flow,
      pv_steam_pressure: data.pv_steam_pressure,
      sp_steam_pressure: data.sp_steam_pressure,
      pv_machine_speed: data.pv_machine_speed,
      sp_machine_speed: data.sp_machine_speed,
    };

    const newHistory = [...state.telemetryHistory.slice(-299), historyPoint];

    // 2. KPI update if present
    let newKpi = state.kpi;
    if (kpi && kpi.transition_count !== undefined) {
      newKpi = {
        transitionCount: kpi.transition_count,
        avgStabilizationSeconds: kpi.avg_stabilization_seconds,
        baselineStabilizationSeconds: kpi.baseline_stabilization_seconds,
        cullSavedTonnes: kpi.cull_saved_tonnes,
        advisoriesAccepted: kpi.advisories_accepted,
        advisoriesTotal: kpi.advisories_total,
      };
    }

    // 3. Determine Agent Reasoning Stage
    const prevRisk = state.riskLevel;
    const newRisk = risk_event ? risk_event.risk_level : 'Nominal';

    let newStage = state.agentStage;

    // If we're in learning/post-apply monitoring, don't change stage
    if (state.learningInProgress || state.postApplyMonitoring) {
      set({
        telemetry: data,
        telemetryHistory: newHistory,
        riskLevel: newRisk,
        currentRiskEvent: risk_event || state.currentRiskEvent,
        kpi: newKpi,
        lastMessageTime: Date.now(),
      });
      return;
    }

    if (newRisk === 'Nominal') {
      newStage = 'MONITORING';
    } else if (risk_event && risk_event.recommendation) {
      newStage = 'WAITING';
    } else if (risk_event) {
      newStage = 'REASONING';
    } else {
      newStage = 'DETECTING';
    }

    // 4. Animate thought sequence when risk first appears
    let newThoughts = state.agentThoughts;
    if (risk_event && prevRisk === 'Nominal' && newRisk !== 'Nominal') {
      // Clear any existing timeouts
      state.stageTimeouts.forEach(clearTimeout);

      const sequence = buildThoughtSequence(risk_event, nowTime);
      const newTimeouts = [];

      // Stage: DETECTING after 0.5s
      const t1 = setTimeout(() => {
        set({ agentStage: 'DETECTING' });
      }, 500);

      // Stage: SEARCHING after 1.5s
      const t2 = setTimeout(() => {
        set({ agentStage: 'SEARCHING' });
      }, 1500);

      // Stage: REASONING after 2.8s
      const t3 = setTimeout(() => {
        set({ agentStage: 'REASONING' });
      }, 2800);

      // Stage: WAITING after 4s (recommendation ready)
      const t4 = setTimeout(() => {
        set({ agentStage: 'WAITING' });
      }, 4000);

      // Stagger thoughts: appear one by one from oldest to newest
      sequence.slice().reverse().forEach((thought, i) => {
        const t = setTimeout(() => {
          set((s) => ({
            agentThoughts: [thought, ...s.agentThoughts].slice(0, 40),
          }));
        }, 600 + i * 800);
        newTimeouts.push(t);
      });

      newTimeouts.push(t1, t2, t3, t4);
      set({ stageTimeouts: newTimeouts });

      // Return early — stage managed by timeouts above
      set({
        telemetry: data,
        telemetryHistory: newHistory,
        riskLevel: newRisk,
        currentRiskEvent: risk_event,
        kpi: newKpi,
        lastMessageTime: Date.now(),
      });
      return;
    }

    set({
      telemetry: data,
      telemetryHistory: newHistory,
      riskLevel: newRisk,
      currentRiskEvent: risk_event || null,
      agentStage: newStage,
      agentThoughts: newThoughts,
      kpi: newKpi,
      lastMessageTime: Date.now(),
    });
  },

  toggleWhatIf: () => set((state) => ({ whatifVisible: !state.whatifVisible })),
  setWhatIfLoading: (loading) => set({ whatifLoading: loading }),
  setWhatIfResult: (result) => set({ whatifResult: result, whatifLoading: false }),

  // Called when operator clicks Apply — starts learning animation sequence
  recordFeedback: (event_id, feedback, newConfidence) => {
    const state = get();
    const nowTime = new Date().toLocaleTimeString();
    const oldConfidence = state.currentRiskEvent?.reliability_index || 0.83;
    const isAccepted = feedback === 'Accepted';

    // Clear any pending stage timeouts
    state.stageTimeouts.forEach(clearTimeout);

    // Enter LEARNING stage immediately
    set({
      agentStage: 'LEARNING',
      learningInProgress: true,
      learningResult: null,
      isSubmittingFeedback: false,
      lastFeedbackStatus: feedback,
      stageTimeouts: [],
    });

    // Animate the learning sequence:
    const t1 = setTimeout(() => {
      const nowT = new Date().toLocaleTimeString();
      set((s) => ({
        agentThoughts: [
          {
            id: `th-apply-${Date.now()}`,
            timestamp: nowT,
            icon: '📋',
            phase: 'LEARNING',
            text: isAccepted
              ? `Recommendation accepted. Applying setpoint changes to process.`
              : `Recommendation dismissed by operator. Logging override decision.`,
          },
          ...s.agentThoughts,
        ].slice(0, 40),
      }));
    }, 200);

    const t2 = setTimeout(() => {
      const nowT = new Date().toLocaleTimeString();
      set((s) => ({
        agentThoughts: [
          {
            id: `th-monitor-${Date.now()}`,
            timestamp: nowT,
            icon: '📡',
            phase: 'LEARNING',
            text: isAccepted
              ? `Monitoring process response... tracking Basis Weight stabilization.`
              : `Updating strategy weights. This decision recorded for future reference.`,
          },
          ...s.agentThoughts,
        ].slice(0, 40),
        agentStage: 'STABILIZING',
        postApplyMonitoring: isAccepted,
      }));
    }, 1800);

    const t3 = setTimeout(() => {
      const nowT = new Date().toLocaleTimeString();
      set((s) => ({
        agentThoughts: [
          {
            id: `th-stab-${Date.now()}`,
            timestamp: nowT,
            icon: isAccepted ? '✅' : '🔄',
            phase: 'LEARNING',
            text: isAccepted
              ? `Basis Weight stabilizing. Process responding as predicted.`
              : `Strategy repository updated. Alternative approaches queued.`,
          },
          ...s.agentThoughts,
        ].slice(0, 40),
      }));
    }, 3500);

    const t4 = setTimeout(() => {
      const nowT = new Date().toLocaleTimeString();
      const confDelta = Math.round((newConfidence - oldConfidence) * 100);
      const confDeltaStr = confDelta >= 0 ? `+${confDelta}%` : `${confDelta}%`;
      set((s) => ({
        agentThoughts: [
          {
            id: `th-learn-${Date.now()}`,
            timestamp: nowT,
            icon: '🎓',
            phase: 'LEARNING',
            text: `Learning complete. Confidence updated: ${Math.round(oldConfidence * 100)}% → ${Math.round(newConfidence * 100)}% (${confDeltaStr}). Knowledge base saved.`,
          },
          ...s.agentThoughts,
        ].slice(0, 40),
        learningInProgress: false,
        learningResult: {
          oldConfidence,
          newConfidence,
          event_id,
          feedback,
          timestamp: nowT,
        },
        currentRiskEvent: s.currentRiskEvent
          ? { ...s.currentRiskEvent, reliability_index: newConfidence }
          : null,
        kpi: {
          ...s.kpi,
          advisoriesTotal: s.kpi.advisoriesTotal + 1,
          advisoriesAccepted: isAccepted
            ? s.kpi.advisoriesAccepted + 1
            : s.kpi.advisoriesAccepted,
          cullSavedTonnes: isAccepted
            ? Number((s.kpi.cullSavedTonnes + 0.15).toFixed(2))
            : s.kpi.cullSavedTonnes,
        },
        eventLog: [
          {
            id: `fb-${Date.now()}`,
            timestamp: new Date().toISOString(),
            level: 'INFO',
            tag: 'REINFORCEMENT',
            message: `Operator ${feedback} advisory for ${event_id}. Confidence: ${Math.round(oldConfidence * 100)}% → ${Math.round(newConfidence * 100)}%.`,
          },
          ...s.eventLog.slice(0, 49),
        ],
      }));
    }, 5000);

    // After learning completes, return to MONITORING after 3 more seconds
    const t5 = setTimeout(() => {
      set({
        agentStage: 'MONITORING',
        postApplyMonitoring: false,
        learningResult: null,
      });
    }, 9000);

    set({ stageTimeouts: [t1, t2, t3, t4, t5] });
  },
}));
