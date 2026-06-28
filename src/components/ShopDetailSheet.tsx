"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import type { FavoriteShop } from "@/lib/coffeeShops";
import { formatOpeningHours } from "@/lib/openingHours";
import { availableMenuForShop } from "@/lib/menu";
import OrderModal from "@/components/OrderModal";
import ShopReviews from "@/components/ShopReviews";

function hasRealAddress(address?: string): boolean {
  return !!address && address.trim() !== "" && address !== "Address unavailable";
}

function mapsQuery(name: string, address: string | null): string {
  // Open external maps by name (+ address when we have a real one) per the design.
  return encodeURIComponent([name, address ?? ""].filter(Boolean).join(" "));
}

function buildGoogleMapsUrl(name: string, address: string | null): string {
  return `https://www.google.com/maps/search/?api=1&query=${mapsQuery(name, address)}`;
}

function buildAppleMapsUrl(name: string, address: string | null): string {
  return `https://maps.apple.com/?q=${mapsQuery(name, address)}`;
}

export default function ShopDetailSheet({
  shop,
  onClose,
}: {
  shop: FavoriteShop | null;
  onClose: () => void;
}) {
  const [dragY, setDragY] = useState(0);
  const [copied, setCopied] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [showMapChoice, setShowMapChoice] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const startY = useRef<number | null>(null);

  // Reset transient UI and, when a shop lacks an address, reverse-geocode its
  // coordinates on demand (one lookup per opened shop — not the whole list).
  useEffect(() => {
    setDragY(0);
    setCopied(false);
    setResolvedAddress(null);
    setResolving(false);
    setOrdering(false);
    setShowMapChoice(false);
    setShowMenu(false);

    if (!shop || hasRealAddress(shop.address)) return;
    if (shop.lat === undefined || shop.lng === undefined) return;

    const controller = new AbortController();
    setResolving(true);
    fetch(`/api/reverse-geocode?lat=${shop.lat}&lng=${shop.lng}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { address?: string } | null) => {
        if (data?.address) setResolvedAddress(data.address);
      })
      .catch(() => {
        /* aborted or offline — fall back to coordinates */
      })
      .finally(() => {
        if (!controller.signal.aborted) setResolving(false);
      });

    return () => controller.abort();
  }, [shop]);

  if (!shop) return null;

  const menu = availableMenuForShop(shop.id);
  const hoursLines = formatOpeningHours(shop.openingHours);
  const hasCoords = shop.lat !== undefined && shop.lng !== undefined;
  const coordsText = hasCoords
    ? `${shop.lat!.toFixed(5)}, ${shop.lng!.toFixed(5)}`
    : null;

  const realAddress = hasRealAddress(shop.address) ? shop.address : null;
  const effectiveAddress = realAddress ?? resolvedAddress;
  const displayAddress =
    effectiveAddress ?? (resolving ? "Locating address…" : coordsText ?? "");

  function handleTouchStart(e: TouchEvent) {
    startY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e: TouchEvent) {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    setDragY(Math.max(0, delta));
  }

  function handleTouchEnd() {
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
    startY.current = null;
  }

  async function copyCoords() {
    if (!coordsText) return;
    try {
      await navigator.clipboard.writeText(coordsText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }

  return (
    <>
    <div className="detail-overlay" onClick={onClose}>
      <div
        className="detail-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY ? "none" : undefined,
        }}
        role="dialog"
        aria-label={`${shop.name} details`}
      >
        <div
          className="detail-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-hidden="true"
        />

        <div className="detail-header">
          <div>
            <h2 className="detail-name">{shop.name}</h2>
            {displayAddress && (
              <p className="detail-address">{displayAddress}</p>
            )}
          </div>
          <button
            type="button"
            className="detail-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="detail-row">
          <span className="detail-label">Hours</span>
          {hoursLines.length > 0 ? (
            <div className="detail-hours">
              {hoursLines.map((line, i) => (
                <span key={i} className="detail-value">
                  {line}
                </span>
              ))}
            </div>
          ) : (
            <span className="detail-value">Hours not available</span>
          )}
        </div>

        {coordsText && (
          <div className="detail-row">
            <span className="detail-label">Coordinates</span>
            <div className="detail-coords">
              <code>{coordsText}</code>
              <button type="button" className="detail-copy" onClick={copyCoords}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <div className="detail-actions">
          {shop.phone ? (
            <a className="detail-btn" href={`tel:${shop.phone}`}>
              Call
            </a>
          ) : (
            <button type="button" className="detail-btn detail-btn-disabled" disabled>
              Call N/A
            </button>
          )}

          <button
            type="button"
            className={`detail-btn${showMapChoice ? " detail-btn-active" : ""}`}
            onClick={() => {
              setShowMapChoice((v) => !v);
              setShowMenu(false);
            }}
            aria-expanded={showMapChoice}
          >
            Map
          </button>

          <button
            type="button"
            className={`detail-btn${showMenu ? " detail-btn-active" : ""}`}
            onClick={() => {
              setShowMenu((v) => !v);
              setShowMapChoice(false);
            }}
            aria-expanded={showMenu}
          >
            Menu
          </button>

          <button
            type="button"
            className="detail-btn detail-btn-primary"
            onClick={() => setOrdering(true)}
          >
            Order
          </button>
        </div>

        {showMenu && (
          <div className="detail-menu">
            {menu.map((item) => (
              <div key={item.id} className="detail-menu-row">
                <span className="detail-menu-name">{item.name}</span>
                <span className="detail-menu-price">${item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {showMapChoice && (
          <div className="map-choice" role="menu">
            <a
              className="detail-btn"
              href={buildAppleMapsUrl(shop.name, effectiveAddress)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowMapChoice(false)}
            >
              Apple Maps
            </a>
            <a
              className="detail-btn"
              href={buildGoogleMapsUrl(shop.name, effectiveAddress)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowMapChoice(false)}
            >
              Google Maps
            </a>
          </div>
        )}

        <ShopReviews osmId={shop.id} />
      </div>
    </div>

    {ordering && <OrderModal shop={shop} onClose={() => setOrdering(false)} />}
    </>
  );
}
