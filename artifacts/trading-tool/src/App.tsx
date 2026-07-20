import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Layout } from '@/components/layout';
import { Dashboard } from '@/pages/dashboard';
import { Watchlist } from '@/pages/watchlist';
import { Chart } from '@/pages/chart';
import { Options } from '@/pages/options';
import { Portfolio } from '@/pages/portfolio';
import { Journal } from '@/pages/journal';
import { Scanner } from '@/pages/scanner';
import { Alerts } from '@/pages/alerts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/watchlist" component={Watchlist} />
        <Route path="/chart" component={Chart} />
        <Route path="/options" component={Options} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/journal" component={Journal} />
        <Route path="/scanner" component={Scanner} />
        <Route path="/alerts" component={Alerts} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
