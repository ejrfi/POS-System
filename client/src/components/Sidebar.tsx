import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Settings, 
  LogOut, 
  History
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";

  const links = [
    ...(isAdmin ? [{ href: "/", icon: LayoutDashboard, label: "Dashboard" }] : []),
    { href: "/pos", icon: ShoppingCart, label: "Point of Sale" },
    { href: "/transactions", icon: History, label: "Transactions" },
    ...(isAdmin ? [
      { href: "/inventory", icon: Package, label: "Inventory" },
      { href: "/customers", icon: Users, label: "Customers" },
      { href: "/settings", icon: Settings, label: "Settings" },
    ] : []),
  ];

  return (
    <div className="h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 border-r border-slate-800 shadow-2xl z-50">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Nexus POS
        </h1>
        <p className="text-xs text-slate-400 mt-1">v1.0.0 • {user?.username}</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {links.map((link) => {
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <div
                className={cn(
                  "flex items-center px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <link.icon className={cn("w-5 h-5 mr-3", isActive ? "animate-pulse" : "group-hover:scale-110 transition-transform")} />
                <span className="font-medium">{link.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => logout()}
          className="flex items-center w-full px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
