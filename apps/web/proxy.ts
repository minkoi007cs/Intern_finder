import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { decodeSession, encodedSession, REFRESH_WINDOW_MS, refreshPair, SESSION_COOKIE, setSession, type TokenPair } from "@/lib/hub";

type RefreshResult = { pair: TokenPair | null; terminal: boolean };
const inFlight = new Map<string, Promise<RefreshResult>>();

function refreshOnce(token: string): Promise<RefreshResult> {
  const key = createHash("sha256").update(token).digest("hex");
  const existing = inFlight.get(key);
  if (existing) return existing;
  const pending = refreshPair(token);
  inFlight.set(key, pending);
  // Rotating refresh tokens cannot be replayed. Briefly reuse the same result for parallel requests.
  setTimeout(() => inFlight.delete(key), 10_000);
  return pending;
}

function forwarded(request: NextRequest, value: string | null): NextResponse {
  const headers = new Headers(request.headers);
  const rest = (headers.get("cookie") ?? "").split(";").map((part) => part.trim()).filter((part) => part && !part.startsWith(`${SESSION_COOKIE}=`));
  if (value !== null) rest.push(`${SESSION_COOKIE}=${value}`);
  if (rest.length) headers.set("cookie", rest.join("; "));
  else headers.delete("cookie");
  return NextResponse.next({ request: { headers } });
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.nextUrl.pathname.startsWith("/auth/")) return NextResponse.next();
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session === null || session.expiresAt - Date.now() > REFRESH_WINDOW_MS) return NextResponse.next();

  const outcome = await refreshOnce(session.refreshToken);
  if (outcome.pair) {
    const response = forwarded(request, encodedSession(outcome.pair));
    setSession(response, outcome.pair);
    return response;
  }
  if (outcome.terminal) {
    const response = forwarded(request, null);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
