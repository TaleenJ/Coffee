import { randomInt } from "node:crypto";
import { getPool } from "@/lib/db";

export type ClaimStatus = "pending" | "verified";

export type ShopClaim = {
  id: string;
  osmId: string;
  shopName: string;
  phone: string | null;
  status: ClaimStatus;
  createdAt: string;
  verifiedAt: string | null;
};

type ClaimRow = {
  id: string;
  osm_id: string;
  shop_name: string;
  phone: string | null;
  status: ClaimStatus;
  created_at: string;
  verified_at: string | null;
};

function rowToClaim(row: ClaimRow): ShopClaim {
  return {
    id: row.id,
    osmId: row.osm_id,
    shopName: row.shop_name,
    phone: row.phone,
    status: row.status,
    createdAt: row.created_at,
    verifiedAt: row.verified_at,
  };
}

const CODE_TTL_MINUTES = 10;

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export type CreateClaimResult =
  | { ok: true; claim: ShopClaim; demoCode: string | null; needsManual: boolean }
  | { ok: false; error: string; status: number };

/**
 * Create or refresh an owner's claim on a shop. If the shop has a phone, we
 * generate an OTP (returned as `demoCode` to simulate the SMS). If not, the
 * claim is left pending for manual review.
 */
export async function createClaim(
  ownerId: string,
  input: { osmId: string; shopName: string; phone: string | null },
): Promise<CreateClaimResult> {
  const pool = getPool();

  const existing = await pool.query<ClaimRow & { owner_id: string }>(
    `SELECT *, owner_id FROM shop_claims WHERE osm_id = $1 LIMIT 1;`,
    [input.osmId],
  );

  const row = existing.rows[0];
  if (row && row.owner_id !== ownerId) {
    return {
      ok: false,
      error: "This shop has already been claimed by another owner.",
      status: 409,
    };
  }
  if (row && row.status === "verified") {
    return { ok: true, claim: rowToClaim(row), demoCode: null, needsManual: false };
  }

  const hasPhone = !!input.phone && input.phone.trim() !== "";
  const code = hasPhone ? generateCode() : null;

  // CODE_TTL_MINUTES is a trusted integer constant, so it's safe to inline.
  // (Passing it as a bound param and concatenating — `$6 || ' minutes'` — makes
  // Postgres see `unknown || unknown` and fail to resolve the operator, which
  // throws on every insert.)
  const upserted = await pool.query<ClaimRow>(
    `
      INSERT INTO shop_claims
        (owner_id, osm_id, shop_name, phone, status, verify_code, verify_expires_at)
      VALUES (
        $1, $2, $3, $4, 'pending', $5,
        CASE WHEN $5::text IS NULL THEN NULL
             ELSE NOW() + INTERVAL '${CODE_TTL_MINUTES} minutes' END
      )
      ON CONFLICT (osm_id) DO UPDATE SET
        shop_name = EXCLUDED.shop_name,
        phone = EXCLUDED.phone,
        verify_code = EXCLUDED.verify_code,
        verify_expires_at = EXCLUDED.verify_expires_at
      RETURNING id, osm_id, shop_name, phone, status, created_at, verified_at;
    `,
    [ownerId, input.osmId, input.shopName, input.phone, code],
  );

  return {
    ok: true,
    claim: rowToClaim(upserted.rows[0]),
    demoCode: code,
    needsManual: !hasPhone,
  };
}

export type VerifyResult =
  | { ok: true; claim: ShopClaim }
  | { ok: false; error: string; status: number };

export async function verifyClaim(
  ownerId: string,
  osmId: string,
  code: string,
): Promise<VerifyResult> {
  const pool = getPool();

  const found = await pool.query<ClaimRow & { verify_code: string | null; verify_expires_at: string | null }>(
    `SELECT * FROM shop_claims WHERE osm_id = $1 AND owner_id = $2 LIMIT 1;`,
    [osmId, ownerId],
  );

  const row = found.rows[0];
  if (!row) {
    return { ok: false, error: "Claim not found.", status: 404 };
  }
  if (row.status === "verified") {
    return { ok: true, claim: rowToClaim(row) };
  }
  if (!row.verify_code) {
    return {
      ok: false,
      error: "This claim has no phone on file and needs manual review.",
      status: 400,
    };
  }
  if (row.verify_expires_at && new Date(row.verify_expires_at) < new Date()) {
    return { ok: false, error: "That code has expired. Request a new one.", status: 400 };
  }
  if (row.verify_code !== code.trim()) {
    return { ok: false, error: "Incorrect code.", status: 400 };
  }

  const updated = await pool.query<ClaimRow>(
    `
      UPDATE shop_claims
      SET status = 'verified', verified_at = NOW(),
          verify_code = NULL, verify_expires_at = NULL
      WHERE id = $1
      RETURNING id, osm_id, shop_name, phone, status, created_at, verified_at;
    `,
    [row.id],
  );

  return { ok: true, claim: rowToClaim(updated.rows[0]) };
}

export async function listClaims(ownerId: string): Promise<ShopClaim[]> {
  const result = await getPool().query<ClaimRow>(
    `
      SELECT id, osm_id, shop_name, phone, status, created_at, verified_at
      FROM shop_claims
      WHERE owner_id = $1
      ORDER BY created_at DESC;
    `,
    [ownerId],
  );
  return result.rows.map(rowToClaim);
}

export async function getVerifiedOsmIds(ownerId: string): Promise<string[]> {
  const result = await getPool().query<{ osm_id: string }>(
    `SELECT osm_id FROM shop_claims WHERE owner_id = $1 AND status = 'verified';`,
    [ownerId],
  );
  return result.rows.map((r) => r.osm_id);
}
