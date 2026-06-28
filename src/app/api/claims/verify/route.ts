import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/auth";
import { ensureAuthTables } from "@/lib/db";
import { verifyClaim } from "@/lib/claims";

export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (customer.role !== "owner") {
    return NextResponse.json({ error: "Owners only." }, { status: 403 });
  }

  const body = (await request.json()) as { osmId?: string; code?: string };
  const osmId = body.osmId?.trim();
  const code = body.code?.trim();
  if (!osmId || !code) {
    return NextResponse.json(
      { error: "osmId and code are required." },
      { status: 400 },
    );
  }

  await ensureAuthTables();
  const result = await verifyClaim(customer.id, osmId, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ claim: result.claim });
}
