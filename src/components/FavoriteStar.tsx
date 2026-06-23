"use client";

import { useState, type MouseEvent } from "react";
import type { FavoriteShop } from "@/lib/coffeeShops";
import { useFavorites } from "@/components/FavoritesProvider";

export default function FavoriteStar({ shop }: { shop: FavoriteShop }) {
  const { ready, isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(shop.id);
  const [splash, setSplash] = useState(false);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    // Don't let a star tap open the shop detail sheet behind it.
    event.stopPropagation();
    // Only splash when turning a favorite ON.
    if (!active) {
      setSplash(true);
      window.setTimeout(() => setSplash(false), 500);
    }
    toggleFavorite(shop);
  }

  return (
    <button
      type="button"
      className={`fav-star${active ? " fav-star-active" : ""}`}
      aria-pressed={active}
      aria-label={
        active
          ? `Remove ${shop.name} from favorites`
          : `Add ${shop.name} to favorites`
      }
      disabled={!ready}
      onClick={handleClick}
    >
      <span className="fav-star-icon">{active ? "★" : "☆"}</span>
      {splash ? <span className="fav-star-splash" aria-hidden="true" /> : null}
    </button>
  );
}
