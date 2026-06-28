import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";
import { getCurrentCustomer } from "@/lib/auth";
import { ensureAuthTables } from "@/lib/db";

const accountItems = ["Payment Methods"];

export default async function AccountGuestPage() {
  await ensureAuthTables();
  const customer = await getCurrentCustomer();
  const isOwner = customer?.role === "owner";

  return (
    <div className="page">
      <main
        className="scroll-area account-main"
        aria-label={customer ? "Account" : "Guest account"}
      >
        {customer ? (
          <>
            <h1 className="account-title">Hello {customer.name || "Richard"} ☕</h1>
            <div className="account-list">
              {isOwner && (
                <Link href="/dashboard" className="account-list-item">
                  🏪 Shop dashboard
                </Link>
              )}
              <Link href="/account/orders" className="account-list-item">
                Orders
              </Link>
              <Link href="/account/favorites" className="account-list-item">
                Favorites
              </Link>
              {accountItems.map((item) => (
                <button key={item} type="button" className="account-list-item">
                  {item}
                </button>
              ))}
              <Link
                href="/account/delete"
                className="account-list-item account-list-item-danger"
              >
                Delete account
              </Link>
            </div>

            <LogoutButton />
          </>
        ) : (
          <>
            <h1 className="account-title">Welcome Guest ☕</h1>

            <div className="account-actions">
              <Link href="/account/sign-in" className="account-btn">
                Sign In
              </Link>
              <Link href="/account/create" className="account-btn">
                Create Account
              </Link>
            </div>
          </>
        )}
      </main>

      <BottomNav active="account" />
    </div>
  );
}
