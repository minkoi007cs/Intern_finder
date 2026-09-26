from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.ingestion.seed_demo import seed_demo
from app.main import app
from app.models import Opportunity


def test_reseeding_refreshes_deadlines_without_duplicating_examples():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        assert seed_demo(db) == 40
        first = db.scalar(select(Opportunity).where(Opportunity.external_id == "demo-internship-01"))
        first.deadline = date.today() - timedelta(days=1)
        db.commit()
        assert seed_demo(db) == 0
        assert db.scalar(select(func.count()).select_from(Opportunity)) == 40
        db.refresh(first)
        assert first.deadline > date.today()

    def test_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = test_db
    try:
        client = TestClient(app)
        feed = client.get("/api/v1/demo/recommendations?limit=40")
        assert feed.status_code == 200
        page = feed.json()
        assert page["total"] == 40 and len(page["items"]) == 40 and page["next_offset"] is None
        assert all(item["opportunity"]["is_demo"] for item in page["items"])
        detail_id = page["items"][0]["opportunity"]["id"]
        detail = client.get(f"/api/v1/demo/recommendations/{detail_id}")
        assert detail.status_code == 200
        assert detail.json()["match"]["overall_score"] == page["items"][0]["match"]["overall_score"]
        filtered = client.get("/api/v1/opportunities?opportunity_type=RESEARCH&remote_only=true")
        assert filtered.status_code == 200
        assert filtered.json()["total"] > 0
        assert all(item["opportunity_type"] == "RESEARCH" and item["remote_type"] == "REMOTE" for item in filtered.json()["items"])
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
