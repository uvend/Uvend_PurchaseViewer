"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AdminFrame } from "../AdminFrame";
import { panelClass } from "@/components/admin/panel";
import { Notice } from "@/components/ui/notice";
import { formatDateTime, roleLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

type LoginEvent = {
  id: string;
  username: string;
  role: "ADMIN" | "OFFICE_USER" | "ROAD_USER" | null;
  success: boolean;
  source: string;
  createdAt: string;
  user: { name: string | null } | null;
};

export default function LogsPage() {
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/login-events");

        if (!response.ok) {
          throw new Error("Could not load logs");
        }

        const data = (await response.json()) as { events: LoginEvent[] };

        if (!cancelled) {
          setEvents(data.events ?? []);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load sign-in logs.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return events;
    }

    return events.filter((event) =>
      [event.user?.name, event.username, event.source, event.role, event.success ? "signed in" : "failed"]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [events, search]);

  return (
    <AdminFrame kicker="Recent sign-ins" title="Logs">
      {error ? <Notice>{error}</Notice> : null}
      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <div>
            <h2 className="text-sm font-semibold">Sign-in log</h2>
            <p className="text-xs text-slate-500">{loading ? "Loading..." : `${visible.length} events`}</p>
          </div>
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9 w-full rounded-lg border bg-white pr-3 pl-9 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2f6bff]/30 sm:w-56"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search logs..."
              value={search}
            />
          </label>
        </div>
        <div className="overflow-x-auto px-2 pt-2 pb-3">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-xs font-medium text-slate-500">
                <th className="px-3 py-3">When</th>
                <th className="px-3 py-3">Person</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Result</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((event) => (
                <tr className="border-t border-slate-100" key={event.id}>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDateTime(event.createdAt)}</td>
                  <td className="px-3 py-3">
                    <span className="block font-medium">{event.user?.name || event.username}</span>
                    <span className="text-xs text-slate-500">@{event.username}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{event.source}</td>
                  <td className="px-3 py-3 text-slate-600">{event.role ? roleLabel(event.role) : "—"}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        event.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                      )}
                    >
                      {event.success ? "Signed in" : "Failed"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && visible.length === 0 ? <p className="px-3 py-6 text-sm text-slate-500">No sign-ins recorded yet.</p> : null}
        </div>
      </section>
    </AdminFrame>
  );
}
