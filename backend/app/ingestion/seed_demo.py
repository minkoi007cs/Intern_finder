"""Idempotent, conspicuously fictional catalog for local demos."""

from datetime import date, timedelta
from uuid import uuid5, NAMESPACE_URL

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Opportunity, OpportunitySkill, Organization, Skill

GROUPS = [
    ("INTERNSHIP", 20, "Example Tech Studio", "Software Engineering Intern", "Build student-scale software projects with a fictional mentoring team."),
    ("RESEARCH", 10, "Example University Research Lab", "Undergraduate Research Assistant", "Explore an illustrative undergraduate AI research project."),
    ("SCHOLARSHIP", 5, "Example Student Foundation", "Student Innovation Scholarship", "A fictional scholarship example for exploring the product."),
    ("HACKATHON", 5, "Example Campus Hackathon", "Student Technology Hackathon", "A fictional hackathon example for exploring the product."),
]
SKILL_SETS = [
    (["Python", "Git"], ["PyTorch", "SQL"], ["Machine Learning", "Research"]),
    (["JavaScript", "React"], ["TypeScript", "Git"], ["Software Engineering", "Web Development"]),
    (["Python", "SQL"], ["Data Analysis", "Git"], ["Data Science", "Business Analytics"]),
    (["C++", "Git"], ["Python", "Algorithms"], ["Software Engineering", "Algorithms"]),
]
LOCATIONS = [
    ("New York, NY", 40.7128, -74.0060),
    ("Philadelphia, PA", 39.9526, -75.1636),
    ("Boston, MA", 42.3601, -71.0589),
]


def seed_demo(session: Session) -> int:
    """Insert 40 sample records; reruns do not create duplicates."""
    organizations = {}
    for _, _, name, _, _ in GROUPS:
        organization = session.scalar(select(Organization).where(Organization.name == name))
        if organization is None:
            organization = Organization(id=uuid5(NAMESPACE_URL, "opportunityos-demo-org-" + name), name=name, organization_type="DEMO")
            session.add(organization)
        organizations[name] = organization

    skill_names = sorted({skill for required, preferred, _ in SKILL_SETS for skill in required + preferred})
    skills = {}
    for name in skill_names:
        skill = session.scalar(select(Skill).where(Skill.name == name))
        if skill is None:
            skill = Skill(id=uuid5(NAMESPACE_URL, "opportunityos-demo-skill-" + name), name=name, category="technical", aliases=[])
            session.add(skill)
        skills[name] = skill
    session.flush()

    inserted = 0
    today = date.today()
    for kind, count, organization_name, title, description in GROUPS:
        for number in range(1, count + 1):
            external_id = f"demo-{kind.lower()}-{number:02d}"
            existing = session.scalar(select(Opportunity).where(Opportunity.external_id == external_id))
            if existing is not None:
                # Keep the fictional catalog usable when the seed command is rerun
                # weeks after its first installation.
                if existing.is_demo:
                    existing.posted_date = today - timedelta(days=number % 14)
                    existing.deadline = today + timedelta(days=30 + number)
                continue
            required, preferred, tags = SKILL_SETS[(number - 1) % len(SKILL_SETS)]
            city, latitude, longitude = LOCATIONS[(number - 1) % len(LOCATIONS)]
            remote = number % 3 == 0
            opportunity = Opportunity(
                id=uuid5(NAMESPACE_URL, "opportunityos-" + external_id),
                organization=organizations[organization_name],
                title=f"{title} — Demo {number:02d}",
                description=description + " This is a sample listing, not a real opening.",
                opportunity_type=kind,
                employment_type="INTERNSHIP" if kind == "INTERNSHIP" else None,
                location="Remote" if remote else city,
                latitude=None if remote else latitude,
                longitude=None if remote else longitude,
                remote_type="REMOTE" if remote else "ONSITE",
                majors_preferred=["Computer Science"] if kind in ("INTERNSHIP", "RESEARCH") else [],
                minimum_year=1 if kind in ("INTERNSHIP", "RESEARCH") else None,
                experience_level="STUDENT",
                research_fields=tags if kind == "RESEARCH" else [],
                tags=tags,
                source_name="OpportunityOS demo catalog",
                external_id=external_id,
                posted_date=today - timedelta(days=number % 14),
                deadline=today + timedelta(days=30 + number),
                eligibility="Sample eligibility only; not a real opportunity.",
                visa_status="UNKNOWN",
                status="ACTIVE",
                is_demo=True,
            )
            for name in required:
                opportunity.opportunity_skills.append(OpportunitySkill(skill=skills[name], required=True))
            for name in preferred:
                if name not in required:
                    opportunity.opportunity_skills.append(OpportunitySkill(skill=skills[name], required=False))
            session.add(opportunity)
            inserted += 1
    session.commit()
    return inserted


if __name__ == "__main__":
    with SessionLocal() as db:
        count = seed_demo(db)
    print(f"Inserted {count} clearly marked demo opportunities.")
