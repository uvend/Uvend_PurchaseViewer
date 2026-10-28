"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FieldShell } from "@/components/field/field-shell";
import { JobStatusBadge } from "@/components/field/job-status-badge";
import { Notice } from "@/components/ui/notice";

type JobStatus = "TODO" | "ACTIVE" | "COMPLETE";

type JobCard = {
  id: string;
  title: string;
  customerName: string;
  customerPhone: string | null;
  address: string;
  status: JobStatus;
};

export default function InstallationsPage() {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [message, setMessage] = useState("Loading job cards...");

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
        {jobs.map((job) => (
          <Link
            className="grid gap-1 rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
            href={`/installations/${job.id}`}
            key={job.id}
          >
            <JobStatusBadge status={job.status} />
            <strong className="text-sm">{job.title}</strong>
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
