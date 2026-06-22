"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import CoffeeShopCard from "@/components/CoffeeShopCard";
import { useFavorites } from "@/components/FavoritesProvider";

export default function FavoritesPage() {
  const { ready, favorites } = useFavorites();

  return (
    <div className="page">
      <header className="home-header">
        <h1 className="home-title">Favorites</h1>
        <Link href="/account" className="filters-btn">
          Back
        </Link>
      </header>

      <main className="scroll-area" aria-label="Favorite coffee shops">
        <div className="shop-list">
          {!ready && <p className="empty-state">Loading your favorites...</p>}
          {ready && favorites.length === 0 && (
            <p className="empty-state">
              No favorites yet. Tap the star on a coffee shop to save it here.
            </p>
          )}
          {ready &&
            favorites.map((shop) => (
              <CoffeeShopCard key={shop.id} shop={shop} />
            ))}
        </div>
      </main>

      <BottomNav active="account" />
    </div>
  );
}
