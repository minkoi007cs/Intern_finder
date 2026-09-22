from datetime import date

from app.ml.ranking import OpportunityFeatures, StudentFeatures, distance_miles, normalize_skill, score_opportunity


def student() -> StudentFeatures:
    return StudentFeatures(
        major="Computer Science",
        academic_year=2,
        skills=["Python", "JS", "SQL"],
        interests=["Machine Learning", "Research"],
        preferred_types=["RESEARCH", "INTERNSHIP"],
        latitude=40.7128,
        longitude=-74.0060,
    )


def test_skill_aliases_and_missing_required_are_explained():
    result = score_opportunity(
        student(),
        OpportunityFeatures(
            opportunity_type="RESEARCH",
            required_skills=["Python", "JavaScript", "PyTorch"],
            preferred_skills=["SQL"],
            tags=["Machine Learning"],
            majors_preferred=["Computer Science"],
            minimum_year=2,
            remote_type="REMOTE",
            posted_date=date(2026, 9, 20),
        ),
        today=date(2026, 9, 22),
    )
    assert result["matched_skills"] == ["javascript", "python", "sql"]
    assert result["missing_required_skills"] == ["pytorch"]
    assert result["overall_score"] < 100
    assert result["score_label"] == "Profile compatibility"
    assert "pytorch" in result["next_action"]


def test_no_required_skills_is_neutral_not_perfect():
    result = score_opportunity(student(), OpportunityFeatures(opportunity_type="OTHER"))
    assert result["components"]["skills"] == 0.5


def test_distance_and_location_preference():
    assert distance_miles(40.7128, -74.0060, 40.7128, -74.0060) == 0
    far = score_opportunity(student(), OpportunityFeatures(opportunity_type="RESEARCH", latitude=42.3601, longitude=-71.0589))
    assert far["components"]["location"] == 0
    remote = score_opportunity(student(), OpportunityFeatures(opportunity_type="RESEARCH", remote_type="REMOTE"))
    assert remote["components"]["location"] == 1


def test_normalization():
    assert normalize_skill(" React.js ") == "react"
    assert normalize_skill("Postgres") == "postgresql"
