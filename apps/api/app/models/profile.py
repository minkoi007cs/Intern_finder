from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.opportunity import Skill


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "intern_users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str | None] = mapped_column(String(320), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    profile: Mapped[StudentProfile | None] = relationship(back_populates="user", uselist=False)


class StudentProfile(Base):
    __tablename__ = "intern_student_profiles"

    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("intern_users.id", ondelete="CASCADE"), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    university: Mapped[str] = mapped_column(String(200), nullable=False)
    major: Mapped[str] = mapped_column(String(160), nullable=False)
    minor: Mapped[str | None] = mapped_column(String(160))
    graduation_year: Mapped[int | None] = mapped_column(Integer)
    academic_year: Mapped[int] = mapped_column(Integer, nullable=False)
    gpa: Mapped[float | None] = mapped_column(Float)
    location: Mapped[str | None] = mapped_column(String(200))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    search_radius_miles: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    preferred_remote: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    preferred_types: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    interests: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    career_goals: Mapped[str | None] = mapped_column(Text)
    research_interests: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="profile")
    skills: Mapped[list[StudentSkill]] = relationship(back_populates="profile", cascade="all, delete-orphan")


class StudentSkill(Base):
    __tablename__ = "intern_student_skills"

    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("intern_student_profiles.user_id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("intern_skills.id"), primary_key=True)
    source: Mapped[str] = mapped_column(String(40), nullable=False, default="manually_added")

    profile: Mapped[StudentProfile] = relationship(back_populates="skills")
    skill: Mapped[Skill] = relationship()
