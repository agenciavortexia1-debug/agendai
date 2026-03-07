import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import PublicBooking from './pages/PublicBooking';
import BusinessSettings from './pages/BusinessSettings';
import BusinessHours from './pages/BusinessHours';
import Personalization from './pages/Personalization';
import Services from './pages/Services';
import Staff from './pages/Staff';
import ClientPortal from './pages/ClientPortal';
import CheckoutPage from './pages/CheckoutPage';
import ResetPassword from './pages/ResetPassword';
import Analytics from './pages/Analytics';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching session:', err);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      supabase
        .from('businesses')
        .select('bg_color, text_color, font_family')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            document.documentElement.style.setProperty('--bg-color', data.bg_color || '#f5f5f0');
            document.documentElement.style.setProperty('--text-color', data.text_color || '#141414');
            document.body.className = data.font_family || 'font-sans';
          }
        });
    } else {
      document.documentElement.style.setProperty('--bg-color', '#f5f5f0');
      document.documentElement.style.setProperty('--text-color', '#141414');
      document.body.className = 'font-sans';
    }
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={!session ? <AuthPage /> : <Navigate to="/dashboard" />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
          element={session ? <Dashboard session={session} /> : <Navigate to="/auth" />}
        />
        <Route
          path="/dashboard/analytics"
          element={session ? <Analytics session={session} /> : <Navigate to="/auth" />}
        />
        <Route
          path="/dashboard/settings"
          element={session ? <BusinessSettings session={session} /> : <Navigate to="/auth" />}
        />
        <Route
          path="/dashboard/hours"
          element={session ? <BusinessHours session={session} /> : <Navigate to="/auth" />}
        />
        <Route
          path="/dashboard/personalization"
          element={session ? <Personalization session={session} /> : <Navigate to="/auth" />}
        />
        <Route
          path="/dashboard/services"
          element={session ? <Services session={session} /> : <Navigate to="/auth" />}
        />
        <Route
          path="/dashboard/staff"
          element={session ? <Staff session={session} /> : <Navigate to="/auth" />}
        />

        {/* Public Booking Route */}
        <Route path="/b/:slug" element={<PublicBooking />} />

        {/* Checkout Route - redireciona ao Stripe */}
        <Route path="/checkout" element={<CheckoutPage />} />

        {/* Client Portal Route */}
        <Route path="/meus-agendamentos" element={<ClientPortal />} />

        {/* Reset Password Route */}
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
