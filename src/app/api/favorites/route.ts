import { NextResponse } from "next/server";
import type { FavoriteShop } from "@/lib/coffeeShops";
import { getCurrentCustomer } from "@/lib/auth";
import { ensureAuthTables } from "@/lib/db";
import { addFavorite, listFavorites, removeFavorite } from "@/lib/favorites";

// GET /api/favorites — list the signed-in customer's favorites.
// Returns 401 for guests so the client falls back to localStorage.
export async function GET() {
  await ensureAuthTables();

  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const favorites = await listFavorites(customer.id);
  return NextResponse.json({ favorites });
}

// POST /api/favorites — add a favorite (idempotent via ON CONFLICT).
export async function POST(request: Request) {
  await ensureAuthTables();

  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const shop = (await request.json().catch(() => null)) as FavoriteShop | null;
  if (!shop?.id || !shop?.name) {
    return NextResponse.json(
      { error: "A shop id and name are required." },
      { status: 400 },
    );
  }

  await addFavorite(customer.id, shop);
  return NextResponse.json({ success: true });
}

// DELETE /api/favorites — remove a favorite by its OSM id.
export async function DELETE(request: Request) {
  await ensureAuthTables();

  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  await removeFavorite(customer.id, id);
  return NextResponse.json({ success: true });
}
