import { NextResponse } from "next/server";
import { requireOffice } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const office = await requireOffice();

  if (!office) {
    return NextResponse.json({ error: "Office access required" }, { status: 401 });
  }

  const events = await prisma.loginEvent.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
    select: {
      id: true,
      username: true,
      role: true,
      success: true,
      source: true,
      createdAt: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  return NextResponse.json({ events });
}
