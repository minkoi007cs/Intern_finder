"""Authenticated student profiles and normalized skills.

Revision ID: 20260922_02
Revises: 20260922_01
"""

import sqlalchemy as sa
from alembic import op

revision = "20260922_02"
down_revision = "20260922_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("email", sa.String(320), unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "student_profiles",
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("full_name", sa.String(160), nullable=False),
        sa.Column("university", sa.String(200), nullable=False),
        sa.Column("major", sa.String(160), nullable=False),
        sa.Column("minor", sa.String(160)),
        sa.Column("graduation_year", sa.Integer()),
        sa.Column("academic_year", sa.Integer(), nullable=False),
        sa.Column("gpa", sa.Float()),
        sa.Column("location", sa.String(200)),
        sa.Column("latitude", sa.Float()),
        sa.Column("longitude", sa.Float()),
        sa.Column("search_radius_miles", sa.Integer(), nullable=False),
        sa.Column("preferred_remote", sa.Boolean(), nullable=False),
        sa.Column("preferred_types", sa.JSON(), nullable=False),
        sa.Column("interests", sa.JSON(), nullable=False),
        sa.Column("career_goals", sa.Text()),
        sa.Column("research_interests", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "student_skills",
        sa.Column("user_id", sa.String(64), sa.ForeignKey("student_profiles.user_id", ondelete="CASCADE"), primary_key=True),
        sa.Column("skill_id", sa.Uuid(as_uuid=True), sa.ForeignKey("skills.id"), primary_key=True),
        sa.Column("source", sa.String(40), nullable=False),
    )
    if op.get_bind().dialect.name == "postgresql":
        for table in ("users", "student_profiles", "student_skills"):
            op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
            op.execute(f"""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                        EXECUTE 'REVOKE ALL ON TABLE {table} FROM anon, authenticated';
                    END IF;
                END $$;
            """)


def downgrade() -> None:
    op.drop_table("student_skills")
    op.drop_table("student_profiles")
    op.drop_table("users")
