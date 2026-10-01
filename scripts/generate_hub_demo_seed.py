"""Emit one idempotent SQL Studio statement for 40 fictional opportunities.

Usage: python3 scripts/generate_hub_demo_seed.py --owner-id <hub user id> > /tmp/intern-demo.sql
Paste the output into intern_finder → Database → SQL Studio after recent MFA verification.
The owner id comes from the hub's signed-in user; no API key or database URL is needed.
"""

from __future__ import annotations

import argparse
import json
from datetime import date, timedelta
from uuid import NAMESPACE_URL, uuid5

GROUPS = [
    ("INTERNSHIP", 20, "Example Tech Studio", "Software Engineering Intern", "Build student-scale software projects with a fictional mentoring team."),
    ("RESEARCH", 10, "Example University Research Lab", "Undergraduate Research Assistant", "Explore an illustrative undergraduate AI research project."),
    ("SCHOLARSHIP", 5, "Example Student Foundation", "Student Innovation Scholarship", "A fictional scholarship example for exploring the product."),
    ("HACKATHON", 5, "Example Campus Hackathon", "Student Technology Hackathon", "A fictional hackathon example for exploring the product."),
]
SKILLS = [
    (["Python", "Git"], ["PyTorch", "SQL"], ["Machine Learning", "Research"]),
    (["JavaScript", "React"], ["TypeScript", "Git"], ["Software Engineering", "Web Development"]),
    (["Python", "SQL"], ["Data Analysis", "Git"], ["Data Science", "Business Analytics"]),
    (["C++", "Git"], ["Python", "Algorithms"], ["Software Engineering", "Algorithms"]),
]
CITIES = [
    ("New York, NY", 40.7128, -74.0060),
    ("Philadelphia, PA", 39.9526, -75.1636),
    ("Boston, MA", 42.3601, -71.0589),
]


def quoted(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--owner-id", required=True)
    args = parser.parse_args()
    if not args.owner_id or any(char in args.owner_id for char in "'\n\r"):
        parser.error("invalid owner id")

    today = date.today()
    rows: list[str] = []
    for kind, count, organization, title, description in GROUPS:
        for number in range(1, count + 1):
            required, preferred, tags = SKILLS[(number - 1) % len(SKILLS)]
            city, latitude, longitude = CITIES[(number - 1) % len(CITIES)]
            remote = number % 3 == 0
            external_id = f"demo-{kind.lower()}-{number:02d}"
            row_id = str(uuid5(NAMESPACE_URL, "opportunityos-" + external_id))
            posted = (today - timedelta(days=number % 14)).isoformat()
            deadline = (today + timedelta(days=30 + number)).isoformat()
            record = {
                "opportunity": {
                    "id": row_id,
                    "title": f"{title} — Demo {number:02d}",
                    "organization": organization,
                    "description": description + " This is a sample listing, not a real opening.",
                    "opportunity_type": kind,
                    "location": "Remote" if remote else city,
                    "remote_type": "REMOTE" if remote else "ONSITE",
                    "posted_date": posted,
                    "deadline": deadline,
                    "application_url": None,
                    "source_name": "OpportunityOS demo catalog",
                    "source_url": None,
                    "is_demo": True,
                    "skills": [
                        *[{"name": name, "required": True} for name in required],
                        *[{"name": name, "required": False} for name in preferred if name not in required],
                    ],
                },
                "features": {
                    "tags": tags,
                    "majors": ["Computer Science"] if kind in ("INTERNSHIP", "RESEARCH") else [],
                    "minimumYear": 1 if kind in ("INTERNSHIP", "RESEARCH") else None,
                    "latitude": None if remote else latitude,
                    "longitude": None if remote else longitude,
                },
            }
            values = [
                quoted(row_id), quoted(args.owner_id), quoted(record["opportunity"]["title"]),
                quoted(organization), quoted(kind), quoted(record["opportunity"]["remote_type"]),
                quoted(deadline), "true", quoted(json.dumps(record, separators=(",", ":"))),
            ]
            rows.append("(" + ", ".join(values) + ")")
    print('insert into opportunities (id, owner_id, title, organization, opportunity_type, remote_type, deadline, is_demo, details_json) values')
    print(",\n".join(rows))
    print("on conflict (id) do update set title = excluded.title, organization = excluded.organization, opportunity_type = excluded.opportunity_type, remote_type = excluded.remote_type, deadline = excluded.deadline, is_demo = excluded.is_demo, details_json = excluded.details_json;")


if __name__ == "__main__":
    main()
