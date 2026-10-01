/**
 * Browser side of hub sign-in. No token reaches this code: the session is an httpOnly cookie,
 * and browser reads/writes use same-origin Next.js routes.
 */

/** Is someone signed in? The server proxy handles refresh before this request. */
export async function getSession(): Promise<{ signedIn: boolean }> {
  try {
    const response = await fetch("/api/session", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) return { signedIn: false };
    return (await response.json()) as { signedIn: boolean };
  } catch {
    return { signedIn: false };
  }
}

/** Where the sign-in buttons go. The hub shows its own page (email, Google, GitHub, Microsoft). */
export function signInUrl(provider?: "google" | "github" | "microsoft", next = "/profile"): string {
  const params = new URLSearchParams({ next });
  if (provider) params.set("provider", provider);
  return `/auth/login?${params.toString()}`;
}
