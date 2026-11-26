"use client";

import { useEffect, useState } from "react";

export type OfficePurchase = {
  id: string;
  shopName: string;
  cardLabel: string;
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
  purchasedAt: string;
  user: {
    id: string;
    name: string | null;
    username: string;
    role: "ADMIN" | "OFFICE_USER" | "ROAD_USER";
  } | null;
  downloads: {
    slip: string;
    item: string;
    ocr: string | null;
  };
};

export function usePurchases() {
  const [purchases, setPurchases] = useState<OfficePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/purchases");

        if (!response.ok) {
          throw new Error("Could not load purchases");
        }

        const data = (await response.json()) as { purchases: OfficePurchase[] };

        if (!cancelled) {
          setPurchases(data.purchases);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load purchases from the database.");
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

  return { purchases, loading, error };
}
