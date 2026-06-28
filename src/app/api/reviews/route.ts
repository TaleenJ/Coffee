import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/auth";
import { ensureAuthTables } from "@/lib/db";
import {
  getMyReview,
  getSummary,
  hasOrdered,
  listReviews,
  upsertReview,
} from "@/lib/reviews";

export async function GET(request: NextRequest) {
  await ensureAuthTables();

  const osmId = request.nextUrl.searchParams.get("osmId")?.trim();
  if (!osmId) {
    return NextResponse.json({ error: "Missing osmId." }, { status: 400 });
  }

  const customer = await getCurrentCustomer();

  const [summary, reviews] = await Promise.all([
    getSummary(osmId),
    listReviews(osmId),
  ]);

  let canReview = false;
  let myReview = null;
  if (customer) {
    [canReview, myReview] = await Promise.all([
      hasOrdered(customer.id, osmId),
      getMyReview(customer.id, osmId),
    ]);
  }

  return NextResponse.json({
    summary,
    reviews,
    canReview,
    myReview,
    loggedIn: Boolean(customer),
  });
}

export async function POST(request: NextRequest) {
  await ensureAuthTables();

  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Sign in to leave a review." }, {
      status: 401,
    });
  }

  let payload: { osmId?: unknown; rating?: unknown; body?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const osmId = typeof payload.osmId === "string" ? payload.osmId.trim() : "";
  const rating = Number(payload.rating);
  const body =
    typeof payload.body === "string" ? payload.body.trim().slice(0, 1000) : "";

  if (!osmId) {
    return NextResponse.json({ error: "Missing osmId." }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 5." },
      { status: 400 },
    );
  }

  const ordered = await hasOrdered(customer.id, osmId);
  if (!ordered) {
    return NextResponse.json(
      { error: "Only customers who have ordered here can leave a review." },
      { status: 403 },
    );
  }

  await upsertReview({
    customerId: customer.id,
    customerName: customer.name,
    osmId,
    rating,
    body: body || null,
  });

  const [summary, reviews, myReview] = await Promise.all([
    getSummary(osmId),
    listReviews(osmId),
    getMyReview(customer.id, osmId),
  ]);

  return NextResponse.json({ summary, reviews, myReview, canReview: true });
}
