import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession, getClientInfo } from "@/lib/auth";
import { ensureAuthTables, getPool } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      rememberMe?: boolean;
    };

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const rememberMe = Boolean(body.rememberMe);

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    await ensureAuthTables();

    const existing = await getPool().query(
      `SELECT id FROM customers WHERE email = $1 LIMIT 1;`,
      [email],
    );

    if (existing.rowCount) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let customer: { id: string; name: string; email: string };
    try {
      const inserted = await getPool().query<{
        id: string;
        name: string;
        email: string;
      }>(
        `
          INSERT INTO customers (name, email, password_hash)
          VALUES ($1, $2, $3)
          RETURNING id, name, email;
        `,
        [name, email, passwordHash],
      );
      customer = inserted.rows[0];
    } catch (insertError) {
      // The UNIQUE(email) constraint is the real guarantee against duplicate
      // accounts; it also closes the race where two requests pass the pre-check.
      if (isUniqueViolation(insertError)) {
        return NextResponse.json(
          { error: "An account with that email already exists." },
          { status: 409 },
        );
      }
      throw insertError;
    }

    await createSession(customer.id, rememberMe, getClientInfo(request));

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Could not create account." },
      { status: 500 },
    );
  }
}

// Postgres raises SQLSTATE 23505 on a unique-constraint violation.
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
