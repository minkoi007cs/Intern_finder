from app.ml.ranking import OpportunityFeatures
from app.models import Opportunity
from app.schemas.opportunity import OpportunityResponse, SkillEvidence


def to_response(opportunity: Opportunity) -> OpportunityResponse:
    return OpportunityResponse(
        id=opportunity.id,
        title=opportunity.title,
        organization=opportunity.organization.name,
        description=opportunity.description,
        opportunity_type=opportunity.opportunity_type,
        location=opportunity.location,
        remote_type=opportunity.remote_type,
        posted_date=opportunity.posted_date,
        deadline=opportunity.deadline,
        application_url=opportunity.application_url,
        source_name=opportunity.source_name,
        source_url=opportunity.source_url,
        is_demo=opportunity.is_demo,
        skills=[SkillEvidence(name=link.skill.name, required=link.required) for link in opportunity.opportunity_skills],
    )


def to_features(opportunity: Opportunity) -> OpportunityFeatures:
    return OpportunityFeatures(
        opportunity_type=opportunity.opportunity_type,
        required_skills=[link.skill.name for link in opportunity.opportunity_skills if link.required],
        preferred_skills=[link.skill.name for link in opportunity.opportunity_skills if not link.required],
        tags=opportunity.tags,
        majors_preferred=opportunity.majors_preferred,
        minimum_year=opportunity.minimum_year,
        latitude=opportunity.latitude,
        longitude=opportunity.longitude,
        remote_type=opportunity.remote_type,
        posted_date=opportunity.posted_date,
    )
