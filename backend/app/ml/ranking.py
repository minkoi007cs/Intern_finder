"""Deterministic, explainable profile-compatibility scoring (version 1)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from math import asin, cos, radians, sin, sqrt
from typing import Mapping, Sequence

WEIGHTS: Mapping[str, float] = {
    "skills": 0.35,
    "interests": 0.20,
    "major": 0.10,
    "experience": 0.10,
    "location": 0.10,
    "preference": 0.10,
    "recency": 0.05,
}
SCORE_VERSION = "weighted-v1"
SKILL_ALIASES = {
    "js": "javascript",
    "react.js": "react",
    "reactjs": "react",
    "postgres": "postgresql",
    "pytorch lightning": "pytorch",
    "py": "python",
}


def normalize_skill(value: str) -> str:
    normalized = " ".join(value.strip().lower().split())
    return SKILL_ALIASES.get(normalized, normalized)


def _normalize(value: str) -> str:
    return " ".join(value.strip().lower().split())


@dataclass(frozen=True)
class StudentFeatures:
    major: str
    academic_year: int
    skills: Sequence[str]
    interests: Sequence[str]
    preferred_types: Sequence[str]
    latitude: float | None = None
    longitude: float | None = None
    search_radius_miles: float = 50
    preferred_remote: bool = True


@dataclass(frozen=True)
class OpportunityFeatures:
    opportunity_type: str
    required_skills: Sequence[str] = field(default_factory=tuple)
    preferred_skills: Sequence[str] = field(default_factory=tuple)
    tags: Sequence[str] = field(default_factory=tuple)
    majors_preferred: Sequence[str] = field(default_factory=tuple)
    minimum_year: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    remote_type: str = "ONSITE"
    posted_date: date | None = None


def distance_miles(lat_a: float, lon_a: float, lat_b: float, lon_b: float) -> float:
    earth_radius_miles = 3958.7613
    d_lat = radians(lat_b - lat_a)
    d_lon = radians(lon_b - lon_a)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat_a)) * cos(radians(lat_b)) * sin(d_lon / 2) ** 2
    return 2 * earth_radius_miles * asin(min(1.0, sqrt(a)))


def score_opportunity(student: StudentFeatures, opportunity: OpportunityFeatures, today: date | None = None) -> dict:
    """Return components and evidence. All component values stay in [0, 1]."""
    today = today or date.today()
    owned = {normalize_skill(skill) for skill in student.skills}
    required = {normalize_skill(skill) for skill in opportunity.required_skills}
    preferred = {normalize_skill(skill) for skill in opportunity.preferred_skills}
    matched_required = sorted(required & owned)
    matched_preferred = sorted(preferred & owned)
    missing_required = sorted(required - owned)
    missing_preferred = sorted(preferred - owned)

    if required and preferred:
        skill_score = 0.7 * len(matched_required) / len(required) + 0.3 * len(matched_preferred) / len(preferred)
    elif required:
        skill_score = len(matched_required) / len(required)
    elif preferred:
        skill_score = len(matched_preferred) / len(preferred)
    else:
        skill_score = 0.5

    interests = {_normalize(value) for value in student.interests}
    tags = {_normalize(value) for value in opportunity.tags}
    interest_score = len(interests & tags) / len(tags) if tags else 0.5
    preferred_majors = {_normalize(value) for value in opportunity.majors_preferred}
    major_score = float(_normalize(student.major) in preferred_majors) if preferred_majors else 0.5
    experience_score = float(student.academic_year >= opportunity.minimum_year) if opportunity.minimum_year else 0.5

    if opportunity.remote_type == "REMOTE":
        location_score = 1.0 if student.preferred_remote else 0.5
    elif None not in (student.latitude, student.longitude, opportunity.latitude, opportunity.longitude):
        miles = distance_miles(student.latitude, student.longitude, opportunity.latitude, opportunity.longitude)
        radius = max(student.search_radius_miles, 1)
        location_score = max(0.0, 1.0 - miles / (2 * radius)) if miles <= radius else 0.0
    else:
        location_score = 0.5

    preferred_types = {value.upper() for value in student.preferred_types}
    preference_score = float(opportunity.opportunity_type.upper() in preferred_types) if preferred_types else 0.5
    age_days = max(0, (today - opportunity.posted_date).days) if opportunity.posted_date else None
    recency_score = max(0.0, 1.0 - age_days / 90) if age_days is not None else 0.5

    components = {
        "skills": round(skill_score, 4),
        "interests": round(interest_score, 4),
        "major": round(major_score, 4),
        "experience": round(experience_score, 4),
        "location": round(location_score, 4),
        "preference": round(preference_score, 4),
        "recency": round(recency_score, 4),
    }
    overall = round(100 * sum(WEIGHTS[key] * value for key, value in components.items()))
    reasons = []
    if matched_required:
        reasons.append("Matching required skills: " + ", ".join(matched_required))
    if interests & tags:
        reasons.append("Matches your interests: " + ", ".join(sorted(interests & tags)))
    if major_score == 1:
        reasons.append("Matches your major")
    if opportunity.remote_type == "REMOTE" and student.preferred_remote:
        reasons.append("Fits your remote preference")
    if not reasons:
        reasons.append("Explore the requirements and decide whether this fits your goals")

    if missing_required:
        next_action = "Consider building experience with " + missing_required[0] + " before applying."
    elif missing_preferred:
        next_action = "You could strengthen your profile with " + missing_preferred[0] + "."
    else:
        next_action = "Review the details and prepare an application if it interests you."

    return {
        "overall_score": overall,
        "score_label": "Profile compatibility",
        "score_version": SCORE_VERSION,
        "components": components,
        "matched_skills": sorted(set(matched_required + matched_preferred)),
        "missing_required_skills": missing_required,
        "missing_preferred_skills": missing_preferred,
        "reasons": reasons,
        "next_action": next_action,
    }
