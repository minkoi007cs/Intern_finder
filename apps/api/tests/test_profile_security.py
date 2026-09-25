from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas.profile import ProfileInput


def test_private_routes_require_a_bearer_token():
    client = TestClient(app)
    assert client.get("/api/v1/profile").status_code == 401
    assert client.put("/api/v1/profile", json={"full_name": "A Student", "university": "Example University", "major": "Computer Science", "academic_year": 2}).status_code == 401
    assert client.get("/api/v1/recommendations").status_code == 401


def test_coordinates_must_be_a_pair():
    values = dict(full_name="A Student", university="Example University", major="Computer Science", academic_year=2)
    try:
        ProfileInput(**values, latitude=40.7)
    except ValidationError:
        pass
    else:
        raise AssertionError("A lone latitude must be rejected")
