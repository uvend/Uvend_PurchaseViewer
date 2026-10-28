"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AdminLogoutButton({
  redirectTo = "/admin/login",
  className,
}: {
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <Button className={className} onClick={logout} size="sm" type="button" variant="ghost">
      Log out
    </Button>
  );
}
