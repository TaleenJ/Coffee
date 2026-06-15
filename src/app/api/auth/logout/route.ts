import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getPool } from "@/lib/db";

export async function POST() {
  try {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      await getPool().query(`DELETE FROM customer_sessions WHERE session_token = $1;`, [
        token,
      ]);
    }
  } catch (error) {
    console.error("Logout cleanup error:", error);
  } finally {
    await clearSessionCookie();
  }

  return NextResponse.json({ success: true });
}
