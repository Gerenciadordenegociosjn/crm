import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Shell } from '@/components/layout/Shell';

// Pages
import LoginPage from '@/pages/login';
import PipelinePage from '@/pages/pipeline';
import DealDetailPage from '@/pages/deals/[id]';
import ClientsPage from '@/pages/clients';
import ClientDetailPage from '@/pages/clients/[id]';
import AdAccountsPage from '@/pages/ad-accounts';
import ReportsPage from '@/pages/reports';
import UsersPage from '@/pages/admin/users';

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><div className="animate-pulse flex flex-col items-center"><div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" /><p className="text-muted-foreground font-medium">Carregando...</p></div></div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <NotFound />;
  }

  return (
    <Shell>
      <Component />
    </Shell>
  );
}

function Router() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={() => <ProtectedRoute component={PipelinePage} />} />
      <Route path="/deals/:id" component={() => <ProtectedRoute component={DealDetailPage} />} />
      <Route path="/clients" component={() => <ProtectedRoute component={ClientsPage} />} />
      <Route path="/clients/:id" component={() => <ProtectedRoute component={ClientDetailPage} />} />
      <Route path="/ad-accounts" component={() => <ProtectedRoute component={AdAccountsPage} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={ReportsPage} />} />
      <Route path="/admin/users" component={() => <ProtectedRoute component={UsersPage} adminOnly />} />
      <Route component={user ? () => <ProtectedRoute component={NotFound} /> : LoginPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
