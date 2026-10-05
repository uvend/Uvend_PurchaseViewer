import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { authCookieName, authCookieOptions, createJwt } from "@/lib/jwt";

type LoginPayload = {
  username: string;
  password: string;
  source?: "purchase" | "admin";
};

export async function POST(request: Request) {
  const payload = (await request.json()) as LoginPayload;
  const username = payload.username?.trim().toLowerCase();
  const source = payload.source === "admin" ? "admin" : "purchase";

  if (!username || !payload.password) {
    return NextResponse.json(
      { error: "Username and password are required" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      passwordHash: true,
    },
  });

  const passwordOk = Boolean(
    user?.username && verifyPassword(payload.password, user.passwordHash),
  );

  if (!user || !passwordOk) {
    await prisma.loginEvent.create({
      data: {
        username,
        success: false,
        source,
      },
    });

    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 },
    );
  }

  if (source === "admin" && user.role !== "ADMIN") {
    await prisma.loginEvent.create({
      data: {
        userId: user.id,
        username: user.username ?? username,
        role: user.role,
        success: false,
        source,
      },
    });

    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  const token = await createJwt({
    userId: user.id,
    username: user.username as string,
    role: user.role,
  });

  await prisma.loginEvent.create({
    data: {
      userId: user.id,
      username: user.username ?? username,
      role: user.role,
      success: true,
      source,
    },
  });

  console.log("User login traced", {
    id: user.id,
    username: user.username,
    role: user.role,
    source,
  });

  const response = NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    },
  });

  response.cookies.set(authCookieName, token, authCookieOptions);

  return response;
}
