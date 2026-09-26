from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.ml.ranking import StudentFeatures, score_opportunity
from app.models import Opportunity, OpportunitySkill, Organization, Skill, StudentProfile, StudentSkill
from app.schemas.opportunity import OpportunityPage, OpportunityResponse, RecommendationPage, RecommendationResponse
from app.services.opportunities import to_features, to_response

router = APIRouter(tags=["opportunities"])

DEMO_STUDENT = StudentFeatures(
    major="Computer Science",
    academic_year=2,
    skills=["Python", "C++", "JavaScript", "React", "Git", "SQL"],
    interests=["Machine Learning", "Research", "Software Engineering", "Data Science"],
    preferred_types=["INTERNSHIP", "RESEARCH"],
    latitude=40.7128,
    longitude=-74.0060,
    search_radius_miles=50,
    preferred_remote=True,
)


def _active_demo_query():
    return select(Opportunity).where(
        Opportunity.is_demo.is_(True),
        Opportunity.status == "ACTIVE",
        or_(Opportunity.deadline.is_(None), Opportunity.deadline >= date.today()),
    )


def _escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _filtered(query, q: str | None, opportunity_type: str | None, remote_only: bool):
    """Filters shared by the catalog and the ranked feeds. Search covers title, description,
    organization and skill names."""
    if q and q.strip():
        pattern = f"%{_escape_like(q.strip())}%"
        query = query.where(or_(
            Opportunity.title.ilike(pattern, escape="\\"),
            Opportunity.description.ilike(pattern, escape="\\"),
            Opportunity.organization.has(Organization.name.ilike(pattern, escape="\\")),
            Opportunity.opportunity_skills.any(OpportunitySkill.skill.has(Skill.name.ilike(pattern, escape="\\"))),
        ))
    if opportunity_type:
        query = query.where(Opportunity.opportunity_type == opportunity_type.upper())
    if remote_only:
        query = query.where(Opportunity.remote_type == "REMOTE")
    return query


SortKey = Literal["match", "deadline"]


def _ranked_page(db: Session, student: StudentFeatures, *, q, opportunity_type, remote_only, sort: SortKey, limit: int, offset: int) -> RecommendationPage:
    records = db.scalars(_filtered(_active_demo_query(), q, opportunity_type, remote_only).options(*_detail_options())).all()
    ranked = [RecommendationResponse(opportunity=to_response(item), match=score_opportunity(student, to_features(item))) for item in records]
    if sort == "deadline":
        ranked.sort(key=lambda item: (item.opportunity.deadline or date.max, -item.match.overall_score, item.opportunity.title))
    else:
        ranked.sort(key=lambda item: (-item.match.overall_score, item.opportunity.title))
    items = ranked[offset:offset + limit]
    next_offset = offset + limit if offset + limit < len(ranked) else None
    return RecommendationPage(items=items, total=len(ranked), limit=limit, offset=offset, next_offset=next_offset)


def _student(profile: StudentProfile) -> StudentFeatures:
    return StudentFeatures(
        major=profile.major,
        academic_year=profile.academic_year,
        skills=[link.skill.name for link in profile.skills],
        interests=profile.interests + profile.research_interests,
        preferred_types=profile.preferred_types,
        latitude=profile.latitude,
        longitude=profile.longitude,
        search_radius_miles=profile.search_radius_miles,
        preferred_remote=profile.preferred_remote,
    )


def _detail_options():
    return (selectinload(Opportunity.organization), selectinload(Opportunity.opportunity_skills).selectinload(OpportunitySkill.skill))


@router.get("/opportunities", response_model=OpportunityPage)
def list_opportunities(
    q: str | None = Query(default=None, max_length=100),
    opportunity_type: str | None = Query(default=None, max_length=40),
    remote_only: bool = False,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> OpportunityPage:
    query = _filtered(_active_demo_query(), q, opportunity_type, remote_only)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    records = db.scalars(query.options(*_detail_options()).order_by(Opportunity.posted_date.desc(), Opportunity.id).offset(offset).limit(limit)).all()
    return OpportunityPage(items=[to_response(item) for item in records], total=total, limit=limit, offset=offset)


@router.get("/opportunities/{opportunity_id}", response_model=OpportunityResponse)
def get_opportunity(opportunity_id: UUID, db: Session = Depends(get_db)) -> OpportunityResponse:
    record = db.scalar(_active_demo_query().where(Opportunity.id == opportunity_id).options(*_detail_options()))
    if record is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return to_response(record)


@router.get("/demo/recommendations", response_model=RecommendationPage)
def demo_recommendations(
    q: str | None = Query(default=None, max_length=100),
    opportunity_type: str | None = Query(default=None, max_length=40),
    remote_only: bool = False,
    sort: SortKey = "match",
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0, le=10_000),
    db: Session = Depends(get_db),
) -> RecommendationPage:
    return _ranked_page(db, DEMO_STUDENT, q=q, opportunity_type=opportunity_type, remote_only=remote_only, sort=sort, limit=limit, offset=offset)


@router.get("/demo/recommendations/{opportunity_id}", response_model=RecommendationResponse)
def demo_recommendation(opportunity_id: UUID, db: Session = Depends(get_db)) -> RecommendationResponse:
    record = db.scalar(_active_demo_query().where(Opportunity.id == opportunity_id).options(*_detail_options()))
    if record is None:
        raise HTTPException(status_code=404, detail="Demo recommendation not found")
    return RecommendationResponse(opportunity=to_response(record), match=score_opportunity(DEMO_STUDENT, to_features(record)))


@router.get("/recommendations", response_model=RecommendationPage)
def personal_recommendations(
    q: str | None = Query(default=None, max_length=100),
    opportunity_type: str | None = Query(default=None, max_length=40),
    remote_only: bool = False,
    sort: SortKey = "match",
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0, le=10_000),
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecommendationPage:
    profile = db.scalar(
        select(StudentProfile)
        .where(StudentProfile.user_id == str(user.id))
        .options(selectinload(StudentProfile.skills).selectinload(StudentSkill.skill))
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="Create a profile first")
    return _ranked_page(db, _student(profile), q=q, opportunity_type=opportunity_type, remote_only=remote_only, sort=sort, limit=limit, offset=offset)


@router.get("/recommendations/{opportunity_id}", response_model=RecommendationResponse)
def personal_recommendation(
    opportunity_id: UUID,
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    profile = db.scalar(
        select(StudentProfile)
        .where(StudentProfile.user_id == str(user.id))
        .options(selectinload(StudentProfile.skills).selectinload(StudentSkill.skill))
    )
    if profile is None:
        raise HTTPException(status_code=404, detail="Create a profile first")
    record = db.scalar(_active_demo_query().where(Opportunity.id == opportunity_id).options(*_detail_options()))
    if record is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return RecommendationResponse(opportunity=to_response(record), match=score_opportunity(_student(profile), to_features(record)))
