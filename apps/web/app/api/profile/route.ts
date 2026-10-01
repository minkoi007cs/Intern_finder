import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, HubApiError, SESSION_COOKIE } from "@/lib/hub";
import { readProfile, saveProfile, validateProfile } from "@/lib/student-server";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  if (error instanceof HubApiError) return NextResponse.json({ error: { message: error.message } }, { status: error.status || 503 });
  return NextResponse.json({ error: { message: "Could not reach the hub. Please try again." } }, { status: 503 });
}

export async function GET(request: NextRequest): Promise<Response> {
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: { message: "Please sign in." } }, { status: 401 });
  try {
    const profile = await readProfile(session.accessToken);
    return profile ? NextResponse.json(profile) : NextResponse.json({ error: { message: "Profile not created." } }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: { message: "Please sign in." } }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const profile = validateProfile(body);
  if (!profile) return NextResponse.json({ error: { message: "Check the profile fields and try again." } }, { status: 400 });
  try {
    return NextResponse.json(await saveProfile(session.accessToken, profile));
  } catch (error) {
    return errorResponse(error);
  }
}
