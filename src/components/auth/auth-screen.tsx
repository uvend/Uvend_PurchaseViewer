"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";

export function AuthScreen() {
  return (
    <Suspense fallback={<main className="min-h-svh bg-muted/50" />}>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const next = searchParams.get("next");

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid login");
      }

      const data = (await response.json()) as { user?: { role?: string } };
      router.replace(destinationForRole(data.user?.role, next));
      router.refresh();
    } catch {
      setMessage("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-muted/50 px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Purchases, jobs, and invoices.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
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

function destinationForRole(role: string | undefined, next: string | null) {
  if (role === "ADMIN") {
    return next?.startsWith("/admin") ? next : "/admin";
  }

  if (
    next === "/" ||
    next?.startsWith("/purchase") ||
    next?.startsWith("/installations") ||
    next?.startsWith("/invoices")
  ) {
    return next;
  }

  return "/";
}
