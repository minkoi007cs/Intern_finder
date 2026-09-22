import { apiBaseUrl } from "./api";

export type ProfilePayload = {
  full_name: string;
  university: string;
  major: string;
  minor: string | null;
  graduation_year: number | null;
  academic_year: number;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  search_radius_miles: number;
  preferred_remote: boolean;
  preferred_types: string[];
  interests: string[];
  career_goals: string | null;
  research_interests: string[];
  skills: string[];
};

export async function getProfile(token: string): Promise<ProfilePayload | null> {
  const response = await fetch(`${apiBaseUrl}/profile`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load profile (${response.status})`);
  return (await response.json()) as ProfilePayload;
}

export async function putProfile(token: string, data: ProfilePayload): Promise<ProfilePayload> {
  const response = await fetch(`${apiBaseUrl}/profile`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Could not save profile (${response.status})`);
  return (await response.json()) as ProfilePayload;
}
