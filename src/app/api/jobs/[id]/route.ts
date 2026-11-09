import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { databaseErrorResponse, withDbRetry } from "@/lib/db";
import { busyMessage, conflictingJob } from "@/lib/job-booking";
import { readJobSchedule } from "@/lib/job-schedule";
import { prisma } from "@/lib/prisma";

const personSelect = {
  id: true,
  name: true,
  username: true,
};

const jobInclude = {
  assignedBy: {
    select: personSelect,
  },
  assignedUser: {
    select: personSelect,
  },
  notes: {
    orderBy: {
      createdAt: "desc" as const,
    },
    include: {
      user: {
        select: {
          name: true,
          username: true,
        },
      },
    },
  },
  invoices: {
    orderBy: {
      createdAt: "desc" as const,
    },
    include: {
      items: {
        orderBy: {
          createdAt: "desc" as const,
        },
      },
    },
  },
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const job = await withDbRetry(() =>
      prisma.job.findUnique({
        where: { id },
        include: jobInclude,
      }),
    );

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    const { error: message, status } = databaseErrorResponse(error, "Could not load job");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = (await request.json()) as {
    status?: "TODO" | "ACTIVE" | "COMPLETE";
    title?: string;
    customerName?: string;
    customerPhone?: string;
    address?: string;
    kind?: string;
    meterNumber?: string;
    assignedById?: string;
    assignedUserId?: string;
    startsAt?: string;
    endsAt?: string;
  };
  const changingSchedule = payload.kind !== undefined || payload.startsAt !== undefined || payload.assignedUserId !== undefined;

  if (changingSchedule && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  const schedule = changingSchedule ? readJobSchedule(payload) : null;

  if (schedule && "error" in schedule) {
    return NextResponse.json({ error: schedule.error }, { status: 400 });
  }

  try {
    if (schedule && !("error" in schedule) && payload.status !== "COMPLETE") {
      const clash = await conflictingJob(schedule.assignedUserId, schedule.startsAt, schedule.endsAt, id);

      if (clash) {
        return NextResponse.json({ error: busyMessage(clash) }, { status: 409 });
      }
    }

    const job = await withDbRetry(() =>
      prisma.job.update({
        where: { id },
        data: {
          status: payload.status,
          ...(schedule && !("error" in schedule)
            ? {
                ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
                ...(payload.customerName !== undefined ? { customerName: payload.customerName.trim() } : {}),
                ...(payload.customerPhone !== undefined ? { customerPhone: payload.customerPhone.trim() || null } : {}),
                ...(payload.address !== undefined ? { address: payload.address.trim() } : {}),
                kind: schedule.kind,
                meterNumber: schedule.meterNumber,
                assignedById: schedule.assignedById,
                assignedUserId: schedule.assignedUserId,
                startsAt: schedule.startsAt,
                endsAt: schedule.endsAt,
              }
            : {}),
        },
        include: jobInclude,
      }),
    );

    return NextResponse.json({ job });
  } catch (error) {
    const { error: message, status } = databaseErrorResponse(error, "Could not update job");
    return NextResponse.json({ error: message }, { status });
  }
}
