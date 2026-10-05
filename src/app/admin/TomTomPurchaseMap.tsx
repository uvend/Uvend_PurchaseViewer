"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { TomTomMap } from "@tomtom-org/maps-sdk/map";
import { Marker, setWorkerUrl } from "maplibre-gl";

setWorkerUrl(
  "https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl-worker.mjs",
);

export type MappedPurchase = {
  id: string;
  shopName: string;
  cardLabel: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
};

type PurchaseMapProps = {
  purchases: MappedPurchase[];
  selectedPurchaseId?: string;
  onSelectPurchase: (purchaseId: string) => void;
  loading: boolean;
};

const southAfricaCenter: [number, number] = [24.5, -29.1];

export function TomTomPurchaseMap({
  purchases,
  selectedPurchaseId,
  onSelectPurchase,
  loading,
}: PurchaseMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<TomTomMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const mapReadyRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;

  const mappedPurchases = useMemo(
    () =>
      purchases.filter(
        (purchase) =>
          typeof purchase.latitude === "number" &&
          typeof purchase.longitude === "number",
      ),
    [purchases],
  );
  const mappedPurchaseIds = mappedPurchases.map((purchase) => purchase.id).join(",");
  const selectedPurchase = mappedPurchases.find(
    (purchase) => purchase.id === selectedPurchaseId,
  );

  useEffect(() => {
    if (!apiKey || !mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new TomTomMap(
      {
        container: mapContainerRef.current,
        center: southAfricaCenter,
        zoom: 5,
        minZoom: 4,
      },
      {
        apiKey,
        style: "standardLight",
      },
    );

    mapRef.current = map;

    map.mapLibreMap.on("load", () => {
      mapReadyRef.current = true;
      setMapReady(true);
    });

    return () => {
      mapReadyRef.current = false;
      setMapReady(false);
      const markers = markerRefs.current;
      markerRefs.current = [];
      clearMarkers(markers);
      map.mapLibreMap.remove();
      mapRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReadyRef.current || !mapReady) {
      return;
    }

    renderMarkers(map, mappedPurchases, selectedPurchaseId, onSelectPurchase, markerRefs);
  }, [mapReady, mappedPurchases, onSelectPurchase, selectedPurchaseId]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReadyRef.current || !mapReady) {
      return;
    }

    fitMapToPurchases(map, mappedPurchases);
  }, [mapReady, mappedPurchaseIds, mappedPurchases]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReadyRef.current || !mapReady) {
      return;
    }

    if (
      selectedPurchase &&
      typeof selectedPurchase.latitude === "number" &&
      typeof selectedPurchase.longitude === "number"
    ) {
      map.mapLibreMap.easeTo({
        center: [selectedPurchase.longitude, selectedPurchase.latitude],
        zoom: 15,
        duration: 700,
      });
      return;
    }

    fitMapToPurchases(map, mappedPurchases);
  }, [mapReady, mappedPurchases, selectedPurchase]);

  if (!apiKey) {
    return (
      <div className="tomtom-map missing-key">
        <strong>TomTom API key missing</strong>
        <span>Add `NEXT_PUBLIC_TOMTOM_API_KEY` to `.env` to load the map.</span>
      </div>
    );
  }

  return (
    <div className="tomtom-map-wrap">
      <div className="tomtom-map" ref={mapContainerRef} />
      {!loading && mappedPurchases.length === 0 && (
        <p className="empty-map">No GPS purchases match these filters.</p>
      )}
    </div>
  );
}

function renderMarkers(
  map: TomTomMap,
  purchases: MappedPurchase[],
  selectedPurchaseId?: string,
  onSelectPurchase?: (purchaseId: string) => void,
  markerRefs?: MutableRefObject<Marker[]>,
) {
  if (!markerRefs) {
    return;
  }

  clearMarkers(markerRefs.current);

  markerRefs.current = purchases.map((purchase) => {
    const element = document.createElement("button");
    element.className =
      purchase.id === selectedPurchaseId
        ? "tomtom-purchase-marker active"
        : "tomtom-purchase-marker";
    element.type = "button";
    element.title = `${purchase.shopName}: ${purchase.description}`;
    element.setAttribute("aria-label", `View ${purchase.shopName} purchase`);
    element.addEventListener("click", () => onSelectPurchase?.(purchase.id));

    return new Marker({ element, anchor: "bottom" })
      .setLngLat([purchase.longitude as number, purchase.latitude as number])
      .addTo(map.mapLibreMap);
  });
}

function clearMarkers(markers: Marker[]) {
  markers.forEach((marker) => marker.remove());
}

function fitMapToPurchases(map: TomTomMap, purchases: MappedPurchase[]) {
  if (purchases.length === 0) {
    map.mapLibreMap.easeTo({
      center: southAfricaCenter,
      zoom: 5,
      duration: 500,
    });
    return;
  }

  const longitudes = purchases.map((purchase) => purchase.longitude as number);
  const latitudes = purchases.map((purchase) => purchase.latitude as number);
  const bounds: [[number, number], [number, number]] = [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)],
  ];

  map.mapLibreMap.fitBounds(bounds, {
    padding: 70,
    maxZoom: 13,
    duration: 500,
  });
}
