import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { databaseErrorResponse, withDbRetry } from "@/lib/db";
import { prisma } from "@/lib/prisma";

const jobListInclude = {
  assignedUser: {
    select: {
      id: true,
      name: true,
      username: true,
    },
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
    assignedUserId?: string;
  };

  if (!payload.title?.trim() || !payload.customerName?.trim() || !payload.address?.trim()) {
    return NextResponse.json(
      { error: "Title, customer name, and address are required" },
      { status: 400 },
    );
  }

  try {
    const job = await withDbRetry(() => prisma.job.create({
      data: {
        title: payload.title.trim(),
        customerName: payload.customerName.trim(),
        customerPhone: payload.customerPhone?.trim() || null,
        customerEmail: payload.customerEmail?.trim() || null,
        address: payload.address.trim(),
        status: payload.status ?? "TODO",
        assignedUserId: payload.assignedUserId || null,
      },
      include: jobListInclude,
    }));

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    const { error: message, status } = databaseErrorResponse(error, "Could not create job");
    return NextResponse.json({ error: message }, { status });
  }
}
