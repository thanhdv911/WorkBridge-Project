import React from 'react';
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
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/shared/ErrorBoundary';
import './index.css';

function App() {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/auth'].includes(location.pathname);
  const appShellRoutes = ['/messages', '/employer-dashboard', '/admin-dashboard'];
  const hideFooter = isAuthPage || appShellRoutes.includes(location.pathname);

  return (
    <>
      <Toaster position="top-right" />
      {!isAuthPage && <Header />}
      <main className={location.pathname === '/messages' ? 'overflow-hidden' : undefined}>
        <ErrorBoundary resetKey={location.pathname}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/jobs" element={<FindJobs />} />
            <Route path="/profile" element={<Profile />} />
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
