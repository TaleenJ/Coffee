"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import type { OrderItem } from "@/lib/menu";

type OrderStatus = "new" | "preparing" | "ready" | "completed" | "cancelled";
type Order = {
  id: string;
  shopName: string;
  items: OrderItem[];
  note: string | null;
  total: number;
  status: OrderStatus;
  createdAt: string;
};

type LoadState = "loading" | "guest" | "ready";

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "new", label: "Received" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Done" },
];

function stepIndex(status: OrderStatus): number {
  const i = STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function MyOrdersPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/mine");
      if (res.status === 401) {
        setState("guest");
        return;
      }
      const data = await res.json();
      setOrders(data.orders ?? []);
      setState("ready");
    } catch {
      /* keep last state */
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
    const id = window.setInterval(fetchOrders, 3000);
    return () => window.clearInterval(id);
  }, [fetchOrders]);

  const removeOrder = useCallback(async (orderId: string) => {
    // Optimistically drop it; the 3s poll will reconcile if the call fails.
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    try {
      await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
    } catch {
      void fetchOrders();
    }
  }, [fetchOrders]);

  return (
    <div className="page">
      <main className="scroll-area account-main" aria-label="My orders">
        <h1 className="account-title">My orders</h1>

        {state === "loading" && <p className="order-status-msg">Loading…</p>}

        {state === "guest" && (
          <div className="account-actions">
            <p className="order-status-msg">Sign in to see your orders.</p>
            <Link href="/account/sign-in" className="account-btn">
              Sign In
            </Link>
          </div>
        )}

        {state === "ready" && orders.length === 0 && (
          <p className="order-status-msg">No current orders.</p>
        )}

        {state === "ready" && orders.length > 0 && (
          <div className="myorders-list">
            {orders.map((order) => {
              const cancelled = order.status === "cancelled";
              const active = stepIndex(order.status);
              return (
                <article key={order.id} className="myorder-card">
                  <button
                    type="button"
                    className="myorder-remove"
                    onClick={() => removeOrder(order.id)}
                    aria-label={`Remove order from ${order.shopName}`}
                    title="Remove from history"
                  >
                    ✕
                  </button>
                  <div className="myorder-head">
                    <span className="myorder-shop">{order.shopName}</span>
                    <span className="myorder-total">${order.total.toFixed(2)}</span>
                  </div>

                  <p className="myorder-items">
                    {order.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                  </p>

                  <span className="myorder-time">
                    Ordered {formatWhen(order.createdAt)}
                  </span>

                  {cancelled ? (
                    <p className="myorder-cancelled">Cancelled</p>
                  ) : (
                    <div className="myorder-track">
                      {STEPS.map((step, i) => (
                        <div
                          key={step.key}
                          className={`track-step${i <= active ? " track-step-done" : ""}`}
                        >
                          <span className="track-dot" aria-hidden="true" />
                          <span className="track-label">{step.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className="account-actions">
          <Link href="/account" className="account-btn account-btn-secondary">
            Back
          </Link>
        </div>
      </main>

      <BottomNav active="account" />
    </div>
  );
}
