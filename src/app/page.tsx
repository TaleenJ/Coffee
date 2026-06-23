"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";
import CoffeeShopCard from "@/components/CoffeeShopCard";
import FilterSheet from "@/components/FilterSheet";
import { CoffeeShop, Vibe } from "@/lib/coffeeShops";
import { readLastLocation, type SavedLocation } from "@/lib/lastLocation";

export default function HomePage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedVibes, setSelectedVibes] = useState<Vibe[]>([]);
  const [shops, setShops] = useState<CoffeeShop[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [errorMessage, setErrorMessage] = useState<string>(
    "Couldn't get your location. Please enable location access and refresh.",
  );
  const [activeZip, setActiveZip] = useState<string | null>(null);
  const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(null);
  const [locationMode, setLocationMode] = useState<"saved" | "current">("current");

  const loadNearby = useCallback(async (lat: number, lng: number) => {
    setStatus("loading");
    try {
      const response = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&radius=5`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Failed to load shops");

      setShops(data.shops);
      setStatus("done");
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
        <div className="home-header-actions">
          {savedLocation && (
            <button
              type="button"
              className={`icon-btn${locationMode === "saved" ? " icon-btn-active" : ""}`}
              onClick={toggleLocationMode}
              aria-pressed={locationMode === "saved"}
              aria-label={
                locationMode === "saved"
                  ? `Showing your saved search (${savedLocation.zip}). Switch to your current location.`
                  : "Showing your current location. Switch to your saved search."
              }
              title={
                locationMode === "saved"
                  ? `Saved search: ${savedLocation.zip} — tap for current location`
                  : "Current location — tap for saved search"
              }
            >
              <span aria-hidden="true">🔍</span>
            </button>
          )}
          <button
            type="button"
            className={`filters-btn${selectedVibes.length ? " filters-btn-active" : ""}`}
            onClick={() => setFiltersOpen(true)}
          >
            Filters{selectedVibes.length ? ` (${selectedVibes.length})` : ""}
          </button>
        </div>
      </header>

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
    </div>
  );
}