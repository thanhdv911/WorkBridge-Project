import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../../services/signalrService';
import { translateCategory } from '../../utils/translate';
import WorkBridgeLogo from '../shared/WorkBridgeLogo';
import { useAuthModal } from '../../contexts/AuthModalContext';

const WORKSPACE_PATHS = ['/my-applications', '/saved-jobs', '/offers', '/interviews', '/my-work', '/payslips'];

const HEADER_CATEGORY_ICONS = {
  'food': 'restaurant',
  'beverage': 'local_cafe',
  'tutor': 'school',
  'delivery': 'local_shipping',
  'retail': 'storefront',
  'tech': 'code',
  'design': 'palette',
  'marketing': 'campaign',
  'admin': 'admin_panel_settings',
  'office': 'business_center',
  'creative': 'palette',
};

function getCategoryIcon(name) {
  if (!name) return 'work';
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(HEADER_CATEGORY_ICONS)) {
    if (lower.includes(key)) return val;
  }
  return 'work';
}

const NAV_LINK_BASE = 'text-sm font-semibold transition-colors';
const NAV_LINK_ACTIVE = 'text-primary relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded';

export default function Header() {
  const { openLogin, openSignup, user, logoutUser } = useAuthModal();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const token = localStorage.getItem('token');
  const isLoggedIn = !!user;
  const userRole = user?.role || localStorage.getItem('role');
  const [isVip, setIsVip] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl || '');
  }, [user, location.pathname]);

  useEffect(() => {
    if (isLoggedIn && (userRole === 'Employer' || userRole === 'Applicant')) {
      api.get('/subscriptions/status', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          setIsVip(res.data.isVip);
          localStorage.setItem('isVip', res.data.isVip ? 'true' : 'false');
        })
        .catch(err => console.error('Error fetching VIP status in header:', err));
    } else {
      localStorage.removeItem('isVip');
    }
  }, [isLoggedIn, userRole, token, location.pathname]);

  const [categories, setCategories] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const dropdownRef = useRef(null);
  const [showEmployerConfirm, setShowEmployerConfirm] = useState(false);

  // Mobile menu state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    api.get('/home/categories')
      .then(res => setCategories(res.data || []))
      .catch(err => console.error('Error fetching categories in header:', err));
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    const closeTimer = window.setTimeout(() => {
      setMobileOpen(false);
      setMobileWorkspaceOpen(false);
      setMobileCategoriesOpen(false);
    }, 0);

    return () => window.clearTimeout(closeTimer);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const fetchUnreadNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notification/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [token]);

  const fetchUnreadMessages = useCallback(async () => {
    try {
      const res = await api.get('/messages/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadMessages(res.data.count);
    } catch (err) {
      console.error('Error fetching unread messages:', err);
    }
  }, [token]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const initialFetchId = window.setTimeout(() => {
      fetchUnreadNotifications();
      fetchUnreadMessages();
    }, 0);

    // Real-time: server pushes exact count — no more polling
    const onNotifCount = (count) => setUnreadCount(count);
    const onMsgUpdated = () => fetchUnreadMessages();
    const onReceiveNotif = (notif) => {
      if (!notif) return;
      setRecentNotifs(prev => {
        const list = prev || [];
        const targetId = notif.notificationId || notif.NotificationId;
        if (list.some(n => n && (n.notificationId || n.NotificationId) === targetId)) return list;
        return [notif, ...list].slice(0, 5);
      });

      // Show high-fidelity real-time toast notification
      const title = notif.title || notif.Title || 'Thông báo mới';
      const msg = notif.message || notif.Message || '';
      toast(
        <div className="flex flex-col gap-1 text-left">
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
          <span className="text-xs text-slate-500 line-clamp-2">{msg}</span>
        </div>,
        {
          icon: '🔔',
          duration: 6000,
          style: {
            borderRadius: '16px',
            background: '#ffffff',
            color: '#1e293b',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            padding: '12px 16px',
          }
        }
      );
    };

    signalRService.on('NotificationCountChanged', onNotifCount);
    signalRService.on('ReceiveNotification', onReceiveNotif);
    signalRService.on('ConversationUpdated', onMsgUpdated);
    signalRService.on('ReceiveMessage', onMsgUpdated);
    signalRService.start(); // idempotent

    return () => {
      window.clearTimeout(initialFetchId);
      signalRService.off('NotificationCountChanged', onNotifCount);
      signalRService.off('ReceiveNotification', onReceiveNotif);
      signalRService.off('ConversationUpdated', onMsgUpdated);
      signalRService.off('ReceiveMessage', onMsgUpdated);
    };
  }, [isLoggedIn, fetchUnreadMessages, fetchUnreadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleNotifDropdown = async () => {
    setShowNotifDropdown(!showNotifDropdown);
    if (!showNotifDropdown) {
      setLoadingNotifs(true);
      try {
        const res = await api.get('/notification', { headers: { Authorization: `Bearer ${token}` } });
        setRecentNotifs(res.data.slice(0, 5));
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
      setLoadingNotifs(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notification/read-all', {}, { headers: { Authorization: `Bearer ${token}` } });
      setUnreadCount(0);
      setRecentNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const handleNotifClick = async (n) => {
    if (!n.isRead) {
      try {
        await api.patch(`/notification/${n.notificationId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setRecentNotifs(prev => prev.map(item => item.notificationId === n.notificationId ? { ...item, isRead: true } : item));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }
    setShowNotifDropdown(false);

    const titleLower = n.title.toLowerCase();
    const msgLower = n.message.toLowerCase();

    if (userRole === 'Employer') {
      if (titleLower.includes('application') || msgLower.includes('application')) {
        navigate('/employer-dashboard?tab=review-applicants');
      } else if (titleLower.includes('offer') || msgLower.includes('offer')) {
        navigate('/employer-dashboard?tab=offers');
      } else if (titleLower.includes('interview') || msgLower.includes('interview')) {
        navigate('/employer-dashboard?tab=interviews');
      } else if (titleLower.includes('rate') || titleLower.includes('position') || titleLower.includes('employment') || titleLower.includes('workforce')) {
        navigate('/employer-dashboard?tab=employees');
      } else if (titleLower.includes('shift') || msgLower.includes('shift')) {
        navigate('/employer-dashboard?tab=shifts');
      } else if (titleLower.includes('payroll') || msgLower.includes('payroll')) {
        navigate('/employer-dashboard?tab=payroll');
      } else {
        navigate('/employer-dashboard');
      }
    } else {
      // Applicant
      if (titleLower.includes('application') || msgLower.includes('application')) {
        navigate('/my-applications');
      } else if (titleLower.includes('offer') || msgLower.includes('offer')) {
        navigate('/offers');
      } else if (titleLower.includes('interview') || msgLower.includes('interview')) {
        navigate('/interviews');
      } else if (titleLower.includes('rate') || titleLower.includes('position') || titleLower.includes('employment') || titleLower.includes('workforce') || titleLower.includes('shift') || msgLower.includes('shift')) {
        navigate('/my-work');
      } else if (titleLower.includes('payroll') || titleLower.includes('payslip') || msgLower.includes('payslip')) {
        navigate('/payslips');
      } else {
        navigate('/profile');
      }
    }
  };

  const handleDeleteNotif = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notification/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setRecentNotifs(prev => prev.filter(n => n.notificationId !== id));
      fetchUnreadNotifications();
      toast.success('Đã xóa thông báo');
    } catch (err) {
      console.error(err);
      toast.error('Không thể xóa thông báo');
    }
  };

  const handleLogout = () => {
    signalRService.stop(); // cleanly disconnect on logout
    localStorage.clear();
    logoutUser();
    toast.success('Đã đăng xuất thành công');
    navigate('/login');
  };

  const handleEmployerCtaClick = (e) => {
    if (isLoggedIn && userRole !== 'Employer') {
      e.preventDefault();
      setShowEmployerConfirm(true);
    }
  };

  const handleConfirmEmployerSwitch = () => {
    setShowEmployerConfirm(false);
    signalRService.stop();
    localStorage.clear();
    navigate('/signup?role=Employer');
    window.location.reload();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header className="glass sticky top-0 z-50 border-b border-slate-200/50">
        <div className="w-full mx-auto flex items-center justify-between gap-3 px-4 sm:px-4 sm:px-6 lg:px-8 h-20">
          {/* Logo */}
          <div className="flex items-center min-w-0">
            <Link to="/" className="flex items-center group" aria-label="WorkBridge">
              <WorkBridgeLogo imageClassName="h-14 w-auto max-w-[232px] drop-shadow-[0_8px_18px_rgba(37,99,235,0.18)] transition-transform duration-200 group-hover:scale-[1.02]" />
            </Link>
          </div>

          {/* ── Desktop Nav ── */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            <Link
              to="/"
              className={`${NAV_LINK_BASE} ${isActive('/') ? NAV_LINK_ACTIVE : 'text-slate-500 hover:text-primary'}`}
            >
              Trang chủ
            </Link>

            {/* Categories Dropdown */}
            <div className="relative group py-5">
              <button
                className={`${NAV_LINK_BASE} flex items-center gap-1.5 text-slate-500 hover:text-primary`}
              >
                Danh mục
                <span className="material-symbols-outlined !text-[16px] group-hover:rotate-180 transition-transform duration-200">
                  keyboard_arrow_down
                </span>
              </button>

              <div className="absolute top-[calc(100%-8px)] left-0 w-[220px] bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-sky-900/10 border border-sky-100/80 p-3 opacity-0 pointer-events-none translate-y-2 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 transition-all duration-300 z-50 origin-top">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2.5 mb-1.5 block">
                    Danh mục việc làm
                  </span>
                  {categories.length > 0 ? (
                    categories.map(cat => {
                      const icon = getCategoryIcon(cat.name);
                      return (
                        <Link
                          key={cat.categoryId}
                          to={`/jobs?categoryId=${cat.categoryId}`}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-sky-50/80 hover:text-primary transition-all"
                        >
                          <span className="material-symbols-outlined !text-[16px] text-slate-400">{icon}</span>
                          {translateCategory(cat.name)}
                        </Link>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400 px-3 py-2">Đang tải...</span>
                  )}
                </div>
              </div>
            </div>

            <Link
              to="/jobs"
              className={`${NAV_LINK_BASE} ${isActive('/jobs') ? NAV_LINK_ACTIVE : 'text-slate-500 hover:text-primary'}`}
            >
              Tìm việc
            </Link>
            {userRole === 'Employer' && (
              <>
                <Link
                  to="/employer-dashboard"
                  className={`${NAV_LINK_BASE} ${isActive('/employer-dashboard') ? NAV_LINK_ACTIVE : 'text-slate-500 hover:text-primary'}`}
                >
                  Quản lý tuyển dụng
                </Link>
                {isVip ? (
                  <Link
                    to="/employer-dashboard?tab=vip"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-amber-500 bg-amber-500/10 border border-amber-500/35 transition-all shadow-sm shadow-amber-100/30 ml-1 hover:bg-amber-500/20"
                  >
                    <span className="material-symbols-outlined !text-sm text-amber-500">workspace_premium</span>
                    Doanh nghiệp VIP
                  </Link>
                ) : (
                  <Link
                    to="/employer-dashboard?tab=vip"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-amber-600 bg-amber-50 border border-amber-200/50 hover:bg-amber-100 transition-all shadow-sm shadow-amber-100/50 ml-1"
                  >
                    <span className="material-symbols-outlined !text-sm text-amber-500 animate-pulse">workspace_premium</span>
                    Nâng cấp VIP
                  </Link>
                )}
              </>
            )}
            {userRole === 'Applicant' && (
              <Link
                to="/profile?tab=vip"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-sm ml-1 ${
                  isVip
                    ? 'text-[#1687d9] bg-blue-50 border border-blue-200'
                    : 'text-blue-700 bg-blue-50 border border-blue-200/70 hover:bg-blue-100'
                }`}
              >
                <span className="material-symbols-outlined !text-sm">{isVip ? 'workspace_premium' : 'lock'}</span>
                {isVip ? 'Cá nhân VIP' : 'Nâng cấp VIP'}
              </Link>
            )}
            {userRole === 'Admin' && (
              <Link
                to="/admin-dashboard"
                className={`${NAV_LINK_BASE} ${isActive('/admin-dashboard') ? NAV_LINK_ACTIVE : 'text-slate-500 hover:text-primary'}`}
              >
                Quản trị hệ thống
              </Link>
            )}
            {isLoggedIn && userRole !== 'Employer' && userRole !== 'Admin' && (
              <div className="relative group py-5">
                <button
                  className={`${NAV_LINK_BASE} flex items-center gap-1.5 ${
                    WORKSPACE_PATHS.includes(location.pathname)
                      ? 'text-primary'
                      : 'text-slate-500 hover:text-primary'
                  }`}
                >
                  Không gian làm việc
                  <span className="material-symbols-outlined !text-[16px] group-hover:rotate-180 transition-transform duration-200">
                    keyboard_arrow_down
                  </span>
                </button>

                {/* Workspace Dropdown */}
                <div className="absolute top-[calc(100%-8px)] left-1/2 -translate-x-1/2 w-[340px] bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-sky-900/10 border border-sky-100/80 p-4 opacity-0 pointer-events-none translate-y-2 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 transition-all duration-300 z-50 origin-top">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Job Hunting */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2.5 mb-1 block">
                        Tìm việc
                      </span>
                      {[
                        { to: '/my-applications', icon: 'assignment', label: 'Đơn ứng tuyển' },
                        { to: '/saved-jobs', icon: 'bookmark', label: 'Việc đã lưu' },
                        { to: '/offers', icon: 'local_offer', label: 'Lời mời nhận việc' },
                        { to: '/interviews', icon: 'event_available', label: 'Phỏng vấn' },
                      ].map(item => (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            isActive(item.to)
                              ? 'bg-primary/10 text-primary'
                              : 'text-slate-600 hover:bg-sky-50/80 hover:text-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined !text-[16px]">{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                    {/* Active Work */}
                    <div className="flex flex-col gap-1.5 border-l border-sky-100/80 pl-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2.5 mb-1 block">
                        Công việc
                      </span>
                      {[
                        { to: '/my-work', icon: 'calendar_month', label: 'Ca của tôi' },
                        { to: '/payslips', icon: 'receipt_long', label: 'Phiếu lương' },
                      ].map(item => (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            isActive(item.to)
                              ? 'bg-primary/10 text-primary'
                              : 'text-slate-600 hover:bg-sky-50/80 hover:text-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined !text-[16px]">{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </nav>

          {/* ── Right actions ── */}
          <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">
            {isLoggedIn ? (
              <>
                <Link
                  to="/messages"
                  className="relative w-9 h-9 rounded-full bg-sky-50 flex items-center justify-center hover:bg-sky-100 transition-colors"
                  title="Tin nhắn"
                >
                  <span className="material-symbols-outlined text-slate-500 !text-xl">forum</span>
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-white font-bold flex items-center justify-center">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Link>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={handleToggleNotifDropdown}
                    className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showNotifDropdown ? 'bg-primary/10 text-primary' : 'bg-sky-50 hover:bg-sky-100 text-slate-500'}`}
                    title="Thông báo"
                  >
                    <span className="material-symbols-outlined !text-xl">notifications</span>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] text-white font-bold flex items-center justify-center animate-pulse shadow-sm shadow-red-500/50">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown Menu */}
                  {showNotifDropdown && (
                    <div className="absolute top-[calc(100%+8px)] right-0 w-[320px] sm:w-[360px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-sky-900/10 border border-sky-100/80 py-3 z-50 anim-fadeUp origin-top-right">
                      <div className="flex items-center justify-between px-4 pb-3 border-b border-sky-100">
                        <h3 className="font-bold text-slate-800 text-base">Thông báo</h3>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-[11px] font-bold text-primary hover:text-primary-dk uppercase tracking-wider">
                            Đánh dấu đã đọc
                          </button>
                        )}
                      </div>

                      <div className="max-h-[340px] overflow-y-auto">
                        {loadingNotifs ? (
                          <div className="flex items-center justify-center p-8">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : recentNotifs.length > 0 ? (
                          <div className="divide-y divide-slate-50">
                            {recentNotifs.map(n => (
                              <div
                                key={n.notificationId}
                                onClick={() => handleNotifClick(n)}
                                className="group/notif relative p-4 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 pr-10"
                                style={{ opacity: n.isRead ? 0.7 : 1 }}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary'}`}>
                                  <span className="material-symbols-outlined !text-[16px]">
                                      {n.title.includes('Success') || n.title.includes('Accepted') || n.title.includes('Paid') ? 'check_circle' :
                                       n.title.includes('Rejected') || n.title.includes('Fired') || n.title.includes('Ended') ? 'cancel' : 'info'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${n.isRead ? 'text-slate-600 font-medium' : 'text-slate-800 font-bold'}`}>{n.title}</p>
                                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                                  <p className="text-[10px] text-slate-400 font-medium mt-2">{new Date(n.createdAt).toLocaleDateString()}</p>
                                </div>
                                {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0"></div>}

                                <button
                                  onClick={(e) => handleDeleteNotif(n.notificationId, e)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/notif:opacity-100 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                                  title="Xóa thông báo"
                                >
                                  <span className="material-symbols-outlined !text-[16px]">delete</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center p-8">
                            <span className="material-symbols-outlined text-slate-300 !text-3xl mb-2">notifications_off</span>
                            <p className="text-sm text-slate-500 font-medium">Không có thông báo mới</p>
                          </div>
                        )}
                      </div>

                      <div className="px-4 pt-3 mt-1 border-t border-sky-100 text-center">
                        <Link to="/notifications" onClick={() => setShowNotifDropdown(false)} className="text-xs font-bold text-slate-500 hover:text-primary transition-colors">
                          Xem tất cả thông báo
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="relative hidden sm:block select-none">
                  <Link
                    to={userRole === 'Employer' ? "/employer-dashboard" : "/profile"}
                    className={`flex w-9 h-9 rounded-full items-center justify-center shadow-md hover:shadow-lg transition-all relative overflow-hidden ${
                      isVip
                        ? 'border-2 border-amber-300 ring-2 ring-amber-500/25 shadow-amber-500/20 bg-slate-100'
                        : 'border border-slate-200 bg-slate-100'
                    }`}
                    title={isVip ? "Hồ sơ Doanh nghiệp VIP" : "Hồ sơ"}
                  >
                    <img
                      src={avatarUrl || "/default-avatar.png"}
                      alt="Hồ sơ"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
                    />
                    {isVip && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center border border-amber-200 text-[8px] font-black shadow shadow-amber-500/35 z-10">
                        ★
                      </span>
                    )}
                  </Link>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 pointer-events-none">
                    <span className="material-symbols-outlined !text-[9px] text-slate-500 font-bold">keyboard_arrow_down</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => openLogin()}
                  className="hidden sm:inline-flex items-center h-10 px-5 rounded-xl text-sm font-semibold text-slate-700 bg-sky-50 hover:bg-sky-100 hover:text-primary transition-colors"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => openSignup()}
                  className="hidden sm:inline-flex items-center h-10 px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all whitespace-nowrap"
                >
                  Đăng ký miễn phí
                </button>
              </>
            )}

            {/* Are you an employer? CTA */}
            {isLoggedIn && userRole !== 'Employer' && (
              <>
                <div className="h-8 w-px bg-slate-200/80 mx-1 hidden sm:block"></div>
                <Link
                  to={isLoggedIn ? "#" : "/signup?role=Employer"}
                  onClick={handleEmployerCtaClick}
                  className="hidden sm:flex flex-col text-left leading-tight group select-none pl-1"
                >
                  <span className="text-[11px] font-medium text-slate-400">Bạn là nhà tuyển dụng?</span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-primary transition-colors flex items-center gap-0.5 mt-0.5">
                    Đăng tuyển ngay
                    <span className="text-primary font-bold ml-1 transition-transform group-hover:translate-x-0.5">»</span>
                  </span>
                </Link>
              </>
            )}

            {/* ── Mobile Hamburger ── */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center hover:bg-sky-100 transition-colors"
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined !text-xl text-slate-600">
                {mobileOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-[300px] max-w-[85vw] bg-white/95 backdrop-blur-xl shadow-2xl shadow-sky-900/20 transform transition-transform duration-300 ease-out lg:hidden overflow-y-auto ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 h-[72px] border-b border-sky-100/80">
          <WorkBridgeLogo imageClassName="h-12 w-auto max-w-[194px] drop-shadow-[0_6px_14px_rgba(37,99,235,0.14)]" />
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center hover:bg-sky-100 transition-colors"
          >
            <span className="material-symbols-outlined !text-xl text-slate-600">close</span>
          </button>
        </div>

        {/* Drawer Nav */}
        <nav className="px-4 py-4 flex flex-col gap-1">
          <MobileNavLink to="/" icon="home" label="Trang chủ" active={isActive('/')} />

          {/* Categories mobile accordion */}
          <div>
            <button
              onClick={() => setMobileCategoriesOpen(!mobileCategoriesOpen)}
              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-sky-50/80"
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined !text-[20px]">grid_view</span>
                Danh mục
              </span>
              <span className={`material-symbols-outlined !text-[18px] transition-transform duration-200 ${mobileCategoriesOpen ? 'rotate-180' : ''}`}>
                keyboard_arrow_down
              </span>
            </button>

            <div className={`overflow-hidden transition-all duration-300 ${mobileCategoriesOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="pl-4 pt-1 pb-2 flex flex-col gap-0.5">
                {categories.map(cat => (
                  <MobileNavLink
                    key={cat.categoryId}
                    to={`/jobs?categoryId=${cat.categoryId}`}
                    icon={getCategoryIcon(cat.name)}
                    label={translateCategory(cat.name)}
                    indent
                  />
                ))}
              </div>
            </div>
          </div>

          <MobileNavLink to="/jobs" icon="work" label="Tìm việc" active={isActive('/jobs')} />

          {userRole === 'Employer' && (
            <>
              <MobileNavLink to="/employer-dashboard" icon="dashboard" label="Quản lý tuyển dụng" active={isActive('/employer-dashboard')} />
              {isVip ? (
                <Link
                  to="/employer-dashboard?tab=vip"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-amber-500 bg-amber-500/10 border border-amber-500/30`}
                >
                  <span className="material-symbols-outlined !text-[20px] text-amber-500">workspace_premium</span>
                  Doanh nghiệp VIP
                </Link>
              ) : (
                <Link
                  to="/employer-dashboard?tab=vip"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-amber-600 bg-amber-50/50 hover:bg-amber-50 border border-amber-200/50`}
                >
                  <span className="material-symbols-outlined !text-[20px] text-amber-500 animate-pulse">workspace_premium</span>
                  Nâng cấp VIP Doanh nghiệp
                </Link>
              )}
            </>
          )}
          {userRole === 'Applicant' && (
            <Link
              to="/profile?tab=vip"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/70"
            >
              <span className="material-symbols-outlined !text-[20px] text-[#1687d9]">{isVip ? 'workspace_premium' : 'lock'}</span>
              {isVip ? 'Cá nhân VIP' : 'Nâng cấp VIP'}
            </Link>
          )}
          {userRole === 'Admin' && (
            <MobileNavLink to="/admin-dashboard" icon="admin_panel_settings" label="Quản trị hệ thống" active={isActive('/admin-dashboard')} />
          )}

          {isLoggedIn && userRole !== 'Employer' && userRole !== 'Admin' && (
            <>
              {/* Workspace accordion */}
              <div className="mt-2">
                <button
                  onClick={() => setMobileWorkspaceOpen(!mobileWorkspaceOpen)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    WORKSPACE_PATHS.includes(location.pathname)
                      ? 'text-primary bg-primary/5'
                      : 'text-slate-700 hover:bg-sky-50/80'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="material-symbols-outlined !text-[20px]">widgets</span>
                    Không gian làm việc
                  </span>
                  <span className={`material-symbols-outlined !text-[18px] transition-transform duration-200 ${mobileWorkspaceOpen ? 'rotate-180' : ''}`}>
                    keyboard_arrow_down
                  </span>
                </button>

                <div className={`overflow-hidden transition-all duration-300 ${mobileWorkspaceOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="pl-4 pt-1 pb-2 flex flex-col gap-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 py-2">Tìm việc</span>
                    <MobileNavLink to="/my-applications" icon="assignment" label="Đơn ứng tuyển" active={isActive('/my-applications')} indent />
                    <MobileNavLink to="/saved-jobs" icon="bookmark" label="Việc đã lưu" active={isActive('/saved-jobs')} indent />
                    <MobileNavLink to="/offers" icon="local_offer" label="Lời mời nhận việc" active={isActive('/offers')} indent />
                    <MobileNavLink to="/interviews" icon="event_available" label="Phỏng vấn" active={isActive('/interviews')} indent />

                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 py-2 mt-1">Công việc</span>
                    <MobileNavLink to="/my-work" icon="calendar_month" label="Ca của tôi" active={isActive('/my-work')} indent />
                    <MobileNavLink to="/payslips" icon="receipt_long" label="Phiếu lương" active={isActive('/payslips')} indent />
                  </div>
                </div>
              </div>

              <MobileNavLink to="/messages" icon="forum" label="Tin nhắn" active={isActive('/messages')} badge={unreadMessages} />
            </>
          )}
        </nav>

        {/* Drawer Footer */}
        {isLoggedIn ? (
          <div className="px-4 py-4 mt-auto border-t border-sky-100/80 flex flex-col gap-2">
            <Link
              to={userRole === 'Employer' ? "/employer-dashboard" : "/profile"}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-sky-50/80 transition-colors"
            >
              <div className={`w-8 h-8 rounded-full overflow-hidden relative flex-shrink-0 bg-slate-100 ${
                isVip
                  ? 'border-2 border-amber-300 ring-2 ring-amber-500/25 shadow-md shadow-amber-500/30'
                  : 'border border-slate-200 shadow-md'
              }`}>
                <img
                  src={avatarUrl || "/default-avatar.png"}
                  alt="Hồ sơ"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
                />
                {isVip && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white rounded-full flex items-center justify-center border border-amber-200 text-[7px] font-black shadow-sm z-10">
                    ★
                  </span>
                )}
              </div>
              Hồ sơ của tôi {isVip && <span className="text-[10px] bg-amber-500 text-white font-black px-1.5 py-0.2 rounded ml-1">VIP</span>}
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition-colors w-full text-left"
            >
              <span className="material-symbols-outlined !text-[20px]">logout</span>
              Đăng xuất
            </button>
          </div>
        ) : (
          <div className="px-4 py-4 mt-auto border-t border-sky-100/80 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileOpen(false);
                openLogin();
              }}
              className="flex items-center justify-center h-11 rounded-xl text-sm font-semibold text-slate-700 bg-sky-50 hover:bg-sky-100 hover:text-primary transition-colors w-full"
            >
              Đăng nhập
            </button>
            <button
              onClick={() => {
                setMobileOpen(false);
                openSignup();
              }}
              className="flex items-center justify-center h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all w-full"
            >
              Đăng ký miễn phí
            </button>
          </div>
        )}
      </div>

      {/* ── Custom Switch Role Confirmation Modal ── */}
      {showEmployerConfirm && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4 animate-in fade-in duration-200"
          onClick={() => setShowEmployerConfirm(false)}
        >
          <div 
            className="bg-white/95 backdrop-blur-xl rounded-3xl border border-sky-100/85 max-w-md w-full p-6 relative shadow-2xl anim-fadeUp origin-center text-center font-display"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X */}
            <button
              onClick={() => setShowEmployerConfirm(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined !text-lg">close</span>
            </button>

            {/* Icon decoration */}
            <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 mt-2">
              <span className="material-symbols-outlined !text-3xl text-primary animate-pulse">domain</span>
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Chuyển sang Nhà tuyển dụng?
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed px-2">
              Bạn đang đăng nhập bằng tài khoản <strong>Người tìm việc</strong>. Để đăng tin tuyển dụng, bạn cần sử dụng tài khoản <strong>Nhà tuyển dụng</strong>. Hệ thống sẽ đăng xuất tài khoản hiện tại để tiếp tục.
            </p>

            {/* CTAs */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEmployerConfirm(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold transition-all text-slate-500"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmEmployerSwitch}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-primary-dk hover:shadow-lg hover:shadow-primary/25 text-white font-black text-xs transition-all shadow-md shadow-primary/10"
              >
                Đăng xuất & Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Helper component ── */
function MobileNavLink({ to, icon, label, active, indent, badge }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
        indent ? 'text-[13px]' : ''
      } ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-slate-700 hover:bg-sky-50/80 hover:text-primary'
      }`}
    >
      <span className="material-symbols-outlined !text-[20px]">{icon}</span>
      {label}
      {badge > 0 && (
        <span className="ml-auto w-5 h-5 rounded-full bg-primary text-[10px] text-white font-bold flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}
