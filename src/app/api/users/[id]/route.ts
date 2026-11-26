import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { isUserRole, type UserRole } from "@/lib/roles";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const userSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = (await request.json()) as {
    name?: string;
    username?: string;
    email?: string;
    password?: string;
    role?: string;
  };
  const name = payload.name?.trim();
  const username = payload.username?.trim().toLowerCase();
  const password = payload.password?.trim() ?? "";

  if (!name || !username || !isUserRole(payload.role)) {
    return NextResponse.json({ error: "Name, username, and role are required" }, { status: 400 });
  }

  if (password && password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (existing.role === "ADMIN" && payload.role !== "ADMIN" && !(await anotherAdminExists(id))) {
    return NextResponse.json({ error: "Keep at least one admin" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        username,
        email: payload.email?.trim() || null,
        role: payload.role as UserRole,
        ...(password ? { passwordHash: hashPassword(password) } : {}),
      },
      select: userSelect,
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Could not update user. Username or email may already exist." },
      { status: 409 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  const { id } = await context.params;

  if (id === admin.userId) {
    return NextResponse.json({ error: "You can't delete your own login" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (existing.role === "ADMIN" && !(await anotherAdminExists(id))) {
    return NextResponse.json({ error: "Keep at least one admin" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

async function anotherAdminExists(exceptId: string) {
  const remaining = await prisma.user.count({
    where: {
      role: "ADMIN",
      id: { not: exceptId },
    },
  });

  return remaining > 0;
}
