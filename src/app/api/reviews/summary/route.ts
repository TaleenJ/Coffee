import { NextRequest, NextResponse } from "next/server";
import { ensureAuthTables } from "@/lib/db";
import { getSummaries } from "@/lib/reviews";

export async function GET(request: NextRequest) {
  await ensureAuthTables();

  const raw = request.nextUrl.searchParams.get("osmIds")?.trim() ?? "";
  const osmIds = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 100);

  const summaries = await getSummaries(osmIds);
  return NextResponse.json({ summaries });
}
