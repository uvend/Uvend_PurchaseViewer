"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminFrame } from "../AdminFrame";
import { JobStatusBadge } from "@/components/field/job-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";

type JobStatus = "TODO" | "ACTIVE" | "COMPLETE";

type JobRow = {
  id: string;
  title: string;
  customerName: string;
  customerPhone: string | null;
  address: string;
  status: JobStatus;
  notes: { id: string }[];
  invoices: { id: string }[];
};

const statusLabel: Record<JobStatus, string> = {
  TODO: "To do",
  ACTIVE: "Active",
  COMPLETE: "Complete",
};

const emptyForm = {
  title: "",
  customerName: "",
  customerPhone: "",
  address: "",
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [filter, setFilter] = useState<"ALL" | JobStatus>("ALL");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      const response = await fetch("/api/jobs");
      const data = (await response.json()) as { jobs: JobRow[] };

      if (!cancelled) {
        setJobs(data.jobs ?? []);
      }
    }

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadJobs() {
    const response = await fetch("/api/jobs");
    const data = (await response.json()) as { jobs: JobRow[] };
    setJobs(data.jobs ?? []);
  }

  const visible = useMemo(() => {
    return jobs.filter((job) => filter === "ALL" || job.status === filter);
  }, [filter, jobs]);

  async function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      setMessage("Could not create job card.");
      return;
    }

    setForm(emptyForm);
    setMessage("Job card created.");
    await loadJobs();
  }

  return (
    <AdminFrame kicker="Jobs" title="Job cards">
      <div className="flex flex-wrap gap-2">
        {(["ALL", "TODO", "ACTIVE", "COMPLETE"] as const).map((status) => (
          <Button
            key={status}
            onClick={() => setFilter(status)}
            size="sm"
            type="button"
            variant={filter === status ? "default" : "outline"}
          >
            {status === "ALL" ? "All" : statusLabel[status]}
          </Button>
        ))}
      </div>

      {message ? <Notice>{message}</Notice> : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        <form className="grid h-fit gap-4 rounded-xl border bg-card p-5" onSubmit={createJob}>
          <h2 className="text-base font-semibold tracking-tight">New job card</h2>
          <div className="grid gap-2">
            <Label htmlFor="job-title">Job title</Label>
            <Input
              id="job-title"
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
              value={form.title}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer">Customer</Label>
            <Input
              id="customer"
              onChange={(event) => setForm({ ...form, customerName: event.target.value })}
              required
              value={form.customerName}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              onChange={(event) => setForm({ ...form, customerPhone: event.target.value })}
              value={form.customerPhone}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              required
              value={form.address}
            />
          </div>
          <Button type="submit">Add job card</Button>
        </form>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold tracking-tight">{visible.length} jobs</h2>
          <div className="grid gap-2">
            {visible.map((job) => (
              <Link
                className="grid gap-1 rounded-lg border p-4 text-sm transition-colors hover:bg-accent"
                href={`/admin/jobs/${job.id}`}
                key={job.id}
              >
                <JobStatusBadge status={job.status} />
                <strong>{job.title}</strong>
                <span className="text-muted-foreground">{job.customerName}</span>
                <span className="text-muted-foreground">{job.address}</span>
                <span className="text-muted-foreground">
                  {job.notes.length} notes · {job.invoices.length} invoices
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </AdminFrame>
  );
}
