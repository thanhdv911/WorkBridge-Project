import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/shared/ErrorBoundary';
import AiChatWidget from './components/shared/AiChatWidget';
import VipPromoBanner from './components/shared/VipPromoBanner';
import api from './services/api';
import { getVisitorId } from './utils/presence';
import './index.css';

function PresenceHeartbeat() {
  useEffect(() => {
    let cancelled = false;
    const visitorId = getVisitorId();

    const sendHeartbeat = async () => {
      try {
        await api.post('/home/presence', { visitorId });
      } catch {
        // Presence is decorative; never interrupt the app if it fails.
      }
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 25000);

    const handleVisibilityChange = () => {
      if (!cancelled && document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}

function App() {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/auth', '/reset-password'].includes(location.pathname);
  const appShellRoutes = ['/messages', '/employer-dashboard', '/admin-dashboard'];
  const hideHeader = isAuthPage;
  const hideFooter = isAuthPage || appShellRoutes.includes(location.pathname);
  const hideAiWidget = isAuthPage || location.pathname === '/messages';
  const hideVipPromo = isAuthPage || location.pathname === '/admin-dashboard';

  return (
    <>
      <Toaster position="top-right" />
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
