import type { FavoriteShop } from "@/lib/coffeeShops";

// localStorage-backed favorites for guests (logged-out users).
const STORAGE_KEY = "mapahead_favorites";

export function readGuestFavorites(): FavoriteShop[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as FavoriteShop[]) : [];
  } catch {
    return [];
  }
}

export function writeGuestFavorites(favorites: FavoriteShop[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore quota / serialization errors — favorites are best-effort for guests.
  }
}
