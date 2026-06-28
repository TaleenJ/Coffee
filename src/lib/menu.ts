// A single demo menu shared by every shop (OSM shops don't carry menu data).
export type MenuItem = {
  id: string;
  name: string;
  price: number;
};

export const DEMO_MENU: MenuItem[] = [
  { id: "decaf", name: "Decaf Coffee", price: 3.0 },
  { id: "espresso", name: "Espresso", price: 3.0 },
  { id: "latte", name: "Latte", price: 4.5 },
  { id: "cappuccino", name: "Cappuccino", price: 4.25 },
  { id: "cold-brew", name: "Cold Brew", price: 4.75 },
];

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export function menuItemById(id: string): MenuItem | undefined {
  return DEMO_MENU.find((item) => item.id === id);
}

// Each shop offers a deterministic subset (3–5) of the menu, derived from its
// OSM id so it's stable across the list, filter, and order modal without needing
// to persist anything.
export function availableDrinkIdsForShop(shopId: string): string[] {
  let hash = 0;
  for (let i = 0; i < shopId.length; i++) {
    hash = (hash * 31 + shopId.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);

  const count = 3 + (hash % 3); // 3, 4, or 5 drinks
  const start = hash % DEMO_MENU.length;

  const ids: string[] = [];
  for (let k = 0; k < count; k++) {
    ids.push(DEMO_MENU[(start + k) % DEMO_MENU.length].id);
  }
  return ids;
}

export function availableMenuForShop(shopId: string): MenuItem[] {
  const ids = new Set(availableDrinkIdsForShop(shopId));
  return DEMO_MENU.filter((item) => ids.has(item.id));
}

function hashWithSeed(value: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Deterministic per-shop demo features (seeded differently so they're
// independent of each other and of the drink subset).
export function shopHasVegan(shopId: string): boolean {
  return hashWithSeed(shopId, 7) % 100 < 55;
}

export function shopHasPromo(shopId: string): boolean {
  return hashWithSeed(shopId, 13) % 100 < 40;
}

const PROMO_TEXTS = [
  "10% off today",
  "Buy one, get one latte",
  "Free pastry with any order",
  "Happy hour 3–5pm",
];

export function promoTextForShop(shopId: string): string {
  return PROMO_TEXTS[hashWithSeed(shopId, 13) % PROMO_TEXTS.length];
}

export function cartTotal(items: OrderItem[]): number {
  return Math.round(items.reduce((sum, i) => sum + i.price * i.qty, 0) * 100) / 100;
}

// Validate a client-submitted cart against the real menu so prices/names can't
// be spoofed. Returns a clean cart (server-trusted prices) or null if invalid.
export function sanitizeCart(
  raw: unknown,
): { items: OrderItem[]; total: number } | null {
  if (!Array.isArray(raw)) return null;

  const items: OrderItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const id = (entry as { id?: unknown }).id;
    const qtyRaw = (entry as { qty?: unknown }).qty;
    if (typeof id !== "string") continue;

    const menuItem = menuItemById(id);
    if (!menuItem) continue;

    const qty = Math.floor(Number(qtyRaw));
    if (!Number.isFinite(qty) || qty < 1 || qty > 50) continue;

    items.push({
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      qty,
    });
  }

  if (items.length === 0) return null;
  return { items, total: cartTotal(items) };
}
