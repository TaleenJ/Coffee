import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getPool } from "@/lib/db";

export const SESSION_COOKIE_NAME = "mapahead_session";
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function getSessionDuration(rememberMe: boolean) {
  return rememberMe ? THIRTY_DAYS_IN_SECONDS : undefined;
}

export async function setSessionCookie(
  token: string,
  rememberMe: boolean,
) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionDuration(rememberMe),
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentCustomer() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const result = await getPool().query<{
      id: string;
      name: string;
      email: string;
    }>(
      `
        SELECT c.id, c.name, c.email
        FROM customer_sessions s
        JOIN customers c ON c.id = s.customer_id
        WHERE s.session_token = $1
          AND s.expires_at > NOW()
        LIMIT 1;
      `,
      [token],
    );

    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}
