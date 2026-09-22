from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.ml.ranking import normalize_skill
from app.models import Skill, StudentProfile, StudentSkill, User
from app.schemas.profile import ProfileInput, ProfileResponse

router = APIRouter(tags=["profile"])


def _profile_query(user_id):
    return select(StudentProfile).where(StudentProfile.user_id == user_id).options(selectinload(StudentProfile.skills).selectinload(StudentSkill.skill))


def _to_response(profile: StudentProfile) -> ProfileResponse:
    return ProfileResponse(
        user_id=profile.user_id,
        full_name=profile.full_name,
        university=profile.university,
        major=profile.major,
        minor=profile.minor,
        graduation_year=profile.graduation_year,
        academic_year=profile.academic_year,
        location=profile.location,
        latitude=profile.latitude,
        longitude=profile.longitude,
        search_radius_miles=profile.search_radius_miles,
        preferred_remote=profile.preferred_remote,
        preferred_types=profile.preferred_types,
        interests=profile.interests,
        career_goals=profile.career_goals,
        research_interests=profile.research_interests,
        skills=[link.skill.name for link in profile.skills],
    )


@router.get("/profile", response_model=ProfileResponse)
def get_profile(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)) -> ProfileResponse:
    profile = db.scalar(_profile_query(user.id))
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not created")
    return _to_response(profile)


@router.put("/profile", response_model=ProfileResponse)
def put_profile(data: ProfileInput, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)) -> ProfileResponse:
    account = db.get(User, user.id)
    if account is None:
        account = User(id=user.id, email=user.email)
        db.add(account)
    elif user.email and account.email != user.email:
        account.email = user.email

    profile = db.scalar(_profile_query(user.id))
    if profile is None:
        profile = StudentProfile(user_id=user.id, full_name=data.full_name, university=data.university, major=data.major, academic_year=data.academic_year)
        db.add(profile)
    for field in (
        "full_name", "university", "major", "minor", "graduation_year", "academic_year", "location",
        "latitude", "longitude", "search_radius_miles", "preferred_remote", "preferred_types",
        "interests", "career_goals", "research_interests",
    ):
        setattr(profile, field, getattr(data, field))
    db.flush()

    desired = {normalize_skill(value): value for value in data.skills}
    existing = {normalize_skill(link.skill.name): link for link in profile.skills}
    for name, link in existing.items():
        if name not in desired:
            profile.skills.remove(link)
    for name, submitted in desired.items():
        if name in existing:
            continue
        skill = db.scalar(select(Skill).where(func.lower(Skill.name) == name))
        if skill is None:
            skill = Skill(name=submitted, category="technical", aliases=[])
            db.add(skill)
            db.flush()
        profile.skills.append(StudentSkill(skill=skill, source="manually_added"))
    db.commit()
    saved = db.scalar(_profile_query(user.id))
    return _to_response(saved)
