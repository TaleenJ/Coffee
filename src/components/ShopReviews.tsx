"use client";

import { useEffect, useState } from "react";

type Review = {
  id: string;
  customerName: string;
  rating: number;
  body: string | null;
  createdAt: string;
};

type ReviewsResponse = {
  summary: { average: number; count: number };
  reviews: Review[];
  canReview: boolean;
  myReview: Review | null;
  loggedIn: boolean;
};

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className="review-stars" aria-label={`${value} out of 5`}>
      {"★★★★★".slice(0, rounded)}
      <span className="review-stars-empty">{"★★★★★".slice(rounded)}</span>
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function ShopReviews({ osmId }: { osmId: string }) {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftRating, setDraftRating] = useState(0);
  const [draftBody, setDraftBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/reviews?osmId=${encodeURIComponent(osmId)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((res: ReviewsResponse | null) => {
        if (!res) return;
        setData(res);
        setDraftRating(res.myReview?.rating ?? 0);
        setDraftBody(res.myReview?.body ?? "");
      })
      .catch(() => {
        /* aborted or offline */
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [osmId]);

  async function submit() {
    if (draftRating < 1) {
      setError("Pick a star rating first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ osmId, rating: draftRating, body: draftBody }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not save review.");
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              summary: json.summary,
              reviews: json.reviews,
              myReview: json.myReview,
              canReview: true,
            }
          : prev,
      );
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="detail-row review-section">
      <div className="review-head">
        <span className="detail-label">Reviews</span>
        {data && data.summary.count > 0 ? (
          <span className="review-summary">
            <Stars value={data.summary.average} />
            <strong>{data.summary.average.toFixed(1)}</strong>
            <span className="review-count">
              ({data.summary.count})
            </span>
          </span>
        ) : (
          !loading && <span className="review-count">No reviews yet</span>
        )}
      </div>

      {loading && <p className="review-empty">Loading reviews…</p>}

      {!loading && data && (
        <>
          {data.canReview ? (
            <div className="review-form">
              <p className="review-form-title">
                {data.myReview ? "Update your review" : "You ordered here — leave a review"}
              </p>
              <div
                className="review-star-input"
                role="radiogroup"
                aria-label="Your rating"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`review-star-btn${n <= draftRating ? " active" : ""}`}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    aria-pressed={n <= draftRating}
                    onClick={() => setDraftRating(n)}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                className="review-textarea"
                placeholder="How was it? (optional)"
                value={draftBody}
                maxLength={1000}
                onChange={(e) => setDraftBody(e.target.value)}
                rows={3}
              />
              {error && <p className="review-error">{error}</p>}
              <button
                type="button"
                className="detail-btn detail-btn-primary review-submit"
                onClick={submit}
                disabled={submitting}
              >
                {submitting
                  ? "Saving…"
                  : data.myReview
                    ? "Update review"
                    : "Post review"}
              </button>
            </div>
          ) : (
            <p className="review-gate">
              {data.loggedIn
                ? "Order from this shop to leave a verified review."
                : "Sign in and order here to leave a review."}
            </p>
          )}

          <div className="review-list">
            {data.reviews.length === 0 && (
              <p className="review-empty">Be the first to review this shop.</p>
            )}
            {data.reviews.map((r) => (
              <div key={r.id} className="review-item">
                <div className="review-item-head">
                  <span className="review-author">{r.customerName}</span>
                  <Stars value={r.rating} />
                </div>
                {r.body && <p className="review-body">{r.body}</p>}
                <span className="review-date">{formatDate(r.createdAt)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
