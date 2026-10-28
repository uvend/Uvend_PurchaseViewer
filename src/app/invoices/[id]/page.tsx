"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { FieldShell } from "@/components/field/field-shell";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { cn } from "@/lib/utils";

type InvoiceItem = {
  id: string;
  kind: "LABOUR" | "MATERIALS" | "TOOLS";
  description: string;
  amount: number;
  purchaseId: string | null;
  createdAt: string;
};

type InvoiceDetail = {
  id: string;
  number: string;
  createdAt: string;
  items: InvoiceItem[];
  job: {
    id: string;
    title: string;
    customerName: string;
    address: string;
  };
};

type TrackedPurchase = {
  id: string;
  shopName: string;
  description: string;
  purchasedAt: string;
  jobId: string | null;
  invoiceItems: { id: string; invoiceId: string }[];
};

const kindLabel = {
  LABOUR: "Labour",
  MATERIALS: "Materials",
  TOOLS: "Tools",
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [kind, setKind] = useState<"MATERIALS" | "TOOLS" | "LABOUR">("MATERIALS");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [purchases, setPurchases] = useState<TrackedPurchase[]>([]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInvoice() {
      const [invoiceResponse, purchaseResponse] = await Promise.all([
        fetch("/api/invoices"),
        fetch("/api/purchases"),
      ]);

      if (!invoiceResponse.ok) {
        if (!cancelled) {
          setMessage("Could not load invoice.");
        }
        return;
      }

      const data = (await invoiceResponse.json()) as { invoices: InvoiceDetail[] };
      const match = data.invoices.find((entry) => entry.id === params.id) ?? null;
      const purchaseData = purchaseResponse.ok
        ? ((await purchaseResponse.json()) as { purchases: TrackedPurchase[] })
        : { purchases: [] };

      if (!cancelled) {
        setInvoice(match);
        setPurchases(purchaseData.purchases);

        if (!match) {
          setMessage("Invoice not found.");
        }
      }
    }

    void loadInvoice();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function loadInvoice() {
    const [invoiceResponse, purchaseResponse] = await Promise.all([
      fetch("/api/invoices"),
      fetch("/api/purchases"),
    ]);

    if (!invoiceResponse.ok) {
      setMessage("Could not load invoice.");
      return;
    }

    const data = (await invoiceResponse.json()) as { invoices: InvoiceDetail[] };
    const match = data.invoices.find((entry) => entry.id === params.id) ?? null;
    const purchaseData = purchaseResponse.ok
      ? ((await purchaseResponse.json()) as { purchases: TrackedPurchase[] })
      : { purchases: [] };
    setInvoice(match);
    setPurchases(purchaseData.purchases);

    if (!match) {
      setMessage("Invoice not found.");
    }
  }

  const total = useMemo(() => {
    return invoice?.items.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  }, [invoice]);

  const availablePurchases = useMemo(() => {
    if (!invoice) {
      return [];
    }

    return purchases.filter((purchase) => {
      const unused = purchase.invoiceItems.length === 0;
      const matchesJob = !purchase.jobId || purchase.jobId === invoice.job.id;
      return unused && matchesJob;
    });
  }, [invoice, purchases]);

  function selectPurchase(purchase: TrackedPurchase) {
    setSelectedPurchaseId(purchase.id);
    setKind("MATERIALS");
    setDescription(`${purchase.shopName}: ${purchase.description}`);
    setMessage("Purchase selected. Add the amount, then save.");
  }

  function skipPurchase() {
    setSelectedPurchaseId("");
    setDescription("");
    setKind("MATERIALS");
    setMessage("Enter the payment yourself.");
  }

  async function addPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);

    if (!description.trim() || !Number.isFinite(value)) {
      setMessage("Add a description and amount.");
      return;
    }

    const response = await fetch(`/api/invoices/${params.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        description,
        amount: value,
        purchaseId: selectedPurchaseId || undefined,
      }),
    });

    if (!response.ok) {
      setMessage("Could not add that payment.");
      return;
    }

    setDescription("");
    setAmount("");
    setSelectedPurchaseId("");
    setMessage("Payment added to the invoice.");
    await loadInvoice();
  }

  if (!invoice) {
    return (
      <FieldShell backHref="/invoices" title="Invoice">
        <p className="text-sm text-muted-foreground">{message || "Loading invoice..."}</p>
      </FieldShell>
    );
  }

  return (
    <FieldShell backHref="/invoices" subtitle={invoice.number} title={invoice.job.title}>
      <div className="grid gap-3 rounded-xl border bg-card p-4 text-sm">
        <div>
          <p className="font-medium">{invoice.job.customerName}</p>
          <p className="text-muted-foreground">{invoice.job.address}</p>
          <p className="mt-2 font-medium tabular-nums">
            Total R{total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={`/api/invoices/${invoice.id}/pdf`}>Download statement</a>
        </Button>
      </div>

      {message ? <Notice>{message}</Notice> : null}

      <form className="grid gap-4" onSubmit={addPayment}>
        <div>
          <h2 className="text-base font-semibold tracking-tight">Add a payment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a logged purchase, or skip and type it in.
          </p>
        </div>

        <div className="grid gap-2">
          {availablePurchases.map((purchase) => (
            <button
              className={cn(
                "grid gap-0.5 rounded-xl border bg-card p-4 text-left text-sm hover:bg-accent",
                selectedPurchaseId === purchase.id && "border-foreground bg-accent",
              )}
              key={purchase.id}
              onClick={() => selectPurchase(purchase)}
              type="button"
            >
              <strong>{purchase.shopName}</strong>
              <span className="text-muted-foreground">{purchase.description}</span>
              <span className="text-muted-foreground">
                {new Date(purchase.purchasedAt).toLocaleDateString("en-ZA")}
                {purchase.jobId ? " · Linked to this job" : " · Not linked yet"}
              </span>
            </button>
          ))}
          <button
            className={cn(
              "grid gap-0.5 rounded-xl border bg-card p-4 text-left text-sm hover:bg-accent",
              selectedPurchaseId === "" && "border-foreground bg-accent",
            )}
            onClick={skipPurchase}
            type="button"
          >
            <strong>Skip and enter manually</strong>
            <span className="text-muted-foreground">Something that was not logged as a purchase</span>
          </button>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="payment-kind">Type</Label>
          <select
            className={controlClass}
            id="payment-kind"
            onChange={(event) => setKind(event.target.value as "MATERIALS" | "TOOLS" | "LABOUR")}
            value={kind}
          >
            <option value="MATERIALS">Materials</option>
            <option value="TOOLS">Tools</option>
            <option value="LABOUR">Labour</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="payment-description">What was bought</Label>
          <Input
            id="payment-description"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="20mm copper pipe"
            required
            value={description}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="payment-amount">Amount (R)</Label>
          <Input
            id="payment-amount"
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            required
            value={amount}
          />
        </div>

        <Button type="submit">Add to invoice</Button>
      </form>

      <div className="grid gap-2">
        {invoice.items.map((item) => (
          <article className="grid gap-1 rounded-xl border bg-card p-4 text-sm" key={item.id}>
            <strong>{kindLabel[item.kind]}</strong>
            <p>{item.description}</p>
            <p className="text-muted-foreground tabular-nums">
              R{item.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
              {item.purchaseId ? " · From purchase log" : ""}
            </p>
          </article>
        ))}
      </div>
    </FieldShell>
  );
}
