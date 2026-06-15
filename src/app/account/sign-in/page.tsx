"use client";

import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Sign in failed.");
        return;
      }

      router.push("/account");
      router.refresh();
    } catch {
      setError("Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <main className="scroll-area account-main" aria-label="Sign in">
        <h1 className="account-title">Sign In</h1>

        <form className="account-form" onSubmit={onSubmit}>
          <label className="account-label" htmlFor="sign-in-email">
            Email
          </label>
          <input
            id="sign-in-email"
            type="email"
            className="account-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label className="account-label" htmlFor="sign-in-password">
            Password
          </label>
          <input
            id="sign-in-password"
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
            {loading ? "Signing In..." : "Sign In"}
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
