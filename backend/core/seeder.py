# =============================================================================
# seeder.py — Pre-populates the DB with 50 synthetic historical transitions
# Grade Change Intelligence System — Honeywell Hackathon
# =============================================================================

import logging
import random
from datetime import datetime, timedelta, timezone

from core.database import insert_transition
from core.simulator import Simulator, TransitionPhase
from models.constants import (
    CONSISTENCY_DISTURBANCE_MAGNITUDE,
    GRADE_REGISTRY,
)

logger = logging.getLogger(__name__)

# Scenario definitions: (label_prefix, disturbance, bad_op, advisory_applied, confidence_base, outcome)
_SCENARIOS = [
    # 20 clean successful transitions
    *[("clean", False, False, False, 0.75, True)] * 20,
    # 10 disturbance transitions where advisory was applied and succeeded
    *[("advisory_success", True, False, True, 0.85, True)] * 10,
    # 10 disturbance transitions, no intervention — failed
    *[("disturbance_fail", True, False, False, 0.40, False)] * 10,
    # 5 bad operator actions — failed
    *[("bad_op", False, True, False, 0.30, False)] * 5,
    # 5 advisory applied but still failed (noisy conditions)
    *[("advisory_fail", True, False, True, 0.45, False)] * 5,
]


def seed_database() -> int:
    """Generate and store 50 synthetic historical transitions. Returns count inserted."""
    base_date = datetime.now(timezone.utc) - timedelta(days=180)
    inserted = 0

    for idx, (prefix, inject_disturbance, bad_op, apply_advisory, confidence, outcome) in enumerate(_SCENARIOS):
        sim = Simulator(starting_grade="A")

        # Warm up to steady state
        for _ in range(30):
            sim.step()

        # Initiate grade change
        sim.apply_command("grade_change", {"from_grade": "A", "to_grade": "B"})

        # Run for a few steps to let ramp begin
        for _ in range(8):
            snap = sim.step()

        fingerprint_snap = sim.get_state()

        # Optionally inject disturbance
        if inject_disturbance:
            sim.apply_command("inject_disturbance", {})

        if bad_op:
            sim.apply_command("bad_operator", {})

        # Build fingerprint from this moment
        bw_dev = _deviation_pct(fingerprint_snap["pv_basis_weight"], 90.0)
        mc_dev = _deviation_pct(fingerprint_snap["pv_moisture"], 5.5)
        steam_gap = fingerprint_snap["sp_steam_pressure"] - fingerprint_snap["pv_steam_pressure"]
        flow_gap = fingerprint_snap["sp_stock_flow"] - fingerprint_snap["pv_stock_flow"]

        fingerprint = {
            "bw_deviation_pct": round(bw_dev + random.uniform(-0.3, 0.3), 3),
            "moisture_deviation_pct": round(mc_dev + random.uniform(-0.2, 0.2), 3),
            "bw_trend_slope": round(random.uniform(0.05, 0.25) * (1 if inject_disturbance else 0.3), 4),
            "steam_sp_pv_gap": round(steam_gap + random.uniform(-1.0, 1.0), 2),
            "flow_sp_pv_gap": round(flow_gap + random.uniform(-0.5, 0.5), 2),
            "transition_elapsed_norm": round(random.uniform(0.05, 0.20), 3),
        }

        # Advisory action varies by scenario
        if apply_advisory:
            action = {
                "delta_steam": round(random.uniform(3.0, 6.0), 1),
                "delta_flow": round(random.uniform(-2.0, 0.0), 1),
                "delta_speed": 0.0,
            }
        elif bad_op:
            action = {
                "delta_steam": round(random.uniform(-8.0, -5.0), 1),
                "delta_flow": 0.0,
                "delta_speed": 0.0,
            }
        else:
            action = {
                "delta_steam": 0.0,
                "delta_flow": 0.0,
                "delta_speed": 0.0,
            }

        # Generate a realistic timestamp label
        transition_time = base_date + timedelta(days=idx * 3, hours=random.randint(6, 22))
        label = f"A→B {transition_time.strftime('%Y-%m-%d %H:%M')}"

        feedback = "Accepted" if apply_advisory else ("Rejected" if bad_op else None)

        insert_transition(
            label=label,
            fingerprint=fingerprint,
            action_taken=action,
            outcome_success=outcome,
            confidence=confidence + random.uniform(-0.05, 0.05),
            operator_feedback=feedback,
        )
        inserted += 1

    logger.info("Seeder complete: %d historical transitions inserted.", inserted)
    return inserted


def _deviation_pct(pv: float, target: float) -> float:
    if target == 0:
        return 0.0
    return ((pv - target) / target) * 100.0
