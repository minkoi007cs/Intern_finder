import { NextResponse, type NextRequest } from "next/server";
import { recommendation } from "@/lib/catalog";
import { decodeSession, HubApiError, SESSION_COOKIE } from "@/lib/hub";
import { readProfile } from "@/lib/student-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) return NextResponse.json({ error: { message: "Opportunity not found." } }, { status: 404 });
  let profile;
  if (request.nextUrl.searchParams.get("personal") === "true") {
    const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) return NextResponse.json({ error: { message: "Please sign in." } }, { status: 401 });
    try { profile = await readProfile(session.accessToken); }
    catch (error) {
      const status = error instanceof HubApiError ? error.status : 503;
      const message = error instanceof HubApiError ? error.message : "Could not load your profile.";
      return NextResponse.json({ error: { message } }, { status });
    }
    if (!profile) return NextResponse.json({ error: { message: "Create a profile first." } }, { status: 404 });
  }
  const item = await recommendation(id, profile);
  return item ? NextResponse.json(item) : NextResponse.json({ error: { message: "Opportunity not found." } }, { status: 404 });
}
