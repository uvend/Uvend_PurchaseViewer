import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authCookieName, verifyJwt } from "@/lib/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = await verifyJwt(request.cookies.get(authCookieName)?.value);

  const isFieldPath =
    pathname === "/" ||
    pathname === "/purchase" ||
    pathname.startsWith("/purchase/") ||
    pathname === "/installations" ||
    pathname.startsWith("/installations/") ||
    pathname === "/invoices" ||
    pathname.startsWith("/invoices/");
  const isPurchaseLogin = pathname === "/login";
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLogin = pathname === "/admin/login";

  if (isFieldPath && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminLogin) {
    const loginUrl = new URL("/login", request.url);
    const next = request.nextUrl.searchParams.get("next");
    if (next?.startsWith("/")) {
      loginUrl.searchParams.set("next", next);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (isPurchaseLogin && user) {
    const next = request.nextUrl.searchParams.get("next") || "";
    const destination =
      user.role === "ADMIN" ? (next.startsWith("/admin") ? next : "/admin") : fieldDestination(next);
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (isAdminPath && user?.role !== "ADMIN") {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

function fieldDestination(next: string) {
  if (
    next === "/" ||
    next.startsWith("/purchase") ||
    next.startsWith("/installations") ||
    next.startsWith("/invoices")
  ) {
    return next;
  }

  return "/";
}

export const config = {
  matcher: [
    "/",
    "/purchase",
    "/purchase/:path*",
    "/installations",
    "/installations/:path*",
    "/invoices",
    "/invoices/:path*",
    "/login",
    "/admin",
    "/admin/:path*",
  ],
};
