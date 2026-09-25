/**
 * GET /auth/login?provider=google|github|microsoft&next=/…
 * Starts hosted sign-in on the hub: fresh PKCE verifier + state in a short-lived httpOnly cookie.
 * The hub only ever sees the verifier's hash.
 */
import { NextResponse } from "next/server";
import { authorizeRequest, setFlow } from "@/lib/hub";

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const { url, flow } = authorizeRequest(params.get("provider"), params.get("next") ?? "/profile");
  const response = NextResponse.redirect(url, 303);
  setFlow(response, flow);
  return response;
}
