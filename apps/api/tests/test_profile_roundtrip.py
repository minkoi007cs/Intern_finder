from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.core.auth import CurrentUser, get_current_user
from app.core.database import Base, get_db
from app.main import app


def test_profile_can_be_created_and_updated():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    user = CurrentUser(id=uuid4(), email="student@example.com")

    def test_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = test_db
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        client = TestClient(app)
        payload = {
            "full_name": "Sample Student", "university": "Example University",
            "major": "Computer Science", "academic_year": 2,
            "skills": ["Python", "React"], "interests": ["Research"],
            "preferred_types": ["RESEARCH"],
        }
        assert client.get("/api/v1/profile").status_code == 404
        created = client.put("/api/v1/profile", json=payload)
        assert created.status_code == 200
        assert set(created.json()["skills"]) == {"Python", "React"}
        assert client.get("/api/v1/profile").json()["user_id"] == str(user.id)
        updated = client.put("/api/v1/profile", json={**payload, "skills": ["Python", "SQL"]})
        assert updated.status_code == 200
        assert set(updated.json()["skills"]) == {"Python", "SQL"}
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
