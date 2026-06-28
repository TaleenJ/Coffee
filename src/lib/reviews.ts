import { getPool } from "@/lib/db";

export type Review = {
  id: string;
  customerName: string;
  rating: number;
  body: string | null;
  createdAt: string;
};

export type ReviewSummary = { average: number; count: number };

type ReviewRow = {
  id: string;
  customer_name: string;
  rating: number;
  body: string | null;
  created_at: string;
};

/** "Verified purchase" gate: has this customer ordered from this shop? */
export async function hasOrdered(
  customerId: string,
  osmId: string,
): Promise<boolean> {
  const result = await getPool().query(
    `SELECT 1 FROM orders WHERE customer_id = $1 AND osm_id = $2 LIMIT 1;`,
    [customerId, osmId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getSummary(osmId: string): Promise<ReviewSummary> {
  const result = await getPool().query<{ average: number; count: number }>(
    `
      SELECT COALESCE(AVG(rating), 0)::float AS average, COUNT(*)::int AS count
      FROM shop_reviews WHERE osm_id = $1;
    `,
    [osmId],
  );
  const row = result.rows[0];
  return {
    average: Math.round((row?.average ?? 0) * 10) / 10,
    count: row?.count ?? 0,
  };
}

export async function listReviews(osmId: string): Promise<Review[]> {
  const result = await getPool().query<ReviewRow>(
    `
      SELECT id, customer_name, rating, body, created_at
      FROM shop_reviews
      WHERE osm_id = $1
      ORDER BY created_at DESC
      LIMIT 50;
    `,
    [osmId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    customerName: row.customer_name,
    rating: row.rating,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function getMyReview(
  customerId: string,
  osmId: string,
): Promise<Review | null> {
  const result = await getPool().query<ReviewRow>(
    `
      SELECT id, customer_name, rating, body, created_at
      FROM shop_reviews
      WHERE osm_id = $1 AND customer_id = $2
      LIMIT 1;
    `,
    [osmId, customerId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    customerName: row.customer_name,
    rating: row.rating,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function upsertReview(input: {
  customerId: string;
  customerName: string;
  osmId: string;
  rating: number;
  body: string | null;
}): Promise<void> {
  await getPool().query(
    `
      INSERT INTO shop_reviews (osm_id, customer_id, customer_name, rating, body)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (osm_id, customer_id) DO UPDATE SET
        rating = EXCLUDED.rating,
        body = EXCLUDED.body,
        customer_name = EXCLUDED.customer_name,
        updated_at = NOW();
    `,
    [input.osmId, input.customerId, input.customerName, input.rating, input.body],
  );
}

/** Aggregate ratings for many shops at once (for list cards). */
export async function getSummaries(
  osmIds: string[],
): Promise<Record<string, ReviewSummary>> {
  if (osmIds.length === 0) return {};
  const result = await getPool().query<{
    osm_id: string;
    average: number;
    count: number;
  }>(
    `
      SELECT osm_id, AVG(rating)::float AS average, COUNT(*)::int AS count
      FROM shop_reviews
      WHERE osm_id = ANY($1)
      GROUP BY osm_id;
    `,
    [osmIds],
  );

  const map: Record<string, ReviewSummary> = {};
  for (const row of result.rows) {
    map[row.osm_id] = {
      average: Math.round(row.average * 10) / 10,
      count: row.count,
    };
  }
  return map;
}
