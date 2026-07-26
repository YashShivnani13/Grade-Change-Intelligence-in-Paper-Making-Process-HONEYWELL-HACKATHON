# =============================================================================
# routes_simulator.py — REST endpoints for simulator control commands
# Grade Change Intelligence System — Honeywell Hackathon
# =============================================================================

import logging

from fastapi import APIRouter, HTTPException, Request

from core.database import insert_event_log
from models.schemas import ActionResponse, SimulatorActionRequest
from models.constants import TAG_BASIS_WEIGHT

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/simulator", tags=["Simulator"])


@router.post("/action", response_model=ActionResponse)
async def simulator_action(body: SimulatorActionRequest, request: Request):
    """Trigger a simulator command: grade_change, inject_disturbance, apply_advisory, bad_operator."""
    try:
        simulator = request.app.state.simulator
        message = simulator.apply_command(body.action, body.params)

        level_map = {
            "grade_change": "INFO",
            "inject_disturbance": "WARNING",
            "apply_advisory": "INFO",
            "bad_operator": "WARNING",
        }
        insert_event_log(
            level=level_map.get(body.action, "INFO"),
            tag=TAG_BASIS_WEIGHT,
            message=message,
        )
        return ActionResponse(status="ok", message=message)

    except Exception as exc:
        logger.exception("Simulator action failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/reset", response_model=ActionResponse)
async def simulator_reset(request: Request):
    """Reset the simulator to Grade A steady state."""
    try:
        simulator = request.app.state.simulator
        message = simulator.apply_command("reset", {})
        insert_event_log(level="INFO", tag="SYS", message="Simulator reset to Grade A.")
        return ActionResponse(status="ok", message=message)
    except Exception as exc:
        logger.exception("Reset failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
