import { NextResponse } from "next/server";
import { getCurrentCustomer, getCustomerSessions } from "@/lib/auth";
import { ensureAuthTables, getPool } from "@/lib/db";

// GET /api/auth/sessions — list the signed-in customer's active devices/sessions.
export async function GET() {
  await ensureAuthTables();

  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const sessions = await getCustomerSessions(customer.id);
  return NextResponse.json({ sessions });
}

// DELETE /api/auth/sessions — revoke one of the customer's other sessions ("sign out this device").
export async function DELETE(request: Request) {
  await ensureAuthTables();

  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    sessionId?: string;
  } | null;
  const sessionId = body?.sessionId?.trim();

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required." },
      { status: 400 },
    );
  }

  // Scope the delete to the current customer so one user can't revoke another's session.
  const result = await getPool().query(
    `DELETE FROM customer_sessions WHERE id = $1 AND customer_id = $2;`,
    [sessionId, customer.id],
  );

  if (!result.rowCount) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
