"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

const FIVE_MILES_IN_METERS = 5 * 1609.344;

type RadiusMapProps = {
  lat: number;
  lng: number;
  zip: string;
};

export default function RadiusMap({ lat, lng, zip }: RadiusMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    circleRef.current?.remove();
    markerRef.current?.remove();

    const circle = L.circle([lat, lng], {
      radius: FIVE_MILES_IN_METERS,
      color: "#6b5344",
      fillColor: "#a08976",
      fillOpacity: 0.18,
      weight: 2,
    }).addTo(map);

    const marker = L.circleMarker([lat, lng], {
      radius: 8,
      color: "#6b5344",
      fillColor: "#6b5344",
      fillOpacity: 1,
      weight: 2,
    })
      .addTo(map)
      .bindPopup(`ZIP ${zip}<br />5-mile radius`);

    circleRef.current = circle;
    markerRef.current = marker;

    map.fitBounds(circle.getBounds(), { padding: [28, 28] });
  }, [lat, lng, zip]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="map-container" aria-label="Coffee shop map" />;
}
