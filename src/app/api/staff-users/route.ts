import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: {
      name: "asc",
    },
    where: {
      role: {
        in: ["USER", "INSTALLER", "ADMIN"],
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
