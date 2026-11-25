"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Briefcase,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Download,
  MapPin,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react";
import { AdminFrame } from "./AdminFrame";
import { TomTomPurchaseMap } from "./TomTomPurchaseMap";
import { Panel, ViewAll, panelClass } from "@/components/admin/panel";
import { usePurchases, type OfficePurchase } from "@/components/admin/use-purchases";
import { JobStatusBadge } from "@/components/field/job-status-badge";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import {
  formatDateTime,
  formatPurchaseWhen,
  formatRand,
  initials,
  purchaseMoneyLabel,
  purchaseValue,
  purchaserName,
  shortRef,
} from "@/lib/format";
import { personName } from "@/lib/job-schedule";
import { cn } from "@/lib/utils";

type DashJob = {
  id: string;
  title: string;
  status: "TODO" | "ACTIVE" | "COMPLETE";
  assignedUser: { name: string | null; username: string | null } | null;
};

type SortKey = "date" | "purchaser" | "description" | "shop" | "amount";

const allFilter = "All";
const ranges = [
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "all", label: "All time", days: null },
];

export default function AdminDashboard() {
  const { purchases, loading, error } = usePurchases();
  const [jobs, setJobs] = useState<DashJob[]>([]);
  const [rangeId, setRangeId] = useState("7");
  const [shopFilter, setShopFilter] = useState(allFilter);
  const [cardFilter, setCardFilter] = useState(allFilter);
  const [userFilter, setUserFilter] = useState(allFilter);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      const response = await fetch("/api/jobs");

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { jobs?: DashJob[] };

      if (!cancelled) {
        setJobs(data.jobs ?? []);
      }
    }

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, []);

  const range = ranges.find((item) => item.id === rangeId) ?? ranges[0];

  const rangedPurchases = useMemo(() => {
    return purchases.filter((purchase) => inRange(purchase.purchasedAt, range.days));
  }, [purchases, range.days]);

  const filterOptions = useMemo(() => {
    return {
      shops: uniqueSorted(rangedPurchases.map((purchase) => purchase.shopName)),
      cards: uniqueSorted(rangedPurchases.map((purchase) => purchase.cardLabel)),
      users: uniqueSorted(rangedPurchases.map((purchase) => purchaserName(purchase.user))),
    };
  }, [rangedPurchases]);

  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rangedPurchases.filter((purchase) => {
      const purchasedDate = purchase.purchasedAt.slice(0, 10);
      const purchaser = purchaserName(purchase.user);
      const matchesShop = shopFilter === allFilter || purchase.shopName === shopFilter;
      const matchesCard = cardFilter === allFilter || purchase.cardLabel === cardFilter;
      const matchesUser = userFilter === allFilter || purchaser === userFilter;
      const matchesFromDate = !fromDate || purchasedDate >= fromDate;
      const matchesToDate = !toDate || purchasedDate <= toDate;
      const haystack = [purchase.shopName, purchase.description, purchaser, purchase.cardLabel, purchase.id]
        .join(" ")
        .toLowerCase();

      return matchesShop && matchesCard && matchesUser && matchesFromDate && matchesToDate && (!query || haystack.includes(query));
    });
  }, [cardFilter, fromDate, rangedPurchases, search, shopFilter, toDate, userFilter]);

  const sortedPurchases = useMemo(() => {
    const rows = [...filteredPurchases];
    rows.sort((a, b) => comparePurchases(a, b, sortKey) * (sortDir === "asc" ? 1 : -1));
    return rows;
  }, [filteredPurchases, sortDir, sortKey]);

  const purchasers = useMemo(() => rankPurchases(filteredPurchases, (purchase) => purchaserName(purchase.user), "money"), [filteredPurchases]);
  const shops = useMemo(() => rankPurchases(filteredPurchases, (purchase) => purchase.shopName, "count"), [filteredPurchases]);
  const openJobs = jobs.filter((job) => job.status !== "COMPLETE").slice(0, 5);
  const latest = filteredPurchases.slice(0, 5);
  const filtersDirty =
    shopFilter !== allFilter || cardFilter !== allFilter || userFilter !== allFilter || Boolean(fromDate || toDate || search);

  function selectPurchase(purchaseId: string) {
    setSelectedPurchaseId((currentId) => (currentId === purchaseId ? "" : purchaseId));
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir(key === "date" || key === "amount" ? "desc" : "asc");
  }

  function clearFilters() {
    setShopFilter(allFilter);
    setCardFilter(allFilter);
    setUserFilter(allFilter);
    setFromDate("");
    setToDate("");
    setSearch("");
  }

  return (
    <AdminFrame
      actions={
        <>
          <select
            aria-label="Date range"
            className="h-9 rounded-lg border bg-white px-3 text-sm shadow-sm"
            onChange={(event) => setRangeId(event.target.value)}
            value={rangeId}
          >
            {ranges.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <Button asChild>
            <Link href="/admin/jobs">
              <Plus />
              New job
            </Link>
          </Button>
        </>
      }
      kicker="Purchases, jobs, and where they were logged"
      title="Dashboard"
    >
      {error ? <Notice>{error}</Notice> : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel
          action={<ViewAll href="#purchases" />}
          icon={<ShoppingCart />}
          subtitle={purchasers.some((row) => row.moneyCount > 0) ? "By purchase value" : "By number of purchases"}
          title="Top purchasers"
        >
          <RankList
            empty="No purchases in this range."
            rows={purchasers.map((row) => ({
              key: row.label,
              label: row.label,
              value: row.moneyCount > 0 ? formatRand(row.money) : `${row.count} purchases`,
            }))}
          />
        </Panel>
        <Panel action={<ViewAll href="#purchases" />} icon={<MapPin />} subtitle="By number of purchases" title="Top shops">
          <RankList
            empty="No purchases in this range."
            rows={shops.map((row) => ({
              key: row.label,
              label: row.label,
              value: `${row.count} ${row.count === 1 ? "purchase" : "purchases"}`,
            }))}
          />
        </Panel>
        <Panel action={<ViewAll href="/admin/jobs" />} icon={<Briefcase />} subtitle="Still open" title="Active jobs">
          {openJobs.length === 0 ? (
            <p className="py-6 text-sm text-slate-500">No open jobs.</p>
          ) : (
            <ul>
              {openJobs.map((job) => {
                const name = personName(job.assignedUser) || "Unassigned";

                return (
                  <li className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0" key={job.id}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                      <Briefcase className="size-4" />
                    </span>
                    <Link className="min-w-0 flex-1 truncate text-sm font-medium hover:underline" href={`/admin/jobs/${job.id}`}>
                      {job.title}
                    </Link>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                      {initials(name)}
                    </span>
                    <JobStatusBadge status={job.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.8fr)]">
        <Panel
          action={<ViewAll href="/admin/tracking" />}
          icon={<MapPin />}
          subtitle="Logged purchases with a GPS fix"
          title="Purchase locations"
        >
          <TomTomPurchaseMap
            framed={false}
            heightClassName="h-[340px] xl:h-[420px]"
            loading={loading}
            onSelectPurchase={setSelectedPurchaseId}
            purchases={filteredPurchases}
            selectedPurchaseId={selectedPurchaseId}
          />
        </Panel>
        <Panel action={<ViewAll href="#purchases" />} icon={<ShoppingCart />} subtitle="Newest in this range" title="Latest purchases">
          {latest.length === 0 ? (
            <p className="py-6 text-sm text-slate-500">{loading ? "Loading..." : "No purchases in this range."}</p>
          ) : (
            <ul>
              {latest.map((purchase) => (
                <li key={purchase.id}>
                  <button
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-1 py-2.5 text-left hover:bg-slate-50",
                      selectedPurchaseId === purchase.id && "bg-blue-50",
                    )}
                    onClick={() => selectPurchase(purchase.id)}
                    type="button"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                      <ShoppingCart className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{purchase.shopName}</span>
                      <span className="block truncate text-xs text-slate-500">{purchase.description}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular-nums">{purchaseMoneyLabel(purchase)}</span>
                      <span className="block text-[11px] text-slate-400">{formatPurchaseWhen(purchase.purchasedAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <section className={panelClass} id="purchases">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <div className="flex items-start gap-2.5">
            <ShoppingCart className="mt-0.5 size-4 text-[#2f6bff]" />
            <div>
              <h2 className="text-sm font-semibold">All purchases</h2>
              <p className="text-xs text-slate-500">{loading ? "Loading..." : `${sortedPurchases.length} in this view`}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9 w-52 rounded-lg border bg-white pr-3 pl-9 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2f6bff]/30"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search purchases..."
                value={search}
              />
            </label>
            <Button onClick={() => setShowFilters((current) => !current)} type="button" variant="outline">
              <SlidersHorizontal />
              Filters
            </Button>
            <Button onClick={() => exportPurchases(sortedPurchases)} type="button" variant="outline">
              <Download />
              Export
            </Button>
          </div>
        </div>

        {showFilters ? (
          <div className="grid gap-3 px-5 pt-4 sm:grid-cols-2 xl:grid-cols-5">
            <FilterField label="Shop">
              <select className={controlClass} onChange={(event) => setShopFilter(event.target.value)} value={shopFilter}>
                <option>{allFilter}</option>
                {filterOptions.shops.map((shop) => (
                  <option key={shop}>{shop}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Card">
              <select className={controlClass} onChange={(event) => setCardFilter(event.target.value)} value={cardFilter}>
                <option>{allFilter}</option>
                {filterOptions.cards.map((card) => (
                  <option key={card}>{card}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="User">
              <select className={controlClass} onChange={(event) => setUserFilter(event.target.value)} value={userFilter}>
                <option>{allFilter}</option>
                {filterOptions.users.map((user) => (
                  <option key={user}>{user}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="From">
              <input className={controlClass} onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} />
            </FilterField>
            <FilterField label="To">
              <input className={controlClass} onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} />
            </FilterField>
            {filtersDirty ? (
              <div className="sm:col-span-2 xl:col-span-5">
                <Button onClick={clearFilters} size="sm" type="button" variant="ghost">
                  Clear filters
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="overflow-x-auto px-2 pt-2 pb-3">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="px-3 py-3 text-xs font-medium">#</th>
                <th className="px-3 py-3">
                  <SortButton active={sortKey === "date"} dir={sortDir} label="Date & time" onClick={() => toggleSort("date")} />
                </th>
                <th className="px-3 py-3">
                  <SortButton active={sortKey === "purchaser"} dir={sortDir} label="Purchaser" onClick={() => toggleSort("purchaser")} />
                </th>
                <th className="px-3 py-3">
                  <SortButton active={sortKey === "description"} dir={sortDir} label="Description" onClick={() => toggleSort("description")} />
                </th>
                <th className="px-3 py-3">
                  <SortButton active={sortKey === "shop"} dir={sortDir} label="Shop" onClick={() => toggleSort("shop")} />
                </th>
                <th className="px-3 py-3">
                  <SortButton active={sortKey === "amount"} dir={sortDir} label="Amount" onClick={() => toggleSort("amount")} />
                </th>
                <th className="px-3 py-3 text-xs font-medium">Slip</th>
              </tr>
            </thead>
            <tbody>
              {sortedPurchases.map((purchase) => {
                const open = selectedPurchaseId === purchase.id;

                return (
                  <PurchaseRows key={purchase.id} onSelect={() => selectPurchase(purchase.id)} open={open} purchase={purchase} />
                );
              })}
            </tbody>
          </table>
          {!loading && sortedPurchases.length === 0 ? (
            <p className="px-3 py-6 text-sm text-slate-500">Nothing matches these filters.</p>
          ) : null}
        </div>
      </section>
    </AdminFrame>
  );
}

function PurchaseRows({
  purchase,
  open,
  onSelect,
}: {
  purchase: OfficePurchase;
  open: boolean;
  onSelect: () => void;
}) {
  return (
    <>
      <tr className={cn("border-t border-slate-100 hover:bg-slate-50", open && "bg-blue-50")}>
        <td className="px-3 py-3">
          <button className="font-medium text-slate-500" onClick={onSelect} type="button">
            {shortRef(purchase.id)}
          </button>
        </td>
        <td className="px-3 py-3 whitespace-nowrap text-slate-600">
          <button onClick={onSelect} type="button">
            {formatDateTime(purchase.purchasedAt)}
          </button>
        </td>
        <td className="px-3 py-3 font-medium">
          <button onClick={onSelect} type="button">
            {purchaserName(purchase.user)}
          </button>
        </td>
        <td className="max-w-[240px] truncate px-3 py-3 text-slate-600">
          <button className="max-w-full truncate" onClick={onSelect} type="button">
            {purchase.description}
          </button>
        </td>
        <td className="px-3 py-3">{purchase.shopName}</td>
        <td className="px-3 py-3 font-medium tabular-nums">{purchaseMoneyLabel(purchase)}</td>
        <td className="px-3 py-3">
          <span className="flex gap-3">
            <a className="text-xs font-semibold text-[#2f6bff] hover:underline" href={purchase.downloads.slip} rel="noreferrer" target="_blank">
              Slip
            </a>
            <a className="text-xs font-semibold text-[#2f6bff] hover:underline" href={purchase.downloads.item} rel="noreferrer" target="_blank">
              Item
            </a>
          </span>
        </td>
      </tr>
      {open ? (
        <tr className="bg-blue-50/60">
          <td className="px-3 pt-0 pb-4 text-sm text-slate-600" colSpan={7}>
            <div className="grid gap-1 pl-1">
              <p>{purchase.description}</p>
              <SlipFacts purchase={purchase} />
              <p>{purchase.cardLabel}</p>
              <p>{purchase.locationStatus || "No location status"}</p>
              <p>
                {typeof purchase.latitude === "number" && typeof purchase.longitude === "number"
                  ? `${purchase.latitude}, ${purchase.longitude}`
                  : "No GPS"}
              </p>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function SlipFacts({ purchase }: { purchase: OfficePurchase }) {
  const facts = [
    purchase.slipTotal && `Total ${purchase.slipTotal}`,
    purchase.slipAmount && `Amount ${purchase.slipAmount}`,
    purchase.slipRefunds && `Refunds ${purchase.slipRefunds}`,
    purchase.slipDateTime,
    purchase.slipCard,
  ].filter(Boolean);
  const notes = purchase.slipNotes?.trim() === purchase.description.trim() ? "" : purchase.slipNotes;

  if (facts.length === 0 && !notes) {
    return null;
  }

  return (
    <div className="grid gap-1 text-slate-500">
      {facts.length > 0 ? <p>{facts.join(" · ")}</p> : null}
      {notes ? <p className="whitespace-pre-wrap">{notes}</p> : null}
    </div>
  );
}

function RankList({ rows, empty }: { rows: { key: string; label: string; value: string }[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="py-6 text-sm text-slate-500">{empty}</p>;
  }

  return (
    <ol>
      {rows.map((row, index) => (
        <li className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0" key={row.key}>
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.label}</span>
          <span className="text-sm tabular-nums text-slate-500">{row.value}</span>
        </li>
      ))}
    </ol>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button className="inline-flex items-center gap-1 text-xs font-medium text-slate-500" onClick={onClick} type="button">
      {label}
      {active ? dir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-50" />}
    </button>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function rankPurchases(purchases: OfficePurchase[], labelOf: (purchase: OfficePurchase) => string, mode: "money" | "count") {
  const groups = new Map<string, { label: string; count: number; money: number; moneyCount: number }>();

  for (const purchase of purchases) {
    const label = labelOf(purchase);
    const current = groups.get(label) ?? { label, count: 0, money: 0, moneyCount: 0 };
    current.count += 1;
    const value = purchaseValue(purchase);

    if (value != null) {
      current.money += value;
      current.moneyCount += 1;
    }

    groups.set(label, current);
  }

  return [...groups.values()]
    .sort((a, b) => {
      if (mode === "money" && (a.moneyCount > 0 || b.moneyCount > 0)) {
        return b.money - a.money || b.count - a.count;
      }

      return b.count - a.count;
    })
    .slice(0, 5);
}

function comparePurchases(a: OfficePurchase, b: OfficePurchase, key: SortKey) {
  if (key === "date") {
    return a.purchasedAt.localeCompare(b.purchasedAt);
  }

  if (key === "amount") {
    return (purchaseValue(a) ?? -1) - (purchaseValue(b) ?? -1);
  }

  const left = key === "purchaser" ? purchaserName(a.user) : key === "shop" ? a.shopName : a.description;
  const right = key === "purchaser" ? purchaserName(b.user) : key === "shop" ? b.shopName : b.description;
  return left.localeCompare(right);
}

function inRange(value: string, days: number | null) {
  if (days == null) {
    return true;
  }

  return new Date(value).getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function exportPurchases(purchases: OfficePurchase[]) {
  const header = ["Reference", "Date", "Purchaser", "Description", "Shop", "Card", "Amount", "Latitude", "Longitude"];
  const lines = [
    header.join(","),
    ...purchases.map((purchase) =>
      [
        shortRef(purchase.id),
        formatDateTime(purchase.purchasedAt),
        purchaserName(purchase.user),
        purchase.description,
        purchase.shopName,
        purchase.cardLabel,
        purchaseMoneyLabel(purchase),
        purchase.latitude ?? "",
        purchase.longitude ?? "",
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "purchases.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  const text = String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}
