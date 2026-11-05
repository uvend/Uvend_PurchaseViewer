"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, ShoppingBag, Wrench } from "lucide-react";
import { FieldShell } from "@/components/field/field-shell";

type SignedInUser = {
  userId: string;
  username: string;
};

const paths = [
  {
    href: "/purchase",
    title: "Purchases",
    detail: "Slip, item, then the shop",
    icon: ShoppingBag,
  },
  {
    href: "/installations",
    title: "Installations",
    detail: "Open a job card and leave notes",
    icon: Wrench,
  },
  {
    href: "/invoices",
    title: "Invoices",
    detail: "Bill a job and add what was bought",
    icon: FileText,
  },
];

export default function AppHome() {
  const [username, setUsername] = useState("");

  useEffect(() => {
    async function loadSession() {
      const response = await fetch("/api/auth/me");

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { user: SignedInUser };
      setUsername(data.user.username);
    }

    loadSession();
  }, []);

  return (
    <FieldShell subtitle={username ? `Signed in as @${username}` : "Field"} title="Uvend">
      <p className="text-sm text-muted-foreground">Pick one thing and finish it.</p>
      <div className="grid gap-2">
        {paths.map((path) => {
          const Icon = path.icon;

          return (
            <Link
              className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent"
              href={path.href}
              key={path.href}
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{path.title}</span>
                <span className="block text-sm text-muted-foreground">{path.detail}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </FieldShell>
  );
}
