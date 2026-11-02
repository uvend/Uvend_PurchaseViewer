import { redirect } from "next/navigation";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "";
  redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
}
