"""Ranked feeds page on the server ("Load more") and filter on the server."""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.ingestion.seed_demo import seed_demo
from app.main import app


@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        seed_demo(db)

    def test_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = test_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def _ids(page):
    return [item["opportunity"]["id"] for item in page["items"]]


def test_pages_cover_the_feed_once_in_order(client):
    full = client.get("/api/v1/demo/recommendations?limit=50").json()
    first = client.get("/api/v1/demo/recommendations?limit=15").json()
    assert first["total"] == full["total"] == 40 and first["next_offset"] == 15
    second = client.get("/api/v1/demo/recommendations?limit=15&offset=15").json()
    third = client.get("/api/v1/demo/recommendations?limit=15&offset=30").json()
    assert third["next_offset"] is None and len(third["items"]) == 10
    assert _ids(first) + _ids(second) + _ids(third) == _ids(full)


def test_filters_run_on_the_server(client):
    page = client.get("/api/v1/demo/recommendations?opportunity_type=research&remote_only=true&limit=50").json()
    assert page["total"] > 0
    assert all(i["opportunity"]["opportunity_type"] == "RESEARCH" and i["opportunity"]["remote_type"] == "REMOTE" for i in page["items"])


def test_search_matches_skills_and_organizations(client):
    everything = client.get("/api/v1/demo/recommendations?limit=50").json()["items"]
    skill = everything[0]["opportunity"]["skills"][0]["name"]
    org = everything[0]["opportunity"]["organization"]
    by_skill = client.get("/api/v1/demo/recommendations", params={"q": skill.lower(), "limit": 50}).json()
    assert by_skill["total"] > 0
    assert all(any(s["name"].lower() == skill.lower() for s in i["opportunity"]["skills"])
               or skill.lower() in (i["opportunity"]["title"] + i["opportunity"]["description"] + i["opportunity"]["organization"]).lower()
               for i in by_skill["items"])
    by_org = client.get("/api/v1/demo/recommendations", params={"q": org, "limit": 50}).json()
    assert org in [i["opportunity"]["organization"] for i in by_org["items"]]


def test_search_treats_wildcards_literally(client):
    assert client.get("/api/v1/demo/recommendations", params={"q": "%"}).json()["total"] == 0


def test_deadline_sort(client):
    items = client.get("/api/v1/demo/recommendations?sort=deadline&limit=50").json()["items"]
    deadlines = [i["opportunity"]["deadline"] or date.max.isoformat() for i in items]
    assert deadlines == sorted(deadlines)


def test_bad_parameters_are_refused(client):
    assert client.get("/api/v1/demo/recommendations?sort=random").status_code == 422
    assert client.get("/api/v1/demo/recommendations?limit=500").status_code == 422
