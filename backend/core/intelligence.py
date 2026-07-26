# =============================================================================
# intelligence.py — Advisory engine: detection, similarity, explainability
# Grade Change Intelligence System — Honeywell Hackathon
# =============================================================================

import logging
import math
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from core.database import (
    get_all_transitions,
    get_transition_by_id,
    insert_feedback_log,
    update_confidence,
)
from core.simulator import Simulator
from models.constants import (
    BREACH_PREDICTION_HORIZON_SECONDS,
    CONFIDENCE_ACCEPT_FAIL_DELTA,
    CONFIDENCE_ACCEPT_SUCCESS_DELTA,
    CONFIDENCE_MAX,
    CONFIDENCE_MIN,
    CONFIDENCE_REJECT_DELTA,
    DEVIATION_CRITICAL_PCT,
    DEVIATION_WARNING_PCT,
    GRADE_REGISTRY,
    TAG_BASIS_WEIGHT,
    TAG_MOISTURE,
    TAG_STEAM_PRESSURE,
    TAG_STOCK_FLOW,
    TREND_HORIZON_SECONDS,
)

logger = logging.getLogger(__name__)

# Feature weights for fingerprint distance (must sum to 1.0)
_FEATURE_WEIGHTS = {
    "bw_deviation_pct": 0.30,
    "moisture_deviation_pct": 0.20,
    "bw_trend_slope": 0.20,
    "steam_sp_pv_gap": 0.15,
    "flow_sp_pv_gap": 0.10,
    "transition_elapsed_norm": 0.05,
}

# Normalization ranges derived from domain knowledge
_FEATURE_RANGES = {
    "bw_deviation_pct": (-5.0, 5.0),
    "moisture_deviation_pct": (-5.0, 5.0),
    "bw_trend_slope": (-1.0, 1.0),
    "steam_sp_pv_gap": (-15.0, 15.0),
    "flow_sp_pv_gap": (-20.0, 20.0),
    "transition_elapsed_norm": (0.0, 1.0),
}


class AdvisoryEngine:
    """
    Stateless advisory engine.

    Implements risk detection via linear trend extrapolation,
    reference-case matching via weighted Euclidean distance,
    and online confidence adjustment via operator feedback.
    """

    def analyze(
        self,
        window: List[Dict[str, Any]],
        target_grade: str = "B",
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze a rolling telemetry window and return a RiskEvent if deviation
        risk is detected, or None if the process is nominal.
        """
        if len(window) < TREND_HORIZON_SECONDS:
            return None

        spec = GRADE_REGISTRY.get(target_grade, GRADE_REGISTRY["B"])
        recent = window[-TREND_HORIZON_SECONDS:]

        bw_values = [r["pv_basis_weight"] for r in recent]
        mc_values = [r["pv_moisture"] for r in recent]
        latest = window[-1]

        bw_dev_pct = self._deviation_pct(latest["pv_basis_weight"], spec.bw_target)
        mc_dev_pct = self._deviation_pct(latest["pv_moisture"], spec.moisture_target)

        bw_trend = self._linear_slope(bw_values)
        mc_trend = self._linear_slope(mc_values)

        # Predict time to breach
        bw_secs_to_breach = self._time_to_breach(
            latest["pv_basis_weight"], bw_trend, spec.bw_target, spec.bw_tolerance_pct
        )
        mc_secs_to_breach = self._time_to_breach(
            latest["pv_moisture"], mc_trend, spec.moisture_target, spec.moisture_tolerance_pct
        )

        bw_at_risk = (
            abs(bw_dev_pct) >= DEVIATION_WARNING_PCT
            or (bw_secs_to_breach is not None and bw_secs_to_breach <= BREACH_PREDICTION_HORIZON_SECONDS)
        )
        mc_at_risk = (
            abs(mc_dev_pct) >= DEVIATION_WARNING_PCT
            or (mc_secs_to_breach is not None and mc_secs_to_breach <= BREACH_PREDICTION_HORIZON_SECONDS)
        )

        if not bw_at_risk and not mc_at_risk:
            return None

        risk_level = self._overall_risk(latest)
        fingerprint = self._build_fingerprint(latest, bw_dev_pct, mc_dev_pct, bw_trend, spec)
        top_matches = self._find_similar(fingerprint)

        if not top_matches:
            return None

        best = top_matches[0]
        action = best["action_taken"]
        similarity_pct = int((1.0 - best["_distance"]) * 100)
        similarity_pct = max(0, min(100, similarity_pct))

        contributing = self._attribute_cause(latest, bw_dev_pct, mc_dev_pct, bw_trend, mc_trend)
        cause_text = self._generate_cause_text(contributing, latest, spec)
        deviation_direction = self._deviation_direction(bw_dev_pct, bw_trend, mc_dev_pct, mc_trend)

        secs_to_breach = None
        if bw_secs_to_breach is not None and mc_secs_to_breach is not None:
            secs_to_breach = min(bw_secs_to_breach, mc_secs_to_breach)
        elif bw_secs_to_breach is not None:
            secs_to_breach = bw_secs_to_breach
        elif mc_secs_to_breach is not None:
            secs_to_breach = mc_secs_to_breach

        return {
            "event_id": str(uuid.uuid4())[:8],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "risk_level": risk_level,
            "basis_weight_risk": latest.get("basis_weight_risk", "Nominal"),
            "moisture_risk": latest.get("moisture_risk", "Nominal"),
            "deviation_direction": deviation_direction,
            "seconds_to_breach": secs_to_breach,
            "likely_cause": cause_text,
            "contributing_variables": contributing,
            "recommendation": {
                "delta_steam": round(float(action.get("delta_steam", 0.0)), 1),
                "delta_flow": round(float(action.get("delta_flow", 0.0)), 1),
                "delta_speed": round(float(action.get("delta_speed", 0.0)), 1),
                "action_text": self._action_text(action),
            },
            "reliability_index": round(float(best["confidence"]), 2),
            "reference_transition": {
                "id": best["id"],
                "label": best["label"],
                "similarity_pct": similarity_pct,
            },
            "all_candidates": [
                {"id": m["id"], "label": m["label"],
                 "similarity_pct": int((1.0 - m["_distance"]) * 100),
                 "confidence": m["confidence"]}
                for m in top_matches
            ],
        }

    def project_whatif(
        self,
        current_state: Dict[str, Any],
        delta_steam: float,
        delta_flow: float,
        steps: int = 90,
    ) -> List[Dict[str, float]]:
        """Run a shadow simulation and return projected BW/moisture trajectory."""
        sim = Simulator(starting_grade=current_state.get("current_grade", "A"))
        # Seed shadow sim with current SP values
        sim._state.sp_stock_flow = current_state["sp_stock_flow"] + delta_flow
        sim._state.pv_stock_flow = current_state["pv_stock_flow"]
        sim._state.sp_steam_pressure = current_state["sp_steam_pressure"] + delta_steam
        sim._state.pv_steam_pressure = current_state["pv_steam_pressure"]
        sim._state.sp_machine_speed = current_state["sp_machine_speed"]
        sim._state.pv_machine_speed = current_state["pv_machine_speed"]
        sim._state.pv_basis_weight = current_state["pv_basis_weight"]
        sim._state.pv_moisture = current_state["pv_moisture"]
        # Point target to Grade B
        target_grade = current_state.get("target_grade", "B")
        sim._target_spec = GRADE_REGISTRY.get(target_grade, GRADE_REGISTRY["B"])
        sim._current_spec = sim._target_spec

        trajectory = []
        for _ in range(steps):
            snap = sim.step()
            trajectory.append({
                "bw": snap["pv_basis_weight"],
                "moisture": snap["pv_moisture"],
            })
        return trajectory

    def submit_feedback(
        self,
        transition_id: int,
        feedback: str,
        outcome_success: bool,
    ) -> float:
        """Update confidence based on operator feedback. Returns new confidence."""
        record = get_transition_by_id(transition_id)
        if not record:
            logger.warning("Transition %d not found for feedback.", transition_id)
            return 0.75

        old_confidence = float(record["confidence"])

        if feedback == "Accepted":
            delta = CONFIDENCE_ACCEPT_SUCCESS_DELTA if outcome_success else CONFIDENCE_ACCEPT_FAIL_DELTA
        else:
            delta = CONFIDENCE_REJECT_DELTA

        new_confidence = max(CONFIDENCE_MIN, min(CONFIDENCE_MAX, old_confidence + delta))
        update_confidence(transition_id, new_confidence)
        logger.info(
            "Confidence updated: transition=%d  %.2f -> %.2f  (feedback=%s, success=%s)",
            transition_id, old_confidence, new_confidence, feedback, outcome_success,
        )
        return new_confidence

    # ── Internal: fingerprinting & similarity ─────────────────────────────────

    def _build_fingerprint(
        self,
        latest: Dict[str, Any],
        bw_dev_pct: float,
        mc_dev_pct: float,
        bw_trend: float,
        spec,
    ) -> Dict[str, float]:
        steam_gap = latest["sp_steam_pressure"] - latest["pv_steam_pressure"]
        flow_gap = latest["sp_stock_flow"] - latest["pv_stock_flow"]
        elapsed_norm = min(1.0, latest.get("transition_seconds_elapsed", 0) / 600.0)
        return {
            "bw_deviation_pct": bw_dev_pct,
            "moisture_deviation_pct": mc_dev_pct,
            "bw_trend_slope": bw_trend,
            "steam_sp_pv_gap": steam_gap,
            "flow_sp_pv_gap": flow_gap,
            "transition_elapsed_norm": elapsed_norm,
        }

    def _find_similar(self, fingerprint: Dict[str, float]) -> List[Dict[str, Any]]:
        all_transitions = get_all_transitions()
        if not all_transitions:
            return []

        scored = []
        for t in all_transitions:
            fp = t.get("fingerprint", {})
            if not fp:
                continue
            dist = self._weighted_euclidean(fingerprint, fp)
            t["_distance"] = dist
            scored.append(t)

        scored.sort(key=lambda x: (x["_distance"], -x["confidence"]))
        return scored[:3]

    def _weighted_euclidean(
        self,
        a: Dict[str, float],
        b: Dict[str, float],
    ) -> float:
        total = 0.0
        for feature, weight in _FEATURE_WEIGHTS.items():
            lo, hi = _FEATURE_RANGES[feature]
            rng = hi - lo if (hi - lo) != 0 else 1.0
            va = (a.get(feature, 0.0) - lo) / rng
            vb = (b.get(feature, 0.0) - lo) / rng
            total += weight * (va - vb) ** 2
        return math.sqrt(total)

    # ── Internal: risk computation ─────────────────────────────────────────────

    @staticmethod
    def _deviation_pct(pv: float, target: float) -> float:
        if target == 0:
            return 0.0
        return ((pv - target) / target) * 100.0

    @staticmethod
    def _linear_slope(values: List[float]) -> float:
        n = len(values)
        if n < 2:
            return 0.0
        x_mean = (n - 1) / 2.0
        y_mean = sum(values) / n
        num = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
        den = sum((i - x_mean) ** 2 for i in range(n))
        return num / den if den != 0 else 0.0

    @staticmethod
    def _time_to_breach(
        current_value: float,
        slope: float,
        target: float,
        tolerance_pct: float,
    ) -> Optional[int]:
        if slope == 0:
            return None
        upper = target * (1 + tolerance_pct / 100.0)
        lower = target * (1 - tolerance_pct / 100.0)
        if slope > 0 and current_value < upper:
            return max(0, int((upper - current_value) / slope))
        if slope < 0 and current_value > lower:
            return max(0, int((lower - current_value) / slope))
        return None

    @staticmethod
    def _overall_risk(latest: Dict[str, Any]) -> str:
        if latest.get("basis_weight_risk") == "Critical" or latest.get("moisture_risk") == "Critical":
            return "Critical"
        return "Warning"

    @staticmethod
    def _attribute_cause(
        latest: Dict[str, Any],
        bw_dev_pct: float,
        mc_dev_pct: float,
        bw_trend: float,
        mc_trend: float,
    ) -> List[Dict[str, Any]]:
        steam_gap = abs(latest["sp_steam_pressure"] - latest["pv_steam_pressure"])
        flow_gap = abs(latest["sp_stock_flow"] - latest["pv_stock_flow"])
        bw_rate_contribution = abs(bw_trend) * 15.0
        steam_contribution = steam_gap * 2.5
        flow_contribution = flow_gap * 1.8

        total = steam_contribution + bw_rate_contribution + flow_contribution
        if total == 0:
            total = 1.0

        return [
            {"name": "Steam Pressure Lag", "tag": TAG_STEAM_PRESSURE,
             "contribution_pct": int(100 * steam_contribution / total)},
            {"name": "BW Rate of Change", "tag": TAG_BASIS_WEIGHT,
             "contribution_pct": int(100 * bw_rate_contribution / total)},
            {"name": "Flow SP-PV Gap", "tag": TAG_STOCK_FLOW,
             "contribution_pct": int(100 * flow_contribution / total)},
        ]

    @staticmethod
    def _generate_cause_text(
        contributing: List[Dict],
        latest: Dict[str, Any],
        spec,
    ) -> str:
        top = contributing[0]["name"] if contributing else "unknown cause"
        steam_lag = round(latest["sp_steam_pressure"] - latest["pv_steam_pressure"], 1)
        if "Steam" in top and abs(steam_lag) > 1.0:
            return (
                f"Steam pressure is lagging setpoint by {abs(steam_lag):.1f} kPa — "
                f"dryer capacity is not keeping pace with stock flow ramp."
            )
        bw_dev = round(abs(latest["pv_basis_weight"] - spec.bw_target), 2)
        return (
            f"Basis weight is deviating {bw_dev:.2f} g/m² from target — "
            f"likely caused by {top.lower()} during the current ramp phase."
        )

    @staticmethod
    def _deviation_direction(
        bw_dev: float, bw_trend: float, mc_dev: float, mc_trend: float
    ) -> str:
        parts = []
        if abs(bw_dev) >= DEVIATION_WARNING_PCT or abs(bw_trend) > 0.05:
            direction = "HIGH" if bw_trend > 0 else "LOW"
            parts.append(f"BW-001 trending {direction}")
        if abs(mc_dev) >= DEVIATION_WARNING_PCT or abs(mc_trend) > 0.02:
            direction = "HIGH" if mc_trend > 0 else "LOW"
            parts.append(f"MC-001 trending {direction}")
        return " | ".join(parts) if parts else "Within limits"

    @staticmethod
    def _action_text(action: Dict[str, float]) -> str:
        parts = []
        ds = action.get("delta_steam", 0.0)
        df = action.get("delta_flow", 0.0)
        if abs(ds) > 0.01:
            parts.append(f"{'Increase' if ds > 0 else 'Decrease'} SP-201 by {abs(ds):.1f} kPa")
        if abs(df) > 0.01:
            parts.append(f"{'Increase' if df > 0 else 'Decrease'} SP-101 by {abs(df):.1f} L/min")
        else:
            parts.append("Hold SP-101 at current value")
        return ". ".join(parts) + "."
