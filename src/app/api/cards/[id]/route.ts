import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { databaseErrorResponse, withDbRetry } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await withDbRetry(() => prisma.companyCard.delete({ where: { id } }));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const { error: message, status } = databaseErrorResponse(error, "Could not delete card");
    return NextResponse.json({ error: message }, { status });
  }
}
