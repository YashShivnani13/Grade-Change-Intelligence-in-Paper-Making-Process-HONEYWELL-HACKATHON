// System Constants & Industrial Configuration

export const GRADE_A = {
  name: "A",
  bw_target: 80.0,
  bw_tolerance_pct: 2.0,
  moisture_target: 6.0,
  moisture_tolerance_pct: 2.0,
  stock_flow_sp: 100.0,
  steam_pressure_sp: 58.0,
  machine_speed_sp: 800.0,
};

export const GRADE_B = {
  name: "B",
  bw_target: 90.0,
  bw_tolerance_pct: 2.0,
  moisture_target: 5.5,
  moisture_tolerance_pct: 2.0,
  stock_flow_sp: 120.0,
  steam_pressure_sp: 68.0,
  machine_speed_sp: 850.0,
};

export const GRADE_SPECS = {
  A: GRADE_A,
  B: GRADE_B,
};

// Instrument Tags (ISA 5.1 Standards)
export const TAGS = {
  BASIS_WEIGHT: "BW-001",
  MOISTURE: "MC-001",
  STOCK_FLOW: "SP-101",
  STEAM_PRESSURE: "SP-201",
  MACHINE_SPEED: "MS-001",
};

export const UNITS = {
  BASIS_WEIGHT: "g/m²",
  MOISTURE: "%",
  STOCK_FLOW: "L/min",
  STEAM_PRESSURE: "kPa",
  MACHINE_SPEED: "m/min",
};

export const THRESHOLDS = {
  DEVIATION_WARNING: 2.0,
  DEVIATION_CRITICAL: 2.5,
  SCAN_INTERVAL: 1.2, // seconds
  BASELINE_STABILIZATION_SECONDS: 585, // 9 min 45 sec baseline
};

// ISA-18.2 Alarm Colors
export const RISK_COLORS = {
  Nominal: {
    bg: "bg-emerald-950/40",
    text: "text-emerald-400",
    border: "border-emerald-800/50",
    badgeBg: "bg-emerald-900/60",
    dot: "#3FB950",
  },
  Warning: {
    bg: "bg-amber-950/50",
    text: "text-amber-400",
    border: "border-amber-700/60",
    badgeBg: "bg-amber-900/70",
    dot: "#D29922",
  },
  Critical: {
    bg: "bg-red-950/60",
    text: "text-red-400",
    border: "border-red-600/80",
    badgeBg: "bg-red-900/80",
    dot: "#F85149",
  },
};
