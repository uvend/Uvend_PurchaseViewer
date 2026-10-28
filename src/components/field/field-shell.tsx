"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, FileText, House, ShoppingBag, Wrench } from "lucide-react";
import { AdminLogoutButton } from "@/app/admin/AdminLogoutButton";
import { cn } from "@/lib/utils";

const nav = [
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
            {pathname !== "/" ? (
              <Link
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium",
                  navy ? "text-blue-100 hover:bg-white/10 hover:text-white" : "hover:bg-accent",
                )}
                href="/"
              >
                <House className="size-4" />
                Home
              </Link>
            ) : null}
            <AdminLogoutButton
              className={navy ? "text-blue-100 hover:bg-white/10 hover:text-white" : undefined}
              redirectTo="/login"
            />
          </div>
          {headerExtra}
        </header>

        <main className={cn("flex flex-1 flex-col gap-4 px-4 py-5", footer && "pb-28")}>{children}</main>

        {footer ? <div className="sticky bottom-0 border-t bg-background p-3">{footer}</div> : null}

        {showNav ? (
          <nav className="sticky bottom-0 grid grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom)]">
            {nav.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;

              return (
                <Link
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 py-2.5 text-xs text-muted-foreground",
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
