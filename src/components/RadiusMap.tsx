"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { FavoriteShop } from "@/lib/coffeeShops";
import { useShopDetail } from "@/components/ShopDetailProvider";

const MILE_IN_METERS = 1609.344;

type RadiusMapProps = {
  lat: number;
  lng: number;
  label: string;
  shops: FavoriteShop[];
};

// A small coffee-cup pin rendered as HTML so we don't depend on Leaflet's
// default marker image assets (which break under bundlers).
const shopIcon = L.divIcon({
  className: "shop-pin",
  html: "<span>☕</span>",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Leaflet's bindPopup/bindTooltip render their string argument as HTML, so any
// externally-sourced text (OSM shop names, geocoded labels) must be escaped to
// avoid DOM-based XSS.
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char] ?? char,
  );
}

function metersBetween(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function RadiusMap({ lat, lng, label, shops }: RadiusMapProps) {
  const { openShop } = useShopDetail();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const shopLayerRef = useRef<L.LayerGroup | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      center: [lat, lng],
      zoom: 12,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);

    shopLayerRef.current = L.layerGroup().addTo(mapRef.current);
  }, [lat, lng]);

  // Redraw center, circle (sized to the farthest shop), and pins.
  useEffect(() => {
    const map = mapRef.current;
    const layer = shopLayerRef.current;
    if (!map || !layer) return;

    map.setView([lat, lng], map.getZoom());

    circleRef.current?.remove();
    markerRef.current?.remove();
    layer.clearLayers();

    // Size the circle to hug the farthest shop shown (so it never grows into
    // empty space). Fall back to a small ring when there are no shops.
    let radiusMeters = 2 * MILE_IN_METERS;
    const withCoords = shops.filter(
      (s) => s.lat !== undefined && s.lng !== undefined,
    );
    if (withCoords.length > 0) {
      const farthest = Math.max(
        ...withCoords.map((s) => metersBetween(lat, lng, s.lat!, s.lng!)),
      );
      radiusMeters = Math.max(farthest * 1.08, 400);
    }

    const circle = L.circle([lat, lng], {
      radius: radiusMeters,
      color: "#6b5344",
      fillColor: "#a08976",
      fillOpacity: 0.12,
      weight: 2,
    }).addTo(map);

    const radiusMiles = radiusMeters / MILE_IN_METERS;
    const marker = L.circleMarker([lat, lng], {
      radius: 8,
      color: "#6b5344",
      fillColor: "#6b5344",
      fillOpacity: 1,
      weight: 2,
    })
      .addTo(map)
      .bindPopup(`${escapeHtml(label)}<br />${radiusMiles.toFixed(1)}-mile reach`);

    withCoords.forEach((shop) => {
      L.marker([shop.lat!, shop.lng!], { icon: shopIcon })
        .addTo(layer)
        .bindTooltip(escapeHtml(shop.name), { direction: "top", offset: [0, -12] })
        .on("click", () => openShop(shop));
    });

    circleRef.current = circle;
    markerRef.current = marker;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!mapRef.current) return;
      mapRef.current.invalidateSize();
      mapRef.current.fitBounds(circle.getBounds(), { padding: [28, 28] });
    }, 100);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lat, lng, label, shops, openShop]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className="map-container" aria-label="Coffee shop map" />
  );
}
