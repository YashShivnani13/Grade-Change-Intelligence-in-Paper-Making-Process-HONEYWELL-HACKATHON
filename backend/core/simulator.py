# =============================================================================
# simulator.py — Physics engine: FOPDT lags, transport delay, state machine
# Grade Change Intelligence System — Honeywell Hackathon
# =============================================================================

import logging
import math
import random
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Deque, Dict, Optional

from models.constants import (
    BW_FLOW_GAIN,
    BW_NOISE_SIGMA,
    BW_SPEED_GAIN,
    CONSISTENCY_DISTURBANCE_DURATION_STEPS,
    CONSISTENCY_DISTURBANCE_MAGNITUDE,
    DEVIATION_WARNING_PCT,
    FELT_DEGRADATION_RATE,
    FLOW_ACTUATOR_TAU,
    FLOW_NOISE_SIGMA,
    GRADE_REGISTRY,
    GradeSpec,
    MAX_FLOW_RAMP_RATE,
    MAX_SPEED_RAMP_RATE,
    MAX_STEAM_RAMP_RATE,
    MOISTURE_BIAS,
    MOISTURE_BW_GAIN,
    MOISTURE_NOISE_SIGMA,
    MOISTURE_STEAM_GAIN,
    SCAN_INTERVAL_SECONDS,
    SPEED_ACTUATOR_TAU,
    STEAM_NOISE_SIGMA,
    STEAM_THERMAL_TAU,
    TRANSPORT_DELAY_STEPS,
)

logger = logging.getLogger(__name__)
DT: float = 1.0  # Simulation timestep in seconds


class TransitionPhase(str, Enum):
    STEADY_A = "STEADY_A"
    RAMPING = "RAMPING"
    STABILIZING = "STABILIZING"
    STEADY_B = "STEADY_B"


@dataclass
class SimulatorState:
    # Setpoints (commanded by APC or operator)
    sp_stock_flow: float = 100.0
    sp_steam_pressure: float = 58.0
    sp_machine_speed: float = 800.0

    # Process variables (actual sensor/actuator readings)
    pv_stock_flow: float = 100.0
    pv_steam_pressure: float = 58.0
    pv_machine_speed: float = 800.0
    pv_basis_weight: float = 80.0
    pv_moisture: float = 6.0

    # Internal — ring buffer for transport delay
    bw_ring_buffer: Deque[float] = field(
        default_factory=lambda: deque([80.0] * TRANSPORT_DELAY_STEPS,
                                      maxlen=TRANSPORT_DELAY_STEPS)
    )

    # Hidden disturbance factors
    consistency_modifier: float = 0.0
    disturbance_steps_remaining: int = 0
    felt_efficiency: float = 1.0      # Degrades slowly over time

    # Transition tracking
    transition_phase: TransitionPhase = TransitionPhase.STEADY_A
    current_grade: str = "A"
    target_grade: str = "A"
    seconds_elapsed: int = 0
    transition_seconds_elapsed: int = 0

    # Scanner timing
    scan_age_seconds: float = 0.0

    # Per-variable risk flags
    basis_weight_risk: str = "Nominal"
    moisture_risk: str = "Nominal"


class Simulator:
    """
    Paper machine grade-change physics simulator.

    Models the coupled MIMO process of basis weight and moisture response
    to stock flow, steam pressure, and machine speed setpoint changes,
    including transport delay, thermal inertia, and hidden disturbances.
    """

    def __init__(self, starting_grade: str = "A") -> None:
        self._state = SimulatorState()
        self._target_spec: GradeSpec = GRADE_REGISTRY[starting_grade]
        self._current_spec: GradeSpec = GRADE_REGISTRY[starting_grade]
        self._initialize_to_grade(starting_grade)
        logger.info("Simulator initialized at Grade %s steady state.", starting_grade)

    # ── Public interface ──────────────────────────────────────────────────────

    def step(self) -> Dict[str, Any]:
        """Advance simulation by one timestep (DT seconds). Returns full state snapshot."""
        s = self._state

        # 1. Apply ramp-rate limits to SP changes
        s.sp_stock_flow = self._ramp_sp(
            s.sp_stock_flow, self._target_spec.stock_flow_sp, MAX_FLOW_RAMP_RATE
        )
        s.sp_steam_pressure = self._ramp_sp(
            s.sp_steam_pressure, self._target_spec.steam_pressure_sp, MAX_STEAM_RAMP_RATE
        )
        s.sp_machine_speed = self._ramp_sp(
            s.sp_machine_speed, self._target_spec.machine_speed_sp, MAX_SPEED_RAMP_RATE
        )

        # 2. Apply first-order lag (FOPDT) to actuators
        s.pv_stock_flow = self._fopdt(s.pv_stock_flow, s.sp_stock_flow, FLOW_ACTUATOR_TAU)
        s.pv_steam_pressure = self._fopdt(s.pv_steam_pressure, s.sp_steam_pressure, STEAM_THERMAL_TAU)
        s.pv_machine_speed = self._fopdt(s.pv_machine_speed, s.sp_machine_speed, SPEED_ACTUATOR_TAU)

        # 3. Add measurement noise to PVs
        s.pv_stock_flow += self._noise(s.pv_stock_flow, FLOW_NOISE_SIGMA)
        s.pv_steam_pressure += self._noise(s.pv_steam_pressure, STEAM_NOISE_SIGMA)

        # 4. Compute raw BW at wet-end (before transport delay)
        bw_nominal = self._current_spec.bw_target
        spd_nominal = self._current_spec.machine_speed_sp
        flow_nominal = self._current_spec.stock_flow_sp

        bw_raw = (
            bw_nominal
            + BW_FLOW_GAIN * (s.pv_stock_flow - flow_nominal)
            + BW_SPEED_GAIN * (s.pv_machine_speed - spd_nominal)
            + s.consistency_modifier * bw_nominal
            + s.consistency_modifier * (1.0 - s.felt_efficiency) * bw_nominal
        )
        bw_raw += self._noise(bw_raw, BW_NOISE_SIGMA)

        # 5. Push raw BW into ring buffer (transport delay)
        s.bw_ring_buffer.appendleft(bw_raw)

        # 6. Read delayed BW from tail of ring buffer
        s.pv_basis_weight = s.bw_ring_buffer[-1]

        # 7. Compute moisture (coupled to BW and steam)
        moisture_raw = (
            MOISTURE_BIAS
            + MOISTURE_BW_GAIN * (s.pv_basis_weight - 80.0)
            - MOISTURE_STEAM_GAIN * (s.pv_steam_pressure - 58.0)
        )
        moisture_raw += self._noise(moisture_raw, MOISTURE_NOISE_SIGMA)
        s.pv_moisture = max(1.0, min(15.0, moisture_raw))

        # 8. Update disturbance counters
        if s.disturbance_steps_remaining > 0:
            s.disturbance_steps_remaining -= 1
            if s.disturbance_steps_remaining == 0:
                s.consistency_modifier = 0.0
                logger.info("Disturbance cleared.")

        # 9. Felt degradation (slow background drift)
        s.felt_efficiency = max(0.85, s.felt_efficiency - FELT_DEGRADATION_RATE)

        # 10. Update scanner age
        s.scan_age_seconds = (s.scan_age_seconds + DT) % SCAN_INTERVAL_SECONDS

        # 11. Update transition phase
        self._update_transition_phase()

        # 12. Update per-variable risk flags
        s.basis_weight_risk = self._compute_risk(
            s.pv_basis_weight, self._target_spec.bw_target
        )
        s.moisture_risk = self._compute_risk(
            s.pv_moisture, self._target_spec.moisture_target
        )

        # 13. Increment counters
        s.seconds_elapsed += 1
        if s.transition_phase in (TransitionPhase.RAMPING, TransitionPhase.STABILIZING):
            s.transition_seconds_elapsed += 1

        return self._snapshot()

    def apply_command(self, action: str, params: Dict[str, Any]) -> str:
        """Apply an external command to the simulator."""
        s = self._state
        handlers = {
            "grade_change": self._cmd_grade_change,
            "inject_disturbance": self._cmd_inject_disturbance,
            "apply_advisory": self._cmd_apply_advisory,
            "bad_operator": self._cmd_bad_operator,
            "reset": self._cmd_reset,
        }
        if action not in handlers:
            return f"Unknown action: {action}"
        return handlers[action](params)

    def get_state(self) -> Dict[str, Any]:
        return self._snapshot()

    # ── Commands ──────────────────────────────────────────────────────────────

    def _cmd_grade_change(self, params: Dict[str, Any]) -> str:
        from_grade = params.get("from_grade", "A")
        to_grade = params.get("to_grade", "B")
        if to_grade not in GRADE_REGISTRY:
            return f"Unknown grade: {to_grade}"
        self._target_spec = GRADE_REGISTRY[to_grade]
        self._state.target_grade = to_grade
        self._state.transition_phase = TransitionPhase.RAMPING
        self._state.transition_seconds_elapsed = 0
        msg = f"Grade Change Initiated: Grade {from_grade} → Grade {to_grade}"
        logger.info(msg)
        return msg

    def _cmd_inject_disturbance(self, params: Dict[str, Any]) -> str:
        self._state.consistency_modifier = CONSISTENCY_DISTURBANCE_MAGNITUDE
        self._state.disturbance_steps_remaining = CONSISTENCY_DISTURBANCE_DURATION_STEPS
        logger.warning("Consistency disturbance injected.")
        return "Disturbance injected: pulp consistency drop active for 60s."

    def _cmd_apply_advisory(self, params: Dict[str, Any]) -> str:
        delta_steam = float(params.get("delta_steam", 0.0))
        delta_flow = float(params.get("delta_flow", 0.0))
        # Clamp to rate limits: max single-step delta is 5× the per-second limit
        delta_steam = max(-10.0, min(10.0, delta_steam))
        delta_flow = max(-15.0, min(15.0, delta_flow))
        self._state.sp_steam_pressure += delta_steam
        self._state.sp_stock_flow += delta_flow
        msg = f"Advisory Applied: ΔFlow={delta_flow:+.1f} L/min, ΔSteam={delta_steam:+.1f} kPa"
        logger.info(msg)
        return msg

    def _cmd_bad_operator(self, params: Dict[str, Any]) -> str:
        self._state.sp_steam_pressure = max(
            40.0, self._state.sp_steam_pressure - 10.0
        )
        logger.warning("Bad operator action: steam pressure dropped by 10 kPa.")
        return "Bad operator action simulated: SP steam dropped 10 kPa."

    def _cmd_reset(self, params: Dict[str, Any]) -> str:
        self._initialize_to_grade("A")
        logger.info("Simulator reset to Grade A.")
        return "Simulator reset to Grade A steady state."

    # ── Physics helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _fopdt(pv: float, sp: float, tau: float) -> float:
        """First-order plus dead time response: dy/dt = (sp - pv) / tau"""
        return pv + (DT / tau) * (sp - pv)

    @staticmethod
    def _ramp_sp(current_sp: float, target_sp: float, max_rate: float) -> float:
        """Apply rate-of-change limit to a setpoint transition."""
        delta = target_sp - current_sp
        max_delta = max_rate * DT
        return current_sp + max(-max_delta, min(max_delta, delta))

    @staticmethod
    def _noise(value: float, sigma_pct: float) -> float:
        return random.gauss(0.0, abs(value) * sigma_pct)

    @staticmethod
    def _compute_risk(pv: float, target: float) -> str:
        if target == 0:
            return "Nominal"
        dev_pct = abs((pv - target) / target) * 100.0
        if dev_pct >= 2.5:
            return "Critical"
        if dev_pct >= 2.0:
            return "Warning"
        return "Nominal"

    def _update_transition_phase(self) -> None:
        s = self._state
        if s.transition_phase == TransitionPhase.STEADY_A:
            return

        target = self._target_spec
        bw_dev = abs((s.pv_basis_weight - target.bw_target) / target.bw_target) * 100.0
        mc_dev = abs((s.pv_moisture - target.moisture_target) / target.moisture_target) * 100.0

        sp_reached = (
            abs(s.sp_stock_flow - target.stock_flow_sp) < 0.5
            and abs(s.sp_steam_pressure - target.steam_pressure_sp) < 0.5
        )

        if sp_reached and s.transition_phase == TransitionPhase.RAMPING:
            s.transition_phase = TransitionPhase.STABILIZING
            s.current_grade = s.target_grade
            self._current_spec = self._target_spec

        if (
            s.transition_phase == TransitionPhase.STABILIZING
            and bw_dev < DEVIATION_WARNING_PCT
            and mc_dev < DEVIATION_WARNING_PCT
        ):
            s.transition_phase = TransitionPhase.STEADY_B
            logger.info("Stabilization achieved at Grade %s.", s.target_grade)

    def _initialize_to_grade(self, grade: str) -> None:
        spec = GRADE_REGISTRY[grade]
        self._current_spec = spec
        self._target_spec = spec
        s = self._state
        s.sp_stock_flow = spec.stock_flow_sp
        s.pv_stock_flow = spec.stock_flow_sp
        s.sp_steam_pressure = spec.steam_pressure_sp
        s.pv_steam_pressure = spec.steam_pressure_sp
        s.sp_machine_speed = spec.machine_speed_sp
        s.pv_machine_speed = spec.machine_speed_sp
        s.pv_basis_weight = spec.bw_target
        s.pv_moisture = spec.moisture_target
        s.bw_ring_buffer = deque(
            [spec.bw_target] * TRANSPORT_DELAY_STEPS, maxlen=TRANSPORT_DELAY_STEPS
        )
        s.consistency_modifier = 0.0
        s.disturbance_steps_remaining = 0
        s.felt_efficiency = 1.0
        s.transition_phase = TransitionPhase.STEADY_A
        s.current_grade = grade
        s.target_grade = grade
        s.seconds_elapsed = 0
        s.transition_seconds_elapsed = 0
        s.scan_age_seconds = 0.0
        s.basis_weight_risk = "Nominal"
        s.moisture_risk = "Nominal"

    def _snapshot(self) -> Dict[str, Any]:
        s = self._state
        return {
            "sp_stock_flow": round(s.sp_stock_flow, 2),
            "pv_stock_flow": round(s.pv_stock_flow, 2),
            "sp_steam_pressure": round(s.sp_steam_pressure, 2),
            "pv_steam_pressure": round(s.pv_steam_pressure, 2),
            "sp_machine_speed": round(s.sp_machine_speed, 2),
            "pv_machine_speed": round(s.pv_machine_speed, 2),
            "pv_basis_weight": round(s.pv_basis_weight, 3),
            "pv_moisture": round(s.pv_moisture, 3),
            "scan_age_seconds": round(s.scan_age_seconds, 2),
            "transition_phase": s.transition_phase.value,
            "current_grade": s.current_grade,
            "target_grade": s.target_grade,
            "seconds_elapsed": s.seconds_elapsed,
            "transition_seconds_elapsed": s.transition_seconds_elapsed,
            "basis_weight_risk": s.basis_weight_risk,
            "moisture_risk": s.moisture_risk,
            "bw_target": self._target_spec.bw_target,
            "moisture_target": self._target_spec.moisture_target,
        }
