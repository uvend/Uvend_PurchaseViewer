"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  ChevronDown,
  LayoutDashboard,
  MapPin,
  ScrollText,
  Settings,
  Smartphone,
  Users,
} from "lucide-react";
import { initials, roleLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Dash", icon: LayoutDashboard, match: (path: string) => path === "/admin" },
  {
    href: "/admin/tracking",
    label: "Tracking",
    icon: MapPin,
    match: (path: string) => path.startsWith("/admin/tracking"),
  },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase, match: (path: string) => path.startsWith("/admin/jobs") },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: BarChart3,
    match: (path: string) => path.startsWith("/admin/reports"),
  },
  { href: "/admin/logs", label: "Logs", icon: ScrollText, match: (path: string) => path.startsWith("/admin/logs") },
  {
    href: "/admin/users",
    label: "People",
    icon: Users,
    adminOnly: true,
    match: (path: string) => path.startsWith("/admin/users") || path.startsWith("/admin/configure"),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    match: (path: string) => path.startsWith("/admin/settings"),
  },
  { href: "/", label: "Field", icon: Smartphone, match: (path: string) => path === "/" },
];

export function AdminFrame({
  title,
  kicker,
  actions,
  children,
}: {
  title: string;
  kicker: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const visibleNav = nav.filter((item) => !("adminOnly" in item && item.adminOnly) || role === "ADMIN");

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      const response = await fetch("/api/auth/me");

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { user?: { role?: string } };

      if (!cancelled) {
        setRole(data.user?.role ?? null);
      }
    }

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-[#f4f7fb] text-slate-900">
      <aside className="relative hidden h-full w-[232px] shrink-0 flex-col overflow-hidden bg-[#0b1c3d] text-slate-200 lg:flex">
        <SidebarBrand />
        <nav className="grid min-h-0 flex-1 content-start gap-1 overflow-y-auto px-3" aria-label="Admin">
          {visibleNav.map((item) => (
            <NavLink active={item.match(pathname)} href={item.href} icon={item.icon} key={item.href} label={item.label} />
          ))}
        </nav>
        <SidebarWaves />
        <AccountChip />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 bg-[#0b1c3d] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-slate-200 lg:hidden">
          <SidebarBrand compact />
          <AccountChip compact />
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-5 sm:gap-4 lg:px-6 lg:pt-6">
            <div className="min-w-0">
              <h1 className="text-xl leading-tight font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{kicker}</p>
            </div>
            {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div> : null}
          </header>
          <div className="grid min-w-0 gap-4 px-4 py-4 lg:px-6 lg:pb-8">{children}</div>
        </div>

        <nav
          aria-label="Admin"
          className="grid shrink-0 grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          {visibleNav.map((item) => (
            <BottomLink active={item.match(pathname)} href={item.href} icon={item.icon} key={item.href} label={item.label} />
          ))}
        </nav>
      </div>
    </div>
  );
}

function SidebarBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={cn("flex items-center gap-3 px-4 py-5", compact && "px-1 py-1")} href="/admin">
      <span className="relative size-9 shrink-0" aria-hidden>
        <span className="absolute top-0 left-0 size-5 rounded-md bg-sky-400" />
        <span className="absolute right-0 bottom-0 size-5 rounded-md bg-[#2f6bff] ring-2 ring-[#0b1c3d]" />
      </span>
      <span>
        <span className="block text-sm font-semibold tracking-tight text-white">Uvend</span>
        <span className="block text-[11px] text-slate-400">Admin</span>
      </span>
    </Link>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white",
        active && "bg-[#2f6bff] font-medium text-white shadow-sm hover:bg-[#2f6bff] hover:text-white",
      )}
      href={href}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function BottomLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] leading-tight text-slate-500",
        active && "bg-blue-50 font-semibold text-[#2f6bff]",
      )}
      href={href}
    >
      <Icon className="size-4 shrink-0" />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

function SidebarWaves() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44" aria-hidden>
      <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 240 180">
        <path d="M0 70 C 50 40, 90 110, 140 80 S 210 40, 240 78 V 180 H 0 Z" fill="#12315c" opacity="0.85" />
        <path d="M0 110 C 40 90, 90 140, 150 112 S 210 90, 240 120 V 180 H 0 Z" fill="#1d4f91" opacity="0.45" />
      </svg>
    </div>
  );
}

function AccountChip({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState({ name: "Admin", role: "Administrator" });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
            users: { id: string; name: string | null; username: string | null; role: string }[];
          })
        : { users: [] };
      const match = users.users.find((user) => user.id === me.user?.userId);

      if (!cancelled && me.user) {
        setAccount({
          name: match?.name?.trim() || me.user.username,
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

  return (
    <div className={cn("relative z-10 mt-auto bg-[#0b1c3d] px-3 pb-4", compact && "mt-0 bg-transparent px-0 pb-0")}>
      {open ? (
        <div
          className={cn(
            "absolute z-20 rounded-xl border border-white/10 bg-[#10284f] p-1 shadow-lg",
            compact ? "top-12 right-0 w-40" : "right-3 bottom-16 left-3",
          )}
        >
          <Link className="block rounded-lg px-3 py-2 text-sm text-white hover:bg-white/10" href="/admin/settings">
            Settings
          </Link>
          <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10" onClick={logout} type="button">
            Log out
          </button>
        </div>
      ) : null}
      <button
        className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-white/10"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
          {initials(account.name)}
        </span>
        {compact ? null : (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{account.name}</span>
              <span className="block truncate text-[11px] text-slate-400">{account.role}</span>
            </span>
            <ChevronDown className="size-4 text-slate-400" />
          </>
        )}
      </button>
    </div>
  );
}
