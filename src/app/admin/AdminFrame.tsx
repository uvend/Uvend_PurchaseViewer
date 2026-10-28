"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Purchases", match: (path: string) => path === "/admin" },
  { href: "/admin/jobs", label: "Jobs", match: (path: string) => path.startsWith("/admin/jobs") },
  {
    href: "/admin/configure",
    label: "People",
    match: (path: string) => path.startsWith("/admin/configure"),
  },
];

export function AdminFrame({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-svh flex-col bg-muted/40 md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-blue-900 bg-blue-950 text-blue-50 md:min-h-svh md:w-56 md:border-r md:border-b-0">
        <div className="px-4 py-4">
          <p className="text-sm font-semibold tracking-tight">Uvend</p>
          <p className="text-xs text-blue-200">Office</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:grid md:px-2" aria-label="Admin">
          {nav.map((item) => (
            <Link
              className={cn(
                "rounded-md px-3 py-2 text-sm whitespace-nowrap text-blue-200 hover:bg-blue-900 hover:text-white",
                item.match(pathname) && "bg-blue-800 font-medium text-white",
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
          <Link
            className="rounded-md px-3 py-2 text-sm whitespace-nowrap text-blue-200 hover:bg-blue-900 hover:text-white"
            href="/"
          >
            Field app
          </Link>
        </nav>
        <div className="hidden px-2 pb-4 md:mt-auto md:block">
          <AdminLogoutButton className="text-blue-100 hover:bg-blue-900 hover:text-white" />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-end justify-between gap-4 border-b bg-background px-4 py-5 md:px-6">
          <div>
            <p className="text-sm text-muted-foreground">{kicker}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="md:hidden">
            <AdminLogoutButton />
          </div>
        </header>
        <div className="grid gap-4 p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
