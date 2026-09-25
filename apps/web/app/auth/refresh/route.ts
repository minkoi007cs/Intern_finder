/**
 * POST /auth/refresh — called by the browser (one call at a time, see lib/auth.ts) when the
 * backend proxy answered 401 because the access token expired.
 */
import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, refreshPair, SESSION_COOKIE, setSession } from "@/lib/hub";

export async function POST(request: NextRequest): Promise<Response> {
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session === null) return NextResponse.json({ signedIn: false }, { status: 401 });

  const outcome = await refreshPair(session.refreshToken);
  if (outcome.pair !== null) {
    const response = NextResponse.json({ signedIn: true });
    setSession(response, outcome.pair);
    return response;
  }
  if (outcome.terminal) {
    const response = NextResponse.json({ signedIn: false }, { status: 401 });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  return NextResponse.json({ signedIn: true, retryLater: true }, { status: 503 });
}
