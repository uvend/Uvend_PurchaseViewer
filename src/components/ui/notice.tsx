import { cn } from "@/lib/utils";

export function Notice({ children }: { children: string }) {
  const bad = /invalid|could not|failed/i.test(children);

  return (
    <p
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        bad
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}
