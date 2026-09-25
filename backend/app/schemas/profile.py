from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class ProfileInput(BaseModel):
    full_name: str = Field(min_length=1, max_length=160)
    university: str = Field(min_length=1, max_length=200)
    major: str = Field(min_length=1, max_length=160)
    minor: str | None = Field(default=None, max_length=160)
    graduation_year: int | None = Field(default=None, ge=2020, le=2100)
    academic_year: int = Field(ge=1, le=8)
    location: str | None = Field(default=None, max_length=200)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    search_radius_miles: int = Field(default=50, ge=1, le=500)
    preferred_remote: bool = True
    preferred_types: list[str] = Field(default_factory=list, max_length=15)
    interests: list[str] = Field(default_factory=list, max_length=30)
    career_goals: str | None = Field(default=None, max_length=2000)
    research_interests: list[str] = Field(default_factory=list, max_length=30)
    skills: list[str] = Field(default_factory=list, max_length=60)

    @field_validator("full_name", "university", "major")
    @classmethod
    def trim_required(cls, value: str) -> str:
        result = value.strip()
        if not result:
            raise ValueError("Required field cannot be blank")
        return result

    @field_validator("skills", "interests", "preferred_types", "research_interests")
    @classmethod
    def validate_items(cls, values: list[str]) -> list[str]:
        result = []
        seen = set()
        for item in values:
            item = item.strip()
            if not item or len(item) > 100:
                raise ValueError("List values must contain 1 to 100 characters")
            key = item.lower()
            if key not in seen:
                result.append(item)
                seen.add(key)
        return result

    @model_validator(mode="after")
    def coordinate_pair(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be supplied together")
        return self


class ProfileResponse(ProfileInput):
    user_id: str
