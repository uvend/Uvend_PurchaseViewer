import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const panelClass =
  "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export function Panel({
  title,
  subtitle,
  icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn(panelClass, className)}>
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon ? <span className="mt-0.5 text-[#2f6bff] [&_svg]:size-4">{icon}</span> : null}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function ViewAll({ href }: { href: string }) {
  return (
    <Link className="shrink-0 text-xs font-semibold text-[#2f6bff] hover:underline" href={href}>
      View all
    </Link>
  );
}
