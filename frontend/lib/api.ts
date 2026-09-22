import type { Opportunity, Recommendation } from "./types";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return (await response.json()) as T;
}

export function getDemoRecommendations(): Promise<Recommendation[]> {
  return getJson<Recommendation[]>("/demo/recommendations?limit=40");
}

export function getOpportunity(id: string): Promise<Opportunity> {
  return getJson<Opportunity>(`/opportunities/${encodeURIComponent(id)}`);
}

export function getDemoRecommendation(id: string): Promise<Recommendation> {
  return getJson<Recommendation>(`/demo/recommendations/${encodeURIComponent(id)}`);
}

export async function getPersonalRecommendations(token: string): Promise<Recommendation[] | null> {
  const response = await fetch(`${apiBaseUrl}/recommendations?limit=40`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load recommendations (${response.status})`);
  return (await response.json()) as Recommendation[];
}

export async function getPersonalRecommendation(id: string, token: string): Promise<Recommendation> {
  const response = await fetch(`${apiBaseUrl}/recommendations/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!response.ok) throw new Error(`Could not load recommendation (${response.status})`);
  return (await response.json()) as Recommendation;
}
