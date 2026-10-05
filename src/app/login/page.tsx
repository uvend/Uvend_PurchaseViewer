"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function StaffLoginPage() {
  return (
    <Suspense fallback={<main className="admin-shell" />}>
      <StaffLoginForm />
    </Suspense>
  );
}

function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("Checking login...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, source: "purchase" }),
      });

      if (!response.ok) {
        throw new Error("Invalid login");
      }

      const nextPath = searchParams.get("next") || "/purchase";
      router.replace(nextPath.startsWith("/purchase") ? nextPath : "/purchase");
      router.refresh();
    } catch {
      setMessage("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-shell">
      <section className="admin-login-card">
        <p className="eyebrow">Purchase capture</p>
        <h1>Staff login</h1>
        <p>Sign in with your username and password before logging a purchase.</p>

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
            {loading ? "Checking..." : "Sign in"}
          </button>
        </form>

        {message && <p className="admin-login-message">{message}</p>}

        <Link className="admin-link" href="/admin/login">
          Admin login
        </Link>
      </section>
    </main>
  );
}
