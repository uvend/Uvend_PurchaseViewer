import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { databaseErrorResponse, withDbRetry } from "@/lib/db";
import { prisma } from "@/lib/prisma";

function invoiceNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${stamp}-${suffix}`;
}

export async function GET() {
  const user = await requireUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const invoices = await withDbRetry(() => prisma.invoice.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        items: {
          orderBy: {
            createdAt: "desc",
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            customerName: true,
            address: true,
            status: true,
          },
        },
      },
    }));

    return NextResponse.json({ invoices });
  } catch (error) {
    const { error: message, status } = databaseErrorResponse(error, "Could not load invoices");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  const user = await requireUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const payload = (await request.json()) as { jobId: string };

  if (!payload.jobId) {
    return NextResponse.json({ error: "Job is required" }, { status: 400 });
  }

  try {
    const job = await withDbRetry(() => prisma.job.findUnique({
      where: { id: payload.jobId },
      include: {
        invoices: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            items: true,
            job: {
              select: {
                id: true,
                title: true,
                customerName: true,
                address: true,
                status: true,
              },
            },
          },
        },
      },
    }));

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.invoices[0]) {
      return NextResponse.json({ invoice: job.invoices[0] });
    }

    const invoice = await withDbRetry(() => prisma.invoice.create({
      data: {
        jobId: job.id,
        number: invoiceNumber(),
        createdById: user.userId,
      },
      include: {
        items: true,
        job: {
          select: {
            id: true,
            title: true,
            customerName: true,
            address: true,
            status: true,
          },
        },
      },
    }));

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    const { error: message, status } = databaseErrorResponse(error, "Could not create invoice");
    return NextResponse.json({ error: message }, { status });
  }
}
