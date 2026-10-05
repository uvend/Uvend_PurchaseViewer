import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

type UserPayload = {
  name: string;
  username: string;
  email?: string;
  password: string;
  role: "USER" | "ADMIN";
};

export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const payload = (await request.json()) as UserPayload;

    if (!payload.name || !payload.username || !payload.password || !payload.role) {
      return NextResponse.json(
        { error: "Name, username, password, and role are required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.create({
      data: {
        name: payload.name.trim(),
        username: payload.username.trim().toLowerCase(),
        email: payload.email?.trim() || null,
        passwordHash: hashPassword(payload.password),
        role: payload.role,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    console.log("Internal user created", {
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Could not create user. Username or email may already exist." },
      { status: 500 },
    );
  }
}
