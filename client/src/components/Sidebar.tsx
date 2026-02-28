import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Settings, 
  LogOut, 
  History,
  RotateCcw,
  BarChart3,
  Percent,
  Clock3,
  Star
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings } from "@/hooks/use-others";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isCollapsed: boolean;
}

export function Sidebar({ isCollapsed }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: appSettings } = useAppSettings();
  const [isHovered, setIsHovered] = useState(false);

  const isAdmin = user?.role === "admin";
  const storeNameRaw = (appSettings?.storeName ?? "Barokah Frozen Food").trim();
  const storeParts = storeNameRaw ? storeNameRaw.split(/\s+/) : ["Barokah", "Frozen", "Food"];
  const storeTop = storeParts[0] ?? "Barokah";
  const storeBottom = storeParts.slice(1).join(" ") || "Frozen Food";

  const isActuallyExpanded = !isCollapsed || isHovered;

  const links = [
    ...(isAdmin ? [{ href: "/", icon: LayoutDashboard, label: "Dashboard" }] : []),
    { href: "/pos", icon: ShoppingCart, label: "Kasir (POS)" },
    { href: "/transactions", icon: History, label: "Transaksi" },
    { href: "/returns", icon: RotateCcw, label: "Retur" },
    ...(isAdmin ? [
      { href: "/reports", icon: BarChart3, label: "Laporan" },
      { href: "/reports/shifts", icon: Clock3, label: "Laporan Shift" },
      { href: "/inventory", icon: Package, label: "Inventori" },
      { href: "/discounts", icon: Percent, label: "Diskon" },
      { href: "/customers", icon: Users, label: "Pelanggan" },
      { href: "/loyalty", icon: Star, label: "Loyalti" },
      { href: "/settings", icon: Settings, label: "Pengaturan" },
    ] : []),
  ];

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "h-screen bg-base-100 text-base-content flex flex-col fixed left-0 top-0 border-r border-base-200 shadow-xl z-50 font-sans transition-all duration-300 ease-in-out",
        isActuallyExpanded ? "w-64" : "w-20"
      )}
    >
      <div className={cn(
        "p-6 flex flex-col bg-base-100/50 backdrop-blur-sm z-10 transition-all duration-300",
        isActuallyExpanded ? "items-start" : "items-center px-4"
      )}>
        <div className={cn(
          "flex flex-col gap-0.5 transition-all duration-300 origin-left",
          isActuallyExpanded ? "opacity-100 scale-100" : "opacity-0 scale-0 w-0 h-0 overflow-hidden"
        )}>
          <p className="text-2xl font-bold tracking-wider text-base-content uppercase whitespace-nowrap">{storeTop}</p>
          <p className="text-sm font-bold bg-gradient-to-r from-cyan-500 to-green-500 bg-clip-text text-transparent uppercase whitespace-nowrap">
            {storeBottom}
          </p>
        </div>
        {!isActuallyExpanded && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-green-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
            {storeTop[0]}
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {links.map((link) => {
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <div
                className={cn(
                  "relative flex items-center rounded-xl cursor-pointer transition-all duration-300 group overflow-hidden",
                  isActuallyExpanded ? "px-4 py-3.5" : "p-3.5 justify-center",
                  isActive 
                    ? "bg-gradient-to-r from-cyan-500 to-green-500 text-white shadow-lg shadow-cyan-500/20" 
                    : "text-base-content/70 hover:bg-base-200 hover:text-base-content",
                  isActive && isActuallyExpanded && "scale-[1.02]",
                  !isActive && isActuallyExpanded && "hover:pl-5"
                )}
                title={!isActuallyExpanded ? link.label : undefined}
              >
                <link.icon className={cn(
                  "w-5 h-5 transition-all duration-300 shrink-0", 
                  isActuallyExpanded && "mr-3",
                  isActive ? "animate-pulse" : "group-hover:scale-110"
                )} />
                <span className={cn(
                  "font-medium tracking-wide transition-all duration-300 whitespace-nowrap origin-left",
                  isActuallyExpanded ? "opacity-100 scale-100" : "opacity-0 scale-0 w-0 overflow-hidden"
                )}>
                  {link.label}
                </span>
                {isActive && isActuallyExpanded && (
                  <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/50 animate-ping" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className={cn("p-4 border-t border-base-200 bg-base-100 transition-all duration-300", !isActuallyExpanded && "px-3")}>
        <button
          onClick={() => logout()}
          className={cn(
            "flex items-center w-full text-error hover:bg-error/10 rounded-xl transition-all duration-300 group hover:shadow-sm",
            isActuallyExpanded ? "px-4 py-3.5" : "p-3.5 justify-center"
          )}
          title={!isActuallyExpanded ? "Keluar" : undefined}
        >
          <LogOut className={cn(
            "w-5 h-5 shrink-0 transition-transform duration-300",
            isActuallyExpanded ? "mr-3 group-hover:-translate-x-1" : "group-hover:scale-110"
          )} />
          <span className={cn(
            "font-medium transition-all duration-300 whitespace-nowrap origin-left",
            isActuallyExpanded ? "opacity-100 scale-100" : "opacity-0 scale-0 w-0 overflow-hidden"
          )}>
            Keluar
          </span>
        </button>
      </div>
    </aside>
  );
}
