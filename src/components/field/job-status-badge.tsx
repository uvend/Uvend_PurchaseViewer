import { Badge } from "@/components/ui/badge";

const copy = {
  TODO: { label: "To do", variant: "todo" },
  ACTIVE: { label: "Active", variant: "active" },
  COMPLETE: { label: "Complete", variant: "complete" },
} as const;

export function JobStatusBadge({ status }: { status: string }) {
  const item = status in copy ? copy[status as keyof typeof copy] : copy.TODO;

  return <Badge variant={item.variant}>{item.label}</Badge>;
}
