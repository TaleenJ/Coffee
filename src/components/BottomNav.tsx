import Link from "next/link";

type BottomNavProps = {
  active?: "map" | "nearby" | "account";
  position?: "top" | "bottom";
};

export default function BottomNav({ active, position = "bottom" }: BottomNavProps) {
  return (
    <nav
      className={position === "top" ? "top-bar" : "bottom-bar"}
      aria-label="Navigation"
    >
      <Link
        href="/map"
        className={`nav-btn nav-link${active === "map" ? " nav-btn-active" : ""}`}
        aria-label="Find beans"
        aria-current={active === "map" ? "page" : undefined}
      >
        find beans
      </Link>
      <Link
        href="/"
        className={`nav-btn nav-link${active === "nearby" ? " nav-btn-active" : ""}`}
        aria-label="What's nearby!"
        aria-current={active === "nearby" ? "page" : undefined}
      >
        whats nearby!
      </Link>
      <Link
        href="/account"
        className={`nav-btn nav-link${active === "account" ? " nav-btn-active" : ""}`}
        aria-label="Profile"
        aria-current={active === "account" ? "page" : undefined}
      >
        profile
      </Link>
    </nav>
  );
}
