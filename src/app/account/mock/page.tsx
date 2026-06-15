import Link from "next/link";
import BottomNav from "@/components/BottomNav";

const items = [
  "Favorites",
  "Orders",
  "Payment Methods",
  "Settings",
  "Logout",
];

export default function MockAccountPage() {
  return (
    <div className="page">
      <main className="scroll-area account-main" aria-label="Mock account">
        <h1 className="account-title">Hello Richard ☕</h1>

        <div className="account-list">
          {items.map((item) => (
            <button key={item} type="button" className="account-list-item">
              {item}
            </button>
          ))}
        </div>

        <Link href="/account" className="account-link">
          Back to guest account
        </Link>
      </main>

      <BottomNav active="account" />
    </div>
  );
}
