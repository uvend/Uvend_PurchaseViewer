"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="admin-shell" />}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("Checking admin login...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, source: "admin" }),
      });

      if (!response.ok) {
        throw new Error("Invalid login");
      }

      const nextPath = searchParams.get("next") || "/admin";
      router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
      router.refresh();
    } catch {
      setMessage("Invalid admin username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-shell">
      <section className="admin-login-card">
        <p className="eyebrow">Admin access</p>
        <h1>Enter admin password</h1>
        <p>Only users with the Admin role can view the admin pages.</p>

        <form onSubmit={login}>
          <label className="field">
            Username
            <input
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
          </label>

          <label className="field">
            Password
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Checking..." : "Enter admin"}
          </button>
        </form>

        {message && <p className="admin-login-message">{message}</p>}

        <Link className="admin-link" href="/login">
          Staff login
        </Link>
      </section>
    </main>
  );
}
