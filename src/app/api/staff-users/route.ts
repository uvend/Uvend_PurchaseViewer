import { NextResponse } from "next/server";
import { requireOffice } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const office = await requireOffice();

  if (!office) {
    return NextResponse.json({ error: "Office access required" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: {
      name: "asc",
    },
    where: {
      role: {
        in: ["ADMIN", "OFFICE_USER", "ROAD_USER"],
      },
    },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
    },
  });

  return NextResponse.json({ users });
}
