"use client";

import { useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import CoffeeShopCard from "@/components/CoffeeShopCard";
import FilterSheet from "@/components/FilterSheet";
import { coffeeShops, Vibe } from "@/lib/coffeeShops";

export default function HomePage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedVibes, setSelectedVibes] = useState<Vibe[]>([]);

  function toggleVibe(vibe: Vibe) {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe],
    );
  }

  const filteredShops = useMemo(() => {
    if (selectedVibes.length === 0) return coffeeShops;
    return coffeeShops.filter((shop) =>
      selectedVibes.every((vibe) => shop.vibes.includes(vibe)),
    );
  }, [selectedVibes]);

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
          {filteredShops.length === 0 ? (
            <p className="empty-state">No coffee shops match those vibes yet.</p>
          ) : (
            filteredShops.map((shop) => <CoffeeShopCard key={shop.id} shop={shop} />)
          )}
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
