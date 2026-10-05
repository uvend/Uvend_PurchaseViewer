"use client";

import { useRouter } from "next/navigation";

export function AdminLogoutButton({ redirectTo = "/admin/login" }: { redirectTo?: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <button className="admin-link" onClick={logout} type="button">
      Log out
    </button>
  );
}
