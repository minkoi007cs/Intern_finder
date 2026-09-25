/**
 * POST /auth/logout — revoke the refresh token at the hub and clear the cookie.
 * POST, not GET, so an <img src> on another page cannot sign someone out.
 */
import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, hubConfig, revoke, SESSION_COOKIE } from "@/lib/hub";

export async function POST(request: NextRequest): Promise<Response> {
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session !== null) await revoke(session.refreshToken); // best effort
  const response = NextResponse.redirect(new URL("/opportunities", hubConfig().appUrl), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
