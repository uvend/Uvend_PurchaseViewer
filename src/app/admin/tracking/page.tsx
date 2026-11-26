"use client";

import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { AdminFrame } from "../AdminFrame";
import { TomTomPurchaseMap } from "../TomTomPurchaseMap";
import { Panel, panelClass } from "@/components/admin/panel";
import { usePurchases } from "@/components/admin/use-purchases";
import { Notice } from "@/components/ui/notice";
import { formatDateTime, purchaserName, shortRef } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function TrackingPage() {
  const { purchases, loading, error } = usePurchases();
  const [selectedPurchaseId, setSelectedPurchaseId] = useState("");
  const [search, setSearch] = useState("");

  const located = useMemo(
    () =>
      purchases.filter(
        (purchase) => typeof purchase.latitude === "number" && typeof purchase.longitude === "number",
      ),
    [purchases],
  );
  const query = search.trim().toLowerCase();
  const visible = located.filter((purchase) => {
    if (!query) {
      return true;
    }

    return [purchase.shopName, purchase.description, purchaserName(purchase.user), purchase.locationStatus ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <AdminFrame kicker="GPS from logged purchases" title="Tracking">
      {error ? <Notice>{error}</Notice> : null}

      <Panel icon={<MapPin />} subtitle={`${located.length} with a fix · ${purchases.length - located.length} without GPS`} title="Purchase locations">
        <TomTomPurchaseMap
          framed={false}
          heightClassName="h-[min(58dvh,520px)]"
          loading={loading}
          onSelectPurchase={setSelectedPurchaseId}
          purchases={visible}
          selectedPurchaseId={selectedPurchaseId}
        />
      </Panel>

      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <div>
            <h2 className="text-sm font-semibold">Located purchases</h2>
            <p className="text-xs text-slate-500">{loading ? "Loading..." : `${visible.length} on the map`}</p>
          </div>
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9 w-full rounded-lg border bg-white pr-3 pl-9 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2f6bff]/30 sm:w-56"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search locations..."
              value={search}
            />
          </label>
        </div>
        <div className="overflow-x-auto px-2 pt-2 pb-3">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="text-xs font-medium text-slate-500">
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Shop</th>
                <th className="px-3 py-3">Purchaser</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">When</th>
                <th className="px-3 py-3">Fix</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((purchase) => {
                const selected = selectedPurchaseId === purchase.id;

                return (
                  <tr
                    className={cn("cursor-pointer border-t border-slate-100 hover:bg-slate-50", selected && "bg-blue-50")}
                    key={purchase.id}
                    onClick={() => setSelectedPurchaseId(selected ? "" : purchase.id)}
                  >
                    <td className="px-3 py-3 font-medium text-slate-500">{shortRef(purchase.id)}</td>
                    <td className="px-3 py-3 font-medium">{purchase.shopName}</td>
                    <td className="px-3 py-3">{purchaserName(purchase.user)}</td>
                    <td className="max-w-[240px] truncate px-3 py-3 text-slate-600">{purchase.description}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDateTime(purchase.purchasedAt)}</td>
                    <td className="px-3 py-3 text-slate-500">
                      {purchase.locationStatus || `${purchase.latitude}, ${purchase.longitude}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && visible.length === 0 ? (
            <p className="px-3 py-6 text-sm text-slate-500">No GPS purchases match this search.</p>
          ) : null}
        </div>
      </section>
    </AdminFrame>
  );
}
