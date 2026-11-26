import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { databaseErrorResponse, withDbRetry } from "@/lib/db";
import { prisma } from "@/lib/prisma";

function readCard(input: { name?: string; lastFour?: string }) {
  const name = input.name?.trim() ?? "";
  const lastFour = input.lastFour?.replace(/\D/g, "") ?? "";

  if (!name) {
    return { error: "Add the card name." as const };
  }

  if (!/^\d{4}$/.test(lastFour)) {
    return { error: "Last four digits must be 4 numbers." as const };
  }

  return { name, lastFour };
}

export async function GET() {
  const user = await requireUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const cards = await withDbRetry(() =>
      prisma.companyCard.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, lastFour: true },
      }),
    );

    return NextResponse.json({ cards });
  } catch (error) {
    const { error: message, status } = databaseErrorResponse(error, "Could not load cards");
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  const card = readCard((await request.json()) as { name?: string; lastFour?: string });

  if ("error" in card) {
    return NextResponse.json({ error: card.error }, { status: 400 });
  }

  try {
    const created = await withDbRetry(() =>
      prisma.companyCard.create({
        data: card,
        select: { id: true, name: true, lastFour: true },
      }),
    );

    return NextResponse.json({ card: created });
  } catch (error) {
    const { error: message, status } = databaseErrorResponse(error, "Could not save card");
    return NextResponse.json({ error: message }, { status });
  }
}
