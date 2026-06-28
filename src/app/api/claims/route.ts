import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/auth";
import { ensureAuthTables } from "@/lib/db";
import { createClaim, listClaims } from "@/lib/claims";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (customer.role !== "owner") {
    return NextResponse.json({ error: "Owners only." }, { status: 403 });
  }

  await ensureAuthTables();
  const claims = await listClaims(customer.id);
  return NextResponse.json({ claims });
}

export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (customer.role !== "owner") {
    return NextResponse.json({ error: "Owners only." }, { status: 403 });
  }

  const body = (await request.json()) as {
    osmId?: string;
    shopName?: string;
    phone?: string | null;
  };

  const osmId = body.osmId?.trim();
  const shopName = body.shopName?.trim();
  if (!osmId || !shopName) {
    return NextResponse.json(
      { error: "osmId and shopName are required." },
      { status: 400 },
    );
  }

  try {
    await ensureAuthTables();
    const result = await createClaim(customer.id, {
      osmId,
      shopName,
      phone: body.phone?.trim() || null,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      claim: result.claim,
      // Simulated SMS: in production this code would be texted, not returned.
      demoCode: result.demoCode,
      needsManual: result.needsManual,
    });
  } catch (err) {
    console.error("Failed to create claim:", err);
    return NextResponse.json(
      { error: "Couldn't claim that shop. Please try again." },
      { status: 500 },
    );
  }
}
