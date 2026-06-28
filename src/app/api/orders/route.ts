import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/auth";
import { ensureAuthTables } from "@/lib/db";
import { availableDrinkIdsForShop, cartTotal, sanitizeCart } from "@/lib/menu";
import { placeOrder } from "@/lib/orders";

export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json(
      { error: "Please sign in to place an order." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    osmId?: string;
    shopName?: string;
    items?: unknown;
    note?: string;
  };

  const osmId = body.osmId?.trim();
  const shopName = body.shopName?.trim();
  if (!osmId || !shopName) {
    return NextResponse.json(
      { error: "Missing shop information." },
      { status: 400 },
    );
  }

  const cart = sanitizeCart(body.items);
  if (!cart) {
    return NextResponse.json(
      { error: "Your cart is empty or invalid." },
      { status: 400 },
    );
  }

  // Enforce this shop's available drinks so unavailable items can't be ordered.
  const allowed = new Set(availableDrinkIdsForShop(osmId));
  const items = cart.items.filter((item) => allowed.has(item.id));
  if (items.length === 0) {
    return NextResponse.json(
      { error: "Those drinks aren't available at this shop." },
      { status: 400 },
    );
  }
  const total = cartTotal(items);

  const note = body.note?.trim().slice(0, 280) || null;

  await ensureAuthTables();
  const order = await placeOrder({
    osmId,
    shopName,
    customerId: customer.id,
    customerName: customer.name,
    items,
    note,
    total,
  });

  return NextResponse.json({ order });
}
