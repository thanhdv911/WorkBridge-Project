import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isMessagesPage = location.pathname === '/messages';

  return (
    <>
      <Toaster position="top-right" />
      {!isAuthPage && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<FindJobs />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/employer-dashboard" element={<EmployerDashboard />} />
          <Route path="/my-applications" element={<MyApplications />} />
          <Route path="/saved-jobs" element={<SavedJobs />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
        </Routes>
      </main>
      {!isAuthPage && !isMessagesPage && <Footer />}
    </>
  );
}

export default App;
