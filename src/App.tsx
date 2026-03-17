import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import Services from './pages/Services';
import Staff from './pages/Staff';
import ClientPortal from './pages/ClientPortal';
import CheckoutPage from './pages/CheckoutPage';
import ResetPassword from './pages/ResetPassword';
import Analytics from './pages/Analytics';
import Management from './pages/Management';
import StaffLogin from './pages/StaffLogin';
import WhatsAppConfig from './pages/WhatsAppConfig';
import PaymentConfig from './pages/PaymentConfig';

// Componente interno para ter acesso ao useNavigate dentro do BrowserRouter
function AppRoutes() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [staffSession, setStaffSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const localStaff = localStorage.getItem('staff_session');
    if (localStaff) {
      try {
        setStaffSession(JSON.parse(localStaff));
      } catch (e) {
        console.error('Error parsing staff session', e);
      }
    }
    supabase.auth.getSession()
      .then((res) => {
        const session = res.data?.session;
        setSession(session);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching session:', err);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Usar navigate() em vez de window.location.href para NÃO destruir a sessão de recuperação
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session) {
      supabase
        .from('businesses')
        .select('primary_color, bg_color, text_color, font_family')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            document.documentElement.style.setProperty('--primary-color', data.primary_color || '#18181b');
            document.documentElement.style.setProperty('--bg-color', data.bg_color || '#f5f5f0');
            document.documentElement.style.setProperty('--text-color', data.text_color || '#141414');
            document.body.className = data.font_family || 'font-sans';
          }
        });
    } else {
      document.documentElement.style.setProperty('--primary-color', '#18181b');
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
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={!session ? <AuthPage /> : <Navigate to="/dashboard" />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
          element={(session || staffSession) ? <Dashboard session={session} staffSession={staffSession} /> : <Navigate to="/auth" />}
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
          path="/dashboard/services"
          element={session ? <Services session={session} /> : <Navigate to="/auth" />}
        />
        <Route
          path="/dashboard/staff"
          element={session ? <Staff session={session} /> : <Navigate to="/auth" />}
        />

        {/* Public Booking Route */}
        <Route path="/b/:slug" element={<PublicBooking />} />

        {/* Staff Login */}
        <Route path="/staff/login" element={<StaffLogin />} />

        {/* Management */}
        <Route
          path="/dashboard/management"
          element={session ? <Management session={session} /> : <Navigate to="/auth" />}
        />

        {/* Checkout Route - redireciona ao Stripe */}
        <Route path="/checkout" element={<CheckoutPage />} />

        {/* Client Portal Route */}
        <Route path="/meus-agendamentos" element={<ClientPortal />} />

        {/* Reset Password Route */}
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* WhatsApp Config Route */}
        <Route
          path="/dashboard/whatsapp"
          element={session ? <WhatsAppConfig session={session} /> : <Navigate to="/auth" />}
        />

        {/* Payment Config Route */}
        <Route
          path="/dashboard/payment"
          element={session ? <PaymentConfig session={session} /> : <Navigate to="/auth" />}
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
