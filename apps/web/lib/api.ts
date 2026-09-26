import { backendFetch } from "./auth";
import type { FeedFilters, Opportunity, Place, Recommendation, RecommendationPage } from "./types";

/** Public, read-only backend routes — same-origin through /api/backend (see its route.ts). */
async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/backend${path}`, { cache: "no-store", credentials: "same-origin", signal });
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return (await response.json()) as T;
}

export const PAGE_SIZE = 20;

function feedQuery(filters: FeedFilters, offset: number): string {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), sort: filters.sort });
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.opportunityType !== "ALL") params.set("opportunity_type", filters.opportunityType);
  if (filters.remoteOnly) params.set("remote_only", "true");
  return params.toString();
}

export function getDemoRecommendations(filters: FeedFilters, offset = 0): Promise<RecommendationPage> {
  return getJson<RecommendationPage>(`/demo/recommendations?${feedQuery(filters, offset)}`);
}

/** City suggestions for the profile form (offline list on the backend). */
export async function searchPlaces(q: string, signal?: AbortSignal): Promise<{ items: Place[]; attribution: string }> {
  return getJson<{ items: Place[]; attribution: string }>(`/places?${new URLSearchParams({ q, limit: "8" }).toString()}`, signal);
}

export function getOpportunity(id: string): Promise<Opportunity> {
  return getJson<Opportunity>(`/opportunities/${encodeURIComponent(id)}`);
}

export function getDemoRecommendation(id: string): Promise<Recommendation> {
  return getJson<Recommendation>(`/demo/recommendations/${encodeURIComponent(id)}`);
}

/** null → signed in but no profile yet. */
export async function getPersonalRecommendations(filters: FeedFilters, offset = 0): Promise<RecommendationPage | null> {
  const response = await backendFetch(`/recommendations?${feedQuery(filters, offset)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load recommendations (${response.status})`);
  return (await response.json()) as RecommendationPage;
}

export async function getPersonalRecommendation(id: string): Promise<Recommendation> {
  const response = await backendFetch(`/recommendations/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error(`Could not load recommendation (${response.status})`);
  return (await response.json()) as Recommendation;
}
