import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession, getClientInfo } from "@/lib/auth";
import { CustomerRow, ensureAuthTables, getPool } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      rememberMe?: boolean;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const rememberMe = Boolean(body.rememberMe);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    await ensureAuthTables();

    const found = await getPool().query<CustomerRow>(
      `SELECT * FROM customers WHERE email = $1 LIMIT 1;`,
      [email],
    );

    const customer = found.rows[0];
    if (!customer) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const validPassword = await bcrypt.compare(password, customer.password_hash);
    if (!validPassword) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    await createSession(customer.id, rememberMe, getClientInfo(request));

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        role: customer.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }
}
