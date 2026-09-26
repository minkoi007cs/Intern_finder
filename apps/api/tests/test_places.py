"""Offline city lookup: suggestions for the profile form and coordinates for distance scoring."""

from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.auth import CurrentUser, get_current_user
from app.core.database import Base, get_db
from app.main import app
from app.services.places import resolve, search


def test_search_by_prefix_biggest_first_and_by_state():
    labels = [p.label for p in search("kent")]
    assert labels[:2] == ["Kent, WA", "Kent, OH"]
    assert [p.label for p in search("kent, oh")] == ["Kent, OH"]
    assert [p.label for p in search("Kent, Ohio")] == ["Kent, OH"]
    assert search("new york")[0].label == "New York City, NY"
    assert search("k") == [] and search("kent, zz") == []


def test_resolve_needs_a_state():
    assert resolve("Kent") is None
    kent = resolve(" kent ,  ohio ")
    assert kent is not None and kent.label == "Kent, OH"
    assert abs(kent.latitude - 41.15) < 0.01 and abs(kent.longitude + 81.36) < 0.01
    assert resolve("Atlantis, OH") is None and resolve(None) is None


def test_places_endpoint():
    client = TestClient(app)
    body = client.get("/api/v1/places", params={"q": "akr"}).json()
    assert body["items"][0]["label"] == "Akron, OH"
    assert "GeoNames" in body["attribution"]
    assert client.get("/api/v1/places", params={"q": "a", "limit": 11}).status_code == 422


def test_saving_a_known_city_sets_coordinates_and_unknown_text_does_not():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)

    def test_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = test_db
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(id=str(uuid4()), email=None)
    try:
        client = TestClient(app)
        base = {"full_name": "A Student", "university": "Kent State University", "major": "Computer Science", "academic_year": 2}
        saved = client.put("/api/v1/profile", json={**base, "location": "kent, ohio"}).json()
        assert saved["location"] == "Kent, OH" and saved["latitude"] is not None and saved["longitude"] is not None
        unknown = client.put("/api/v1/profile", json={**base, "location": "Somewhere nice"}).json()
        assert unknown["location"] == "Somewhere nice" and unknown["latitude"] is None
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
