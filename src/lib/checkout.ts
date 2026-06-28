import type { OrderItem } from "@/lib/menu";

/** sessionStorage key for the order awaiting (demo) payment. */
export const PENDING_ORDER_KEY = "mapahead.pendingOrder";

export type PendingOrder = {
  osmId: string;
  shopName: string;
  items: OrderItem[];
  note: string;
  total: number;
};
