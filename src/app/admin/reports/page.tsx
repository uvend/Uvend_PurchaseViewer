"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ShoppingCart } from "lucide-react";
import { AdminFrame } from "../AdminFrame";
import { Panel, panelClass } from "@/components/admin/panel";
import { usePurchases } from "@/components/admin/use-purchases";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { formatDateTime, formatRand, purchaseMoneyLabel, purchaseValue, purchaserName, shortRef } from "@/lib/format";

type JobRow = { id: string; status: "TODO" | "ACTIVE" | "COMPLETE" };

type InvoiceRow = {
  id: string;
  number: string;
  createdAt: string;
  items: { amount: number }[];
  job: { title: string; customerName: string };
};

export default function ReportsPage() {
  const { purchases, loading, error } = usePurchases();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [extrasError, setExtrasError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [jobsResponse, invoicesResponse] = await Promise.all([fetch("/api/jobs"), fetch("/api/invoices")]);

      if (!jobsResponse.ok || !invoicesResponse.ok) {
        if (!cancelled) {
          setExtrasError("Could not load jobs or invoices.");
        }
        return;
      }

      const jobsData = (await jobsResponse.json()) as { jobs?: JobRow[] };
      const invoicesData = (await invoicesResponse.json()) as { invoices?: InvoiceRow[] };

      if (!cancelled) {
        setJobs(jobsData.jobs ?? []);
        setInvoices(invoicesData.invoices ?? []);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const spend = useMemo(() => {
    return purchases.reduce((total, purchase) => total + (purchaseValue(purchase) ?? 0), 0);
  }, [purchases]);
  const valued = purchases.filter((purchase) => purchaseValue(purchase) != null).length;
  const byPerson = useMemo(() => groupPurchases(purchases, (purchase) => purchaserName(purchase.user)), [purchases]);
  const byShop = useMemo(() => groupPurchases(purchases, (purchase) => purchase.shopName), [purchases]);
  const openJobs = jobs.filter((job) => job.status !== "COMPLETE").length;

  return (
    <AdminFrame
      actions={
        <Button onClick={() => exportPurchases(purchases)} type="button" variant="outline">
          <Download />
          Export
        </Button>
      }
      kicker="Purchases, open jobs, and invoices"
      title="Reports"
    >
      {error ? <Notice>{error}</Notice> : null}
      {extrasError ? <Notice>{extrasError}</Notice> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Purchases" value={loading ? "..." : String(purchases.length)} />
        <Stat label="Slip value" value={valued > 0 ? formatRand(spend) : "—"} />
        <Stat label="Open jobs" value={String(openJobs)} />
        <Stat label="Invoices" value={String(invoices.length)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel icon={<ShoppingCart />} subtitle="Grouped from logged slips" title="By purchaser">
          <RankTable empty="No purchases yet." rows={byPerson} />
        </Panel>
        <Panel icon={<ShoppingCart />} subtitle="Grouped from logged slips" title="By shop">
          <RankTable empty="No purchases yet." rows={byShop} />
        </Panel>
      </section>

      <section className={panelClass}>
        <div className="px-5 pt-4">
          <h2 className="text-sm font-semibold">Invoices</h2>
          <p className="text-xs text-slate-500">Bills raised against job cards</p>
        </div>
        <div className="overflow-x-auto px-2 pt-2 pb-3">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-xs font-medium text-slate-500">
                <th className="px-3 py-3">Number</th>
                <th className="px-3 py-3">Job</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Total</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const total = invoice.items.reduce((sum, item) => sum + item.amount, 0);

                return (
                  <tr className="border-t border-slate-100" key={invoice.id}>
                    <td className="px-3 py-3 font-medium">{invoice.number}</td>
                    <td className="px-3 py-3">{invoice.job.title}</td>
                    <td className="px-3 py-3 text-slate-600">{invoice.job.customerName}</td>
                    <td className="px-3 py-3 tabular-nums">{formatRand(total)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDateTime(invoice.createdAt)}</td>
                    <td className="px-3 py-3">
                      <a className="text-xs font-semibold text-[#2f6bff] hover:underline" href={`/api/invoices/${invoice.id}/pdf`}>
                        Download
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {invoices.length === 0 ? <p className="px-3 py-6 text-sm text-slate-500">No invoices yet.</p> : null}
        </div>
      </section>
    </AdminFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className={`${panelClass} px-5 py-4`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}

function RankTable({
  rows,
  empty,
}: {
  rows: { label: string; count: number; money: number; moneyCount: number }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-sm text-slate-500">{empty}</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-xs font-medium text-slate-500">
          <th className="py-2 font-medium">Name</th>
          <th className="py-2 text-right font-medium">Purchases</th>
          <th className="py-2 text-right font-medium">Value</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr className="border-t border-slate-100" key={row.label}>
            <td className="py-2.5 font-medium">{row.label}</td>
            <td className="py-2.5 text-right tabular-nums text-slate-600">{row.count}</td>
            <td className="py-2.5 text-right tabular-nums">{row.moneyCount > 0 ? formatRand(row.money) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function groupPurchases(
  purchases: { shopName: string; slipTotal: string | null; slipAmount: string | null; user: { name: string | null; username: string | null } | null }[],
  labelOf: (purchase: (typeof purchases)[number]) => string,
) {
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

  return [...groups.values()].sort((a, b) => b.money - a.money || b.count - a.count);
}

function exportPurchases(purchases: { id: string; shopName: string; description: string; cardLabel: string; slipTotal: string | null; slipAmount: string | null; purchasedAt: string; user: { name: string | null; username: string | null } | null }[]) {
  const lines = [
    ["Reference", "Date", "Purchaser", "Shop", "Description", "Amount"].join(","),
    ...purchases.map((purchase) =>
      [shortRef(purchase.id), formatDateTime(purchase.purchasedAt), purchaserName(purchase.user), purchase.shopName, purchase.description, purchaseMoneyLabel(purchase)]
        .map((value) => {
          const text = String(value);
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "purchase-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}
