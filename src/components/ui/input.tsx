import * as React from "react";
import { cn } from "@/lib/utils";

export const controlClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(controlClass, className)}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}

export { Input };
