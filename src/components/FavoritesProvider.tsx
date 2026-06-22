"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { FavoriteShop } from "@/lib/coffeeShops";
import { readGuestFavorites, writeGuestFavorites } from "@/lib/favoritesStore";

type FavoritesContextValue = {
  ready: boolean;
  loggedIn: boolean;
  favorites: FavoriteShop[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (shop: FavoriteShop) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return ctx;
}

export default function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteShop[]>([]);

  // On mount, ask the API for favorites. A 200 means logged in (use the DB list);
  // a 401 (or any failure) means guest (fall back to localStorage).
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await fetch("/api/favorites");
        if (res.ok) {
          const data = (await res.json()) as { favorites?: FavoriteShop[] };
          if (!active) return;
          setLoggedIn(true);
          setFavorites(data.favorites ?? []);
        } else {
          if (!active) return;
          setLoggedIn(false);
          setFavorites(readGuestFavorites());
        }
      } catch {
        if (!active) return;
        setLoggedIn(false);
        setFavorites(readGuestFavorites());
      } finally {
        if (active) setReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((shop) => shop.id)),
    [favorites],
  );

  const isFavorite = useCallback(
    (id: string) => favoriteIds.has(id),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    (shop: FavoriteShop) => {
      setFavorites((prev) => {
        const exists = prev.some((item) => item.id === shop.id);
        const next = exists
          ? prev.filter((item) => item.id !== shop.id)
          : [shop, ...prev];

        if (loggedIn) {
          // Optimistic: persist to the DB in the background.
          if (exists) {
            void fetch("/api/favorites", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: shop.id }),
            });
          } else {
            void fetch("/api/favorites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(shop),
            });
          }
        } else {
          writeGuestFavorites(next);
        }

        return next;
      });
    },
    [loggedIn],
  );

  const value = useMemo(
    () => ({ ready, loggedIn, favorites, isFavorite, toggleFavorite }),
    [ready, loggedIn, favorites, isFavorite, toggleFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}
