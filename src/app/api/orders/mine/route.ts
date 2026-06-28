import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/auth";
import { ensureAuthTables } from "@/lib/db";
import { listMyOrders } from "@/lib/orders";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  await ensureAuthTables();
  const orders = await listMyOrders(customer.id);
  return NextResponse.json({ orders });
}
