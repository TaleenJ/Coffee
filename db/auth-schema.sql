CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

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

ALTER TABLE customer_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE customer_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;

CREATE INDEX IF NOT EXISTS idx_customer_sessions_token
  ON customer_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer
  ON customer_sessions(customer_id);

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

ALTER TABLE customer_favorites ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE customer_favorites ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE customer_favorites ADD COLUMN IF NOT EXISTS opening_hours TEXT;

CREATE INDEX IF NOT EXISTS idx_customer_favorites_customer
  ON customer_favorites(customer_id);

-- A shop owner's claim over an OSM shop, verified via a (simulated) OTP to the
-- shop's public OSM phone number. UNIQUE(osm_id) = one owner per shop.
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

CREATE INDEX IF NOT EXISTS idx_shop_claims_owner ON shop_claims(owner_id);

-- Coffee orders placed by a user against a shop (by OSM id).
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

CREATE INDEX IF NOT EXISTS idx_orders_osm ON orders(osm_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

-- First-party shop reviews (one per customer per shop; gated to customers who
-- have ordered from that shop).
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

CREATE INDEX IF NOT EXISTS idx_shop_reviews_osm ON shop_reviews(osm_id);
