"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AdminFrame } from "./AdminFrame";
import { TomTomPurchaseMap } from "./TomTomPurchaseMap";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { cn } from "@/lib/utils";

type Purchase = {
  id: string;
  shopName: string;
  cardLabel: string;
  cardLastFour: string | null;
  description: string;
  slipTotal: string | null;
  slipAmount: string | null;
  slipRefunds: string | null;
  slipDateTime: string | null;
  slipCard: string | null;
  slipNotes: string | null;
  latitude: number | null;
  longitude: number | null;
  locationStatus: string | null;
  slipLabel: string;
  slipImageName: string;
  itemLabel: string;
  itemImageName: string;
  ocrText: string | null;
  ocrRequestId: string | null;
  purchasedAt: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username: string;
    email: string | null;
    role: "USER" | "ADMIN" | "INSTALLER";
  } | null;
  downloads: {
    slip: string;
    item: string;
    ocr: string | null;
  };
};

type PurchasesResponse = {
  purchases: Purchase[];
};

const allFilter = "All";

export default function AdminDashboard() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shopFilter, setShopFilter] = useState(allFilter);
  const [cardFilter, setCardFilter] = useState(allFilter);
  const [userFilter, setUserFilter] = useState(allFilter);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedPurchaseId, setSelectedPurchaseId] = useState("");

  useEffect(() => {
    async function loadPurchases() {
      try {
        const response = await fetch("/api/purchases");

        if (!response.ok) {
          throw new Error("Could not load purchases");
        }

        const data = (await response.json()) as PurchasesResponse;
        setPurchases(data.purchases);
      } catch {
        setError("Could not load purchases from the database.");
      } finally {
        setLoading(false);
      }
    }

    loadPurchases();
  }, []);

  const filterOptions = useMemo(() => {
    return {
      shops: uniqueSorted(purchases.map((purchase) => purchase.shopName)),
      cards: uniqueSorted(purchases.map((purchase) => purchase.cardLabel)),
      users: uniqueSorted(purchases.map(getUserLabel)),
    };
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase) => {
      const purchasedDate = purchase.purchasedAt.slice(0, 10);
      const matchesShop = shopFilter === allFilter || purchase.shopName === shopFilter;
      const matchesCard = cardFilter === allFilter || purchase.cardLabel === cardFilter;
      const matchesUser = userFilter === allFilter || getUserLabel(purchase) === userFilter;
      const matchesFromDate = !fromDate || purchasedDate >= fromDate;
      const matchesToDate = !toDate || purchasedDate <= toDate;

      return (
        matchesShop &&
        matchesCard &&
        matchesUser &&
        matchesFromDate &&
        matchesToDate
      );
    });
  }, [cardFilter, fromDate, purchases, shopFilter, toDate, userFilter]);

  const mappedPurchases = filteredPurchases.filter(hasCoordinates);
  const recentPurchases = filteredPurchases.slice(0, 20);

  function selectPurchase(purchaseId: string) {
    setSelectedPurchaseId((currentId) => (currentId === purchaseId ? "" : purchaseId));
  }

  return (
    <AdminFrame kicker="Purchases" title="Logged on the road">

      <section className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Purchase filters">
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
      </section>

      {error ? <Notice>{error}</Notice> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Dashboard totals">
        <StatCard label="Purchases" value={filteredPurchases.length} />
        <StatCard label="On the map" value={mappedPurchases.length} />
        <StatCard label="Shops" value={filterOptions.shops.length} />
        <StatCard label="Cards" value={filterOptions.cards.length} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">Map</h2>
            <span className="text-sm text-muted-foreground">{mappedPurchases.length} pins</span>
          </div>
          <TomTomPurchaseMap
            loading={loading}
            onSelectPurchase={setSelectedPurchaseId}
            purchases={filteredPurchases}
            selectedPurchaseId={selectedPurchaseId}
          />
        </section>

        <aside className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">Recent</h2>
            <span className="text-sm text-muted-foreground">{recentPurchases.length}</span>
          </div>
          <div className="grid max-h-[520px] gap-2 overflow-auto">
            {recentPurchases.map((purchase) => {
              const isOpen = selectedPurchaseId === purchase.id;

              return (
                <article
                  className={cn("overflow-hidden rounded-lg border", isOpen && "border-foreground bg-accent")}
                  key={purchase.id}
                >
                  <button
                    className="grid w-full gap-0.5 px-3 py-3 text-left text-sm"
                    onClick={() => selectPurchase(purchase.id)}
                    type="button"
                  >
                    <strong>{purchase.shopName}</strong>
                    <span className="text-muted-foreground">{formatDate(purchase.purchasedAt)}</span>
                    <span className="text-muted-foreground">{getUserLabel(purchase)}</span>
                  </button>
                  {isOpen ? (
                    <div className="grid gap-2 px-3 pb-3 text-sm">
                      <p>{purchase.description}</p>
                      <SlipFacts purchase={purchase} />
                      {purchase.ocrRequestId ? (
                        <p className="text-muted-foreground">OCR request: {purchase.ocrRequestId}</p>
                      ) : null}
                      <p className="text-muted-foreground">Card: {purchase.cardLabel}</p>
                      <p className="text-muted-foreground">
                        {purchase.locationStatus || "No location status"}
                      </p>
                      <p className="text-muted-foreground">
                        {hasCoordinates(purchase)
                          ? `${purchase.latitude}, ${purchase.longitude}`
                          : "No GPS"}
                      </p>
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline">
                          <a href={purchase.downloads.slip} rel="noreferrer" target="_blank">
                            Slip
                          </a>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <a href={purchase.downloads.item} rel="noreferrer" target="_blank">
                            Item
                          </a>
                        </Button>
                        {purchase.downloads.ocr ? (
                          <Button asChild size="sm" variant="outline">
                            <a href={purchase.downloads.ocr} rel="noreferrer" target="_blank">
                              OCR image
                            </a>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
            {!loading && recentPurchases.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing matches these filters.</p>
            ) : null}
          </div>
        </aside>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">All purchases</h2>
          {loading ? <span className="text-sm text-muted-foreground">Loading...</span> : null}
        </div>
        <div className="grid gap-2">
          {filteredPurchases.map((purchase) => (
            <article
              className="grid gap-3 rounded-lg border p-3 text-sm md:grid-cols-[minmax(0,1.4fr)_1fr_0.8fr_1fr_auto] md:items-center"
              key={purchase.id}
            >
              <div>
                <strong>{purchase.shopName}</strong>
                <p className="text-muted-foreground">{purchase.description}</p>
                <SlipFacts purchase={purchase} />
              </div>
              <span>{purchase.cardLabel}</span>
              <span>{getUserLabel(purchase)}</span>
              <span className="text-muted-foreground">{formatDate(purchase.purchasedAt)}</span>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={purchase.downloads.slip} rel="noreferrer" target="_blank">
                    Slip
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={purchase.downloads.item} rel="noreferrer" target="_blank">
                    Item
                  </a>
                </Button>
                {purchase.downloads.ocr ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={purchase.downloads.ocr} rel="noreferrer" target="_blank">
                      OCR image
                    </a>
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
          {!loading && filteredPurchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing matches these filters.</p>
          ) : null}
        </div>
      </section>
    </AdminFrame>
  );
}

function SlipFacts({ purchase }: { purchase: Purchase }) {
  const facts = [
    purchase.slipTotal && `Total ${purchase.slipTotal}`,
    purchase.slipAmount && `Amount ${purchase.slipAmount}`,
    purchase.slipRefunds && `Refunds ${purchase.slipRefunds}`,
    purchase.slipDateTime,
    purchase.slipCard,
  ].filter(Boolean);

  if (facts.length === 0 && !purchase.slipNotes) {
    return null;
  }

  return (
    <div className="grid gap-1 text-muted-foreground">
      {facts.length > 0 ? <p>{facts.join(" · ")}</p> : null}
      {purchase.slipNotes ? <p>{purchase.slipNotes}</p> : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </article>
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

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function getUserLabel(purchase: Purchase) {
  return purchase.user?.name ?? purchase.user?.username ?? "Unassigned user";
}

function hasCoordinates(
  purchase: Purchase,
): purchase is Purchase & { latitude: number; longitude: number } {
  return typeof purchase.latitude === "number" && typeof purchase.longitude === "number";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
