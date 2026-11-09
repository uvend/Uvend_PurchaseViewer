"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { kindLabel, personName, type JobKind } from "@/lib/job-schedule";
import { cn } from "@/lib/utils";

type CalendarPerson = { id: string; name: string | null; username: string | null };

export type CalendarJob = {
  id: string;
  title: string;
  status: "TODO" | "ACTIVE" | "COMPLETE";
  kind: JobKind | null;
  startsAt: string | null;
  endsAt: string | null;
  assignedUser: CalendarPerson | null;
};

type DraftSlot = {
  title: string;
  assignedUserId: string;
  startsAt: string;
  endsAt: string;
  assigneeName: string;
};

const startHour = 7;
const endHour = 18;
const hourHeight = 42;
const swatches = ["bg-blue-950 text-white", "bg-sky-800 text-white", "bg-emerald-800 text-white", "bg-amber-700 text-white", "bg-violet-800 text-white"];

export function JobWeek({ jobs, draft }: { jobs: CalendarJob[]; draft?: DraftSlot | null }) {
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const days = useMemo(() => (weekStart ? Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)) : []), [weekStart]);

  useEffect(() => {
    setWeekStart(startOfWeek(new Date()));
  }, []);
  const people = useMemo(() => {
    const seen = new Map<string, string>();
    for (const job of jobs) {
      if (job.assignedUser) {
        seen.set(job.assignedUser.id, personName(job.assignedUser));
      }
    }
    if (draft?.assignedUserId) {
      seen.set(draft.assignedUserId, draft.assigneeName || seen.get(draft.assignedUserId) || "Selected person");
    }
    return [...seen.entries()];
  }, [draft, jobs]);

  return (
    <section className="grid gap-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Time calendar</h2>
          <p className="text-sm text-muted-foreground">
            A filled block means that person is unavailable. Completing the job on the field app frees them.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => weekStart && setWeekStart(addDays(weekStart, -7))}
            size="sm"
            type="button"
            variant="outline"
          >
            Previous
          </Button>
          <Button onClick={() => setWeekStart(startOfWeek(new Date()))} size="sm" type="button" variant="outline">
            This week
          </Button>
          <Button
            onClick={() => weekStart && setWeekStart(addDays(weekStart, 7))}
            size="sm"
            type="button"
            variant="outline"
          >
            Next
          </Button>
        </div>
      </div>

      {people.length > 0 ? (
        <div className="flex flex-wrap gap-3 text-xs">
          {people.map(([id, name]) => (
            <span className="inline-flex items-center gap-2" key={id}>
              <span className={cn("size-2.5 rounded-full", swatches[colorIndex(id)].split(" ")[0])} />
              {name}
            </span>
          ))}
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="size-2.5 rounded-full border border-dashed" />
            Completed, available again
          </span>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No bookings this week yet.</p>
      )}

      {weekStart ? <div className="overflow-x-auto">
        <div className="grid min-w-[820px] grid-cols-[52px_repeat(7,minmax(0,1fr))] gap-px">
          <div />
          {days.map((day) => (
            <div className="px-1 pb-2 text-center text-xs" key={day.toISOString()}>
              <div className="font-medium">{day.toLocaleDateString("en-ZA", { weekday: "short" })}</div>
              <div className="text-muted-foreground">{day.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</div>
            </div>
          ))}
          <div className="relative" style={{ height: (endHour - startHour) * hourHeight }}>
            {Array.from({ length: endHour - startHour + 1 }, (_, index) => (
              <span
                className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground"
                key={index}
                style={{ top: index * hourHeight }}
              >
                {String(startHour + index).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {days.map((day) => (
            <DayColumn day={day} draft={draft} jobs={jobs} key={day.toISOString()} />
          ))}
        </div>
      </div> : <p className="text-sm text-muted-foreground">Loading the week...</p>}
    </section>
  );
}

function DayColumn({ day, jobs, draft }: { day: Date; jobs: CalendarJob[]; draft?: DraftSlot | null }) {
  const blocks = laneBlocks(
    jobs.flatMap((job) => {
      const placed = placeOnDay(day, job.startsAt, job.endsAt);
      if (!placed || !job.assignedUser) {
        return [];
      }
      return [{ ...placed, job, name: personName(job.assignedUser), userId: job.assignedUser.id }];
    }),
  );
  const draftBlock = draft ? placeOnDay(day, draft.startsAt, draft.endsAt) : null;

  return (
    <div className="relative border-l bg-background" style={{ height: (endHour - startHour) * hourHeight }}>
      {Array.from({ length: endHour - startHour }, (_, index) => (
        <div className="border-t border-dashed border-border/70" key={index} style={{ height: hourHeight }} />
      ))}
      {blocks.map((block) => (
        <Link
          className={cn(
            "absolute overflow-hidden rounded-md px-1.5 py-1 text-[10px] leading-tight",
            block.job.status === "COMPLETE" ? "border border-dashed bg-muted text-muted-foreground" : swatches[colorIndex(block.userId)],
          )}
          href={`/admin/jobs/${block.job.id}`}
          key={block.job.id}
          style={{
            top: block.top,
            height: block.height,
            left: `calc(${(100 / block.lanes) * block.lane}% + 2px)`,
            width: `calc(${100 / block.lanes}% - 4px)`,
          }}
        >
          <span className="block font-medium">
            {block.job.status === "COMPLETE" ? "Available" : "Unavailable"} · {block.name}
          </span>
          <span className="block truncate">
            {clock(block.job.startsAt)}–{clock(block.job.endsAt)} {kindLabel(block.job.kind)}
          </span>
        </Link>
      ))}
      {draftBlock ? (
        <div
          className="pointer-events-none absolute inset-x-1 rounded-md border-2 border-dashed border-foreground/70 bg-foreground/10 px-1.5 py-1 text-[10px] leading-tight"
          style={{ top: draftBlock.top, height: draftBlock.height }}
        >
          <span className="block font-medium">New booking</span>
          <span className="block truncate">{draft?.assigneeName || "Choose a person"}</span>
        </div>
      ) : null}
    </div>
  );
}

function laneBlocks<T extends { top: number; height: number }>(blocks: T[]) {
  const sorted = [...blocks].sort((left, right) => left.top - right.top);
  const laneEnds: number[] = [];
  const placed = sorted.map((block) => {
    let lane = laneEnds.findIndex((end) => end <= block.top + 1);

    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(block.top + block.height);
    } else {
      laneEnds[lane] = block.top + block.height;
    }

    return { ...block, lane };
  });
  const lanes = Math.max(1, ...placed.map((block) => block.lane + 1));
  return placed.map((block) => ({ ...block, lanes }));
}

function placeOnDay(day: Date, startsAt: string | null | undefined, endsAt: string | null | undefined) {
  if (!startsAt || !endsAt) {
    return null;
  }

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const nextDay = addDays(dayStart, 1);

  if (end <= dayStart || start >= nextDay) {
    return null;
  }

  const windowStart = new Date(day);
  windowStart.setHours(startHour, 0, 0, 0);
  const windowEnd = new Date(day);
  windowEnd.setHours(endHour, 0, 0, 0);
  const visibleStart = new Date(Math.max(start.getTime(), windowStart.getTime()));
  const visibleEnd = new Date(Math.min(end.getTime(), windowEnd.getTime()));

  if (visibleEnd <= visibleStart) {
    return null;
  }

  const top = ((visibleStart.getTime() - windowStart.getTime()) / 3_600_000) * hourHeight;
  const height = Math.max(28, ((visibleEnd.getTime() - visibleStart.getTime()) / 3_600_000) * hourHeight);
  return { top, height };
}

function clock(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}

function colorIndex(id: string) {
  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % swatches.length;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
