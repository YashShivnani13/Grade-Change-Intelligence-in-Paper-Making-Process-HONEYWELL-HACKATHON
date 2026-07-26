# =============================================================================
# constants.py — Physical constants, grade specifications, and system thresholds
# Grade Change Intelligence System — Honeywell Hackathon
# =============================================================================

from dataclasses import dataclass, field
from typing import Dict


@dataclass(frozen=True)
class GradeSpec:
    """Immutable specification for a single paper grade."""
    name: str
    bw_target: float        # g/m²
    bw_tolerance_pct: float # ± percentage
    moisture_target: float  # %
    moisture_tolerance_pct: float
    stock_flow_sp: float    # L/min
    steam_pressure_sp: float # kPa
    machine_speed_sp: float  # m/min


# ── Grade Definitions ─────────────────────────────────────────────────────────
GRADE_A = GradeSpec(
    name="A",
    bw_target=80.0,
    bw_tolerance_pct=2.0,
    moisture_target=6.0,
    moisture_tolerance_pct=2.0,
    stock_flow_sp=100.0,
    steam_pressure_sp=58.0,
    machine_speed_sp=800.0,
)

GRADE_B = GradeSpec(
    name="B",
    bw_target=90.0,
    bw_tolerance_pct=2.0,
    moisture_target=5.5,
    moisture_tolerance_pct=2.0,
    stock_flow_sp=120.0,
    steam_pressure_sp=68.0,
    machine_speed_sp=850.0,
)

GRADE_REGISTRY: Dict[str, GradeSpec] = {"A": GRADE_A, "B": GRADE_B}

# ── Simulator Physics ─────────────────────────────────────────────────────────
TRANSPORT_DELAY_STEPS: int = 10      # BW scanner dead-time (seconds)
STEAM_THERMAL_TAU: float = 20.0      # First-order time constant for steam (s)
FLOW_ACTUATOR_TAU: float = 5.0       # First-order time constant for stock flow (s)
SPEED_ACTUATOR_TAU: float = 3.0      # First-order time constant for machine speed (s)

MAX_STEAM_RAMP_RATE: float = 2.0     # kPa per second
MAX_FLOW_RAMP_RATE: float = 3.0      # L/min per second
MAX_SPEED_RAMP_RATE: float = 5.0     # m/min per second

SCAN_INTERVAL_SECONDS: float = 1.2   # Quality scanner cycle time (s)

# Gaussian noise sigma as % of nominal value
BW_NOISE_SIGMA: float = 0.05
MOISTURE_NOISE_SIGMA: float = 0.03
FLOW_NOISE_SIGMA: float = 0.02
STEAM_NOISE_SIGMA: float = 0.015

# ── Coupling Coefficients ─────────────────────────────────────────────────────
# BW = K_flow * pv_flow / pv_speed  (normalized around Grade A)
BW_FLOW_GAIN: float = 0.72
BW_SPEED_GAIN: float = -0.28

# Moisture = K_bw * pv_bw - K_steam * pv_steam  (affine model)
MOISTURE_BW_GAIN: float = 0.04
MOISTURE_STEAM_GAIN: float = 0.055
MOISTURE_BIAS: float = 6.10

# ── Disturbance Parameters ────────────────────────────────────────────────────
CONSISTENCY_DISTURBANCE_MAGNITUDE: float = -0.08
CONSISTENCY_DISTURBANCE_DURATION_STEPS: int = 60
FELT_DEGRADATION_RATE: float = 0.0002  # per step, slow drift

# ── Risk Thresholds ───────────────────────────────────────────────────────────
DEVIATION_ADVISORY_PCT: float = 1.5    # Informational
DEVIATION_WARNING_PCT: float = 2.0     # Warning — action recommended
DEVIATION_CRITICAL_PCT: float = 2.5    # Critical — immediate action required
TREND_HORIZON_SECONDS: int = 15        # Window for linear trend extrapolation
BREACH_PREDICTION_HORIZON_SECONDS: int = 30  # Predict breach this far ahead

# ── Learning Loop ─────────────────────────────────────────────────────────────
CONFIDENCE_ACCEPT_SUCCESS_DELTA: float = 0.05
CONFIDENCE_ACCEPT_FAIL_DELTA: float = -0.10
CONFIDENCE_REJECT_DELTA: float = -0.05
CONFIDENCE_MIN: float = 0.05
CONFIDENCE_MAX: float = 1.00
OUTCOME_EVALUATION_WINDOW_SECONDS: int = 90  # Based on max process dead-time

# ── Instrument Tags ───────────────────────────────────────────────────────────
TAG_BASIS_WEIGHT = "BW-001"
TAG_MOISTURE = "MC-001"
TAG_STOCK_FLOW = "SP-101"
TAG_STEAM_PRESSURE = "SP-201"
TAG_MACHINE_SPEED = "MS-001"

# ── Baseline KPI (pre-system historical average) ──────────────────────────────
BASELINE_STABILIZATION_SECONDS: int = 585  # 9 minutes 45 seconds
