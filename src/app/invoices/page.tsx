"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FieldShell } from "@/components/field/field-shell";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

type JobCard = {
  id: string;
  title: string;
  customerName: string;
  address: string;
  status: string;
  invoices: { id: string }[];
};

export default function InvoicesPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

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
      }
    }

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, []);

  async function generateInvoice(jobId: string) {
    setBusyId(jobId);
    setMessage("");

    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        throw new Error("Could not create invoice");
      }

      const data = (await response.json()) as { invoice: { id: string } };
      router.push(`/invoices/${data.invoice.id}`);
    } catch {
      setMessage("Could not generate the invoice.");
      setBusyId("");
    }
  }

  return (
    <FieldShell subtitle="Open a job, then add materials or tools." title="Invoices">
      {message ? <Notice>{message}</Notice> : null}
      <div className="grid gap-2">
        {jobs.map((job) => (
          <article className="grid gap-3 rounded-xl border bg-card p-4" key={job.id}>
            <div>
              <strong className="text-sm">{job.title}</strong>
              <p className="text-sm text-muted-foreground">{job.customerName}</p>
              <p className="text-sm text-muted-foreground">{job.address}</p>
            </div>
            <Button
              disabled={busyId === job.id}
              onClick={() => generateInvoice(job.id)}
              type="button"
            >
              {busyId === job.id ? "Opening..." : job.invoices.length ? "Open invoice" : "Generate invoice"}
            </Button>
          </article>
        ))}
      </div>
    </FieldShell>
  );
}
