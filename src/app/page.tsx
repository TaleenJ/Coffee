"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import CoffeeShopCard from "@/components/CoffeeShopCard";
import FilterSheet from "@/components/FilterSheet";
import { CoffeeShop, Vibe } from "@/lib/coffeeShops";
import { availableDrinkIdsForShop, shopHasPromo, shopHasVegan } from "@/lib/menu";
import { readLastLocation, saveLastLocation, type SavedLocation } from "@/lib/lastLocation";

export default function HomePage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedVibes, setSelectedVibes] = useState<Vibe[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<string[]>([]);
  const [veganOnly, setVeganOnly] = useState(false);
  const [promoOnly, setPromoOnly] = useState(false);
  const [hideChains, setHideChains] = useState(false);
  const [shops, setShops] = useState<CoffeeShop[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [errorMessage, setErrorMessage] = useState<string>(
    "Couldn't get your location. Please enable location access and refresh.",
  );
  const [activeZip, setActiveZip] = useState<string | null>(null);
  const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(null);
  const [locationMode, setLocationMode] = useState<"saved" | "current">("current");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const loadNearby = useCallback(async (lat: number, lng: number) => {
    setStatus("loading");
    try {
      const response = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&radius=5`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Failed to load shops");

      setShops(data.shops);
      setStatus("done");

      // Overlay first-party review averages onto the cards (OSM has no ratings).
      const ids = (data.shops as CoffeeShop[]).map((s) => s.id);
      if (ids.length > 0) {
        try {
          const sumRes = await fetch(
            `/api/reviews/summary?osmIds=${encodeURIComponent(ids.join(","))}`,
          );
          if (sumRes.ok) {
            const { summaries } = (await sumRes.json()) as {
              summaries: Record<string, { average: number; count: number }>;
            };
            setShops((prev) =>
              prev.map((s) =>
                summaries[s.id]
                  ? { ...s, rating: summaries[s.id].average }
                  : s,
              ),
            );
          }
        } catch {
          /* ratings are best-effort; ignore failures */
        }
      }
    } catch (err) {
      console.error("Failed to load nearby shops:", err);
      setErrorMessage(
        "Couldn't load nearby coffee shops. Please try again in a moment.",
      );
      setStatus("error");
    }
  }, []);

  const loadSavedLocation = useCallback(
    (saved: SavedLocation) => {
      setLocationMode("saved");
      setActiveZip(saved.zip);
      void loadNearby(saved.lat, saved.lng);
    },
    [loadNearby],
  );

  const loadCurrentLocation = useCallback(() => {
    setLocationMode("current");
    setActiveZip(null);

    if (!("geolocation" in navigator)) {
      setErrorMessage("This browser doesn't support geolocation.");
      setStatus("error");
      return;
    }

    setStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void loadNearby(position.coords.latitude, position.coords.longitude);
      },
      (geoError) => {
        console.error("Geolocation error:", geoError.code, geoError.message);
        const messages: Record<number, string> = {
          1: "Location access is blocked for this site. Check your browser's site settings and your OS location settings, then refresh.",
          2: "Your device couldn't determine your location right now. Make sure location services are turned on.",
          3: "Getting your location took too long. Please try again.",
        };
        setErrorMessage(
          messages[geoError.code] ?? "Couldn't get your location. Please enable location access and refresh.",
        );
        setStatus("error");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, [loadNearby]);

  useEffect(() => {
    // Prefer the zip the user just searched on the "find beans" page (this session).
    const saved = readLastLocation();
    setSavedLocation(saved);

    if (saved) {
      loadSavedLocation(saved);
    } else {
      loadCurrentLocation();
    }
  }, [loadSavedLocation, loadCurrentLocation]);

  function toggleLocationMode() {
    if (locationMode === "saved") {
      loadCurrentLocation();
    } else if (savedLocation) {
      loadSavedLocation(savedLocation);
    }
  }

  function handleGlassClick() {
    // Once a second location has been searched, the glass simply toggles between
    // it and the current location. Before that, it prompts for one.
    if (savedLocation) {
      toggleLocationMode();
    } else {
      setSearchError("");
      setSearchOpen((open) => !open);
    }
  }

  async function runLocationSearch() {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error ?? "Couldn't find that location.");
        return;
      }
      const loc: SavedLocation = {
        lat: data.lat,
        lng: data.lng,
        zip: data.label,
        displayName: data.displayName,
      };
      setSavedLocation(loc);
      saveLastLocation(loc);
      setSearchOpen(false);
      setSearchQuery("");
      loadSavedLocation(loc);
    } catch {
      setSearchError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  function toggleVibe(vibe: Vibe) {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe],
    );
  }

  function toggleDrink(drinkId: string) {
    setSelectedDrinks((prev) =>
      prev.includes(drinkId)
        ? prev.filter((d) => d !== drinkId)
        : [...prev, drinkId],
    );
  }

  const activeFilterCount =
    selectedVibes.length +
    selectedDrinks.length +
    (veganOnly ? 1 : 0) +
    (promoOnly ? 1 : 0) +
    (hideChains ? 1 : 0);

  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      const matchesVibes = selectedVibes.every((vibe) =>
        shop.vibes.includes(vibe),
      );
      if (!matchesVibes) return false;

      if (selectedDrinks.length > 0) {
        const drinks = availableDrinkIdsForShop(shop.id);
        if (!selectedDrinks.every((d) => drinks.includes(d))) return false;
      }

      if (veganOnly && !shopHasVegan(shop.id)) return false;
      if (promoOnly && !shopHasPromo(shop.id)) return false;
      if (hideChains && shop.isChain) return false;

      return true;
    });
  }, [shops, selectedVibes, selectedDrinks, veganOnly, promoOnly, hideChains]);

  return (
    <div className="page">
      <header className="home-header">
        <h1 className="home-title">What&apos;s nearby</h1>
        <div className="home-header-actions">
          <button
            type="button"
            className={`icon-btn${
              savedLocation && locationMode === "saved" ? " icon-btn-active" : ""
            }${searchOpen ? " icon-btn-active" : ""}`}
            onClick={handleGlassClick}
            aria-pressed={savedLocation ? locationMode === "saved" : searchOpen}
            aria-label={
              savedLocation
                ? locationMode === "saved"
                  ? `Showing your saved search (${savedLocation.zip}). Switch to your current location.`
                  : "Showing your current location. Switch to your saved search."
                : "Search another location to compare with your current location."
            }
            title={
              savedLocation
                ? locationMode === "saved"
                  ? `Saved search: ${savedLocation.zip} — tap for current location`
                  : "Current location — tap for saved search"
                : "Search another location"
            }
          >
            <span aria-hidden="true">🔍</span>
          </button>
          <button
            type="button"
            className={`filters-btn${activeFilterCount ? " filters-btn-active" : ""}`}
            onClick={() => setFiltersOpen(true)}
          >
            Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </header>

      {searchOpen && !savedLocation && (
        <div className="location-search">
          <input
            className="location-search-input"
            placeholder="Search another location (zip or city)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runLocationSearch();
            }}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <button
            type="button"
            className="location-search-btn"
            onClick={runLocationSearch}
            disabled={searching || searchQuery.trim() === ""}
          >
            {searching ? "…" : "Search"}
          </button>
          <button
            type="button"
            className="location-search-cancel"
            onClick={() => setSearchOpen(false)}
            aria-label="Cancel search"
          >
            ✕
          </button>
        </div>
      )}
      {searchError && <p className="location-search-error">{searchError}</p>}

      <BottomNav active="nearby" position="top" />

      <main className="scroll-area" aria-label="Nearby coffee shops">
        {savedLocation && status !== "error" && (
          <p className="nearby-location-note">
            {locationMode === "saved" && activeZip ? (
              <>
                Showing shops near <strong>{activeZip}</strong>
              </>
            ) : (
              <>
                Showing shops near <strong>your current location</strong>
              </>
            )}
          </p>
        )}
        <div className="shop-list">
          {status === "loading" && (
            <p className="empty-state">Finding coffee shops near you...</p>
          )}
          {status === "error" && (
            <p className="empty-state">{errorMessage}</p>
          )}
          {status === "done" && filteredShops.length === 0 && (
            <p className="empty-state">No coffee shops match those filters yet.</p>
          )}
          {filteredShops.map((shop) => (
            <CoffeeShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      </main>

      <FilterSheet
        open={filtersOpen}
        selected={selectedVibes}
        selectedDrinks={selectedDrinks}
        veganOnly={veganOnly}
        promoOnly={promoOnly}
        hideChains={hideChains}
        onToggleVibe={toggleVibe}
        onToggleDrink={toggleDrink}
        onToggleVegan={() => setVeganOnly((v) => !v)}
        onTogglePromo={() => setPromoOnly((v) => !v)}
        onToggleHideChains={() => setHideChains((v) => !v)}
        onClear={() => {
          setSelectedVibes([]);
          setSelectedDrinks([]);
          setVeganOnly(false);
          setPromoOnly(false);
          setHideChains(false);
        }}
        onClose={() => setFiltersOpen(false)}
      />
    </div>
  );
}