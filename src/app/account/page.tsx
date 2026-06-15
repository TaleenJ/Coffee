import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";
import { getCurrentCustomer } from "@/lib/auth";

const accountItems = ["Favorites", "Orders", "Payment Methods", "Settings"];

export default async function AccountGuestPage() {
  const customer = await getCurrentCustomer();

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
              {accountItems.map((item) => (
                <button key={item} type="button" className="account-list-item">
                  {item}
                </button>
              ))}
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
