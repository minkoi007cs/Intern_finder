import "server-only";
import { hubData } from "./hub";
import type { FeedFilters, Match, Opportunity, Recommendation, RecommendationPage } from "./types";
import type { ProfilePayload } from "./profile";

type Features = {
  tags: string[];
  majors: string[];
  minimumYear: number | null;
  latitude: number | null;
  longitude: number | null;
};
type CatalogRecord = { opportunity: Opportunity; features: Features };
type CatalogRow = Record<string, unknown> & { id: string; details_json: string };

const groups = [
  ["INTERNSHIP", 20, "Example Tech Studio", "Software Engineering Intern", "Build student-scale software projects with a fictional mentoring team."],
  ["RESEARCH", 10, "Example University Research Lab", "Undergraduate Research Assistant", "Explore an illustrative undergraduate AI research project."],
  ["SCHOLARSHIP", 5, "Example Student Foundation", "Student Innovation Scholarship", "A fictional scholarship example for exploring the product."],
  ["HACKATHON", 5, "Example Campus Hackathon", "Student Technology Hackathon", "A fictional hackathon example for exploring the product."],
] as const;
const skillSets = [
  { required: ["Python", "Git"], preferred: ["PyTorch", "SQL"], tags: ["Machine Learning", "Research"] },
  { required: ["JavaScript", "React"], preferred: ["TypeScript", "Git"], tags: ["Software Engineering", "Web Development"] },
  { required: ["Python", "SQL"], preferred: ["Data Analysis", "Git"], tags: ["Data Science", "Business Analytics"] },
  { required: ["C++", "Git"], preferred: ["Python", "Algorithms"], tags: ["Software Engineering", "Algorithms"] },
];
const cities = [
  ["New York, NY", 40.7128, -74.0060],
  ["Philadelphia, PA", 39.9526, -75.1636],
  ["Boston, MA", 42.3601, -71.0589],
] as const;
const weights: Record<string, number> = { skills: .35, interests: .20, major: .10, experience: .10, location: .10, preference: .10, recency: .05 };
const aliases: Record<string, string> = { js: "javascript", "react.js": "react", reactjs: "react", postgres: "postgresql", "pytorch lightning": "pytorch", py: "python" };

function day(offset: number): string {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function demoCatalog(): CatalogRecord[] {
  return groups.flatMap(([kind, count, organization, title, description]) => Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const skills = skillSets[index % skillSets.length];
    const city = cities[index % cities.length];
    const remote = number % 3 === 0;
    return {
      opportunity: {
        id: `demo-${kind.toLowerCase()}-${String(number).padStart(2, "0")}`,
        title: `${title} — Demo ${String(number).padStart(2, "0")}`,
        organization,
        description: `${description} This is a sample listing, not a real opening.`,
        opportunity_type: kind,
        location: remote ? "Remote" : city[0],
        remote_type: remote ? "REMOTE" : "ONSITE",
        posted_date: day(-(number % 14)),
        deadline: day(30 + number),
        application_url: null,
        source_name: "OpportunityOS demo catalog",
        source_url: null,
        is_demo: true,
        skills: [...skills.required.map((name) => ({ name, required: true })), ...skills.preferred.filter((name) => !skills.required.includes(name)).map((name) => ({ name, required: false }))],
      },
      features: {
        tags: skills.tags,
        majors: kind === "INTERNSHIP" || kind === "RESEARCH" ? ["Computer Science"] : [],
        minimumYear: kind === "INTERNSHIP" || kind === "RESEARCH" ? 1 : null,
        latitude: remote ? null : city[1],
        longitude: remote ? null : city[2],
      },
    };
  }));
}

/** The hub catalog is the source of truth once public demo reads are enabled and rows exist. */
async function catalog(): Promise<CatalogRecord[]> {
  if (process.env.HUB_PUBLIC_CATALOG_ENABLED !== "true") return demoCatalog();
  try {
    const result = await hubData<CatalogRow>("opportunities", {
      action: "select", select: ["id", "details_json"],
      filters: [{ column: "is_demo", op: "eq", value: true }], limit: 1000,
    });
    const parsed = result.rows.flatMap((row) => {
      try {
        const data = JSON.parse(row.details_json) as CatalogRecord;
        if (!data.opportunity?.is_demo || !data.opportunity?.title || !data.features) return [];
        return [{ ...data, opportunity: { ...data.opportunity, id: row.id } }];
      } catch { return []; }
    });
    if (parsed.some((item) => !item.opportunity.deadline || item.opportunity.deadline >= day(0))) return parsed;
  } catch {
    // Until the hub's public-read policy is approved, the clearly labelled local demo stays usable.
  }
  return demoCatalog();
}

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const skill = (value: string) => aliases[normalize(value)] ?? normalize(value);
const round4 = (value: number) => Math.round(value * 10000) / 10000;

function distanceMiles(a: number, b: number, c: number, d: number): number {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(c - a), dLon = radians(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a)) * Math.cos(radians(c)) * Math.sin(dLon / 2) ** 2;
  return 2 * 3958.7613 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const sample: ProfilePayload = {
  full_name: "Sample student", university: "Example University", major: "Computer Science", minor: null,
  graduation_year: null, academic_year: 2, location: "New York, NY", latitude: 40.7128, longitude: -74.006,
  search_radius_miles: 50, preferred_remote: true, preferred_types: ["INTERNSHIP", "RESEARCH"],
  interests: ["Machine Learning", "Research", "Software Engineering", "Data Science"],
  career_goals: null, research_interests: [], skills: ["Python", "C++", "JavaScript", "React", "Git", "SQL"],
};

function score(student: ProfilePayload, record: CatalogRecord): Match {
  const { opportunity, features } = record;
  const owned = new Set(student.skills.map(skill));
  const required = new Set(opportunity.skills.filter((item) => item.required).map((item) => skill(item.name)));
  const preferred = new Set(opportunity.skills.filter((item) => !item.required).map((item) => skill(item.name)));
  const matchedRequired = [...required].filter((name) => owned.has(name)).sort();
  const matchedPreferred = [...preferred].filter((name) => owned.has(name)).sort();
  const missingRequired = [...required].filter((name) => !owned.has(name)).sort();
  const missingPreferred = [...preferred].filter((name) => !owned.has(name)).sort();
  const skills = required.size && preferred.size ? .7 * matchedRequired.length / required.size + .3 * matchedPreferred.length / preferred.size
    : required.size ? matchedRequired.length / required.size : preferred.size ? matchedPreferred.length / preferred.size : .5;
  const interests = new Set([...student.interests, ...student.research_interests].map(normalize));
  const tags = new Set(features.tags.map(normalize));
  const shared = [...tags].filter((name) => interests.has(name));
  const interestScore = tags.size ? shared.length / tags.size : .5;
  const major = features.majors.length ? Number(features.majors.map(normalize).includes(normalize(student.major))) : .5;
  const experience = features.minimumYear === null ? .5 : Number(student.academic_year >= features.minimumYear);
  let location = .5;
  if (opportunity.remote_type === "REMOTE") location = student.preferred_remote ? 1 : .5;
  else if (student.latitude !== null && student.longitude !== null && features.latitude !== null && features.longitude !== null) {
    const miles = distanceMiles(student.latitude, student.longitude, features.latitude, features.longitude);
    const radius = Math.max(student.search_radius_miles, 1);
    location = miles <= radius ? Math.max(0, 1 - miles / (2 * radius)) : 0;
  }
  const preference = student.preferred_types.length ? Number(student.preferred_types.map((item) => item.toUpperCase()).includes(opportunity.opportunity_type.toUpperCase())) : .5;
  const age = opportunity.posted_date ? Math.max(0, Math.floor((Date.now() - new Date(`${opportunity.posted_date}T12:00:00Z`).getTime()) / 86400000)) : null;
  const recency = age === null ? .5 : Math.max(0, 1 - age / 90);
  const components = { skills: round4(skills), interests: round4(interestScore), major: round4(major), experience: round4(experience), location: round4(location), preference: round4(preference), recency: round4(recency) };
  const overall_score = Math.round(100 * Object.entries(components).reduce((sum, [key, value]) => sum + weights[key] * value, 0));
  const reasons = [
    matchedRequired.length ? `Matching required skills: ${matchedRequired.join(", ")}` : null,
    shared.length ? `Matches your interests: ${shared.sort().join(", ")}` : null,
    major === 1 ? "Matches your major" : null,
    opportunity.remote_type === "REMOTE" && student.preferred_remote ? "Fits your remote preference" : null,
  ].filter((item): item is string => item !== null);
  if (!reasons.length) reasons.push("Explore the requirements and decide whether this fits your goals");
  const next_action = missingRequired.length ? `Consider building experience with ${missingRequired[0]} before applying.`
    : missingPreferred.length ? `You could strengthen your profile with ${missingPreferred[0]}.`
    : "Review the details and prepare an application if it interests you.";
  return { overall_score, score_label: "Profile compatibility", score_version: "weighted-v1", components,
    matched_skills: [...new Set([...matchedRequired, ...matchedPreferred])].sort(),
    missing_required_skills: missingRequired, missing_preferred_skills: missingPreferred, reasons, next_action };
}

function matches(record: CatalogRecord, filters: FeedFilters): boolean {
  const { opportunity } = record;
  if (filters.opportunityType !== "ALL" && opportunity.opportunity_type !== filters.opportunityType) return false;
  if (filters.remoteOnly && opportunity.remote_type !== "REMOTE") return false;
  if (opportunity.deadline && opportunity.deadline < day(0)) return false;
  const q = normalize(filters.q);
  return !q || [opportunity.title, opportunity.organization, opportunity.description, ...opportunity.skills.map((item) => item.name)].some((text) => normalize(text).includes(q));
}

export async function recommendations(filters: FeedFilters, offset: number, limit: number, profile?: ProfilePayload): Promise<RecommendationPage> {
  const records = (await catalog()).filter((item) => matches(item, filters));
  const student = profile ?? sample;
  const items = records.map((record) => ({ opportunity: record.opportunity, match: score(student, record) }));
  if (filters.sort === "deadline") items.sort((a, b) => (a.opportunity.deadline ?? "9999").localeCompare(b.opportunity.deadline ?? "9999") || b.match.overall_score - a.match.overall_score);
  else items.sort((a, b) => b.match.overall_score - a.match.overall_score || a.opportunity.title.localeCompare(b.opportunity.title));
  return { items: items.slice(offset, offset + limit), total: items.length, offset, limit, next_offset: offset + limit < items.length ? offset + limit : null };
}

export async function recommendation(id: string, profile?: ProfilePayload): Promise<Recommendation | null> {
  const record = (await catalog()).find((item) => item.opportunity.id === id);
  return record ? { opportunity: record.opportunity, match: score(profile ?? sample, record) } : null;
}
