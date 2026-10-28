"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { cn } from "@/lib/utils";

export function AuthScreen({ mode }: { mode: "staff" | "admin" }) {
  return (
    <Suspense fallback={<main className="min-h-svh bg-muted/50" />}>
      <AuthForm mode={mode} />
    </Suspense>
  );
}

function AuthForm({ mode }: { mode: "staff" | "admin" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const next = searchParams.get("next");
  const staffHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  const adminHref = next ? `/admin/login?next=${encodeURIComponent(next)}` : "/admin/login";

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          source: mode === "admin" ? "admin" : "purchase",
        }),
      });

      if (!response.ok) {
        throw new Error("Invalid login");
      }

      if (mode === "admin") {
        const nextPath = next || "/admin";
        router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
      } else {
        const nextPath = next || "/";
        const allowed =
          nextPath === "/" ||
          nextPath.startsWith("/purchase") ||
          nextPath.startsWith("/installations") ||
          nextPath.startsWith("/invoices");
        router.replace(allowed ? nextPath : "/");
      }

      router.refresh();
    } catch {
      setMessage(mode === "admin" ? "Invalid admin username or password." : "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-muted/50 px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            {mode === "admin" ? "Office access for admins." : "Field access for purchases, jobs, and invoices."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm">
            <Link
              className={cn(
                "rounded-md px-3 py-1.5 text-center",
                mode === "staff" ? "bg-background font-medium shadow-xs" : "text-muted-foreground",
              )}
              href={staffHref}
            >
              Staff
            </Link>
            <Link
              className={cn(
                "rounded-md px-3 py-1.5 text-center",
                mode === "admin" ? "bg-background font-medium shadow-xs" : "text-muted-foreground",
              )}
              href={adminHref}
            >
              Admin
            </Link>
          </div>

          <form className="grid gap-4" onSubmit={login}>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                autoComplete="username"
                id="username"
                onChange={(event) => setUsername(event.target.value)}
                required
                value={username}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                autoComplete="current-password"
                id="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            <Button className="w-full" disabled={loading} size="lg" type="submit">
              {loading ? "Checking..." : "Continue"}
            </Button>
          </form>

          {message ? <Notice>{message}</Notice> : null}
        </CardContent>
      </Card>
    </main>
  );
}
