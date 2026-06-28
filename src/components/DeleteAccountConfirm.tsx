"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteAccountConfirm() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteAccount() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't delete your account. Try again.");
        return;
      }
      // Account and session are gone — send them home.
      router.push("/");
      router.refresh();
    } catch {
      setError("Couldn't delete your account. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {error && <p className="account-error">{error}</p>}
      <button
        type="button"
        className="account-btn account-btn-danger"
        onClick={deleteAccount}
        disabled={deleting}
      >
        {deleting ? "Deleting…" : "Yes, delete my account"}
      </button>
    </>
  );
}
