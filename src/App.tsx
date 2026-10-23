import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ProfileSetup from './pages/ProfileSetup';
import DeadlineView from './pages/DeadlineView';
import Search from './pages/Search';
import NotFound from './pages/NotFound';
import { Layout } from './components/Layout';
import { requestNotificationPermission } from './lib/webpush';
import { notificationsApi } from './lib/api';
import { supabase } from './integrations/supabase/client';

const queryClient = new QueryClient();

const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/push-sw.js');
    } catch (err) {
      console.error('Service Worker registration failed:', err);
    }
  }
};

// Request Web Push permission and register the subscription endpoint with the backend
const initPush = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // only for logged-in users

  try {
    const token = await requestNotificationPermission();
    if (token) await notificationsApi.registerToken(token);
  } catch {
    // Push is best-effort — non-fatal
  }
};

const App = () => {
  useEffect(() => {
    registerServiceWorker();
    // Defer push init slightly so auth state is ready
    const t = setTimeout(initPush, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/"              element={<Index />} />
              <Route path="/auth"          element={<Auth />} />
              <Route path="/dashboard"     element={<Dashboard />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/deadlines"     element={<DeadlineView />} />
              <Route path="/search"        element={<Search />} />
              <Route path="*"              element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
