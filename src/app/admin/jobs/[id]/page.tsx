"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminFrame } from "../../AdminFrame";
import { JobStatusBadge } from "@/components/field/job-status-badge";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { formatSlot, kindLabel, personName, type JobKind } from "@/lib/job-schedule";

type JobStatus = "TODO" | "ACTIVE" | "COMPLETE";

type JobDetail = {
  id: string;
  title: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  address: string;
  status: JobStatus;
  kind: JobKind | null;
  meterNumber: string | null;
  startsAt: string | null;
  endsAt: string | null;
  assignedBy: { name: string | null; username: string | null } | null;
  assignedUser: { name: string | null; username: string | null } | null;
  notes: {
    id: string;
    text: string;
    source: string;
    latitude: number | null;
    longitude: number | null;
    locationStatus: string | null;
    createdAt: string;
    user: { name: string | null; username: string | null } | null;
  }[];
  invoices: {
    id: string;
    number: string;
    items: { id: string; kind: string; description: string; amount: number }[];
  }[];
};

export default function AdminJobDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadJob() {
      const response = await fetch(`/api/jobs/${params.id}`);
      const data = (await response.json()) as { job?: JobDetail };

      if (!cancelled) {
        setJob(data.job ?? null);
      }
    }

    void loadJob();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function loadJob() {
    const response = await fetch(`/api/jobs/${params.id}`);
    const data = (await response.json()) as { job?: JobDetail };
    setJob(data.job ?? null);
  }

  async function setStatus(status: JobStatus) {
    const response = await fetch(`/api/jobs/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      setMessage("Could not update status.");
      return;
    }

    await loadJob();
  }

  if (!job) {
    return (
      <AdminFrame kicker="Jobs" title="Job card">
        <p className="text-sm text-muted-foreground">Loading job...</p>
      </AdminFrame>
    );
  }

  return (
    <AdminFrame kicker="Jobs" title={job.title}>
      {message ? <Notice>{message}</Notice> : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="grid h-fit gap-3 rounded-xl border bg-card p-5 text-sm">
          <JobStatusBadge status={job.status} />
          <h2 className="text-base font-semibold">{job.customerName}</h2>
          <p className="text-muted-foreground">{job.address}</p>
          {job.customerPhone ? <p className="text-muted-foreground">{job.customerPhone}</p> : null}
          <p className="text-muted-foreground">{kindLabel(job.kind)}</p>
          {job.meterNumber ? <p className="text-muted-foreground">Meter {job.meterNumber}</p> : null}
          <p className="text-muted-foreground">Assigned by {personName(job.assignedBy) || "not recorded"}</p>
          <p className="text-muted-foreground">Assigned to {personName(job.assignedUser) || "nobody"}</p>
          {job.startsAt && job.endsAt ? (
            <p className="text-muted-foreground">
              {job.status === "COMPLETE"
                ? `${personName(job.assignedUser) || "The field user"} is available again. The slot was ${formatSlot(job.startsAt, job.endsAt)}.`
                : `${personName(job.assignedUser) || "The field user"} is unavailable ${formatSlot(job.startsAt, job.endsAt)}.`}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={`/api/jobs/${job.id}/pdf`}>Download job card</a>
            </Button>
            <Button onClick={() => setStatus("TODO")} size="sm" type="button" variant="outline">
              To do
            </Button>
            <Button onClick={() => setStatus("ACTIVE")} size="sm" type="button" variant="outline">
              Active
            </Button>
            <Button onClick={() => setStatus("COMPLETE")} size="sm" type="button" variant="outline">
              Complete
            </Button>
          </div>
        </article>

        <article className="grid gap-3 rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold tracking-tight">Notes</h2>
          {job.notes.map((note) => (
            <article className="grid gap-1 rounded-lg border p-3 text-sm" key={note.id}>
              <strong className="capitalize">{note.source}</strong>
              <p>{note.text}</p>
              <p className="text-muted-foreground">
                {note.latitude != null && note.longitude != null
                  ? `${note.latitude}, ${note.longitude}`
                  : note.locationStatus || "No GPS"}
              </p>
            </article>
          ))}
          {job.notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet.</p> : null}
        </article>

        <article className="grid gap-3 rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold tracking-tight">Invoices</h2>
          {job.invoices.map((invoice) => (
            <article className="grid gap-1 rounded-lg border p-3 text-sm" key={invoice.id}>
              <div className="flex items-center justify-between gap-3">
                <strong>{invoice.number}</strong>
                <a className="text-sm font-medium underline-offset-4 hover:underline" href={`/api/invoices/${invoice.id}/pdf`}>
                  PDF
                </a>
              </div>
              {invoice.items.map((item) => (
                <p key={item.id}>
                  {item.kind}: {item.description} — R{item.amount}
                </p>
              ))}
            </article>
          ))}
          {job.invoices.length === 0 ? <p className="text-sm text-muted-foreground">No invoice yet.</p> : null}
        </article>
      </section>
    </AdminFrame>
  );
}
