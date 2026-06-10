"use client";

import dynamic from "next/dynamic";
import { FormEvent, useState } from "react";
import BottomNav from "@/components/BottomNav";

const RadiusMap = dynamic(() => import("@/components/RadiusMap"), {
  ssr: false,
  loading: () => <div className="map-placeholder">Loading map...</div>,
});

type MapLocation = {
  lat: number;
  lng: number;
  zip: string;
  displayName: string;
};

export default function MapPage() {
  const [zipInput, setZipInput] = useState("");
  const [location, setLocation] = useState<MapLocation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function searchByZip(zip: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/geocode?zip=${encodeURIComponent(zip)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not find that zip code");
      }

      setLocation({
        lat: data.lat,
        lng: data.lng,
        zip: data.zip,
        displayName: data.displayName,
      });
    } catch (searchError) {
      setLocation(null);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Could not find that zip code",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const zip = zipInput.trim();

    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a 5-digit US zip code");
      return;
    }

    void searchByZip(zip);
  }

  return (
    <div className="page map-page">
      <header className="map-header">
        <form className="zip-form" onSubmit={handleSubmit}>
          <label className="zip-label" htmlFor="zip-code">
            Zip code
          </label>
          <div className="zip-row">
            <input
              id="zip-code"
              className="zip-input"
              type="text"
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              placeholder="90210"
              value={zipInput}
              onChange={(event) => setZipInput(event.target.value.replace(/\D/g, ""))}
            />
            <button className="zip-btn" type="submit" disabled={loading}>
              {loading ? "..." : "Search"}
            </button>
          </div>
        </form>
        {error ? <p className="map-error">{error}</p> : null}
        {location ? (
          <p className="map-summary">
            Showing 5-mile radius around <strong>{location.zip}</strong>
          </p>
        ) : (
          <p className="map-summary">Enter a zip to zoom the map</p>
        )}
      </header>

      <div className="map-wrapper">
        {location ? (
          <RadiusMap lat={location.lat} lng={location.lng} zip={location.zip} />
        ) : (
          <div className="map-placeholder">Map preview appears after zip search</div>
        )}
      </div>

      <BottomNav active="map" />
    </div>
  );
}
