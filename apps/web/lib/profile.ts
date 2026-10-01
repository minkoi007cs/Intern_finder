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

export async function getProfile(): Promise<ProfilePayload | null> {
  const response = await fetch("/api/profile", { cache: "no-store", credentials: "same-origin" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await profileError(response));
  return (await response.json()) as ProfilePayload;
}

export async function putProfile(data: ProfilePayload): Promise<ProfilePayload> {
  const response = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await profileError(response));
  return (await response.json()) as ProfilePayload;
}

async function profileError(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  return body?.error?.message ?? "Could not save your profile. Please try again.";
}
