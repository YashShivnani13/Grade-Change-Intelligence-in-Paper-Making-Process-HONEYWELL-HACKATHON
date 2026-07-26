# =============================================================================
# websocket.py — WebSocket broadcast loop: 1Hz telemetry + advisory events
# Grade Change Intelligence System — Honeywell Hackathon
# =============================================================================

import asyncio
import json
import logging
from collections import deque
from datetime import datetime, timezone
from typing import Any, Deque, Dict, Set

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

# Rolling telemetry window fed to the advisory engine
_TELEMETRY_WINDOW_SIZE = 60
_telemetry_window: Deque[Dict[str, Any]] = deque(maxlen=_TELEMETRY_WINDOW_SIZE)
_connected_clients: Set[WebSocket] = set()

# Session KPI accumulators
_session_kpi = {
    "transition_count": 0,
    "stabilization_times": [],
    "advisories_accepted": 0,
    "advisories_total": 0,
    "cull_saved_tonnes": 0.0,
}

_last_transition_phase = None
_transition_start_second = 0


async def websocket_endpoint(websocket: WebSocket, app_state) -> None:
    """Handle a single WebSocket client connection."""
    await websocket.accept()
    _connected_clients.add(websocket)
    logger.info("WebSocket client connected. Total: %d", len(_connected_clients))

    try:
        # Send one immediate snapshot so the UI populates instantly
        snap = app_state.simulator.get_state()
        await websocket.send_text(_build_payload(snap, None))

        while True:
            await asyncio.sleep(0.05)  # Yield to keep connection alive
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning("WebSocket client error: %s", exc)
    finally:
        _connected_clients.discard(websocket)
        logger.info("WebSocket client disconnected. Total: %d", len(_connected_clients))


async def broadcast_loop(app_state) -> None:
    """
    Background task: steps the simulator at 1Hz,
    runs the advisory engine, and broadcasts to all clients.
    """
    global _last_transition_phase, _transition_start_second

    while True:
        await asyncio.sleep(1.0)

        try:
            snap = app_state.simulator.step()
            _telemetry_window.append(snap)

            # Track transition KPIs
            current_phase = snap["transition_phase"]
            if _last_transition_phase != "RAMPING" and current_phase == "RAMPING":
                _transition_start_second = snap["seconds_elapsed"]
                _session_kpi["transition_count"] += 1

            if _last_transition_phase in ("RAMPING", "STABILIZING") and current_phase == "STEADY_B":
                elapsed = snap["seconds_elapsed"] - _transition_start_second
                _session_kpi["stabilization_times"].append(elapsed)
                # Estimate cull saved vs. baseline (585s baseline)
                baseline = 585
                saved_seconds = max(0, baseline - elapsed)
                # Rough estimate: paper machine producing ~1 tonne/minute of cull during transition
                _session_kpi["cull_saved_tonnes"] += round(saved_seconds / 60.0 * 0.8, 2)

            _last_transition_phase = current_phase

            # Run advisory engine on rolling window
            risk_event = None
            if len(_telemetry_window) >= 15:
                target_grade = snap.get("target_grade", "B")
                risk_event = app_state.advisory_engine.analyze(
                    list(_telemetry_window),
                    target_grade=target_grade,
                )

            # Compute session KPI summary
            stab_times = _session_kpi["stabilization_times"]
            avg_stab = int(sum(stab_times) / len(stab_times)) if stab_times else 0

            kpi = {
                "transition_count": _session_kpi["transition_count"],
                "avg_stabilization_seconds": avg_stab,
                "baseline_stabilization_seconds": 585,
                "cull_saved_tonnes": round(_session_kpi["cull_saved_tonnes"], 2),
                "advisories_accepted": _session_kpi["advisories_accepted"],
                "advisories_total": _session_kpi["advisories_total"],
            }

            payload = _build_payload(snap, risk_event, kpi)

            # Broadcast to all connected clients
            dead_clients = set()
            for ws in _connected_clients.copy():
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead_clients.add(ws)

            _connected_clients.difference_update(dead_clients)

        except Exception as exc:
            logger.exception("Broadcast loop error: %s", exc)


def _build_payload(
    snap: Dict[str, Any],
    risk_event: Any,
    kpi: Dict[str, Any] = None,
) -> str:
    return json.dumps({
        "type": "telemetry",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": snap,
        "risk_event": risk_event,
        "kpi": kpi or {},
    })


def increment_advisory_stat(accepted: bool) -> None:
    """Called by feedback route to update session advisory stats."""
    _session_kpi["advisories_total"] += 1
    if accepted:
        _session_kpi["advisories_accepted"] += 1
