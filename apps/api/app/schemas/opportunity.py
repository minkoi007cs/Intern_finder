from __future__ import annotations

from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class SkillEvidence(BaseModel):
    name: str
    required: bool


class OpportunityResponse(BaseModel):
    id: UUID
    title: str
    organization: str
    description: str
    opportunity_type: str
    location: str | None
    remote_type: str
    posted_date: date | None
    deadline: date | None
    application_url: str | None
    source_name: str
    source_url: str | None
    is_demo: bool
    skills: list[SkillEvidence]


class MatchResponse(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    score_label: str
    score_version: str
    components: dict[str, float]
    matched_skills: list[str]
    missing_required_skills: list[str]
    missing_preferred_skills: list[str]
    reasons: list[str]
    next_action: str


class RecommendationResponse(BaseModel):
    opportunity: OpportunityResponse
    match: MatchResponse


class OpportunityPage(BaseModel):
    items: list[OpportunityResponse]
    total: int
    limit: int
    offset: int


class RecommendationPage(BaseModel):
    items: list[RecommendationResponse]
    total: int
    limit: int
    offset: int
    next_offset: int | None
