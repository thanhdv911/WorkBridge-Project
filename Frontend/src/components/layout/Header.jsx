import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const token = localStorage.getItem('token');
  const isLoggedIn = !!token;
  const userRole = localStorage.getItem('role');

  useEffect(() => {
    if (isLoggedIn) {
      fetchUnreadCounts();
      const interval = setInterval(fetchUnreadCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const fetchUnreadCounts = async () => {
    fetchUnreadNotifications();
    fetchUnreadMessages();
  };

  const fetchUnreadNotifications = async () => {
    try {
      const res = await api.get('/notification/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const fetchUnreadMessages = async () => {
    try {
      const res = await api.get('/messages/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadMessages(res.data.count);
    } catch (err) {
      console.error('Error fetching unread messages:', err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <header className="glass sticky top-0 z-50 border-b border-slate-200/50">
      <div className="max-w-[1320px] mx-auto flex items-center px-6 lg:px-10 h-16">
        <div className="flex-1 flex items-center">
          <Link to="/" className="flex items-center gap-2.5 group">
            {/* Professional Suit & Tie Logo SVG */}
            <svg viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10 w-auto group-hover:scale-105 transition-transform duration-300">
              {/* Head - open circle */}
              <circle cx="32" cy="15" r="11" stroke="#1392EC" strokeWidth="4" fill="none"/>
              {/* Face arc inside head */}
              <path d="M26 18 Q32 22 38 18" stroke="#1392EC" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              {/* Left suit lapel */}
              <path d="M7 68 C7 68 12 46 32 44" stroke="#1392EC" strokeWidth="4" strokeLinecap="round" fill="none"/>
              {/* Right suit lapel */}
              <path d="M57 68 C57 68 52 46 32 44" stroke="#1392EC" strokeWidth="4" strokeLinecap="round" fill="none"/>
              {/* Left collar */}
              <path d="M32 44 L26 50" stroke="#1392EC" strokeWidth="3.5" strokeLinecap="round"/>
              {/* Right collar */}
              <path d="M32 44 L38 50" stroke="#1392EC" strokeWidth="3.5" strokeLinecap="round"/>
              {/* Tie knot */}
              <path d="M29 50 L32 48 L35 50 L32 70 Z" fill="#1A1A2E"/>
            </svg>
            <span className="text-2xl font-black tracking-tight flex items-center leading-none">
              <span className="text-slate-900">Work</span>
              <span className="text-[#1392EC]">Bridge</span>
            </span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className={`text-sm font-semibold transition-colors ${location.pathname === '/' ? 'text-primary relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded' : 'text-slate-500 hover:text-primary'}`}
          >
            Home
          </Link>
          <Link
            to="/jobs"
            className={`text-sm font-semibold transition-colors ${location.pathname === '/jobs' ? 'text-primary relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded' : 'text-slate-500 hover:text-primary'}`}
          >
            Find Jobs
          </Link>
          {userRole === 'Employer' && (
            <Link
              to="/employer-dashboard"
              className={`text-sm font-semibold transition-colors ${location.pathname === '/employer-dashboard' ? 'text-primary relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded' : 'text-slate-500 hover:text-primary'}`}
            >
              Dashboard
            </Link>
          )}
          {userRole === 'Admin' && (
            <Link
              to="/admin-dashboard"
              className={`text-sm font-semibold transition-colors ${location.pathname === '/admin-dashboard' ? 'text-primary relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded' : 'text-slate-500 hover:text-primary'}`}
            >
              Management
            </Link>
          )}
          {isLoggedIn && userRole !== 'Employer' && userRole !== 'Admin' && (
            <>
              <Link
                to="/my-applications"
                className={`text-sm font-semibold transition-colors ${location.pathname === '/my-applications' ? 'text-primary relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded' : 'text-slate-500 hover:text-primary'}`}
              >
                My Applications
              </Link>
              <Link
                to="/ai-matches"
                className={`flex items-center gap-1.5 text-sm font-black px-3 py-1  rounded-lg transition-all ${
                  location.pathname === '/ai-matches'
                    ? 'text-white bg-primary shadow-md shadow-primary/20'
                    : 'text-primary bg-primary/10 hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/20'
                }`}
              >
                🤖 AI Picks
              </Link>
              <Link
                to="/my-schedules"
                className={`text-sm font-semibold transition-colors ${location.pathname === '/my-schedules' ? 'text-primary relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded' : 'text-slate-500 hover:text-primary'}`}
              >
                Time Tracking
              </Link>
              <Link
                to="/swap-board"
                className={`text-sm font-semibold transition-colors ${location.pathname === '/swap-board' ? 'text-primary relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded' : 'text-slate-500 hover:text-primary'}`}
              >
                Swap Board
              </Link>
              <Link
                to="/resolution-center"
                className={`flex items-center gap-1 text-sm font-semibold transition-colors ${location.pathname === '/resolution-center' ? 'text-rose-500 relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-rose-500 after:rounded' : 'text-rose-400 hover:text-rose-500'}`}
              >
                <span className="material-symbols-outlined !text-[16px]">gavel</span>
                Disputes
              </Link>
              <Link
                to="/saved-jobs"
                className={`text-sm font-semibold transition-colors ${location.pathname === '/saved-jobs' ? 'text-primary relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded' : 'text-slate-500 hover:text-primary'}`}
              >
                Saved Jobs
              </Link>
              <Link
                to="/messages"
                className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${location.pathname === '/messages' ? 'text-primary' : 'text-slate-500 hover:text-primary'}`}
              >
                Messages
                {unreadMessages > 0 && (
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                )}
              </Link>
            </>
          )}
        </nav>
        <div className="flex-1 flex items-center justify-end gap-3">
          {isLoggedIn ? (
            <>
              <Link
                to="/messages"
                className="relative w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                title="Messages"
              >
                <span className="material-symbols-outlined text-slate-500 !text-xl">forum</span>
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-white font-bold flex items-center justify-center">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
              <Link
                to="/notifications"
                className="relative w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                title="Notifications"
              >
                <span className="material-symbols-outlined text-slate-500 !text-xl">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] text-white font-bold flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link to={userRole === 'Employer' ? "/employer-dashboard" : "/profile"} className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-bold shadow-md hover:shadow-lg transition-all" title="Profile">
                {userRole === 'Employer' ? 'EMP' : 'ME'}
              </Link>
              <button onClick={handleLogout} className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 transition-colors ml-2" title="Logout">
                <span className="material-symbols-outlined !text-xl">logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden sm:inline-flex items-center h-10 px-5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
                Login
              </Link>
              <Link to="/signup" className="inline-flex items-center h-10 px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                Sign Up Free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
