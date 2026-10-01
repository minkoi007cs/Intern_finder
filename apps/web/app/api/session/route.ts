/**
 * GET /api/session → { signedIn }. The proxy refreshes before this route runs.
 */
import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/hub";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ signedIn: session !== null && session.expiresAt > Date.now() });
}
