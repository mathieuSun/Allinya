import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { BuildVersionIndicator } from "@/components/BuildVersionIndicator";
import AuthPage from "@/pages/auth";
import OnboardingPage from "@/pages/onboarding";
import ProfilePage from "@/pages/profile";
import ExplorePage from "@/pages/explore";
import PractitionerProfilePage from "@/pages/practitioner-profile";
import SessionPage from "@/pages/session";
import PractitionerDashboard from "@/pages/practitioner-dashboard";
import NotFound from "@/pages/not-found";
import DevInspector from "@/pages/dev-inspector";
import TestVideo from "@/test-video";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/explore" component={ExplorePage} />
      <Route path="/dashboard" component={PractitionerDashboard} />
      <Route path="/p/:id" component={PractitionerProfilePage} />
      <Route path="/s/:id" component={SessionPage} />
      <Route path="/dev/inspector" component={DevInspector} />
      <Route path="/test-video" component={TestVideo} />
      <Route path="/" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>
        <AuthProvider>
          <Toaster />
          <Router />
          {/* Build version indicator for iOS cache management */}
          <BuildVersionIndicator />
          {/* React Query DevTools for debugging */}
          <ReactQueryDevtools initialIsOpen={false} />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
