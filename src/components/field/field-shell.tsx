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
  tone = "default",
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
  const navy = tone === "navy";
  const [isAdmin, setIsAdmin] = useState(false);
  const nav = isAdmin ? [adminNav, ...fieldNav] : fieldNav;

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
    <div className="min-h-svh bg-muted/50">
      <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col bg-background sm:border-x">
        <header
          className={cn(
            "sticky top-0 z-20 border-b px-3 py-3",
            navy ? "border-blue-900 bg-blue-950 text-white" : "bg-background/95 backdrop-blur",
          )}
        >
          <div className="flex items-center gap-2">
            {backHref ? (
              <Link
                aria-label="Back"
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-md",
                  navy ? "hover:bg-white/10" : "hover:bg-accent",
                )}
                href={backHref}
              >
                <ChevronLeft className="size-4" />
              </Link>
            ) : null}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
              {subtitle ? (
                <p className={cn("truncate text-sm", navy ? "text-blue-200" : "text-muted-foreground")}>
                  {subtitle}
                </p>
              ) : null}
            </div>
            <AdminLogoutButton
              className={navy ? "text-blue-100 hover:bg-white/10 hover:text-white" : undefined}
              redirectTo="/login"
            />
          </div>
          {headerExtra}
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5">{children}</main>

        {footer ? <div className="border-t bg-background p-3">{footer}</div> : null}

        {showNav ? (
          <nav
            className={cn(
              "grid border-t bg-background pb-[env(safe-area-inset-bottom)]",
              nav.length > 4 ? "grid-cols-5" : "grid-cols-4",
            )}
          >
            {nav.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;

              return (
                <Link
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-1 px-1 py-2.5 text-[11px] text-muted-foreground",
                    active && "text-foreground",
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
