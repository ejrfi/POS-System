import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageToolbarProps = {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export function PageToolbar({ left, right, className }: PageToolbarProps) {
  if (!left && !right) return null;
  return (
    <div className={cn("rounded-xl border bg-card shadow-sm p-4", className)}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {left ? <div className="flex flex-col sm:flex-row gap-2">{left}</div> : <div />}
        {right ? <div className="flex flex-col sm:flex-row gap-2">{right}</div> : null}
      </div>
    </div>
  );
}

