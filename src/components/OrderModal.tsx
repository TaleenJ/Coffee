"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FavoriteShop } from "@/lib/coffeeShops";
import { availableMenuForShop, cartTotal, type OrderItem } from "@/lib/menu";
import { PENDING_ORDER_KEY, type PendingOrder } from "@/lib/checkout";
import { useShopDetail } from "@/components/ShopDetailProvider";

type AuthState = "checking" | "guest" | "user";

export default function OrderModal({
  shop,
  onClose,
}: {
  shop: FavoriteShop;
  onClose: () => void;
}) {
  const router = useRouter();
  const { close: closeShopDetail } = useShopDetail();
  const [auth, setAuth] = useState<AuthState>("checking");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");

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

  function goToPayment() {
    if (items.length === 0) return;
    const pending: PendingOrder = {
      osmId: shop.id,
      shopName: shop.name,
      items,
      note,
      total,
    };
    try {
      sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(pending));
    } catch {
      /* sessionStorage may be unavailable; checkout will handle the empty case */
    }
    onClose();
    // Dismiss the shop detail sheet entirely so its info doesn't linger over checkout.
    closeShopDetail();
    router.push("/checkout");
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

        {auth === "user" && (
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

            <button
              type="button"
              className="detail-btn detail-btn-primary order-place-btn"
              onClick={goToPayment}
              disabled={count === 0}
            >
              {count === 0
                ? "Add items to order"
                : `Continue to payment · ${count} item${count === 1 ? "" : "s"} · $${total.toFixed(2)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
