import { getPool } from "@/lib/db";
import { getVerifiedOsmIds } from "@/lib/claims";
import type { OrderItem } from "@/lib/menu";

export type OrderStatus =
  | "new"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export const ACTIVE_STATUSES: OrderStatus[] = ["new", "preparing", "ready"];

// Allowed forward transitions an owner can apply.
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  new: "preparing",
  preparing: "ready",
  ready: "completed",
};

export type Order = {
  id: string;
  osmId: string;
  shopName: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  note: string | null;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

type OrderRow = {
  id: string;
  osm_id: string;
  shop_name: string;
  customer_id: string;
  customer_name: string;
  items: OrderItem[];
  note: string | null;
  total: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
};

function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    osmId: row.osm_id,
    shopName: row.shop_name,
    customerId: row.customer_id,
    customerName: row.customer_name,
    items: row.items ?? [],
    note: row.note,
    total: Number(row.total),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function placeOrder(input: {
  osmId: string;
  shopName: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  note: string | null;
  total: number;
}): Promise<Order> {
  const result = await getPool().query<OrderRow>(
    `
      INSERT INTO orders
        (osm_id, shop_name, customer_id, customer_name, items, note, total, status)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, 'new')
      RETURNING *;
    `,
    [
      input.osmId,
      input.shopName,
      input.customerId,
      input.customerName,
      JSON.stringify(input.items),
      input.note,
      input.total,
    ],
  );
  return rowToOrder(result.rows[0]);
}

/** Orders for all shops an owner has verified. `activeOnly` hides completed/cancelled. */
export async function listIncoming(
  ownerId: string,
  activeOnly = true,
): Promise<Order[]> {
  const osmIds = await getVerifiedOsmIds(ownerId);
  if (osmIds.length === 0) return [];

  const statusFilter = activeOnly
    ? `AND status = ANY($2)`
    : ``;
  const params: unknown[] = [osmIds];
  if (activeOnly) params.push(ACTIVE_STATUSES);

  const result = await getPool().query<OrderRow>(
    `
      SELECT * FROM orders
      WHERE osm_id = ANY($1) ${statusFilter}
      ORDER BY created_at ASC;
    `,
    params,
  );
  return result.rows.map(rowToOrder);
}

export async function listMyOrders(customerId: string): Promise<Order[]> {
  const result = await getPool().query<OrderRow>(
    `
      SELECT * FROM orders
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 50;
    `,
    [customerId],
  );
  return result.rows.map(rowToOrder);
}

export type UpdateStatusResult =
  | { ok: true; order: Order }
  | { ok: false; error: string; status: number };

/** Owner advances/cancels an order, but only for shops they've verified. */
export async function updateOrderStatus(
  ownerId: string,
  orderId: string,
  nextStatus: OrderStatus,
): Promise<UpdateStatusResult> {
  const osmIds = await getVerifiedOsmIds(ownerId);
  if (osmIds.length === 0) {
    return { ok: false, error: "You have no verified shops.", status: 403 };
  }

  const result = await getPool().query<OrderRow>(
    `
      UPDATE orders
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND osm_id = ANY($3)
      RETURNING *;
    `,
    [nextStatus, orderId, osmIds],
  );

  const row = result.rows[0];
  if (!row) {
    return { ok: false, error: "Order not found for your shops.", status: 404 };
  }
  return { ok: true, order: rowToOrder(row) };
}
