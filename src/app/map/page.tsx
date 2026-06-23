"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { saveLastLocation } from "@/lib/lastLocation";
import type { FavoriteShop } from "@/lib/coffeeShops";

const RadiusMap = dynamic(() => import("@/components/RadiusMap"), {
  ssr: false,
  loading: () => <div className="map-placeholder">Loading map...</div>,
});

// Gather candidates within a generous radius; the API keeps the nearest `limit`
// shops and the map auto-fits its circle to them, so this is just an outer bound.
const MAX_RADIUS_MILES = 25;
const INITIAL_LIMIT = 30;
const MAX_LIMIT = 100;

type MapLocation = {
  lat: number;
  lng: number;
  label: string;
  displayName: string;
};

export default function MapPage() {
  const [queryInput, setQueryInput] = useState("");
  const [location, setLocation] = useState<MapLocation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<FavoriteShop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [limit, setLimit] = useState(INITIAL_LIMIT);

  // Load the nearest cafes whenever the location or requested count changes.
  useEffect(() => {
    if (!location) {
      setShops([]);
      return;
    }

    const controller = new AbortController();
    setShopsLoading(true);
    fetch(
      `/api/nearby?lat=${location.lat}&lng=${location.lng}&radius=${MAX_RADIUS_MILES}&limit=${limit}`,
      { signal: controller.signal },
    )
      .then((res) => (res.ok ? res.json() : { shops: [] }))
      .then((data: { shops?: FavoriteShop[] }) => setShops(data.shops ?? []))
      .catch(() => {
        /* aborted or offline */
      })
      .finally(() => {
        if (!controller.signal.aborted) setShopsLoading(false);
      });

    return () => controller.abort();
  }, [location, limit]);

  function applyLocation(next: MapLocation) {
    setLocation(next);
    setLimit(INITIAL_LIMIT);
    saveLastLocation({
      lat: next.lat,
      lng: next.lng,
      zip: next.label,
      displayName: next.displayName,
    });
  }

  async function runGeocode(query: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not find that location");
      }

      applyLocation({
        lat: data.lat,
        lng: data.lng,
        label: data.label,
        displayName: data.displayName,
      });
    } catch (searchError) {
      setLocation(null);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Could not find that location",
      );
    } finally {
      setLoading(false);
    }
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setError("Location isn't available on this device.");
      return;
    }

    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Your location",
          displayName: "Your current location",
        });
        setLoading(false);
      },
      () => {
        setError("Couldn't get your location. Check permissions and try again.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = queryInput.trim();

    if (!query) {
      setError("Enter a zip code or city name");
      return;
    }

    void runGeocode(query);
  }

  const canFindMore =
    !!location && !shopsLoading && shops.length >= limit && limit < MAX_LIMIT;

  return (
    <div className="page map-page">
      <header className="map-header">
        <form className="zip-form" onSubmit={handleSubmit}>
          <label className="zip-label" htmlFor="place-query">
            Zip code or city name
          </label>
          <div className="zip-row">
            <input
              id="place-query"
              className="zip-input"
              type="text"
              placeholder="90210 or Portland"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
            />
            <button className="zip-btn" type="submit" disabled={loading}>
              {loading ? "..." : "Search"}
            </button>
          </div>
        </form>

        <button
          type="button"
          className="map-secondary-btn"
          onClick={useMyLocation}
          disabled={loading}
        >
          📍 Use my location
        </button>

        {error ? <p className="map-error">{error}</p> : null}

        {location ? (
          <div className="map-summary-row">
            <p className="map-summary">
              {shopsLoading && shops.length === 0 ? (
                "Searching cafes…"
              ) : (
                <>
                  {shops.length} nearest {shops.length === 1 ? "cafe" : "cafes"}{" "}
                  around <strong>{location.label}</strong>
                </>
              )}
            </p>
            {canFindMore && (
              <button
                type="button"
                className="map-secondary-btn map-more-btn"
                onClick={() => setLimit((l) => Math.min(l + 10, MAX_LIMIT))}
              >
                Find 10 more
              </button>
            )}
          </div>
        ) : (
          <p className="map-summary">Enter a zip or city to zoom the map</p>
        )}
      </header>

      <div className="map-wrapper">
        {location ? (
          <RadiusMap
            lat={location.lat}
            lng={location.lng}
            label={location.label}
            shops={shops}
          />
        ) : (
          <div className="map-placeholder">Map preview appears after a search</div>
        )}
      </div>

      <BottomNav active="map" />
    </div>
  );
}
