"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminFrame } from "../AdminFrame";
import { panelClass } from "@/components/admin/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";

type CompanyCard = {
  id: string;
  name: string;
  lastFour: string;
};

export default function CardsPage() {
  const [cards, setCards] = useState<CompanyCard[]>([]);
  const [name, setName] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadCards() {
    const response = await fetch("/api/cards");
    const data = (await response.json()) as { cards?: CompanyCard[]; error?: string };

    if (!response.ok) {
      setMessage(data.error || "Could not load cards.");
      return;
    }

    setCards(data.cards ?? []);
  }

  useEffect(() => {
    void loadCards();
  }, []);

  async function addCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, lastFour }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);

    if (!response.ok) {
      setMessage(data.error || "Could not save that card.");
      return;
    }

    setName("");
    setLastFour("");
    setMessage("Card saved. Field users can pick it when a slip has no card number.");
    await loadCards();
  }

  async function removeCard(card: CompanyCard) {
    if (!window.confirm(`Remove ${card.name}?`)) {
      return;
    }

    const response = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(data.error || "Could not remove that card.");
      return;
    }

    setMessage("Card removed.");
    await loadCards();
  }

  return (
    <AdminFrame kicker="Shared when a slip has no card number" title="Cards">
      {message ? <Notice>{message}</Notice> : null}
      <form className={`${panelClass} grid gap-4 p-5 md:grid-cols-[1fr_10rem_auto] md:items-end`} onSubmit={addCard}>
        <div className="grid gap-2">
          <Label htmlFor="card-name">Card name</Label>
          <Input id="card-name" onChange={(event) => setName(event.target.value)} required value={name} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="card-last-four">Last four</Label>
          <Input
            id="card-last-four"
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => setLastFour(event.target.value.replace(/\D/g, "").slice(0, 4))}
            required
            value={lastFour}
          />
        </div>
        <Button disabled={saving} type="submit">
          {saving ? "Saving..." : "Add card"}
        </Button>
      </form>
      <section className={panelClass}>
        <div className="px-5 pt-4">
          <h2 className="text-sm font-semibold">{cards.length} cards</h2>
          <p className="text-xs text-slate-500">Everyone in the field app can use these.</p>
        </div>
        <div className="overflow-x-auto px-2 pt-2 pb-3">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-medium text-slate-500">
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Last four</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr className="border-t border-slate-100" key={card.id}>
                  <td className="px-3 py-3 font-medium">{card.name}</td>
                  <td className="px-3 py-3 text-slate-600">**** {card.lastFour}</td>
                  <td className="px-3 py-3 text-right">
                    <Button onClick={() => void removeCard(card)} size="sm" type="button" variant="outline">
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cards.length === 0 ? <p className="px-3 py-6 text-sm text-slate-500">No cards yet.</p> : null}
        </div>
      </section>
    </AdminFrame>
  );
}
