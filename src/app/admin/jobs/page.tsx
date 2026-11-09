"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminFrame } from "../AdminFrame";
import { JobWeek } from "@/components/admin/job-week";
import { JobStatusBadge } from "@/components/field/job-status-badge";
import { Button } from "@/components/ui/button";
import { controlClass, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { defaultTimeSlot, formatSlot, isJobKind, jobKindLabel, jobKinds, kindLabel, personName, type JobKind } from "@/lib/job-schedule";

type JobStatus = "TODO" | "ACTIVE" | "COMPLETE";
type StaffRole = "USER" | "INSTALLER" | "ADMIN";

type StaffUser = {
  id: string;
  name: string | null;
  username: string | null;
  role: StaffRole;
};

type JobRow = {
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
  assignedBy: StaffUser | null;
  assignedUser: StaffUser | null;
  notes: { id: string }[];
  invoices: { id: string }[];
};

type JobForm = {
  kind: JobKind;
  title: string;
  customerName: string;
  customerPhone: string;
  address: string;
  meterNumber: string;
  assignedById: string;
  assignedUserId: string;
  startsAt: string;
  endsAt: string;
};

const statusLabel: Record<JobStatus, string> = {
  TODO: "To do",
  ACTIVE: "Active",
  COMPLETE: "Complete",
};

const emptyForm: JobForm = {
  kind: "NEW_METER",
  title: "New meter",
  customerName: "",
  customerPhone: "",
  address: "",
  meterNumber: "",
  assignedById: "",
  assignedUserId: "",
  startsAt: "",
  endsAt: "",
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [filter, setFilter] = useState<"ALL" | JobStatus>("ALL");
  const [form, setForm] = useState<JobForm>(emptyForm);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [jobsResponse, staffResponse, meResponse] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/staff-users"),
        fetch("/api/auth/me"),
      ]);
      const jobsData = (await jobsResponse.json()) as { jobs?: JobRow[] };
      const staffData = (await staffResponse.json()) as { users?: StaffUser[] };
      const meData = (await meResponse.json()) as { user?: { userId: string } };

      if (cancelled) {
        return;
      }

      setJobs(jobsData.jobs ?? []);
      setStaff(staffData.users ?? []);
      setForm((current) => ({
        ...current,
        ...defaultTimeSlot(),
        assignedById: current.assignedById || meData.user?.userId || "",
      }));
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadJobs() {
    const response = await fetch("/api/jobs");
    const data = (await response.json()) as { jobs?: JobRow[] };
    setJobs(data.jobs ?? []);
  }

  const visible = useMemo(() => jobs.filter((job) => filter === "ALL" || job.status === filter), [filter, jobs]);
  const assigners = staff.filter((person) => person.role === "ADMIN");
  const assignees = staff.filter((person) => person.role !== "ADMIN");
  const assigneeChoices = assignees.length > 0 ? assignees : staff;
  const selectedAssignee = staff.find((person) => person.id === form.assignedUserId);

  async function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(data.error || "Could not create job card.");
      return;
    }

    setForm((current) => ({
      ...emptyForm,
      ...defaultTimeSlot(),
      assignedById: current.assignedById,
    }));
    setMessage("Job card created. That person is unavailable for the time slot.");
    await loadJobs();
  }

  function chooseKind(kind: string) {
    if (!isJobKind(kind)) {
      return;
    }

    setForm((current) => ({
      ...current,
      kind,
      title:
        current.title === "" || current.title === jobKindLabel.NEW_METER || current.title === jobKindLabel.METER_REPLACEMENT
          ? jobKindLabel[kind]
          : current.title,
    }));
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

      <section className="grid gap-4 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)]">
        <form className="grid h-fit gap-4 rounded-xl border bg-card p-5" onSubmit={createJob}>
          <h2 className="text-base font-semibold tracking-tight">New job card</h2>
          <div className="grid gap-2">
            <Label htmlFor="job-kind">Job type</Label>
            <select className={controlClass} id="job-kind" onChange={(event) => chooseKind(event.target.value)} value={form.kind}>
              {jobKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {jobKindLabel[kind]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="job-title">Job title</Label>
            <Input id="job-title" onChange={(event) => setForm({ ...form, title: event.target.value })} required value={form.title} />
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
            <Input id="phone" onChange={(event) => setForm({ ...form, customerPhone: event.target.value })} value={form.customerPhone} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" onChange={(event) => setForm({ ...form, address: event.target.value })} required value={form.address} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="meter">Meter number</Label>
            <Input
              id="meter"
              onChange={(event) => setForm({ ...form, meterNumber: event.target.value })}
              required
              value={form.meterNumber}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assigned-by">Assigned by</Label>
            <select
              className={controlClass}
              id="assigned-by"
              onChange={(event) => setForm({ ...form, assignedById: event.target.value })}
              required
              value={form.assignedById}
            >
              <option value="">Choose an admin</option>
              {(assigners.length > 0 ? assigners : staff).map((person) => (
                <option key={person.id} value={person.id}>
                  {personName(person) || person.username}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assigned-to">Assigned to</Label>
            <select
              className={controlClass}
              id="assigned-to"
              onChange={(event) => setForm({ ...form, assignedUserId: event.target.value })}
              required
              value={form.assignedUserId}
            >
              <option value="">Choose a field user</option>
              {assigneeChoices.map((person) => (
                <option key={person.id} value={person.id}>
                  {personName(person) || person.username}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="starts-at">Time slot starts</Label>
              <Input
                id="starts-at"
                onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                required
                type="datetime-local"
                value={form.startsAt}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ends-at">Time slot ends</Label>
              <Input
                id="ends-at"
                onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
                required
                type="datetime-local"
                value={form.endsAt}
              />
            </div>
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
                <span className="text-muted-foreground">
                  {kindLabel(job.kind)}
                  {job.meterNumber ? ` · Meter ${job.meterNumber}` : ""}
                </span>
                <span className="text-muted-foreground">{job.customerName}</span>
                <span className="text-muted-foreground">{job.address}</span>
                <span className="text-muted-foreground">
                  {personName(job.assignedUser) ? `Assigned to ${personName(job.assignedUser)}` : "Unassigned"}
                  {personName(job.assignedBy) ? ` · by ${personName(job.assignedBy)}` : ""}
                </span>
                {job.startsAt && job.endsAt ? (
                  <span className="text-muted-foreground">
                    {job.status === "COMPLETE" ? "Available again" : "Unavailable"} · {formatSlot(job.startsAt, job.endsAt)}
                  </span>
                ) : null}
                <span className="text-muted-foreground">
                  {job.notes.length} notes · {job.invoices.length} invoices
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <JobWeek
        draft={
          form.startsAt && form.endsAt
            ? {
                title: form.title,
                assignedUserId: form.assignedUserId,
                startsAt: new Date(form.startsAt).toISOString(),
                endsAt: new Date(form.endsAt).toISOString(),
                assigneeName: personName(selectedAssignee),
              }
            : null
        }
        jobs={jobs}
      />
    </AdminFrame>
  );
}
