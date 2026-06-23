import type { FavoriteShop } from "@/lib/coffeeShops";
import { getPool } from "@/lib/db";

type FavoriteRow = {
  osm_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  distance_miles: number | null;
  rating: number | null;
  vibes: string[] | null;
  image_url: string | null;
  phone: string | null;
  opening_hours: string | null;
};

function rowToShop(row: FavoriteRow): FavoriteShop {
  return {
    id: row.osm_id,
    name: row.name,
    address: row.address ?? "",
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    distanceMiles: row.distance_miles ?? undefined,
    rating: row.rating ?? undefined,
    vibes: row.vibes ?? [],
    imageUrl: row.image_url ?? undefined,
    phone: row.phone ?? undefined,
    openingHours: row.opening_hours ?? undefined,
  };
}

export async function listFavorites(customerId: string): Promise<FavoriteShop[]> {
  const result = await getPool().query<FavoriteRow>(
    `
      SELECT osm_id, name, address, lat, lng, distance_miles, rating, vibes, image_url, phone, opening_hours
      FROM customer_favorites
      WHERE customer_id = $1
      ORDER BY created_at DESC;
    `,
    [customerId],
  );

  return result.rows.map(rowToShop);
}

export async function addFavorite(
  customerId: string,
  shop: FavoriteShop,
): Promise<void> {
  await getPool().query(
    `
      INSERT INTO customer_favorites
        (customer_id, osm_id, name, address, lat, lng, distance_miles, rating, vibes, image_url, phone, opening_hours)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (customer_id, osm_id) DO NOTHING;
    `,
    [
      customerId,
      shop.id,
      shop.name,
      shop.address ?? null,
      shop.lat ?? null,
      shop.lng ?? null,
      shop.distanceMiles ?? null,
      shop.rating ?? null,
      shop.vibes ?? [],
      shop.imageUrl ?? null,
      shop.phone ?? null,
      shop.openingHours ?? null,
    ],
  );
}

export async function removeFavorite(
  customerId: string,
  osmId: string,
): Promise<void> {
  await getPool().query(
    `DELETE FROM customer_favorites WHERE customer_id = $1 AND osm_id = $2;`,
    [customerId, osmId],
  );
}
