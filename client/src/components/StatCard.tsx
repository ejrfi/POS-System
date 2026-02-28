import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  description?: string;
  iconClassName?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, description, iconClassName, className }: StatCardProps) {
  return (
    <div className={cn("p-6 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-2">{value}</h3>
          {description ? <p className="text-xs text-muted-foreground mt-1">{description}</p> : null}
        </div>
        <div className={cn("h-12 w-12 rounded-full flex items-center justify-center", iconClassName ?? "bg-primary/10 text-primary")}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={cn("font-medium", trendUp ? "text-green-600" : "text-red-600")}>
            {trend}
          </span>
          <span className="text-muted-foreground ml-2">from last month</span>
        </div>
      )}
    </div>
  );
}
