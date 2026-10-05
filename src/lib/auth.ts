import { cookies } from "next/headers";
import { authCookieName, verifyJwt, type JwtPayload } from "@/lib/jwt";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;

  return verifyJwt(token);
}

export async function requireUser() {
  return getCurrentUser();
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  return user?.role === "ADMIN" ? user : null;
}

export function isAdmin(user?: JwtPayload | null) {
  return user?.role === "ADMIN";
}
