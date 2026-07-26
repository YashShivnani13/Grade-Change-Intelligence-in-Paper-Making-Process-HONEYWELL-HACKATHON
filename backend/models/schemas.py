# =============================================================================
# schemas.py — Pydantic request/response models for all API endpoints
# Grade Change Intelligence System — Honeywell Hackathon
# =============================================================================

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class SimulatorActionRequest(BaseModel):
    action: str = Field(..., description="Simulator command name")
    params: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        allowed = {"grade_change", "inject_disturbance", "apply_advisory", "bad_operator", "reset"}
        if v not in allowed:
            raise ValueError(f"action must be one of {allowed}")
        return v


class FeedbackRequest(BaseModel):
    event_id: str
    transition_id: int
    feedback: str = Field(..., pattern="^(Accepted|Rejected)$")
    outcome_success: bool = False


class WhatIfRequest(BaseModel):
    delta_steam: float = Field(0.0, ge=-10.0, le=10.0)
    delta_flow: float = Field(0.0, ge=-15.0, le=15.0)
    current_state: Dict[str, Any] = Field(default_factory=dict)


class ContributingVariable(BaseModel):
    name: str
    tag: str
    contribution_pct: int


class RecommendationDetail(BaseModel):
    delta_steam: float
    delta_flow: float
    delta_speed: float
    action_text: str


class ReferenceTransition(BaseModel):
    id: int
    label: str
    similarity_pct: int


class RiskEventResponse(BaseModel):
    event_id: str
    timestamp: str
    risk_level: str
    basis_weight_risk: str
    moisture_risk: str
    deviation_direction: str
    seconds_to_breach: Optional[int]
    likely_cause: str
    contributing_variables: List[ContributingVariable]
    recommendation: RecommendationDetail
    reliability_index: float
    reference_transition: ReferenceTransition


class FeedbackResponse(BaseModel):
    new_confidence: float
    transition_id: int
    feedback: str
    message: str


class WhatIfResponse(BaseModel):
    trajectory: List[Dict[str, float]]
    steps: int


class ActionResponse(BaseModel):
    status: str
    message: str


class HistoryResponse(BaseModel):
    events: List[Dict[str, Any]]
    total: int
