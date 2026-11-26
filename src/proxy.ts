import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authCookieName, verifyJwt } from "@/lib/jwt";
import { isOfficeRole, officePathAllowed } from "@/lib/roles";

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
    const destination = isOfficeRole(user.role) ? officeDestination(user.role, next) : fieldDestination(next);
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (isAdminPath && !isOfficeRole(user?.role)) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  if (user?.role === "OFFICE_USER" && isAdminPath && !officePathAllowed(pathname)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

function officeDestination(role: string, next: string) {
  if (role === "ADMIN" && next.startsWith("/admin")) {
    return next;
  }

  if (role === "OFFICE_USER" && officePathAllowed(next)) {
    return next;
  }

  return "/admin";
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
