import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import Payments from "@/pages/payments";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import About from "@/pages/about";

function Router() {
  return (
    <div className="min-h-screen bg-slate-50 safe-area-padding overflow-x-hidden">
      <Sidebar />
      <div className="flex flex-col min-h-screen lg:pl-64">
        <main className="flex-1 overflow-auto touch-manipulation">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/clients" component={Clients} />
            <Route path="/clients/:id" component={ClientDetail} />
            <Route path="/payments" component={Payments} />
            <Route path="/reports" component={Reports} />
            <Route path="/about" component={About} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
