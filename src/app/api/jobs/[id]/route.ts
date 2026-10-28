import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { databaseErrorResponse, withDbRetry } from "@/lib/db";
import { prisma } from "@/lib/prisma";

const jobInclude = {
  assignedUser: {
    select: {
      id: true,
      name: true,
      username: true,
    },
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
    assignedUserId?: string | null;
  };

  if (payload.assignedUserId !== undefined && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  try {
    const job = await withDbRetry(() =>
      prisma.job.update({
        where: { id },
        data: {
          status: payload.status,
          assignedUserId: payload.assignedUserId,
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
