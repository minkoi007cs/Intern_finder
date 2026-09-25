from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Organization(Base):
    __tablename__ = "intern_organizations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    organization_type: Mapped[str] = mapped_column(String(60), nullable=False, default="OTHER")
    website: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    opportunities: Mapped[list["Opportunity"]] = relationship(back_populates="organization")


class Skill(Base):
    __tablename__ = "intern_skills"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False, default="technical")
    aliases: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)


class OpportunitySkill(Base):
    __tablename__ = "intern_opportunity_skills"
    __table_args__ = (UniqueConstraint("opportunity_id", "skill_id", name="uq_opportunity_skill"),)

    opportunity_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("intern_opportunities.id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("intern_skills.id"), primary_key=True)
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    skill: Mapped[Skill] = relationship()
    opportunity: Mapped["Opportunity"] = relationship(back_populates="opportunity_skills")


class Opportunity(Base):
    __tablename__ = "intern_opportunities"
    __table_args__ = (
        Index("ix_opportunities_type_status_deadline", "opportunity_type", "status", "deadline"),
        Index("ix_opportunities_location", "latitude", "longitude"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("intern_organizations.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    opportunity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    employment_type: Mapped[str | None] = mapped_column(String(40))
    location: Mapped[str | None] = mapped_column(String(200))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    remote_type: Mapped[str] = mapped_column(String(30), nullable=False, default="ONSITE")
    salary_min: Mapped[int | None] = mapped_column(Integer)
    salary_max: Mapped[int | None] = mapped_column(Integer)
    salary_currency: Mapped[str | None] = mapped_column(String(3))
    majors_preferred: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    minimum_year: Mapped[int | None] = mapped_column(Integer)
    experience_level: Mapped[str | None] = mapped_column(String(40))
    research_fields: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    application_url: Mapped[str | None] = mapped_column(String(1000))
    source_url: Mapped[str | None] = mapped_column(String(1000))
    source_name: Mapped[str] = mapped_column(String(160), nullable=False)
    external_id: Mapped[str | None] = mapped_column(String(250), unique=True)
    posted_date: Mapped[date | None] = mapped_column(Date)
    deadline: Mapped[date | None] = mapped_column(Date)
    sponsorship_information: Mapped[str | None] = mapped_column(Text)
    eligibility: Mapped[str | None] = mapped_column(Text)
    visa_status: Mapped[str] = mapped_column(String(40), nullable=False, default="UNKNOWN")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")
    is_demo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    organization: Mapped[Organization] = relationship(back_populates="opportunities")
    opportunity_skills: Mapped[list[OpportunitySkill]] = relationship(back_populates="opportunity", cascade="all, delete-orphan")
