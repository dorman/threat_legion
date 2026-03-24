import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Pricing from "@/pages/pricing";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import SecurityNotice from "@/pages/security";
import ScanProgress from "@/pages/scan-progress";
import ScanResults from "@/pages/scan-results";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/security" component={SecurityNotice} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/scans/:id/progress" component={ScanProgress} />
      <Route path="/scans/:id" component={ScanResults} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
