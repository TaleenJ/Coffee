import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import OwnerDashboard from "@/components/OwnerDashboard";
import { getCurrentCustomer } from "@/lib/auth";
import { ensureAuthTables } from "@/lib/db";

export default async function DashboardPage() {
  await ensureAuthTables();
  const customer = await getCurrentCustomer();

  if (!customer) {
    return (
      <div className="page">
        <main className="scroll-area account-main" aria-label="Dashboard">
          <h1 className="account-title">Shop dashboard</h1>
          <p className="dashboard-gate">Please sign in to manage your shop.</p>
          <div className="account-actions">
            <Link href="/account/sign-in" className="account-btn">
              Sign In
            </Link>
          </div>
        </main>
        <BottomNav active="account" />
      </div>
    );
  }

  if (customer.role !== "owner") {
    return (
      <div className="page">
        <main className="scroll-area account-main" aria-label="Dashboard">
          <h1 className="account-title">Shop dashboard</h1>
          <p className="dashboard-gate">
            This area is for shop owners. Create a shop-owner account to manage
            orders.
          </p>
          <div className="account-actions">
            <Link href="/account" className="account-btn account-btn-secondary">
              Back to account
            </Link>
          </div>
        </main>
        <BottomNav active="account" />
      </div>
    );
  }

  return (
    <div className="page">
      <OwnerDashboard ownerName={customer.name} />
      <BottomNav active="account" />
    </div>
  );
}
