"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FavoriteShop } from "@/lib/coffeeShops";
import { availableMenuForShop, cartTotal, type OrderItem } from "@/lib/menu";

type AuthState = "checking" | "guest" | "user";

export default function OrderModal({
  shop,
  onClose,
}: {
  shop: FavoriteShop;
  onClose: () => void;
}) {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(false);

  const menu = useMemo(() => availableMenuForShop(shop.id), [shop.id]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { customer?: { id: string } | null }) => {
        if (active) setAuth(data.customer ? "user" : "guest");
      })
      .catch(() => {
        if (active) setAuth("guest");
      });
    return () => {
      active = false;
    };
  }, []);

  const items: OrderItem[] = useMemo(
    () =>
      menu
        .filter((m) => (qty[m.id] ?? 0) > 0)
        .map((m) => ({
          id: m.id,
          name: m.name,
          price: m.price,
          qty: qty[m.id] ?? 0,
        })),
    [menu, qty],
  );
  const total = cartTotal(items);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  function bump(id: string, delta: number) {
    setQty((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      return { ...prev, [id]: next };
    });
  }

  async function placeOrder() {
    if (items.length === 0) return;
    setPlacing(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          osmId: shop.id,
          shopName: shop.name,
          items: items.map((i) => ({ id: i.id, qty: i.qty })),
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not place order.");
        return;
      }
      setPlaced(true);
    } catch {
      setError("Could not place order.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div
        className="order-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Order from ${shop.name}`}
      >
        <div className="detail-header">
          <div>
            <h2 className="detail-name">Order</h2>
            <p className="detail-address">{shop.name}</p>
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

        {auth === "checking" && <p className="order-status-msg">Loading menu…</p>}

        {auth === "guest" && (
          <div className="order-guest">
            <p>Please sign in to place an order.</p>
            <Link href="/account/sign-in" className="detail-btn detail-btn-primary">
              Sign in
            </Link>
          </div>
        )}

        {auth === "user" && placed && (
          <div className="order-success">
            <p className="order-success-icon" aria-hidden="true">✅</p>
            <p className="order-success-title">Order placed!</p>
            <p className="order-success-sub">
              {shop.name} got your order. Track it in your orders.
            </p>
            <Link href="/account/orders" className="detail-btn detail-btn-primary">
              Track my order
            </Link>
          </div>
        )}

        {auth === "user" && !placed && (
          <>
            <div className="order-menu">
              {menu.map((item) => (
                <div key={item.id} className="order-row">
                  <div className="order-item-info">
                    <span className="order-item-name">{item.name}</span>
                    <span className="order-item-price">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="order-stepper">
                    <button
                      type="button"
                      onClick={() => bump(item.id, -1)}
                      aria-label={`Remove one ${item.name}`}
                      disabled={(qty[item.id] ?? 0) === 0}
                    >
                      −
                    </button>
                    <span className="order-qty">{qty[item.id] ?? 0}</span>
                    <button
                      type="button"
                      onClick={() => bump(item.id, 1)}
                      aria-label={`Add one ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <input
              className="order-note"
              type="text"
              placeholder="Add a note (oat milk, extra hot…)"
              value={note}
              maxLength={280}
              onChange={(e) => setNote(e.target.value)}
            />

            {error && <p className="account-error">{error}</p>}

            <button
              type="button"
              className="detail-btn detail-btn-primary order-place-btn"
              onClick={placeOrder}
              disabled={count === 0 || placing}
            >
              {placing
                ? "Placing…"
                : count === 0
                  ? "Add items to order"
                  : `Place order · ${count} item${count === 1 ? "" : "s"} · $${total.toFixed(2)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
