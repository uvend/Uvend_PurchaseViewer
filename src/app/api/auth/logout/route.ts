import { NextResponse } from "next/server";
import { authCookieName, authCookieOptions } from "@/lib/jwt";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(authCookieName, "", {
    ...authCookieOptions,
    maxAge: 0,
  });

  return response;
}
