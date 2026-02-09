import { Switch, Route, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";
import Login from "@/pages/Login";
import POS from "@/pages/POS";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Transactions from "@/pages/Transactions";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

function PrivateRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

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
      <Sidebar />
      <main className="flex-1 ml-64 overflow-hidden">
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
      
      {/* Admin Routes */}
      <Route path="/">
        <PrivateRoute component={Dashboard} adminOnly />
      </Route>
      <Route path="/inventory">
        <PrivateRoute component={Inventory} adminOnly />
      </Route>
      <Route path="/customers">
        {/* Placeholder for now, reusing Inventory layout concept */}
        <PrivateRoute component={Inventory} adminOnly />
      </Route>
      <Route path="/settings">
        <PrivateRoute component={Dashboard} adminOnly />
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
