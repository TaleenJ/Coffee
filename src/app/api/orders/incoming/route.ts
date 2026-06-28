import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/auth";
import { ensureAuthTables } from "@/lib/db";
import { listIncoming, listPastIncoming } from "@/lib/orders";

export async function GET(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (customer.role !== "owner") {
    return NextResponse.json({ error: "Owners only." }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const scope = params.get("scope");

  await ensureAuthTables();
  const orders =
    scope === "past"
      ? await listPastIncoming(customer.id)
      : await listIncoming(customer.id, params.get("all") !== "true");
  return NextResponse.json({ orders });
}
