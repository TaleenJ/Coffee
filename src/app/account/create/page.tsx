"use client";

import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function CreateAccountPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [role, setRole] = useState<"user" | "owner">("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, rememberMe, role }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Create account failed.");
        return;
      }

      // Owners go straight to their dashboard to claim a shop.
      router.push(data.customer?.role === "owner" ? "/dashboard" : "/account");
      router.refresh();
    } catch {
      setError("Create account failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <main className="scroll-area account-main" aria-label="Create account">
        <h1 className="account-title">Create Account</h1>

        <form className="account-form" onSubmit={onSubmit}>
          <span className="account-label">Account type</span>
          <div className="role-toggle">
            <button
              type="button"
              className={`role-option${role === "user" ? " role-option-active" : ""}`}
              onClick={() => setRole("user")}
              aria-pressed={role === "user"}
            >
              ☕ Customer
            </button>
            <button
              type="button"
              className={`role-option${role === "owner" ? " role-option-active" : ""}`}
              onClick={() => setRole("owner")}
              aria-pressed={role === "owner"}
            >
              🏪 Shop owner
            </button>
          </div>

          <label className="account-label" htmlFor="create-name">
            Name
          </label>
          <input
            id="create-name"
            type="text"
            className="account-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label className="account-label" htmlFor="create-email">
            Email
          </label>
          <input
            id="create-email"
            type="email"
            className="account-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label className="account-label" htmlFor="create-password">
            Password
          </label>
          <input
            id="create-password"
            type="password"
            className="account-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <label className="remember-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            Remember Me
          </label>

          {error ? <p className="account-error">{error}</p> : null}

          <button type="submit" className="account-btn" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <div className="account-actions">
          <Link href="/account" className="account-btn account-btn-secondary">
            Back
          </Link>
        </div>
      </main>

      <BottomNav active="account" />
    </div>
  );
}
