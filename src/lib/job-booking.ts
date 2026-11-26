import { withDbRetry } from "@/lib/db";
import { formatSlot, personName } from "@/lib/job-schedule";
import { prisma } from "@/lib/prisma";

const personSelect = {
  id: true,
  name: true,
  username: true,
};

export async function conflictingJob(
  assignedUserId: string,
  startsAt: Date,
  endsAt: Date,
  bufferMinutes = 0,
  ignoreId?: string,
) {
  const occupiedUntil = new Date(endsAt.getTime() + bufferMinutes * 60_000);
  const jobs = await withDbRetry(() =>
    prisma.job.findMany({
      where: {
        assignedUserId,
        status: { not: "COMPLETE" },
        startsAt: { not: null },
        endsAt: { not: null },
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      include: {
        assignedUser: { select: personSelect },
      },
    }),
  );

  return (
    jobs.find((job) => {
      if (!job.startsAt || !job.endsAt) {
        return false;
      }

      const otherUntil = new Date(job.endsAt.getTime() + job.bufferMinutes * 60_000);
      return job.startsAt < occupiedUntil && otherUntil > startsAt;
    }) ?? null
  );
}

export function busyMessage(job: {
  title: string;
  startsAt: Date | null;
  endsAt: Date | null;
  bufferMinutes: number;
  assignedUser: { name: string | null; username: string | null } | null;
}) {
  const name = personName(job.assignedUser) || "That person";
  const slot = job.startsAt && job.endsAt ? formatSlot(job.startsAt, job.endsAt) : "that time";
  const travel = job.bufferMinutes ? `, plus ${job.bufferMinutes} min travel` : "";
  return `${name} is unavailable ${slot}${travel} for ${job.title}.`;
}
