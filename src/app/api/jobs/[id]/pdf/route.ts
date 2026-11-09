import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { databaseErrorResponse, withDbRetry } from "@/lib/db";
import { formatSlot, kindLabel, personName } from "@/lib/job-schedule";
import { pdfFileName, renderJobCard } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

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
        include: {
          assignedBy: { select: { name: true, username: true } },
          assignedUser: { select: { name: true, username: true } },
          notes: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { name: true, username: true } } },
          },
          purchases: {
            orderBy: { purchasedAt: "asc" },
            select: { shopName: true, description: true, purchasedAt: true },
          },
          invoices: {
            orderBy: { createdAt: "asc" },
            include: { items: { select: { amount: true } } },
          },
        },
      }),
    );

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const bytes = await renderJobCard({
      title: job.title,
      status: job.status,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      customerEmail: job.customerEmail,
      address: job.address,
      createdAt: job.createdAt,
      kind: kindLabel(job.kind),
      meterNumber: job.meterNumber,
      assignedBy: personName(job.assignedBy) || null,
      assignedTo: personName(job.assignedUser) || null,
      slot: job.startsAt && job.endsAt ? formatSlot(job.startsAt, job.endsAt) : null,
      notes: job.notes.map((note) => ({
        text: note.text,
        source: note.source,
        createdAt: note.createdAt,
        author: note.user?.name || note.user?.username || null,
        location:
          note.latitude != null && note.longitude != null
            ? `${note.latitude.toFixed(5)}, ${note.longitude.toFixed(5)}`
            : note.locationStatus,
      })),
      purchases: job.purchases,
      invoices: job.invoices.map((invoice) => ({
        number: invoice.number,
        total: invoice.items.reduce((sum, item) => sum + item.amount, 0),
      })),
    });

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFileName(job.title, "job-card")}"`,
      },
    });
  } catch (error) {
    const { error: message, status } = databaseErrorResponse(error, "Could not build the job card PDF");
    return NextResponse.json({ error: message }, { status });
  }
}
