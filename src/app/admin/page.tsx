"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { TomTomPurchaseMap } from "./TomTomPurchaseMap";

type Purchase = {
  id: string;
  shopName: string;
  cardLabel: string;
  cardLastFour: string | null;
  description: string;
  latitude: number | null;
  longitude: number | null;
  locationStatus: string | null;
  slipLabel: string;
  slipImageName: string;
  itemLabel: string;
  itemImageName: string;
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
      <main className="admin-shell">
      <header className="admin-hero">
        <div>
          <p className="eyebrow">MR A admin</p>
          <h1>Purchase dashboard</h1>
          <p>
            Review card purchases, filter records, and track captured GPS points
            on the map.
          </p>
        </div>
        <div className="admin-link-row">
          <Link className="admin-link" href="/admin/configure">
            Configure
          </Link>
          <Link className="admin-link" href="/purchase">
            Capture app
          </Link>
          <AdminLogoutButton />
        </div>
      </header>

      <section className="admin-filters" aria-label="Purchase filters">
        <label>
          Shop
          <select value={shopFilter} onChange={(event) => setShopFilter(event.target.value)}>
            <option>{allFilter}</option>
            {filterOptions.shops.map((shop) => (
              <option key={shop}>{shop}</option>
            ))}
          </select>
        </label>

        <label>
          Card
          <select value={cardFilter} onChange={(event) => setCardFilter(event.target.value)}>
            <option>{allFilter}</option>
            {filterOptions.cards.map((card) => (
              <option key={card}>{card}</option>
            ))}
          </select>
        </label>

        <label>
          User
          <select value={userFilter} onChange={(event) => setUserFilter(event.target.value)}>
            <option>{allFilter}</option>
            {filterOptions.users.map((user) => (
              <option key={user}>{user}</option>
            ))}
          </select>
        </label>

        <label>
          From
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>

        <label>
          To
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>
      </section>

      {error && <p className="admin-error">{error}</p>}

      <section className="admin-stats" aria-label="Dashboard totals">
        <StatCard label="Filtered purchases" value={filteredPurchases.length} />
        <StatCard label="Mapped GPS pins" value={mappedPurchases.length} />
        <StatCard label="Shops" value={filterOptions.shops.length} />
        <StatCard label="Cards" value={filterOptions.cards.length} />
      </section>

      <section className="admin-grid">
        <section className="map-panel">
          <div className="panel-heading">
            <div>
              <p className="screen-kicker">Geo tracking</p>
              <h2>Purchase map</h2>
            </div>
            <span>{mappedPurchases.length} pins</span>
          </div>

          <TomTomPurchaseMap
            loading={loading}
            onSelectPurchase={setSelectedPurchaseId}
            purchases={filteredPurchases}
            selectedPurchaseId={selectedPurchaseId}
          />
        </section>

        <aside className="selected-panel recent-panel">
          <div className="panel-heading">
            <div>
              <p className="screen-kicker">Recent purchases</p>
              <h2>Click to inspect</h2>
            </div>
            <span>{recentPurchases.length}</span>
          </div>

          <div className="recent-list">
            {recentPurchases.map((purchase) => {
              const isOpen = selectedPurchaseId === purchase.id;

              return (
                <article
                  className={isOpen ? "recent-item open" : "recent-item"}
                  key={purchase.id}
                >
                  <button
                    className="recent-item-toggle"
                    onClick={() => selectPurchase(purchase.id)}
                    type="button"
                  >
                    <strong>{purchase.shopName}</strong>
                    <span>{formatDate(purchase.purchasedAt)}</span>
                    <small>{getUserLabel(purchase)}</small>
                  </button>

                  {isOpen && (
                    <div className="recent-item-details">
                      <p>{purchase.description}</p>
                      <span>Card: {purchase.cardLabel}</span>
                      <span>
                        Status: {purchase.locationStatus || "No location status"}
                      </span>
                      <span>
                        GPS:{" "}
                        {hasCoordinates(purchase)
                          ? `${purchase.latitude}, ${purchase.longitude}`
                          : "No GPS"}
                      </span>
                      <div className="download-row">
                        <a href={purchase.downloads.slip} rel="noreferrer" target="_blank">
                          View slip
                        </a>
                        <a href={purchase.downloads.item} rel="noreferrer" target="_blank">
                          View product
                        </a>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}

            {!loading && recentPurchases.length === 0 && (
              <p className="empty-list">No purchases match the current filters.</p>
            )}
          </div>
        </aside>
      </section>

      <section className="purchase-table-panel">
        <div className="panel-heading">
          <div>
            <p className="screen-kicker">Database records</p>
            <h2>Purchases</h2>
          </div>
          {loading && <span>Loading...</span>}
        </div>

        <div className="purchase-list">
          {filteredPurchases.map((purchase) => (
            <article className="purchase-row" key={purchase.id}>
              <div>
                <strong>{purchase.shopName}</strong>
                <p>{purchase.description}</p>
              </div>
              <span>{purchase.cardLabel}</span>
              <span>{getUserLabel(purchase)}</span>
              <span>{formatDate(purchase.purchasedAt)}</span>
              <div className="table-actions">
                <a href={purchase.downloads.slip} rel="noreferrer" target="_blank">
                  Slip
                </a>
                <a href={purchase.downloads.item} rel="noreferrer" target="_blank">
                  Item
                </a>
              </div>
            </article>
          ))}

          {!loading && filteredPurchases.length === 0 && (
            <p className="empty-list">No purchases match the current filters.</p>
          )}
        </div>
      </section>
      </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
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
