"use client";

import type { OrderItem } from "@/lib/menu";

export type ReceiptOrder = {
  id: string;
  shopName: string;
  customerName?: string;
  items: OrderItem[];
  note: string | null;
  total: number;
  status: string;
  createdAt: string;
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function Receipt({
  order,
  onClose,
}: {
  order: ReceiptOrder;
  onClose: () => void;
}) {
  return (
    <div className="detail-overlay" onClick={onClose}>
      <div
        className="receipt-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Order receipt"
      >
        <div className="receipt-print">
          <p className="receipt-shop">{order.shopName}</p>
          <p className="receipt-title">ORDER RECEIPT</p>

          <div className="receipt-meta">
            <span>{formatWhen(order.createdAt)}</span>
            <span>Order #{order.id.slice(0, 8).toUpperCase()}</span>
            {order.customerName && <span>Customer: {order.customerName}</span>}
          </div>

          <div className="receipt-divider" aria-hidden="true" />

          <ul className="receipt-items">
            {order.items.map((item, i) => (
              <li key={i} className="receipt-item">
                <span className="receipt-item-name">
                  {item.qty}× {item.name}
                </span>
                <span className="receipt-item-price">
                  ${(item.price * item.qty).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          {order.note && <p className="receipt-note">Note: {order.note}</p>}

          <div className="receipt-divider" aria-hidden="true" />

          <div className="receipt-total">
            <span>TOTAL</span>
            <span>${order.total.toFixed(2)}</span>
          </div>

          <p className="receipt-status">Status: {order.status.toUpperCase()}</p>
          <p className="receipt-thanks">Thank you! ☕</p>
        </div>

        <div className="receipt-actions">
          <button
            type="button"
            className="detail-btn detail-btn-primary"
            onClick={() => window.print()}
          >
            Print receipt
          </button>
          <button type="button" className="detail-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
