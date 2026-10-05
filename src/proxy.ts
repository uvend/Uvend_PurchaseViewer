import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authCookieName, verifyJwt } from "@/lib/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = await verifyJwt(request.cookies.get(authCookieName)?.value);

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/purchase", request.url));
  }

  const isPurchasePath = pathname === "/purchase" || pathname.startsWith("/purchase/");
  const isPurchaseLogin = pathname === "/login";
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLogin = pathname === "/admin/login";

  if (isPurchasePath && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPurchaseLogin && user) {
    return NextResponse.redirect(new URL("/purchase", request.url));
  }

  if (isAdminPath && !isAdminLogin && user?.role !== "ADMIN") {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminLogin && user?.role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/purchase", "/purchase/:path*", "/login", "/admin", "/admin/:path*"],
};
