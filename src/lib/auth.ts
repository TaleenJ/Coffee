import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getPool } from "@/lib/db";

export const SESSION_COOKIE_NAME = "mapahead_session";
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;

const FALLBACK_SESSION_SECONDS = 60 * 60 * 8;

export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function getSessionDuration(rememberMe: boolean) {
  return rememberMe ? THIRTY_DAYS_IN_SECONDS : undefined;
}

export type ClientInfo = {
  userAgent: string | null;
  ipAddress: string | null;
};

export function getClientInfo(request: Request): ClientInfo {
  const userAgent = request.headers.get("user-agent");
  // x-forwarded-for can be a comma-separated list; the first entry is the client.
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;

  return {
    userAgent: userAgent ?? null,
    ipAddress,
  };
}

/**
 * Creates a session row for a customer, captures the device/IP that started it,
 * and sets the session cookie. Used by both login and register.
 */
export async function createSession(
  customerId: string,
  rememberMe: boolean,
  client: ClientInfo,
): Promise<string> {
  const token = generateSessionToken();
  const maxAge = getSessionDuration(rememberMe) ?? FALLBACK_SESSION_SECONDS;

  await getPool().query(
    `
      INSERT INTO customer_sessions
        (customer_id, session_token, remember_me, expires_at, user_agent, ip_address)
      VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::interval, $5, $6);
    `,
    [customerId, token, rememberMe, maxAge, client.userAgent, client.ipAddress],
  );

  await setSessionCookie(token, rememberMe);
  return token;
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

export type CustomerSession = {
  id: string;
  rememberMe: boolean;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

/**
 * Returns the active (non-expired) sessions for a customer, newest first, so the
 * account page can render a "logged-in devices" list. The session token itself is
 * never returned; it is only used server-side to flag the current device.
 */
export async function getCustomerSessions(
  customerId: string,
): Promise<CustomerSession[]> {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;

  const result = await getPool().query<{
    id: string;
    session_token: string;
    remember_me: boolean;
    user_agent: string | null;
    ip_address: string | null;
    created_at: string;
    expires_at: string;
  }>(
    `
      SELECT id, session_token, remember_me, user_agent, ip_address, created_at, expires_at
      FROM customer_sessions
      WHERE customer_id = $1
        AND expires_at > NOW()
      ORDER BY created_at DESC;
    `,
    [customerId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    rememberMe: row.remember_me,
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    current: currentToken !== null && row.session_token === currentToken,
  }));
}
