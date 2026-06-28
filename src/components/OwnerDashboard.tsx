"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FavoriteShop } from "@/lib/coffeeShops";
import type { OrderItem } from "@/lib/menu";
import Receipt from "@/components/Receipt";

type ClaimStatus = "pending" | "verified";
type Claim = {
  id: string;
  osmId: string;
  shopName: string;
  phone: string | null;
  status: ClaimStatus;
};

type OrderStatus = "new" | "preparing" | "ready" | "completed" | "cancelled";
type Order = {
  id: string;
  osmId: string;
  shopName: string;
  customerName: string;
  items: OrderItem[];
  note: string | null;
  total: number;
  status: OrderStatus;
  createdAt: string;
};

const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  new: { status: "preparing", label: "Start" },
  preparing: { status: "ready", label: "Mark ready" },
  ready: { status: "completed", label: "Complete" },
};

export default function OwnerDashboard({ ownerName }: { ownerName: string }) {
  const [claims, setClaims] = useState<Claim[] | null>(null);

  const loadClaims = useCallback(async () => {
    try {
      const res = await fetch("/api/claims");
      const data = await res.json();
      setClaims(res.ok ? (data.claims ?? []) : []);
    } catch {
      setClaims([]);
    }
  }, []);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  if (claims === null) {
    return (
      <main className="scroll-area dashboard" aria-label="Shop dashboard">
        <p className="order-status-msg">Loading your shop…</p>
      </main>
    );
  }

  const verified = claims.find((c) => c.status === "verified");

  return (
    <main className="scroll-area dashboard" aria-label="Shop dashboard">
      <header className="dashboard-header">
        <h1 className="account-title">Shop dashboard</h1>
        <p className="dashboard-sub">Welcome, {ownerName}</p>
      </header>

      {verified ? (
        <OrdersBoard shopName={verified.shopName} />
      ) : (
        <ClaimFlow claims={claims} onChanged={loadClaims} />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Claim + verify
// ---------------------------------------------------------------------------

function ClaimFlow({
  claims,
  onChanged,
}: {
  claims: Claim[];
  onChanged: () => void;
}) {
  const pending = claims.find((c) => c.status === "pending");

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FavoriteShop[]>([]);
  const [error, setError] = useState("");

  // Active claim attempt
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [needsManual, setNeedsManual] = useState(false);
  const [pendingShop, setPendingShop] = useState<FavoriteShop | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError("");
    setResults([]);
    try {
      const geo = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const geoData = await geo.json();
      if (!geo.ok) {
        setError(geoData.error ?? "Couldn't find that place.");
        return;
      }
      const near = await fetch(
        `/api/nearby?lat=${geoData.lat}&lng=${geoData.lng}&radius=10&limit=30`,
      );
      const nearData = await near.json();
      setResults(nearData.shops ?? []);
      if ((nearData.shops ?? []).length === 0) {
        setError("No cafes found there. Try a nearby zip or city.");
      }
    } catch {
      setError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  async function claim(shop: FavoriteShop) {
    setClaimingId(shop.id);
    setError("");
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          osmId: shop.id,
          shopName: shop.name,
          phone: shop.phone ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't claim that shop.");
        return;
      }
      setPendingShop(shop);
      setDemoCode(data.demoCode ?? null);
      setNeedsManual(Boolean(data.needsManual));
    } catch {
      setError("Couldn't claim that shop.");
    } finally {
      setClaimingId(null);
    }
  }

  async function verify() {
    if (!pendingShop) return;
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/claims/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ osmId: pendingShop.id, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed.");
        return;
      }
      onChanged();
    } catch {
      setError("Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  // Mid-verification view
  if (pendingShop) {
    return (
      <section className="claim-panel">
        <h2 className="claim-title">Verify {pendingShop.name}</h2>
        {needsManual ? (
          <p className="claim-note">
            This shop has no public phone number on file, so your claim is{" "}
            <strong>pending manual review</strong>. For the demo, pick a shop that
            lists a phone to verify instantly.
          </p>
        ) : (
          <>
            <p className="claim-note">
              We sent a 6-digit code to the shop&apos;s phone on file
              {pendingShop.phone ? ` (${pendingShop.phone})` : ""}.
            </p>
            {demoCode && (
              <p className="claim-demo-code">
                Demo code (simulated SMS): <strong>{demoCode}</strong>
              </p>
            )}
            <input
              className="account-input"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <button
              type="button"
              className="account-btn"
              onClick={verify}
              disabled={code.length !== 6 || verifying}
            >
              {verifying ? "Verifying…" : "Verify & go live"}
            </button>
          </>
        )}
        {error && <p className="account-error">{error}</p>}
        <button
          type="button"
          className="account-btn account-btn-secondary"
          onClick={() => {
            setPendingShop(null);
            setDemoCode(null);
            setNeedsManual(false);
            setCode("");
          }}
        >
          Back
        </button>
      </section>
    );
  }

  return (
    <section className="claim-panel">
      <h2 className="claim-title">Claim your shop</h2>
      <p className="claim-note">
        Find your cafe and verify ownership with a code sent to its listed phone
        number.
      </p>

      {pending && (
        <p className="claim-note">
          You have a pending claim for <strong>{pending.shopName}</strong>.
        </p>
      )}

      <div className="zip-row">
        <input
          className="zip-input"
          placeholder="Your shop's zip or city"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
        />
        <button
          type="button"
          className="zip-btn"
          onClick={search}
          disabled={searching}
        >
          {searching ? "…" : "Search"}
        </button>
      </div>

      {error && <p className="account-error">{error}</p>}

      <div className="claim-results">
        {results.map((shop) => (
          <div key={shop.id} className="claim-result">
            <div className="claim-result-info">
              <span className="claim-result-name">{shop.name}</span>
              <span className="claim-result-meta">
                {shop.phone ? `📞 ${shop.phone}` : "No phone on file"}
              </span>
            </div>
            <button
              type="button"
              className="account-btn claim-result-btn"
              onClick={() => claim(shop)}
              disabled={claimingId === shop.id}
            >
              {claimingId === shop.id ? "…" : "Claim"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Live orders board
// ---------------------------------------------------------------------------

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
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

type BoardTab = "active" | "past";

function OrdersBoard({ shopName }: { shopName: string }) {
  const [tab, setTab] = useState<BoardTab>("active");
  const [orders, setOrders] = useState<Order[]>([]);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pastLoaded, setPastLoaded] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Order | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/incoming");
      if (!res.ok) return;
      const data = await res.json();
      const next: Order[] = data.orders ?? [];

      // Flag genuinely new orders for the "fly in" highlight.
      const fresh = new Set<string>();
      for (const o of next) {
        if (!seenIds.current.has(o.id)) fresh.add(o.id);
        seenIds.current.add(o.id);
      }
      if (fresh.size > 0) {
        setFlashIds((prev) => new Set([...prev, ...fresh]));
        window.setTimeout(() => {
          setFlashIds((prev) => {
            const copy = new Set(prev);
            fresh.forEach((id) => copy.delete(id));
            return copy;
          });
        }, 2500);
      }

      setOrders(next);
      setLoaded(true);
    } catch {
      /* keep showing last state */
    }
  }, []);

  const fetchPast = useCallback(async () => {
    try {
      const res = await fetch("/api/orders/incoming?scope=past");
      if (!res.ok) return;
      const data = await res.json();
      setPastOrders(data.orders ?? []);
      setPastLoaded(true);
    } catch {
      /* keep showing last state */
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
    const id = window.setInterval(fetchOrders, 3000);
    return () => window.clearInterval(id);
  }, [fetchOrders]);

  // Refresh past orders whenever that tab is shown.
  useEffect(() => {
    if (tab === "past") void fetchPast();
  }, [tab, fetchPast]);

  async function setStatus(orderId: string, status: OrderStatus) {
    setUpdating(orderId);
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchOrders();
      // A completed/cancelled order moves to the Past tab.
      if (status === "completed" || status === "cancelled") void fetchPast();
    } finally {
      setUpdating(null);
    }
  }

  const list = tab === "active" ? orders : pastOrders;

  return (
    <section className="board">
      <div className="board-head">
        <div>
          <h2 className="board-shop">{shopName}</h2>
          {tab === "active" ? (
            <p className="board-live">
              <span className="board-live-dot" aria-hidden="true" /> Live · updates
              every 3s
            </p>
          ) : (
            <p className="board-live">Completed &amp; cancelled orders</p>
          )}
        </div>
        <span className="board-count">
          {tab === "active" ? `${orders.length} active` : `${pastOrders.length} past`}
        </span>
      </div>

      <div className="board-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "active"}
          className={`board-tab${tab === "active" ? " board-tab-active" : ""}`}
          onClick={() => setTab("active")}
        >
          Active
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "past"}
          className={`board-tab${tab === "past" ? " board-tab-active" : ""}`}
          onClick={() => setTab("past")}
        >
          Past orders
        </button>
      </div>

      {tab === "active" && loaded && orders.length === 0 && (
        <p className="board-empty">
          No active orders yet. New orders will appear here automatically. ☕
        </p>
      )}
      {tab === "past" && pastLoaded && pastOrders.length === 0 && (
        <p className="board-empty">No past orders yet.</p>
      )}

      <div className="board-list">
        {list.map((order) => {
          const next = NEXT[order.status];
          const isActive = tab === "active";
          return (
            <article
              key={order.id}
              className={`order-card${
                isActive && flashIds.has(order.id) ? " order-card-new" : ""
              }`}
            >
              <div className="order-card-top">
                <span className={`status-pill status-${order.status}`}>
                  {order.status}
                </span>
                <span className="order-card-time">{timeAgo(order.createdAt)}</span>
              </div>

              <p className="order-card-customer">{order.customerName}</p>
              <span className="order-card-when">{formatWhen(order.createdAt)}</span>

              <ul className="order-card-items">
                {order.items.map((item, i) => (
                  <li key={i}>
                    {item.qty}× {item.name}
                  </li>
                ))}
              </ul>

              {order.note && <p className="order-card-note">“{order.note}”</p>}

              <div className="order-card-foot">
                <span className="order-card-total">${order.total.toFixed(2)}</span>
                <div className="order-card-actions">
                  {isActive && next && (
                    <button
                      type="button"
                      className="board-btn board-btn-primary"
                      onClick={() => setStatus(order.id, next.status)}
                      disabled={updating === order.id}
                    >
                      {next.label}
                    </button>
                  )}
                  {isActive && (
                    <button
                      type="button"
                      className="board-btn board-btn-ghost"
                      onClick={() => setStatus(order.id, "cancelled")}
                      disabled={updating === order.id}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    className="board-btn board-btn-ghost"
                    onClick={() => setReceipt(order)}
                  >
                    Receipt
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {receipt && (
        <Receipt order={receipt} onClose={() => setReceipt(null)} />
      )}
    </section>
  );
}
