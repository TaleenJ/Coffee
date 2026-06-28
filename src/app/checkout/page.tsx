"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PENDING_ORDER_KEY, type PendingOrder } from "@/lib/checkout";

export default function CheckoutPage() {
  const router = useRouter();
  const [order, setOrder] = useState<PendingOrder | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Cosmetic card fields — purely for show in this demo.
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");

  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_ORDER_KEY);
      if (raw) setOrder(JSON.parse(raw) as PendingOrder);
    } catch {
      /* no pending order */
    }
    setHydrated(true);
  }, []);

  async function pay() {
    if (!order) return;
    setPaying(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          osmId: order.osmId,
          shopName: order.shopName,
          items: order.items.map((i) => ({ id: i.id, qty: i.qty })),
          note: order.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please sign in to complete your order.");
        } else {
          setError(data.error ?? "Could not place order.");
        }
        return;
      }
      try {
        sessionStorage.removeItem(PENDING_ORDER_KEY);
      } catch {
        /* ignore */
      }
      router.push("/account/orders");
    } catch {
      setError("Could not place order. Try again.");
    } finally {
      setPaying(false);
    }
  }

  if (!hydrated) {
    return (
      <main className="scroll-area checkout">
        <p className="order-status-msg">Loading…</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="scroll-area checkout">
        <div className="checkout-empty">
          <p className="checkout-empty-icon" aria-hidden="true">🧾</p>
          <p className="checkout-empty-title">No order in progress</p>
          <p className="checkout-empty-sub">
            Pick a shop and add some drinks to start an order.
          </p>
          <Link href="/" className="detail-btn detail-btn-primary">
            Browse shops
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="scroll-area checkout">
      <header className="checkout-header">
        <h1 className="account-title">Checkout</h1>
        <p className="dashboard-sub">{order.shopName}</p>
      </header>

      <section className="checkout-summary">
        <h2 className="checkout-section-title">Your order</h2>
        <ul className="checkout-items">
          {order.items.map((item) => (
            <li key={item.id} className="checkout-item">
              <span>
                {item.qty}× {item.name}
              </span>
              <span>${(item.price * item.qty).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        {order.note && <p className="checkout-note">“{order.note}”</p>}
        <div className="checkout-total">
          <span>Total</span>
          <strong>${order.total.toFixed(2)}</strong>
        </div>
      </section>

      <section className="checkout-payment">
        <h2 className="checkout-section-title">Payment</h2>
        <p className="checkout-demo-banner">
          🔒 Demo mode — no real card is charged.
        </p>

        <label className="checkout-field">
          <span>Name on card</span>
          <input
            className="account-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            autoComplete="off"
          />
        </label>

        <label className="checkout-field">
          <span>Card number</span>
          <input
            className="account-input"
            value={card}
            onChange={(e) =>
              setCard(e.target.value.replace(/[^\d ]/g, "").slice(0, 19))
            }
            inputMode="numeric"
            placeholder="4242 4242 4242 4242"
            autoComplete="off"
          />
        </label>

        <div className="checkout-field-row">
          <label className="checkout-field">
            <span>Expiry</span>
            <input
              className="account-input"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value.slice(0, 5))}
              placeholder="MM/YY"
              autoComplete="off"
            />
          </label>
          <label className="checkout-field">
            <span>CVC</span>
            <input
              className="account-input"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="123"
              autoComplete="off"
            />
          </label>
        </div>

        {error && <p className="account-error">{error}</p>}

        <button
          type="button"
          className="detail-btn detail-btn-primary checkout-pay-btn"
          onClick={pay}
          disabled={paying}
        >
          {paying ? "Processing…" : `Pay $${order.total.toFixed(2)} (Demo)`}
        </button>

        <button
          type="button"
          className="checkout-bypass-btn"
          onClick={pay}
          disabled={paying}
        >
          Skip payment — place order (demo bypass)
        </button>

        <Link href="/" className="checkout-cancel">
          Cancel
        </Link>
      </section>
    </main>
  );
}
