# =============================================================================
# database.py — All SQLite operations. No SQL lives anywhere else.
# Grade Change Intelligence System — Honeywell Hackathon
# =============================================================================

import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "grade_intelligence.db"


@contextmanager
def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Create all tables and indexes if they do not exist."""
    with _get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS transitions (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                label             TEXT    NOT NULL,
                fingerprint       TEXT    NOT NULL,
                action_taken      TEXT    NOT NULL,
                outcome_success   INTEGER NOT NULL,
                confidence        REAL    NOT NULL DEFAULT 0.75,
                operator_feedback TEXT    DEFAULT NULL,
                created_at        TEXT    NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_confidence
                ON transitions(confidence DESC);

            CREATE TABLE IF NOT EXISTS event_log (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp  TEXT    NOT NULL,
                level      TEXT    NOT NULL,
                tag        TEXT    NOT NULL,
                message    TEXT    NOT NULL,
                event_id   TEXT    DEFAULT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_timestamp
                ON event_log(timestamp DESC);

            CREATE TABLE IF NOT EXISTS feedback_log (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id          TEXT    NOT NULL,
                transition_id     INTEGER REFERENCES transitions(id),
                feedback          TEXT    NOT NULL,
                confidence_before REAL    NOT NULL,
                confidence_after  REAL    NOT NULL,
                created_at        TEXT    NOT NULL
            );
        """)
    logger.info("Database initialized at %s", DB_PATH)


def count_transitions() -> int:
    with _get_conn() as conn:
        row = conn.execute("SELECT COUNT(*) FROM transitions").fetchone()
        return row[0]


def insert_transition(
    label: str,
    fingerprint: Dict[str, float],
    action_taken: Dict[str, float],
    outcome_success: bool,
    confidence: float,
    operator_feedback: Optional[str] = None,
) -> int:
    now = _now()
    with _get_conn() as conn:
        cursor = conn.execute(
            """INSERT INTO transitions
               (label, fingerprint, action_taken, outcome_success,
                confidence, operator_feedback, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                label,
                json.dumps(fingerprint),
                json.dumps(action_taken),
                1 if outcome_success else 0,
                confidence,
                operator_feedback,
                now,
            ),
        )
        return cursor.lastrowid


def get_all_transitions() -> List[Dict[str, Any]]:
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM transitions ORDER BY confidence DESC"
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def get_transition_by_id(transition_id: int) -> Optional[Dict[str, Any]]:
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM transitions WHERE id = ?", (transition_id,)
        ).fetchone()
        return _row_to_dict(row) if row else None


def update_confidence(transition_id: int, new_confidence: float) -> None:
    with _get_conn() as conn:
        conn.execute(
            "UPDATE transitions SET confidence = ? WHERE id = ?",
            (new_confidence, transition_id),
        )


def insert_event_log(
    level: str,
    tag: str,
    message: str,
    event_id: Optional[str] = None,
) -> None:
    with _get_conn() as conn:
        conn.execute(
            """INSERT INTO event_log (timestamp, level, tag, message, event_id)
               VALUES (?, ?, ?, ?, ?)""",
            (_now(), level, tag, message, event_id),
        )


def get_recent_events(limit: int = 20) -> List[Dict[str, Any]]:
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM event_log ORDER BY timestamp DESC LIMIT ?", (limit,)
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def insert_feedback_log(
    event_id: str,
    transition_id: int,
    feedback: str,
    confidence_before: float,
    confidence_after: float,
) -> None:
    with _get_conn() as conn:
        conn.execute(
            """INSERT INTO feedback_log
               (event_id, transition_id, feedback,
                confidence_before, confidence_after, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (event_id, transition_id, feedback,
             confidence_before, confidence_after, _now()),
        )


# ── Internal helpers ──────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    for key in ("fingerprint", "action_taken"):
        if key in d and isinstance(d[key], str):
            d[key] = json.loads(d[key])
    return d
