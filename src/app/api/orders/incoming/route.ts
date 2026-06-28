import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/auth";
import { ensureAuthTables } from "@/lib/db";
import { listIncoming } from "@/lib/orders";

export async function GET(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (customer.role !== "owner") {
    return NextResponse.json({ error: "Owners only." }, { status: 403 });
  }

  const activeOnly =
    new URL(request.url).searchParams.get("all") !== "true";

  await ensureAuthTables();
  const orders = await listIncoming(customer.id, activeOnly);
  return NextResponse.json({ orders });
}
