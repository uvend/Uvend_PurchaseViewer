import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { databaseErrorResponse, withDbRetry } from "@/lib/db";
import { busyMessage, conflictingJob } from "@/lib/job-booking";
import { readJobSchedule } from "@/lib/job-schedule";
import { prisma } from "@/lib/prisma";

const personSelect = {
  id: true,
  name: true,
  username: true,
};

const jobListInclude = {
  assignedBy: {
    select: personSelect,
  },
  assignedUser: {
    select: personSelect,
  },
  notes: {
    select: {
      id: true,
    },
  },
  invoices: {
    select: {
      id: true,
    },
  },
};

export async function GET() {
  const user = await requireUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const jobs = await withDbRetry(() =>
      prisma.job.findMany({
        orderBy: {
          updatedAt: "desc",
        },
        include: jobListInclude,
      }),
    );

    return NextResponse.json({ jobs });
  } catch (error) {
    const { error: message, status } = databaseErrorResponse(error, "Could not load jobs");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    title: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    address: string;
    status?: "TODO" | "ACTIVE" | "COMPLETE";
    kind?: string;
    meterNumber?: string;
    assignedById?: string;
    assignedUserId?: string;
    startsAt?: string;
    endsAt?: string;
  };
  const schedule = readJobSchedule(payload);

  if ("error" in schedule) {
    return NextResponse.json({ error: schedule.error }, { status: 400 });
  }

  if (!payload.title?.trim() || !payload.customerName?.trim() || !payload.address?.trim()) {
    return NextResponse.json(
      { error: "Title, customer name, and address are required" },
      { status: 400 },
    );
  }

  try {
    const clash = await conflictingJob(schedule.assignedUserId, schedule.startsAt, schedule.endsAt);

    if (clash) {
      return NextResponse.json({ error: busyMessage(clash) }, { status: 409 });
    }

    const job = await withDbRetry(() => prisma.job.create({
      data: {
        title: payload.title.trim(),
        customerName: payload.customerName.trim(),
        customerPhone: payload.customerPhone?.trim() || null,
        customerEmail: payload.customerEmail?.trim() || null,
        address: payload.address.trim(),
        status: payload.status ?? "TODO",
        kind: schedule.kind,
        meterNumber: schedule.meterNumber,
        assignedById: schedule.assignedById,
        assignedUserId: schedule.assignedUserId,
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
      },
      include: jobListInclude,
    }));

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    const { error: message, status } = databaseErrorResponse(error, "Could not create job");
    return NextResponse.json({ error: message }, { status });
  }
}
