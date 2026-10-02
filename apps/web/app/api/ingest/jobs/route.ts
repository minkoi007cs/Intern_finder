import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedSync } from "@/lib/github-oidc";
import { isBoardId } from "@/lib/job-sources";
import { syncBoard } from "@/lib/job-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<Response> {
  if (!await isAuthorizedSync(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const board = request.nextUrl.searchParams.get("source") ?? "";
  if (!isBoardId(board)) return NextResponse.json({ error: "Unknown source" }, { status: 400 });
  try {
    return NextResponse.json(await syncBoard(board));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    console.error(`Job sync failed for ${board}: ${message}`);
    return NextResponse.json({ error: "Sync failed", source: board }, { status: 502 });
  }
}
