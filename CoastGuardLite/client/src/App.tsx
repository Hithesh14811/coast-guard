import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import FishermanSetup from "@/pages/fisherman-setup";
import FishermanApp from "@/pages/fisherman-app";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function AuthenticatedRouter() {
  const { user, isLoading, isAuthenticated, isFisherman, isCoastGuard, hasFishermanProfile } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-ocean mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  // Coast Guard users go directly to dashboard
  if (isCoastGuard) {
    return (
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Fisherman users with profile go to fisherman app
  if (isFisherman && hasFishermanProfile) {
    return (
      <Switch>
        <Route path="/" component={FishermanApp} />
        <Route path="/fisherman" component={FishermanApp} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Fisherman users without profile need to complete setup
  if (isFisherman && !hasFishermanProfile) {
    return (
      <Switch>
        <Route path="/" component={FishermanSetup} />
        <Route path="/setup" component={FishermanSetup} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Fallback
  return <NotFound />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthenticatedRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
