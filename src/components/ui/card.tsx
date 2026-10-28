import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl border bg-card text-card-foreground shadow-xs", className)}
      data-slot="card"
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-1 px-5 pt-5", className)} data-slot="card-header" {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-base font-semibold tracking-tight", className)}
      data-slot="card-title"
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} data-slot="card-description" {...props} />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-5 py-5", className)} data-slot="card-content" {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
