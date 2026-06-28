import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import DeleteAccountConfirm from "@/components/DeleteAccountConfirm";
import { getCurrentCustomer } from "@/lib/auth";
import { ensureAuthTables } from "@/lib/db";

export default async function DeleteAccountPage() {
  await ensureAuthTables();
  const customer = await getCurrentCustomer();

  return (
    <div className="page">
      <main className="scroll-area account-main" aria-label="Delete account">
        {customer ? (
          <>
            <h1 className="account-title">Delete account</h1>
            <div className="delete-panel">
              <p className="delete-warning-icon" aria-hidden="true">⚠️</p>
              <p className="delete-lead">
                This permanently deletes <strong>{customer.email}</strong> and all
                of its data — orders, favorites, reviews
                {customer.role === "owner" ? ", and shop claims" : ""}. This can&apos;t
                be undone.
              </p>
              <DeleteAccountConfirm />
              <Link href="/account" className="account-btn account-btn-secondary">
                Cancel
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="account-title">Delete account</h1>
            <div className="account-actions">
              <p className="order-status-msg">Sign in to manage your account.</p>
              <Link href="/account/sign-in" className="account-btn">
                Sign In
              </Link>
            </div>
          </>
        )}
      </main>

      <BottomNav active="account" />
    </div>
  );
}
