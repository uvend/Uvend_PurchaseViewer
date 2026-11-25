"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, ShoppingBag, Wrench } from "lucide-react";
import { FieldShell } from "@/components/field/field-shell";
import { cn } from "@/lib/utils";

const paths = [
  {
    href: "/purchase",
    title: "Make a purchase",
    detail: "Slip, item, then the shop",
    icon: ShoppingBag,
    bar: "border-l-[#2f6bff]",
    iconClass: "bg-blue-50 text-[#2f6bff]",
  },
  {
    href: "/installations",
    title: "Complete an installation",
    detail: "Open a job card and leave notes",
    icon: Wrench,
    bar: "border-l-violet-500",
    iconClass: "bg-violet-50 text-violet-600",
  },
  {
    href: "/invoices",
    title: "View invoices",
    detail: "Bill a job and add what was bought",
    icon: FileText,
    bar: "border-l-emerald-500",
    iconClass: "bg-emerald-50 text-emerald-600",
  },
];

export default function AppHome() {
  const [name, setName] = useState("");

  useEffect(() => {
    async function loadSession() {
      const response = await fetch("/api/auth/me");

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { user: { username: string; name?: string | null } };
      setName(data.user.name?.trim() || data.user.username);
    }

    void loadSession();
  }, []);

  return (
    <FieldShell title="Uvend">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-800">{name ? `Hi, ${name}` : "Hi"}</h2>
        <p className="mt-1 text-sm text-slate-500">What would you like to do?</p>
      </div>
      <div className="grid gap-3">
        {paths.map((path) => {
          const Icon = path.icon;

          return (
            <Link
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-slate-200/80 border-l-4 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                path.bar,
              )}
              href={path.href}
              key={path.href}
            >
              <span className={cn("flex size-11 items-center justify-center rounded-xl", path.iconClass)}>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">{path.title}</span>
                <span className="block text-sm text-slate-500">{path.detail}</span>
              </span>
              <ChevronRight className="size-4 text-slate-300" />
            </Link>
          );
        })}
      </div>
    </FieldShell>
  );
}
