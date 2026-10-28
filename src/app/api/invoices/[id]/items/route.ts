import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { databaseErrorResponse, withDbRetry } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = (await request.json()) as {
    kind: "LABOUR" | "MATERIALS" | "TOOLS";
    description?: string;
    amount: number;
    purchaseId?: string;
  };

  if (!Number.isFinite(payload.amount)) {
    return NextResponse.json({ error: "Amount is required" }, { status: 400 });
  }

  if (!payload.purchaseId && !payload.description?.trim()) {
    return NextResponse.json(
      { error: "Description and amount are required" },
      { status: 400 },
    );
  }

  if (!["LABOUR", "MATERIALS", "TOOLS"].includes(payload.kind)) {
    return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
  }

  try {
    const invoice = await withDbRetry(() =>
      prisma.invoice.findUnique({
        where: { id },
        select: { id: true, jobId: true },
      }),
    );

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    let description = payload.description?.trim() || "";
    let purchaseId: string | null = null;

    if (payload.purchaseId) {
      const purchase = await withDbRetry(() =>
        prisma.purchase.findUnique({
          where: { id: payload.purchaseId },
          select: {
            id: true,
            shopName: true,
            description: true,
            jobId: true,
            invoiceItems: {
              select: { id: true },
            },
          },
        }),
      );

      if (!purchase) {
        return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
      }

      if (purchase.jobId && purchase.jobId !== invoice.jobId) {
        return NextResponse.json(
          { error: "That purchase belongs to a different job" },
          { status: 400 },
        );
      }

      if (purchase.invoiceItems.length > 0) {
        return NextResponse.json(
          { error: "That purchase is already on an invoice" },
          { status: 409 },
        );
      }

      purchaseId = purchase.id;
      description =
        description || `${purchase.shopName}: ${purchase.description}`;
    }

    const item = await withDbRetry(() =>
      prisma.invoiceItem.create({
        data: {
          invoiceId: id,
          purchaseId,
          kind: payload.kind,
          description,
          amount: payload.amount,
        },
      }),
    );

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    const { error: message, status } = databaseErrorResponse(error, "Could not add payment");
    return NextResponse.json({ error: message }, { status });
  }
}
