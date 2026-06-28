import { NextResponse } from "next/server";
import { clearSessionCookie, getCurrentCustomer } from "@/lib/auth";
import { ensureAuthTables, getPool } from "@/lib/db";

export async function DELETE() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    await ensureAuthTables();
    // ON DELETE CASCADE on customer_sessions, customer_favorites, orders,
    // shop_reviews and shop_claims removes all of this customer's data too.
    await getPool().query(`DELETE FROM customers WHERE id = $1;`, [customer.id]);
  } catch (err) {
    console.error("Failed to delete account:", err);
    return NextResponse.json(
      { error: "Couldn't delete your account. Try again." },
      { status: 500 },
    );
  } finally {
    await clearSessionCookie();
  }

  return NextResponse.json({ ok: true });
}
