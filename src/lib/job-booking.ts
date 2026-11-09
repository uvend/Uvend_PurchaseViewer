import { withDbRetry } from "@/lib/db";
import { formatSlot, personName } from "@/lib/job-schedule";
import { prisma } from "@/lib/prisma";

const personSelect = {
  id: true,
  name: true,
  username: true,
};

export async function conflictingJob(assignedUserId: string, startsAt: Date, endsAt: Date, ignoreId?: string) {
  return withDbRetry(() =>
    prisma.job.findFirst({
      where: {
        assignedUserId,
        status: { not: "COMPLETE" },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      include: {
        assignedUser: { select: personSelect },
      },
    }),
  );
}

export function busyMessage(job: {
  title: string;
  startsAt: Date | null;
  endsAt: Date | null;
  assignedUser: { name: string | null; username: string | null } | null;
}) {
  const name = personName(job.assignedUser) || "That person";
  const slot = job.startsAt && job.endsAt ? formatSlot(job.startsAt, job.endsAt) : "that time";
  return `${name} is unavailable ${slot} for ${job.title}.`;
}
