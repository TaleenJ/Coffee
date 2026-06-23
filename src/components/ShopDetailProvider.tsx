"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { FavoriteShop } from "@/lib/coffeeShops";
import ShopDetailSheet from "@/components/ShopDetailSheet";

type ShopDetailContextValue = {
  openShop: (shop: FavoriteShop) => void;
  close: () => void;
};

const ShopDetailContext = createContext<ShopDetailContextValue | null>(null);

export function useShopDetail(): ShopDetailContextValue {
  const ctx = useContext(ShopDetailContext);
  if (!ctx) {
    throw new Error("useShopDetail must be used within a ShopDetailProvider");
  }
  return ctx;
}

export default function ShopDetailProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState<FavoriteShop | null>(null);

  const openShop = useCallback((next: FavoriteShop) => setShop(next), []);
  const close = useCallback(() => setShop(null), []);

  const value = useMemo(() => ({ openShop, close }), [openShop, close]);

  return (
    <ShopDetailContext.Provider value={value}>
      {children}
      <ShopDetailSheet shop={shop} onClose={close} />
    </ShopDetailContext.Provider>
  );
}
