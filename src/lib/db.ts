import { Pool } from "pg";

let cachedPool: Pool | null = null;

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing. Add it to your environment.");
  }

  return new Pool({
    // Strip libpq SSL params from the URL so the explicit `ssl` config below is
    // the single source of truth. Otherwise `sslmode=require` makes pg verify the
    // server cert against Node's default CA store, which fails for RDS's Amazon CA
    // with UNABLE_TO_GET_ISSUER_CERT_LOCALLY.
    connectionString: stripUrlSslParams(connectionString),
    ssl: { rejectUnauthorized: false },
  });
}

function stripUrlSslParams(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    for (const param of ["sslmode", "uselibpqcompat", "ssl"]) {
      url.searchParams.delete(param);
    }
    return url.toString();
  } catch {
    // If it isn't a parseable URL, leave it untouched.
    return connectionString;
  }
}

export function getPool() {
  if (!cachedPool) {
    cachedPool = createPool();
  }
  return cachedPool;
}

export type CustomerRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
};

export async function ensureAuthTables() {
  const pool = getPool();
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      session_token TEXT UNIQUE NOT NULL,
      remember_me BOOLEAN NOT NULL DEFAULT FALSE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_agent TEXT,
      ip_address TEXT
    );
  `);

  // Backfill columns on databases that created the table before these existed.
  await pool.query(`
    ALTER TABLE customer_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
  `);
  await pool.query(`
    ALTER TABLE customer_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_sessions_token
      ON customer_sessions(session_token);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer
      ON customer_sessions(customer_id);
  `);
}
