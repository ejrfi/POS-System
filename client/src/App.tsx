import { useState } from "react";
import { Switch, Route, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";
import Login from "@/pages/Login";
import POS from "@/pages/POS";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Transactions from "@/pages/Transactions";
import Returns from "@/pages/Returns";
import Reports from "@/pages/Reports";
import ShiftReports from "@/pages/ShiftReports";
import ShiftReportDetail from "@/pages/ShiftReportDetail";
import Customers from "@/pages/Customers";
import Discounts from "@/pages/Discounts";
import Loyalty from "@/pages/Loyalty";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import { Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDEBAR_HIDDEN_KEY = "pos_sidebar_hidden";

function getSidebarHiddenFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

function setSidebarHiddenToStorage(hidden: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_HIDDEN_KEY, hidden ? "1" : "0");
  } catch {
    return;
  }
}

function PrivateRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => getSidebarHiddenFromStorage());

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      setSidebarHiddenToStorage(next);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Redirect to="/pos" />; // Cashiers go to POS by default if they try to access admin pages
  }

  return (
    <div className="flex bg-slate-100 min-h-screen">
      <Sidebar isCollapsed={isSidebarCollapsed} />
      <main
        className={cn(
          "flex-1 overflow-hidden relative transition-all duration-300",
          isSidebarCollapsed ? "ml-20" : "ml-64",
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "fixed bottom-4 z-50 bg-white/80 backdrop-blur hover:bg-white transition-all duration-300",
            isSidebarCollapsed ? "left-6" : "left-[17rem]",
          )}
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
          title={isSidebarCollapsed ? "Buka sidebar" : "Tutup sidebar"}
        >
          {isSidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
        <Component />
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes */}
      <Route path="/pos">
        <PrivateRoute component={POS} />
      </Route>
      <Route path="/transactions">
        <PrivateRoute component={Transactions} />
      </Route>
      <Route path="/returns">
        <PrivateRoute component={Returns} />
      </Route>
      
      {/* Admin Routes */}
      <Route path="/">
        <PrivateRoute component={Dashboard} adminOnly />
      </Route>
      <Route path="/reports">
        <PrivateRoute component={Reports} adminOnly />
      </Route>
      <Route path="/reports/shifts/:id">
        <PrivateRoute component={ShiftReportDetail} adminOnly />
      </Route>
      <Route path="/reports/shifts">
        <PrivateRoute component={ShiftReports} adminOnly />
      </Route>
      <Route path="/inventory">
        <PrivateRoute component={Inventory} adminOnly />
      </Route>
      <Route path="/customers">
        <PrivateRoute component={Customers} adminOnly />
      </Route>
      <Route path="/discounts">
        <PrivateRoute component={Discounts} adminOnly />
      </Route>
      <Route path="/loyalty">
        <PrivateRoute component={Loyalty} adminOnly />
      </Route>
      <Route path="/settings">
        <PrivateRoute component={Settings} adminOnly />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
