import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Home } from '@/pages/Home';
import { TasimaKosullari } from '@/pages/TasimaKosullari';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { TermsOfService } from '@/pages/TermsOfService';
import { AsistanPage } from '@/pages/AsistanPage';
import { TaskDetailPage } from '@/pages/TaskDetailPage';
import { PartnerDashboard } from '@/pages/PartnerDashboard';
import { AdminPanel } from '@/pages/AdminPanel';
import { StoreFront } from '@/pages/StoreFront';
import { CategoryPage } from '@/pages/CategoryPage';
import { SeninDukkaninPage } from '@/pages/SeninDukkaninPage';
import { Toaster } from '@/components/ui/toaster';
import { ScrollRestoration } from '@/components/ScrollRestoration';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

const queryClient = new QueryClient();

function RealtimeEngineBridge({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  useRealtimeSync(user?.id);
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-transparent text-foreground">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground">Sayfa bulunamadı.</p>
        <a href="/" className="mt-8 inline-block px-6 py-2 border border-white/10 rounded-full hover:bg-white/5 transition-colors">
          Ana Sayfaya Dön
        </a>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tasima-kosullari" component={TasimaKosullari} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/asistan" component={AsistanPage} />
      <Route path="/assistant/task/:id" component={TaskDetailPage} />
      <Route path="/asistan/task/:id" component={TaskDetailPage} />
      <Route path="/partner" component={PartnerDashboard} />
      <Route path="/partner/dashboard" component={PartnerDashboard} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/senin-dukkanin" component={SeninDukkaninPage} />
      <Route path="/kategori/:slug" component={CategoryPage} />
      <Route path="/:slug" component={StoreFront} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeEngineBridge>
          <WouterRouter base={(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}>
            <ScrollRestoration />
            <Router />
          </WouterRouter>
          <Toaster />
        </RealtimeEngineBridge>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
