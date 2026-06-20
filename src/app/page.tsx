"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import CoffeeShopCard from "@/components/CoffeeShopCard";
import FilterSheet from "@/components/FilterSheet";
import { CoffeeShop, Vibe } from "@/lib/coffeeShops";

export default function HomePage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedVibes, setSelectedVibes] = useState<Vibe[]>([]);
  const [shops, setShops] = useState<CoffeeShop[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `/api/nearby?lat=${latitude}&lng=${longitude}&radius=5`,
          );
          const data = await response.json();

          if (!response.ok) throw new Error(data.error ?? "Failed to load shops");

          setShops(data.shops);
          setStatus("done");
        } catch {
          setStatus("error");
        }
      },
      () => setStatus("error"),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, []);

  function toggleVibe(vibe: Vibe) {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe],
    );
  }

  const filteredShops = useMemo(() => {
    if (selectedVibes.length === 0) return shops;
    return shops.filter((shop) =>
      selectedVibes.every((vibe) => shop.vibes.includes(vibe)),
    );
  }, [shops, selectedVibes]);

  return (
    <div className="page">
      <header className="home-header">
        <h1 className="home-title">What&apos;s nearby</h1>
        <button
          type="button"
          className={`filters-btn${selectedVibes.length ? " filters-btn-active" : ""}`}
          onClick={() => setFiltersOpen(true)}
        >
          Filters{selectedVibes.length ? ` (${selectedVibes.length})` : ""}
        </button>
      </header>

      <main className="scroll-area" aria-label="Nearby coffee shops">
        <div className="shop-list">
          {status === "loading" && (
            <p className="empty-state">Finding coffee shops near you...</p>
          )}
          {status === "error" && (
            <p className="empty-state">
              Couldn&apos;t get your location. Please enable location access and refresh.
            </p>
          )}
          {status === "done" && filteredShops.length === 0 && (
            <p className="empty-state">No coffee shops match those vibes yet.</p>
          )}
          {filteredShops.map((shop) => (
            <CoffeeShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      </main>

      <FilterSheet
        open={filtersOpen}
        selected={selectedVibes}
        onToggleVibe={toggleVibe}
        onClear={() => setSelectedVibes([])}
        onClose={() => setFiltersOpen(false)}
      />

      <BottomNav active="nearby" />
    </div>
  );
}

