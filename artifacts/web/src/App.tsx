import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ChannelProvider } from "@/lib/channel";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import KeywordsPage from "@/pages/keywords";
import SeoPage from "@/pages/seo";
import ExperimentsPage from "@/pages/experiments";
import BulkPage from "@/pages/bulk";
import AnalyticsPage from "@/pages/analytics";
import CompetitorsPage from "@/pages/competitors";
import CommentsPage from "@/pages/comments";
import AiToolsPage from "@/pages/ai-tools";
import BillingPage from "@/pages/billing";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading, token } = useAuth();
  const [location] = useLocation();

  if (isLoading && token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading TubePulse...</p>
        </div>
      </div>
    );
  }

  if (!token || (!isLoading && !user)) {
    return <Redirect to="/login" />;
  }

  return (
    <ChannelProvider>
      <Component />
    </ChannelProvider>
  );
}

function PublicOnlyRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, token } = useAuth();
  if (token && user) return <Redirect to="/dashboard" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/login" component={() => <PublicOnlyRoute component={LoginPage} />} />
      <Route path="/register" component={() => <PublicOnlyRoute component={RegisterPage} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/keywords" component={() => <ProtectedRoute component={KeywordsPage} />} />
      <Route path="/seo" component={() => <ProtectedRoute component={SeoPage} />} />
      <Route path="/experiments" component={() => <ProtectedRoute component={ExperimentsPage} />} />
      <Route path="/bulk" component={() => <ProtectedRoute component={BulkPage} />} />
      <Route path="/analytics" component={() => <ProtectedRoute component={AnalyticsPage} />} />
      <Route path="/competitors" component={() => <ProtectedRoute component={CompetitorsPage} />} />
      <Route path="/comments" component={() => <ProtectedRoute component={CommentsPage} />} />
      <Route path="/ai" component={() => <ProtectedRoute component={AiToolsPage} />} />
      <Route path="/billing" component={() => <ProtectedRoute component={BillingPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
