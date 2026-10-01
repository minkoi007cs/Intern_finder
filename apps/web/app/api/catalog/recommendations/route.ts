import { NextResponse, type NextRequest } from "next/server";
import { recommendations } from "@/lib/catalog";
import { decodeSession, HubApiError, SESSION_COOKIE } from "@/lib/hub";
import { readProfile } from "@/lib/student-server";
import type { FeedFilters } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  const filters: FeedFilters = {
    q: (params.get("q") ?? "").slice(0, 100),
    opportunityType: (params.get("opportunity_type") ?? "ALL").toUpperCase(),
    remoteOnly: params.get("remote_only") === "true",
    sort: params.get("sort") === "deadline" ? "deadline" : "match",
  };
  const limit = Math.min(50, Math.max(1, Number(params.get("limit") ?? 20) || 20));
  const offset = Math.min(10000, Math.max(0, Number(params.get("offset") ?? 0) || 0));
  let profile;
  if (params.get("personal") === "true") {
    const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: { message: "Please sign in." } }, { status: 401 });
    try {
      profile = await readProfile(session.accessToken);
    } catch (error) {
      const status = error instanceof HubApiError ? error.status : 503;
      const message = error instanceof HubApiError ? error.message : "Could not load your profile.";
      return NextResponse.json({ error: { message } }, { status });
    }
    if (!profile) return NextResponse.json({ error: { message: "Create a profile first." } }, { status: 404 });
  }
  return NextResponse.json(await recommendations(filters, offset, limit, profile));
}
