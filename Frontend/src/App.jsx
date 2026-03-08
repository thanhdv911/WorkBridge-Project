import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Auth from './pages/Auth';
import FindJobs from './pages/FindJobs';
import Profile from './pages/Profile';
import './index.css';

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <>
      <Toaster position="top-right" />
      {!isAuthPage && <Header />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<FindJobs />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}
    </>
  );
}

export default App;
