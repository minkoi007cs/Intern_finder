from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.places import ATTRIBUTION, search

router = APIRouter(tags=["places"])


class PlaceResponse(BaseModel):
    label: str
    city: str
    state: str
    latitude: float
    longitude: float


class PlaceSearchResponse(BaseModel):
    items: list[PlaceResponse]
    attribution: str


@router.get("/places", response_model=PlaceSearchResponse)
def search_places(q: str = Query(min_length=1, max_length=80), limit: int = Query(default=8, ge=1, le=10)) -> PlaceSearchResponse:
    items = [
        PlaceResponse(label=place.label, city=place.city, state=place.state, latitude=place.latitude, longitude=place.longitude)
        for place in search(q, limit)
    ]
    return PlaceSearchResponse(items=items, attribution=ATTRIBUTION)
