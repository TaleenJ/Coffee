import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/auth";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ customer: null }, { status: 200 });
  }
  return NextResponse.json({ customer });
}
