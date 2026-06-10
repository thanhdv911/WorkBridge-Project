import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Auth from './pages/Auth';
import FindJobs from './pages/FindJobs';
import Profile from './pages/Profile';
import EmployerDashboard from './pages/EmployerDashboard';
import JobDetails from './pages/JobDetails';
import MyApplications from './pages/MyApplications';
import SavedJobs from './pages/SavedJobs';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import Offers from './pages/Offers';
import MyWork from './pages/MyWork';
import Interviews from './pages/Interviews';
import Payslips from './pages/Payslips';
import AdminDashboard from './pages/AdminDashboard';
import ResetPassword from './pages/ResetPassword';
import Maintenance from './pages/Maintenance';
import About from './pages/About';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/shared/ErrorBoundary';
import AiChatWidget from './components/shared/AiChatWidget';
import VipPromoBanner from './components/shared/VipPromoBanner';
import api from './services/api';
import { presenceRealtimeService } from './services/presenceRealtimeService';
import { getVisitorId, PRESENCE_REFRESH_MS } from './utils/presence';
import './index.css';

function PresenceHeartbeat() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/') return undefined;

    let cancelled = false;
    const visitorId = getVisitorId();

    const sendHeartbeat = async () => {
      try {
        await api.post('/home/presence', { visitorId, pageSize: 5 });
      } catch {
        // Presence is decorative; never interrupt the app if it fails.
      }
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, PRESENCE_REFRESH_MS);

    const handleVisibilityChange = () => {
      if (!cancelled && document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', sendHeartbeat);
    window.addEventListener('online', sendHeartbeat);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', sendHeartbeat);
      window.removeEventListener('online', sendHeartbeat);
    };
  }, [location.pathname]);

  return null;
}

function PresenceRealtime() {
  const location = useLocation();
  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    presenceRealtimeService.start();
  }, [location.pathname, token]);

  return null;
}

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return null;
}

function MaintenanceGate() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const checkMaintenance = async () => {
      try {
        const res = await api.get('/platform/maintenance');
        const maintenance = res.data;
        const isAdmin = localStorage.getItem('role') === 'Admin';

        if (maintenance?.isActive) {
          sessionStorage.setItem('workbridge_maintenance', JSON.stringify(maintenance));
          if (!isAdmin && location.pathname !== '/maintenance') {
            navigate('/maintenance', { replace: true });
          }
          return;
        }

        sessionStorage.removeItem('workbridge_maintenance');
        if (!cancelled && location.pathname === '/maintenance') {
          navigate('/', { replace: true });
        }
      } catch {
        // API failures are handled by the page-level requests and the 503 interceptor.
      }
    };

    checkMaintenance();
    const interval = window.setInterval(checkMaintenance, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [location.pathname, navigate]);

  return null;
}

function App() {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/auth', '/reset-password'].includes(location.pathname);
  const isSystemPage = location.pathname === '/maintenance';
  const appShellRoutes = ['/messages', '/employer-dashboard', '/admin-dashboard'];
  const hideHeader = isAuthPage || isSystemPage;
  const hideFooter = isAuthPage || isSystemPage || appShellRoutes.includes(location.pathname);
  const hideAiWidget = isAuthPage || isSystemPage || location.pathname === '/messages';
  const hideVipPromo = isAuthPage || isSystemPage || location.pathname === '/admin-dashboard';

  return (
    <>
      <Toaster position="top-right" />
      <MaintenanceGate />
      <ScrollToTop />
      <PresenceRealtime />
      <PresenceHeartbeat />
      {!hideHeader && <Header />}
      {!hideAiWidget && <AiChatWidget />}
      <VipPromoBanner disabled={hideVipPromo} />
      <main className={location.pathname === '/messages' ? 'overflow-hidden' : undefined}>
        <ErrorBoundary resetKey={location.pathname}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/jobs" element={<FindJobs />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/employer-dashboard" element={<EmployerDashboard />} />
            <Route path="/my-applications" element={<MyApplications />} />
            <Route path="/saved-jobs" element={<SavedJobs />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/my-work" element={<MyWork />} />
            <Route path="/interviews" element={<Interviews />} />
            <Route path="/payslips" element={<Payslips />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/jobs/:id" element={<JobDetails />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth" element={<Navigate to="/login" replace />} />
            <Route path="/post-job" element={<Navigate to="/employer-dashboard" replace />} />
            <Route path="/dashboard" element={<Navigate to="/employer-dashboard" replace />} />
            <Route path="/review-applicants" element={<Navigate to="/employer-dashboard" replace />} />
            <Route path="/my-shifts" element={<Navigate to="/my-work" replace />} />
            <Route path="/my-salary" element={<Navigate to="/payslips" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
      {!hideFooter && <Footer />}
    </>
  );
}

export default App;
