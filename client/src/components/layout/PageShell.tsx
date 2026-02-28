import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  top?: ReactNode;
  title: string;
  description?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PageShell({ top, title, description, headerRight, children, className }: PageShellProps) {
  return (
    <div className={cn("p-4 sm:p-8 space-y-6 animate-in fade-in", className)}>
      {top ? <div>{top}</div> : null}
      <div className="rounded-xl border bg-card shadow-sm p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {description ? <p className="text-muted-foreground mt-1">{description}</p> : null}
          </div>
          {headerRight ? <div className="flex flex-col sm:flex-row gap-2">{headerRight}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
