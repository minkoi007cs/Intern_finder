/**
 * GET /api/session → { signedIn }. Never returns a token. Refreshes the session here when it is
 * about to expire, so the backend calls that follow on the same page start with a fresh token.
 */
import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, REFRESH_WINDOW_MS, refreshPair, SESSION_COOKIE, setSession } from "@/lib/hub";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session === null) return NextResponse.json({ signedIn: false });
  if (session.expiresAt - Date.now() > REFRESH_WINDOW_MS) return NextResponse.json({ signedIn: true });

  const outcome = await refreshPair(session.refreshToken);
  if (outcome.pair !== null) {
    const response = NextResponse.json({ signedIn: true });
    setSession(response, outcome.pair);
    return response;
  }
  if (outcome.terminal) {
    const response = NextResponse.json({ signedIn: false });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  // Hub unreachable: still signed in; the backend call decides whether the old token works.
  return NextResponse.json({ signedIn: true });
}
