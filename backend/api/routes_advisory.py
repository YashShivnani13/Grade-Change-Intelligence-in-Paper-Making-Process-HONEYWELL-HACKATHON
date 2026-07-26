# =============================================================================
# routes_advisory.py — REST endpoints for advisory feedback and what-if
# Grade Change Intelligence System — Honeywell Hackathon
# =============================================================================

import logging

from fastapi import APIRouter, HTTPException, Request

from core.database import get_recent_events, insert_event_log, insert_feedback_log
from models.schemas import (
    FeedbackRequest,
    FeedbackResponse,
    HistoryResponse,
    WhatIfRequest,
    WhatIfResponse,
)
from models.constants import TAG_BASIS_WEIGHT

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/advisory", tags=["Advisory"])


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(body: FeedbackRequest, request: Request):
    """Record operator feedback and update advisory reliability index."""
    try:
        engine = request.app.state.advisory_engine
        # Fetch pre-update confidence for accurate logging
        from core.database import get_transition_by_id
        record = get_transition_by_id(body.transition_id)
        confidence_before = float(record["confidence"]) if record else 0.75

        new_confidence = engine.submit_feedback(
            body.transition_id,
            body.feedback,
            body.outcome_success,
        )

        # Update real-time session advisory KPI counters
        from api.websocket import increment_advisory_stat
        increment_advisory_stat(body.feedback == "Accepted")

        insert_feedback_log(
            event_id=body.event_id,
            transition_id=body.transition_id,
            feedback=body.feedback,
            confidence_before=confidence_before,
            confidence_after=new_confidence,
        )

        action_word = "accepted" if body.feedback == "Accepted" else "dismissed"
        insert_event_log(
            level="INFO",
            tag=TAG_BASIS_WEIGHT,
            message=f"Advisory {action_word}. Reliability index updated to {new_confidence:.2f}.",
            event_id=body.event_id,
        )

        return FeedbackResponse(
            new_confidence=round(new_confidence, 3),
            transition_id=body.transition_id,
            feedback=body.feedback,
            message=f"Reliability index updated to {new_confidence:.2f}.",
        )

    except Exception as exc:
        logger.exception("Feedback submission failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/whatif", response_model=WhatIfResponse)
async def whatif_projection(body: WhatIfRequest, request: Request):
    """Return projected BW/moisture trajectory for given setpoint deltas."""
    try:
        engine = request.app.state.advisory_engine
        current_state = body.current_state or request.app.state.simulator.step()
        trajectory = engine.project_whatif(
            current_state,
            body.delta_steam,
            body.delta_flow,
        )
        return WhatIfResponse(trajectory=trajectory, steps=len(trajectory))

    except Exception as exc:
        logger.exception("What-if projection failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))



@router.get("/history", response_model=HistoryResponse)
async def get_history():
    """Return the last 20 timestamped event log entries."""
    try:
        events = get_recent_events(limit=20)
        return HistoryResponse(events=events, total=len(events))
    except Exception as exc:
        logger.exception("History fetch failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/memory")
async def get_memory_library():
    """Return stored historical transition signatures for AI Memory Library."""
    try:
        from core.database import get_all_transitions
        transitions = get_all_transitions()
        return {"transitions": transitions[:20], "total": len(transitions)}
    except Exception as exc:
        logger.exception("Memory library fetch failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/memory/stats")
async def get_memory_stats():
    """Return aggregate knowledge base statistics for the AI Memory panel."""
    try:
        from core.database import get_all_transitions
        transitions = get_all_transitions()

        total = len(transitions)
        if total == 0:
            return {
                "total": 0,
                "successful": 0,
                "failed": 0,
                "avg_confidence": 0.75,
                "top_strategy": None,
                "avoid_strategy": None,
                "latest_learned": None,
            }

        successful = [t for t in transitions if t.get("outcome_success")]
        failed = [t for t in transitions if not t.get("outcome_success")]
        avg_conf = sum(t.get("confidence", 0.75) for t in transitions) / total

        # Top strategy: highest confidence among successes
        top = max(successful, key=lambda t: t.get("confidence", 0), default=None)

        # Avoid strategy: lowest confidence among failures
        avoid = min(failed, key=lambda t: t.get("confidence", 1), default=None)

        # Latest learned: last inserted by id
        latest = max(transitions, key=lambda t: t.get("id", 0), default=None)

        return {
            "total": total,
            "successful": len(successful),
            "failed": len(failed),
            "avg_confidence": round(avg_conf, 3),
            "top_strategy": top,
            "avoid_strategy": avoid,
            "latest_learned": latest,
        }
    except Exception as exc:
        logger.exception("Memory stats fetch failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

