import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/auth";
import { ensureAuthTables } from "@/lib/db";
import { deleteMyOrder, updateOrderStatus, type OrderStatus } from "@/lib/orders";

const ALLOWED: OrderStatus[] = [
  "new",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (customer.role !== "owner") {
    return NextResponse.json({ error: "Owners only." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as { status?: string; advance?: boolean };

  let nextStatus: OrderStatus | undefined;
  if (body.status && ALLOWED.includes(body.status as OrderStatus)) {
    nextStatus = body.status as OrderStatus;
  }
  if (!nextStatus) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  await ensureAuthTables();
  const result = await updateOrderStatus(customer.id, id, nextStatus);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ order: result.order });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;

  await ensureAuthTables();
  const removed = await deleteMyOrder(customer.id, id);
  if (!removed) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
