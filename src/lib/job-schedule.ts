export const jobKinds = ["NEW_METER", "METER_REPLACEMENT"] as const;

export type JobKind = (typeof jobKinds)[number];

export const jobKindLabel: Record<JobKind, string> = {
  NEW_METER: "New meter",
  METER_REPLACEMENT: "Meter replacement",
};

export function kindLabel(kind?: JobKind | null) {
  return kind ? jobKindLabel[kind] : "Job";
}

export function isJobKind(value: string): value is JobKind {
  return jobKinds.includes(value as JobKind);
}

export function personName(person?: { name: string | null; username: string | null } | null) {
  return person?.name || person?.username || "";
}

export function formatSlot(startsAt: string | Date, endsAt: string | Date) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(start);
  const clock = new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  return `${day}, ${clock.format(start)}–${clock.format(end)}`;
}

export function localDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function readJobSchedule(input: {
  kind?: string;
  meterNumber?: string;
  assignedUserId?: string;
  assignedById?: string;
  startsAt?: string;
  endsAt?: string;
}) {
  if (!input.kind || !isJobKind(input.kind)) {
    return { error: "Choose a job type." as const };
  }

  const meterNumber = input.meterNumber?.trim() ?? "";

  if (!meterNumber) {
    return { error: "Add the meter number." as const };
  }

  if (!input.assignedById) {
    return { error: "Choose who assigned this job." as const };
  }

  if (!input.assignedUserId) {
    return { error: "Choose who this job is assigned to." as const };
  }

  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;

  if (!startsAt || !endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return { error: "Choose a time slot that ends after it starts." as const };
  }

  return {
    kind: input.kind,
    meterNumber,
    assignedById: input.assignedById,
    assignedUserId: input.assignedUserId,
    startsAt,
    endsAt,
  };
}

export function defaultTimeSlot() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  return {
    startsAt: localDateTimeInput(start),
    endsAt: localDateTimeInput(end),
  };
}
