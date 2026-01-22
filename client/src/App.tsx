import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import ManagerDashboard from "@/pages/ManagerDashboard";
import DriverDashboard from "@/pages/DriverDashboard";
import PoliceDashboard from "@/pages/PoliceDashboard";
import HospitalDashboard from "@/pages/HospitalDashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login/:type" component={Login} />
      <Route path="/manager/dashboard" component={ManagerDashboard} />
      <Route path="/vehicle/dashboard" component={DriverDashboard} />
      <Route path="/police/dashboard" component={PoliceDashboard} />
      <Route path="/hospital/dashboard" component={HospitalDashboard} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
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
