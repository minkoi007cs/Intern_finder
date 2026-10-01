import "server-only";
import { hubData, hubMe, HubApiError } from "./hub";
import type { ProfilePayload } from "./profile";

type ProfileRow = Record<string, unknown> & {
  id: string;
  owner_id: string;
  profile_json: string;
};

export async function signedInUser(accessToken: string): Promise<{ id: string }> {
  const me = await hubMe(accessToken);
  if (!me?.user?.id) throw new HubApiError("UNAUTHENTICATED", 401, "Please sign in again.");
  return me.user;
}

export async function readProfile(accessToken: string): Promise<ProfilePayload | null> {
  const user = await signedInUser(accessToken);
  const result = await hubData<ProfileRow>("student_profiles", {
    action: "select",
    select: ["id", "profile_json"],
    filters: [{ column: "owner_id", op: "eq", value: user.id }],
    limit: 1,
  }, accessToken);
  const row = result.rows[0];
  if (!row) return null;
  try {
    return JSON.parse(row.profile_json) as ProfilePayload;
  } catch {
    throw new HubApiError("INVALID_PROFILE", 500, "The saved profile could not be read.");
  }
}

function cleanText(value: unknown, max: number, required = false): string | null {
  if (value === null || value === undefined || value === "") return required ? null : "";
  if (typeof value !== "string" || value.length > max) return null;
  const trimmed = value.trim();
  return required && !trimmed ? null : trimmed;
}

function cleanList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const items = value.map((item) => cleanText(item, 100, true));
  return items.some((item) => item === null) ? null : Array.from(new Set(items as string[]));
}

export function validateProfile(value: unknown): ProfilePayload | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  const full_name = cleanText(p.full_name, 160, true);
  const university = cleanText(p.university, 200, true);
  const major = cleanText(p.major, 160, true);
  const minor = p.minor === null ? null : cleanText(p.minor, 160);
  const location = p.location === null ? null : cleanText(p.location, 200);
  const career_goals = p.career_goals === null ? null : cleanText(p.career_goals, 2000);
  const skills = cleanList(p.skills);
  const interests = cleanList(p.interests);
  const preferred_types = cleanList(p.preferred_types);
  const research_interests = cleanList(p.research_interests);
  const academic_year = Number(p.academic_year);
  const graduation_year = p.graduation_year === null ? null : Number(p.graduation_year);
  const latitude = p.latitude === null ? null : Number(p.latitude);
  const longitude = p.longitude === null ? null : Number(p.longitude);
  const search_radius_miles = Number(p.search_radius_miles);
  if (!full_name || !university || !major || skills === null || interests === null || preferred_types === null || research_interests === null) return null;
  if ((p.minor !== null && minor === null) || (p.location !== null && location === null) || (p.career_goals !== null && career_goals === null)) return null;
  if (!Number.isInteger(academic_year) || academic_year < 1 || academic_year > 10) return null;
  if (graduation_year !== null && (!Number.isInteger(graduation_year) || graduation_year < 1900 || graduation_year > 2200)) return null;
  if (latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) return null;
  if (longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180)) return null;
  if (!Number.isFinite(search_radius_miles) || search_radius_miles < 1 || search_radius_miles > 1000) return null;
  if (typeof p.preferred_remote !== "boolean") return null;
  return {
    full_name: full_name!, university: university!, major: major!, minor,
    graduation_year, academic_year, location, latitude, longitude,
    search_radius_miles, preferred_remote: p.preferred_remote,
    preferred_types: preferred_types!, interests: interests!, career_goals,
    research_interests: research_interests!, skills: skills!,
  };
}

export async function saveProfile(accessToken: string, profile: ProfilePayload): Promise<ProfilePayload> {
  const user = await signedInUser(accessToken);
  const existing = await hubData<ProfileRow>("student_profiles", {
    action: "select", select: ["id"],
    filters: [{ column: "owner_id", op: "eq", value: user.id }], limit: 1,
  }, accessToken);
  const values = {
    full_name: profile.full_name,
    university: profile.university,
    major: profile.major,
    academic_year: profile.academic_year,
    profile_json: JSON.stringify(profile),
  };
  if (existing.rows[0]) {
    await hubData("student_profiles", {
      action: "update", values: [values],
      filters: [{ column: "id", op: "eq", value: existing.rows[0].id }],
    }, accessToken);
  } else {
    await hubData("student_profiles", {
      action: "insert", values: [{ ...values, owner_id: user.id }],
    }, accessToken);
  }
  return profile;
}
