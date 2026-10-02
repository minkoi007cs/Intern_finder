import type { FeedFilters, Place, Recommendation, RecommendationPage } from "./types";

/** Public catalog and private recommendation routes on this Next.js server. */
async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { cache: "no-store", credentials: "same-origin", signal });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export const PAGE_SIZE = 20;

function feedQuery(filters: FeedFilters, offset: number): string {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), sort: filters.sort, catalog: filters.catalog });
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.opportunityType !== "ALL") params.set("opportunity_type", filters.opportunityType);
  if (filters.remoteOnly) params.set("remote_only", "true");
  return params.toString();
}

export function getDemoRecommendations(filters: FeedFilters, offset = 0): Promise<RecommendationPage> {
  return getJson<RecommendationPage>(`/api/catalog/recommendations?${feedQuery(filters, offset)}`);
}

/** City suggestions from a bundled GeoNames list. */
export async function searchPlaces(q: string, signal?: AbortSignal): Promise<{ items: Place[]; attribution: string }> {
  return getJson<{ items: Place[]; attribution: string }>(`/api/places?${new URLSearchParams({ q, limit: "8" }).toString()}`, signal);
}

export function getDemoRecommendation(id: string): Promise<Recommendation> {
  return getJson<Recommendation>(`/api/catalog/recommendations/${encodeURIComponent(id)}`);
}

/** null → signed in but no profile yet. */
export async function getPersonalRecommendations(filters: FeedFilters, offset = 0): Promise<RecommendationPage | null> {
  const response = await fetch(`/api/catalog/recommendations?personal=true&${feedQuery(filters, offset)}`, { cache: "no-store", credentials: "same-origin" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load recommendations (${response.status})`);
  return (await response.json()) as RecommendationPage;
}

export async function getPersonalRecommendation(id: string): Promise<Recommendation> {
  const response = await fetch(`/api/catalog/recommendations/${encodeURIComponent(id)}?personal=true`, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Could not load recommendation (${response.status})`);
  return (await response.json()) as Recommendation;
}
