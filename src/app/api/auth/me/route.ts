import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    const record = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true },
    });

    return NextResponse.json({ user: { ...user, name: record?.name ?? null } });
  } catch {
    return NextResponse.json({ user: { ...user, name: null } });
  }
}
