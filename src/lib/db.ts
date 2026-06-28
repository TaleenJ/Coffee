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
  role: string;
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
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 'user' (orders coffee) or 'owner' (runs a shop). Backfill existing rows.
  await pool.query(`
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
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

  // Favorited coffee shops. Shops come from live OSM data (not our DB), so we
  // store a snapshot keyed by the OSM id, unique per customer.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_favorites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      osm_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      distance_miles DOUBLE PRECISION,
      rating DOUBLE PRECISION,
      vibes TEXT[] NOT NULL DEFAULT '{}',
      image_url TEXT,
      phone TEXT,
      opening_hours TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (customer_id, osm_id)
    );
  `);

  // Backfill for databases that created the favorites table before these columns existed.
  await pool.query(`
    ALTER TABLE customer_favorites ADD COLUMN IF NOT EXISTS image_url TEXT;
  `);
  await pool.query(`
    ALTER TABLE customer_favorites ADD COLUMN IF NOT EXISTS phone TEXT;
  `);
  await pool.query(`
    ALTER TABLE customer_favorites ADD COLUMN IF NOT EXISTS opening_hours TEXT;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_favorites_customer
      ON customer_favorites(customer_id);
  `);

  // A shop owner's claim over an OSM shop. status: 'pending' | 'verified'.
  // Verification is a (simulated) OTP to the shop's public OSM phone number.
  // UNIQUE(osm_id) ensures only one owner can hold a given shop.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_claims (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      osm_id TEXT NOT NULL,
      shop_name TEXT NOT NULL,
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      verify_code TEXT,
      verify_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      verified_at TIMESTAMPTZ,
      UNIQUE (osm_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_shop_claims_owner
      ON shop_claims(owner_id);
  `);

  // Coffee orders placed by a user against a shop (by OSM id).
  // status: 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled'.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      osm_id TEXT NOT NULL,
      shop_name TEXT NOT NULL,
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      customer_name TEXT NOT NULL,
      items JSONB NOT NULL DEFAULT '[]',
      note TEXT,
      total NUMERIC(10, 2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_orders_osm ON orders(osm_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
  `);

  // First-party shop reviews. One per customer per shop (upserted). Writing is
  // gated server-side to customers who have ordered from that shop.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shop_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      osm_id TEXT NOT NULL,
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      customer_name TEXT NOT NULL,
      rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      body TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (osm_id, customer_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_shop_reviews_osm ON shop_reviews(osm_id);
  `);
}
