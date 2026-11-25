"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, FileText, House, LayoutDashboard, ShoppingBag, Wrench } from "lucide-react";
import { AdminLogoutButton } from "@/app/admin/AdminLogoutButton";
import { cn } from "@/lib/utils";

const fieldNav = [
  { href: "/", label: "Home", icon: House, match: (path: string) => path === "/" },
  {
    href: "/purchase",
    label: "Buy",
    icon: ShoppingBag,
    match: (path: string) => path.startsWith("/purchase"),
  },
  {
    href: "/installations",
    label: "Jobs",
    icon: Wrench,
    match: (path: string) => path.startsWith("/installations"),
  },
  {
    href: "/invoices",
    label: "Bills",
    icon: FileText,
    match: (path: string) => path.startsWith("/invoices"),
  },
];

const adminNav = {
  href: "/admin",
  label: "Admin",
  icon: LayoutDashboard,
  match: (path: string) => path.startsWith("/admin"),
};

export function FieldShell({
  title,
  subtitle,
  backHref,
  children,
  footer,
  headerExtra,
  showNav = true,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  children: ReactNode;
  footer?: ReactNode;
  headerExtra?: ReactNode;
  tone?: "default" | "navy";
  showNav?: boolean;
}) {
  const pathname = usePathname();
  const home = pathname === "/";
  const [isAdmin, setIsAdmin] = useState(false);
  const nav = isAdmin ? [...fieldNav, adminNav] : fieldNav;

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      const response = await fetch("/api/auth/me");

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { user?: { role?: string } };

      if (!cancelled) {
        setIsAdmin(data.user?.role === "ADMIN");
      }
    }

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-svh bg-[#e7edf6]">
      <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col bg-[#f4f7fb] sm:border-x sm:border-slate-200">
        <header className="relative sticky top-0 z-20 overflow-hidden bg-[#0b1c3d] text-white">
          <svg className="pointer-events-none absolute top-0 right-0 h-full w-36 opacity-50" viewBox="0 0 140 80" aria-hidden>
            <path d="M40 0 C 70 20, 90 10, 140 28 L 140 0 Z" fill="#16325c" />
            <path d="M70 80 C 100 50, 120 70, 140 48 L 140 80 Z" fill="#1d4f91" />
          </svg>
          <div className="relative flex items-center gap-2 px-4 py-3.5">
            {backHref ? (
              <Link
                aria-label="Back"
                className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-white/10"
                href={backHref}
              >
                <ChevronLeft className="size-4" />
              </Link>
            ) : null}
            {home ? <BrandMark /> : null}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold tracking-tight">{home ? "Uvend" : title}</h1>
              {!home && subtitle ? <p className="truncate text-sm text-slate-300">{subtitle}</p> : null}
            </div>
            <AdminLogoutButton className="text-white hover:bg-white/10 hover:text-white" icon redirectTo="/login" />
          </div>
          {headerExtra ? <div className="relative px-4 pb-3">{headerExtra}</div> : null}
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5">{children}</main>

        {footer ? <div className="border-t border-slate-200 bg-white p-3">{footer}</div> : null}

        {showNav ? (
          <nav
            className={cn(
              "grid border-t border-slate-200 bg-white px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]",
              nav.length > 4 ? "grid-cols-5" : "grid-cols-4",
            )}
          >
            {nav.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;

              return (
                <Link
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] text-slate-400",
                    active && "bg-blue-50 font-medium text-[#2f6bff]",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <span className="relative size-8 shrink-0" aria-hidden>
      <span className="absolute top-0 left-0 size-4 rounded-md bg-sky-400" />
      <span className="absolute right-0 bottom-0 size-4 rounded-md bg-[#2f6bff] ring-2 ring-[#0b1c3d]" />
    </span>
  );
}
