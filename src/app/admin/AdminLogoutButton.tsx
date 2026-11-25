"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminLogoutButton({
  redirectTo = "/login",
  className,
  icon = false,
}: {
  redirectTo?: string;
  className?: string;
  icon?: boolean;
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
      {icon ? <LogOut /> : null}
    </Button>
  );
}
