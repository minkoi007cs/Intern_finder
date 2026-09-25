/**
 * /api/backend/<path> → FastAPI <API_URL>/<path>, with the signed-in person's access token.
 *
 * The browser calls this same-origin route; the token stays in the httpOnly cookie and is added
 * here, server side. This route never refreshes (parallel refreshes of one rotating refresh token
 * would look like theft to the hub) — an expired token is answered 401 { expired: true } and the
 * browser asks /auth/refresh once, then retries.
 */
import { NextResponse, type NextRequest } from "next/server";
import { backendUrl, decodeSession, SESSION_COOKIE } from "@/lib/hub";

export const dynamic = "force-dynamic";

const SAFE_SEGMENT = /^[A-Za-z0-9_-]{1,128}$/;
const EXPIRY_SKEW_MS = 5_000;

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await context.params;
  if (path.length === 0 || path.length > 4 || !path.every((segment) => SAFE_SEGMENT.test(segment))) {
    return NextResponse.json({ detail: "Not found" }, { status: 404 });
  }

  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session === null) return NextResponse.json({ detail: "Sign in required" }, { status: 401 });
  if (session.expiresAt - Date.now() < EXPIRY_SKEW_MS) {
    return NextResponse.json({ detail: "Session expired", expired: true }, { status: 401 });
  }

  const target = `${backendUrl()}/${path.join("/")}${new URL(request.url).search}`;
  const headers: Record<string, string> = { authorization: `Bearer ${session.accessToken}`, accept: "application/json" };
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json({ detail: "The opportunity API is unavailable" }, { status: 502 });
  }

  const body = await upstream.text();
  if (upstream.status === 401) {
    return NextResponse.json({ detail: "Session expired", expired: true }, { status: 401 });
  }
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
  });
}

export const GET = forward;
export const PUT = forward;
export const POST = forward;
export const DELETE = forward;
