import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { databaseErrorResponse, withDbRetry } from "@/lib/db";
import { pdfFileName, renderInvoiceStatement } from "@/lib/pdf";
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
    const invoice = await withDbRetry(() =>
      prisma.invoice.findUnique({
        where: { id },
        include: {
          items: { orderBy: { createdAt: "asc" } },
          job: {
            select: {
              title: true,
              customerName: true,
              customerPhone: true,
              customerEmail: true,
              address: true,
            },
          },
        },
      }),
    );

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const bytes = await renderInvoiceStatement({
      number: invoice.number,
      createdAt: invoice.createdAt,
      job: invoice.job,
      items: invoice.items.map((item) => ({
        kind: item.kind,
        description: item.description,
        amount: item.amount,
      })),
    });

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFileName(invoice.number, "invoice")}"`,
      },
    });
  } catch (error) {
    const { error: message, status } = databaseErrorResponse(error, "Could not build the invoice PDF");
    return NextResponse.json({ error: message }, { status });
  }
}
