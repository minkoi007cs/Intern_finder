/**
 * GET /auth/callback?code=…&state=… — the hub sends the person back here.
 * The state must match the one this browser started with (otherwise it is someone else's sign-in
 * replayed into this browser); the code is redeemed server to server with sk_ + the PKCE verifier.
 */
import { NextResponse, type NextRequest } from "next/server";
import { decodeFlow, exchangeCode, FLOW_COOKIE, hubConfig, sameString, setSession } from "@/lib/hub";

function back(error: string): NextResponse {
  const url = new URL("/login", hubConfig().appUrl);
  url.searchParams.set("error", error);
  const response = NextResponse.redirect(url, 303);
  response.cookies.delete(FLOW_COOKIE);
  return response;
}

export async function GET(request: NextRequest): Promise<Response> {
  const params = new URL(request.url).searchParams;
  if (params.get("error") === "access_denied") return back("denied");

  const flow = decodeFlow(request.cookies.get(FLOW_COOKIE)?.value);
  const code = params.get("code");
  const state = params.get("state");
  if (flow === null) return back("expired");
  if (code === null || state === null || !sameString(state, flow.state)) return back("state");

  const pair = await exchangeCode(code, flow.codeVerifier);
  if (pair === null) return back("exchange");

  const response = NextResponse.redirect(new URL(flow.next, hubConfig().appUrl), 303);
  setSession(response, pair);
  response.cookies.delete(FLOW_COOKIE);
  return response;
}
