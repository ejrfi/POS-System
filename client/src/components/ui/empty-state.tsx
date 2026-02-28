import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("py-14 flex flex-col items-center justify-center text-center", className)}>
      {icon ? <div className="mb-4 text-muted-foreground">{icon}</div> : null}
      <div className="text-sm font-semibold">{title}</div>
      {description ? <div className="mt-1 text-sm text-muted-foreground max-w-md">{description}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

