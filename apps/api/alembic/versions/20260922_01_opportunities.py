"""Initial organization, skill, and opportunity catalog.

Revision ID: 20260922_01
Revises:
"""

import sqlalchemy as sa
from alembic import op

revision = "20260922_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column("organization_type", sa.String(60), nullable=False),
        sa.Column("website", sa.String(1000)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "skills",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column("aliases", sa.JSON(), nullable=False),
    )
    op.create_table(
        "opportunities",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("organization_id", sa.Uuid(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("title", sa.String(250), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("opportunity_type", sa.String(40), nullable=False),
        sa.Column("employment_type", sa.String(40)),
        sa.Column("location", sa.String(200)),
        sa.Column("latitude", sa.Float()),
        sa.Column("longitude", sa.Float()),
        sa.Column("remote_type", sa.String(30), nullable=False),
        sa.Column("salary_min", sa.Integer()),
        sa.Column("salary_max", sa.Integer()),
        sa.Column("salary_currency", sa.String(3)),
        sa.Column("majors_preferred", sa.JSON(), nullable=False),
        sa.Column("minimum_year", sa.Integer()),
        sa.Column("experience_level", sa.String(40)),
        sa.Column("research_fields", sa.JSON(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("application_url", sa.String(1000)),
        sa.Column("source_url", sa.String(1000)),
        sa.Column("source_name", sa.String(160), nullable=False),
        sa.Column("external_id", sa.String(250), unique=True),
        sa.Column("posted_date", sa.Date()),
        sa.Column("deadline", sa.Date()),
        sa.Column("sponsorship_information", sa.Text()),
        sa.Column("eligibility", sa.Text()),
        sa.Column("visa_status", sa.String(40), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("is_demo", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_verified_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_opportunities_type_status_deadline", "opportunities", ["opportunity_type", "status", "deadline"])
    op.create_index("ix_opportunities_location", "opportunities", ["latitude", "longitude"])
    op.create_table(
        "opportunity_skills",
        sa.Column("opportunity_id", sa.Uuid(as_uuid=True), sa.ForeignKey("opportunities.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("skill_id", sa.Uuid(as_uuid=True), sa.ForeignKey("skills.id"), primary_key=True),
        sa.Column("required", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("opportunity_id", "skill_id", name="uq_opportunity_skill"),
    )


def downgrade() -> None:
    op.drop_table("opportunity_skills")
    op.drop_index("ix_opportunities_location", table_name="opportunities")
    op.drop_index("ix_opportunities_type_status_deadline", table_name="opportunities")
    op.drop_table("opportunities")
    op.drop_table("skills")
    op.drop_table("organizations")
