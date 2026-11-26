"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminFrame } from "../AdminFrame";
import { panelClass } from "@/components/admin/panel";
import { Button } from "@/components/ui/button";
import { roleLabel } from "@/lib/format";
import { applyTheme, readTheme, themes, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Account = {
  name: string;
  username: string;
  email: string;
  role: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [theme, setTheme] = useState<ThemeId>("default");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const meResponse = await fetch("/api/auth/me");

      if (!meResponse.ok) {
        return;
      }

      const me = (await meResponse.json()) as { user?: { userId: string; username: string; role: string } };
      const usersResponse = await fetch("/api/users");
      const users = usersResponse.ok
        ? ((await usersResponse.json()) as {
            users: { id: string; name: string | null; username: string | null; email: string | null; role: string }[];
          })
        : { users: [] };
      const match = users.users.find((user) => user.id === me.user?.userId);

      if (!cancelled && me.user) {
        setAccount({
          name: match?.name?.trim() || me.user.username,
          username: me.user.username,
          email: match?.email || "No email",
          role: roleLabel(match?.role || me.user.role),
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function chooseTheme(next: ThemeId) {
    applyTheme(next);
    setTheme(next);
  }

  return (
    <AdminFrame kicker="This admin account" title="Settings">
      <section className={`${panelClass} grid gap-4 p-5`}>
        <div>
          <h2 className="text-sm font-semibold">Appearance</h2>
          <p className="text-xs text-muted-foreground">The choice stays on this browser.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Appearance">
          {themes.map((option) => {
            const selected = theme === option.id;
            return (
              <button
                aria-checked={selected}
                className={cn(
                  "grid gap-3 rounded-2xl border bg-card p-3 text-left transition-colors hover:bg-accent",
                  selected ? "border-primary ring-2 ring-primary" : "border-border",
                )}
                key={option.id}
                onClick={() => chooseTheme(option.id)}
                role="radio"
                type="button"
              >
                <span className="flex h-16 overflow-hidden rounded-lg border border-black/10">
                  <span className="w-6" style={{ background: option.sidebar }} />
                  <span className="flex flex-1 flex-col justify-center gap-1.5 px-2" style={{ background: option.canvas }}>
                    <span className="h-2 w-10 rounded-full" style={{ background: option.accent }} />
                    <span className="h-2 w-16 rounded-full bg-black/10" />
                  </span>
                </span>
                <span>
                  <span className="block text-sm font-semibold">{option.name}</span>
                  <span className="block text-xs text-muted-foreground">{selected ? "In use" : option.detail}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className={`${panelClass} grid gap-3 p-5 text-sm`}>
          <h2 className="text-sm font-semibold">Account</h2>
          {account ? (
            <dl className="grid gap-3">
              <Fact label="Name" value={account.name} />
              <Fact label="Username" value={`@${account.username}`} />
              <Fact label="Email" value={account.email} />
              <Fact label="Role" value={account.role} />
            </dl>
          ) : (
            <p className="text-slate-500">Loading account...</p>
          )}
        </article>
        <article className={`${panelClass} grid h-fit gap-4 p-5 text-sm`}>
          <h2 className="text-sm font-semibold">Session</h2>
          <p className="text-slate-500">Sign out of the office on this browser.</p>
          <div>
            <Button onClick={logout} type="button">
              Log out
            </Button>
          </div>
        </article>
      </section>
    </AdminFrame>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
