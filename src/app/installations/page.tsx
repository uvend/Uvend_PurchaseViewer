"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FieldShell } from "@/components/field/field-shell";
import { JobStatusBadge } from "@/components/field/job-status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { formatSlot, kindLabel, type JobKind } from "@/lib/job-schedule";

type JobStatus = "TODO" | "ACTIVE" | "COMPLETE";

type JobCard = {
  id: string;
  title: string;
  customerName: string;
  customerPhone: string | null;
  address: string;
  status: JobStatus;
  kind: JobKind | null;
  meterNumber: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

export default function InstallationsPage() {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Loading job cards...");
  const visibleJobs = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return jobs;
    }

    return jobs.filter((job) =>
      [job.title, job.customerName, job.address, job.customerPhone ?? "", job.meterNumber ?? ""].join(" ").toLowerCase().includes(needle),
    );
  }, [jobs, query]);

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      const response = await fetch("/api/jobs");

      if (!response.ok) {
        if (!cancelled) {
          setMessage("Could not load job cards.");
        }
        return;
      }

      const data = (await response.json()) as { jobs: JobCard[] };

      if (!cancelled) {
        setJobs(data.jobs);
        setMessage(data.jobs.length ? "" : "No job cards yet. Ask admin to add one.");
      }
    }

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <FieldShell subtitle="Open a card, then leave notes on site." title="Installations">
      {message ? <Notice>{message}</Notice> : null}
      <div className="grid gap-2">
        <Label htmlFor="installation-search">Search job cards</Label>
        <Input
          id="installation-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, customer, or address"
          value={query}
        />
      </div>
      {jobs.length > 0 && visibleJobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No job cards match that search.</p>
      ) : null}
      <div className="grid gap-2">
        {visibleJobs.map((job) => (
          <Link
            className="grid gap-1 rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
            href={`/installations/${job.id}`}
            key={job.id}
          >
            <JobStatusBadge status={job.status} />
            <strong className="text-sm">{job.title}</strong>
            <span className="text-sm text-muted-foreground">
              {kindLabel(job.kind)}
              {job.meterNumber ? ` · Meter ${job.meterNumber}` : ""}
            </span>
            {job.startsAt && job.endsAt ? (
              <span className="text-sm text-muted-foreground">
                {job.status === "COMPLETE" ? "Available" : "Unavailable"} · {formatSlot(job.startsAt, job.endsAt)}
              </span>
            ) : null}
            <span className="text-sm text-muted-foreground">{job.customerName}</span>
            <span className="text-sm text-muted-foreground">{job.address}</span>
            {job.customerPhone ? (
              <span className="text-sm text-muted-foreground">{job.customerPhone}</span>
            ) : null}
          </Link>
        ))}
      </div>
    </FieldShell>
  );
}
