/**
 * Browser side of hub sign-in. No token ever reaches this code: the session is an httpOnly cookie,
 * and backend calls go through the same-origin /api/backend proxy, which adds the token server side.
 */

/** Is someone signed in? Also refreshes the session server side when it is about to expire. */
export async function getSession(): Promise<{ signedIn: boolean }> {
  try {
    const response = await fetch("/api/session", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) return { signedIn: false };
    return (await response.json()) as { signedIn: boolean };
  } catch {
    return { signedIn: false };
  }
}

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time in this tab: the hub revokes every session if a refresh token is replayed. */
function refreshOnce(): Promise<boolean> {
  refreshing ??= fetch("/auth/refresh", { method: "POST", credentials: "same-origin" })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

/** fetch() against the backend as the signed-in person. `path` starts with "/", e.g. "/profile". */
export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const call = () => fetch(`/api/backend${path}`, { ...init, cache: "no-store", credentials: "same-origin" });
  const response = await call();
  if (response.status !== 401) return response;
  const body = (await response.clone().json().catch(() => null)) as { expired?: boolean } | null;
  if (!body?.expired || !(await refreshOnce())) return response;
  return call();
}

/** Where the sign-in buttons go. The hub shows its own page (email, Google, GitHub, Microsoft). */
export function signInUrl(provider?: "google" | "github" | "microsoft", next = "/profile"): string {
  const params = new URLSearchParams({ next });
  if (provider) params.set("provider", provider);
  return `/auth/login?${params.toString()}`;
}
