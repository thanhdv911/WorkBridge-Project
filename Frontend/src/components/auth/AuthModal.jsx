import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api, { getApiErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import ErrorBoundary from '../shared/ErrorBoundary';
import { useAuthModal } from '../../contexts/AuthModalContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  || '336931851953-adc02j9sbgou7oga3t1uiu6abfe7av80.apps.googleusercontent.com';

export default function AuthModal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, mode, setMode, closeAuth, executeSuccessCallback, loginUser } = useAuthModal();

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('Applicant'); // Applicant or Employer
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password states
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  // OTP states
  const [pendingRegistrationEmail, setPendingRegistrationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendingCode, setResendingCode] = useState(false);

  const hasGoogleLogin = Boolean(GOOGLE_CLIENT_ID);

  // Reset form when modal toggles or changes mode
  useEffect(() => {
    if (!isOpen) {
      setIsForgotMode(false);
      setPendingRegistrationEmail('');
      setVerificationCode('');
    }
  }, [isOpen]);

  useEffect(() => {
    setIsForgotMode(false);
    setPendingRegistrationEmail('');
    setVerificationCode('');
  }, [mode]);

  // Sync role if /signup?role=Employer is loaded (handled in parent or parsed here)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam === 'Employer' || roleParam === 'Applicant') {
      setRole(roleParam);
    }
  }, [location.search, isOpen]);

  if (!isOpen) return null;

  const persistSession = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    if (data.userId) localStorage.setItem('userId', data.userId);
    if (data.fullName) localStorage.setItem('fullName', data.fullName);
    localStorage.setItem('user', JSON.stringify(data));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Vui lòng nhập email và mật khẩu');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      toast.success(`Chào mừng trở lại, ${response.data.fullName}!`);
      persistSession(response.data);
      loginUser(response.data);
      
      executeSuccessCallback();
      closeAuth();

      if (response.data.role === 'Employer') {
        navigate('/employer-dashboard');
      } else if (location.pathname === '/login' || location.pathname === '/signup') {
        navigate('/');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Email hoặc mật khẩu chưa đúng.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Mật khẩu không khớp');
      return;
    }
    if (password.length < 8) {
      toast.error('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', {
        firstName,
        lastName,
        email,
        password,
        role
      });
      setPendingRegistrationEmail(response.data?.email || email.trim());
      setVerificationCode('');
      toast.success(response.data?.message || 'Mã xác thực đã được gửi đến email của bạn.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể gửi mã xác thực. Vui lòng kiểm tra email và thử lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyRegistration = async (e) => {
    e.preventDefault();
    const normalizedCode = verificationCode.trim();

    if (!pendingRegistrationEmail) {
      toast.error('Vui lòng đăng ký lại để nhận mã xác thực.');
      return;
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      toast.error('Mã xác thực gồm 6 chữ số.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/register/verify', {
        email: pendingRegistrationEmail,
        code: normalizedCode
      });
      toast.success('Xác thực email thành công. Tài khoản đã được tạo.');
      persistSession(response.data);
      loginUser(response.data);
      
      executeSuccessCallback();
      closeAuth();

      if (response.data.role === 'Employer') {
        navigate('/employer-dashboard');
      } else if (location.pathname === '/login' || location.pathname === '/signup') {
        navigate('/');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Mã xác thực không đúng hoặc đã hết hạn.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerificationCode = async () => {
    if (!email || !password || !firstName || !lastName) {
      toast.error('Vui lòng giữ đầy đủ thông tin đăng ký để gửi lại mã.');
      return;
    }

    setResendingCode(true);
    try {
      const response = await api.post('/auth/register', {
        firstName,
        lastName,
        email,
        password,
        role
      });
      setPendingRegistrationEmail(response.data?.email || email.trim());
      setVerificationCode('');
      toast.success(response.data?.message || 'Mã xác thực mới đã được gửi.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể gửi lại mã xác thực.'));
    } finally {
      setResendingCode(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/google', { IdToken: credentialResponse.credential });
      toast.success(`Chào mừng, ${response.data.fullName}!`);
      persistSession(response.data);
      loginUser(response.data);
      
      executeSuccessCallback();
      closeAuth();

      if (response.data.role === 'Employer') {
        navigate('/employer-dashboard');
      } else if (location.pathname === '/login' || location.pathname === '/signup') {
        navigate('/');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể đăng nhập Google. Vui lòng thử lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google bị gián đoạn. Vui lòng thử lại.');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Vui lòng nhập email đăng ký.');
      return;
    }

    setForgotSubmitting(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      toast.success(response.data?.message || 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.');
      setIsForgotMode(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể gửi yêu cầu đặt lại mật khẩu.'));
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={closeAuth}
    >
      <div 
        className="bg-white rounded-[28px] lg:rounded-[2rem] border border-sky-100/80 max-w-[420px] xl:max-w-[820px] w-full relative shadow-2xl anim-fadeUp origin-center grid xl:grid-cols-[380px_minmax(0,1fr)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── LEFT: Illustration Panel ── */}
        <div className="hidden xl:flex relative flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sky-50 via-white to-sky-50 min-h-[620px]">
          {/* Decorative blobs */}
          <div className="absolute top-0 left-0 w-48 h-48 rounded-full bg-[#1392ec]/10 -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-sky-200/20 translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full bg-[#1392ec]/5 -translate-x-1/2 -translate-y-1/2" />

          {/* 3D Character SVG illustration */}
          <div className="relative z-10 flex flex-col items-center px-8 text-center">
            {/* Illustration */}
            <div className="w-52 h-52 mb-5 relative">
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
                {/* Body */}
                <ellipse cx="100" cy="185" rx="55" ry="10" fill="#1392ec" opacity="0.15"/>
                {/* Legs */}
                <rect x="78" y="140" width="18" height="45" rx="9" fill="#2563eb"/>
                <rect x="104" y="140" width="18" height="45" rx="9" fill="#1d4ed8"/>
                {/* Shoes */}
                <ellipse cx="87" cy="184" rx="14" ry="7" fill="#1e293b"/>
                <ellipse cx="113" cy="184" rx="14" ry="7" fill="#1e293b"/>
                {/* Torso - shirt */}
                <rect x="68" y="95" width="64" height="55" rx="12" fill="#1392ec"/>
                {/* Laptop */}
                <rect x="55" y="108" width="55" height="38" rx="5" fill="#e2e8f0"/>
                <rect x="58" y="111" width="49" height="30" rx="3" fill="#0ea5e9"/>
                <rect x="52" y="146" width="61" height="5" rx="2.5" fill="#cbd5e1"/>
                {/* Screen content */}
                <rect x="62" y="115" width="18" height="3" rx="1.5" fill="white" opacity="0.8"/>
                <rect x="62" y="121" width="12" height="3" rx="1.5" fill="white" opacity="0.6"/>
                <rect x="62" y="127" width="22" height="3" rx="1.5" fill="white" opacity="0.6"/>
                <rect x="83" y="115" width="20" height="18" rx="3" fill="white" opacity="0.15"/>
                {/* Left arm */}
                <rect x="44" y="98" width="16" height="40" rx="8" fill="#38bdf8" transform="rotate(-15 44 98)"/>
                {/* Right arm on laptop */}
                <rect x="118" y="100" width="16" height="38" rx="8" fill="#38bdf8" transform="rotate(10 118 100)"/>
                {/* Neck */}
                <rect x="91" y="80" width="18" height="20" rx="9" fill="#fbbf24"/>
                {/* Head */}
                <ellipse cx="100" cy="68" rx="28" ry="28" fill="#fbbf24"/>
                {/* Hair */}
                <ellipse cx="100" cy="44" rx="26" ry="16" fill="#1e293b"/>
                <ellipse cx="80" cy="56" rx="10" ry="14" fill="#1e293b"/>
                <ellipse cx="120" cy="56" rx="10" ry="14" fill="#1e293b"/>
                {/* Eyes */}
                <ellipse cx="90" cy="68" rx="5" ry="6" fill="white"/>
                <ellipse cx="110" cy="68" rx="5" ry="6" fill="white"/>
                <circle cx="91" cy="69" r="3" fill="#1e293b"/>
                <circle cx="111" cy="69" r="3" fill="#1e293b"/>
                <circle cx="92" cy="68" r="1" fill="white"/>
                <circle cx="112" cy="68" r="1" fill="white"/>
                {/* Smile */}
                <path d="M92 78 Q100 85 108 78" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                {/* Floating badge */}
                <rect x="130" y="50" width="52" height="26" rx="13" fill="white" filter="url(#shadow)" opacity="0.95"/>
                <text x="143" y="67" fontSize="11" fill="#1392ec" fontWeight="bold">Hired! 🎉</text>
                <defs>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
                  </filter>
                </defs>
              </svg>
            </div>

            {/* Welcome Text */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1392ec]/10 border border-[#1392ec]/20 px-3 py-1 mb-3">
              <span className="material-symbols-outlined !text-[13px] text-[#1392ec]">verified</span>
              <span className="text-[11px] font-bold text-[#1392ec] tracking-wide">Cổng thông tin việc làm</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 leading-tight mb-2">
              Chào mừng đến<br/><span className="text-[#1392ec]">WorkBridge</span>
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-[220px]">
              Tìm việc làm thêm linh hoạt, ca ngắn phù hợp với lịch học của bạn.
            </p>


          </div>
        </div>

        {/* ── RIGHT: Form ── */}
        <div className="min-w-0 flex flex-col justify-start p-5 sm:p-6 xl:p-8 relative z-10 w-full max-h-[calc(100vh-3rem)] xl:max-h-[620px] overflow-y-auto bg-white">
        {/* Close Button X */}
        <button
          onClick={closeAuth}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          title="Đóng"
        >
          <span className="material-symbols-outlined !text-lg">close</span>
        </button>

        {/* Brand header - only show on mobile (xl already has left panel) */}
        <div className="text-center mb-5 mt-1 xl:hidden">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] font-extrabold text-primary shadow-sm">
            <span className="material-symbols-outlined !text-[14px]">verified</span>
            WorkBridge
          </div>
        </div>
        <div className="mb-5 mt-1">
          <h2 className="text-xl font-bold text-slate-800">
            {isForgotMode 
              ? 'Quên mật khẩu?' 
              : pendingRegistrationEmail 
              ? 'Xác thực tài khoản' 
              : mode === 'login' 
              ? 'Đăng nhập' 
              : 'Tạo tài khoản'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isForgotMode
              ? 'Nhập email để nhận liên kết khôi phục mật khẩu.'
              : pendingRegistrationEmail
              ? `Mã xác thực gửi đến ${pendingRegistrationEmail}`
              : mode === 'login'
              ? 'Chào mừng quay lại! Nhập thông tin để tiếp tục.'
              : 'Tham gia tìm việc thông minh ngay hôm nay.'}
          </p>
        </div>

        {/* ── Mode selector tabs (only if not forgot / verification mode) ── */}
        {!isForgotMode && !pendingRegistrationEmail && (
          <div className="flex h-11 w-full items-center rounded-xl bg-sky-50/70 p-1 gap-1 border border-sky-100/50 mb-4">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 h-full rounded-lg text-xs font-black transition-all ${
                mode === 'login' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 h-full rounded-lg text-xs font-black transition-all ${
                mode === 'signup' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Đăng ký
            </button>
          </div>
        )}

        {/* ════ 1. FORGOT PASSWORD INLINE MODE ════ */}
        {isForgotMode && (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-600 mb-1 pl-1 block">Địa chỉ Email đăng ký</label>
              <div className="relative">
                <span className="material-symbols-outlined !text-lg text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">mail</span>
                <input
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 pl-11 pr-4 text-sm placeholder:text-slate-400 transition-colors"
                  placeholder="name@example.com"
                  type="email"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={forgotSubmitting}
              className="flex items-center justify-center rounded-xl h-11 bg-gradient-to-r from-primary to-primary-dk text-white font-bold text-xs shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all gap-1.5 mt-1 disabled:opacity-75"
            >
              <span>{forgotSubmitting ? 'Đang gửi...' : 'Gửi mã khôi phục'}</span>
              {!forgotSubmitting && <span className="material-symbols-outlined !text-lg">send</span>}
            </button>

            <button
              type="button"
              onClick={() => setIsForgotMode(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 text-center mt-2 transition-colors uppercase tracking-wider"
            >
              Quay lại Đăng nhập
            </button>
          </form>
        )}

        {/* ════ 2. EMAIL VERIFICATION / OTP MODE ════ */}
        {pendingRegistrationEmail && !isForgotMode && (
          <form onSubmit={handleVerifyRegistration} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-600 mb-1 pl-1 block text-center">Mã xác thực email</label>
              <div className="relative">
                <span className="material-symbols-outlined !text-lg text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">pin</span>
                <input
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-4 text-center text-xl font-black tracking-[0.3em] placeholder:tracking-normal placeholder:text-xs placeholder:font-semibold placeholder:text-slate-400 transition-colors"
                  placeholder="Nhập 6 số"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center rounded-xl h-11 bg-gradient-to-r from-primary to-primary-dk text-white font-bold text-xs shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all gap-1.5 disabled:opacity-70"
            >
              <span>{isLoading ? 'Đang xác thực...' : 'Xác nhận tạo tài khoản'}</span>
              {!isLoading && <span className="material-symbols-outlined !text-lg">verified</span>}
            </button>

            <div className="flex items-center justify-between text-xs font-bold px-1 mt-1">
              <button
                type="button"
                onClick={() => setPendingRegistrationEmail('')}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                Nhập lại email
              </button>
              <button
                type="button"
                onClick={handleResendVerificationCode}
                disabled={resendingCode}
                className="text-primary hover:text-primary-dk transition-colors disabled:opacity-50"
              >
                {resendingCode ? 'Đang gửi...' : 'Gửi lại mã'}
              </button>
            </div>
          </form>
        )}

        {/* ════ 3. LOGIN MODE FORM ════ */}
        {mode === 'login' && !isForgotMode && !pendingRegistrationEmail && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-600 mb-1 pl-1 block">Địa chỉ Email</label>
              <div className="relative">
                <span className="material-symbols-outlined !text-lg text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">mail</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 pl-10 pr-4 text-xs font-semibold placeholder:text-slate-400 transition-colors"
                  placeholder="name@example.com"
                  type="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center pr-1">
                <label className="text-xs font-bold text-slate-600 mb-1 pl-1 block">Mật khẩu</label>
                <button
                  type="button"
                  onClick={() => setIsForgotMode(true)}
                  className="text-[10px] font-bold text-primary hover:text-primary-dk transition-colors uppercase tracking-wider"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined !text-lg text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">lock</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-11 pl-10 pr-10 text-xs font-semibold placeholder:text-slate-400 transition-colors"
                  placeholder="Mật khẩu của bạn"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center h-8 w-8 rounded-full"
                >
                  <span className="material-symbols-outlined !text-lg">{showLoginPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center rounded-xl h-11 bg-gradient-to-r from-primary to-primary-dk text-white font-bold text-xs shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all gap-1.5 mt-1 disabled:opacity-75"
            >
              <span>{isLoading ? 'Đang đăng nhập...' : 'Đăng nhập ngay'}</span>
              {!isLoading && <span className="material-symbols-outlined !text-lg">arrow_forward</span>}
            </button>

            {/* Google Sign-in */}
            {hasGoogleLogin && (
              <ErrorBoundary fallback={<p className="text-center text-[10px] text-slate-400">Đăng nhập Google tạm thời không khả dụng.</p>}>
                <div className="relative flex items-center py-1.5 mt-1">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink-0 mx-3 text-slate-450 text-[10px] font-black uppercase tracking-wider">hoặc</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <div className="w-full flex justify-center overflow-hidden min-h-10">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="outline"
                    size="medium"
                    width="260"
                    text="signin_with"
                  />
                </div>
              </ErrorBoundary>
            )}

            {/* Toggle prompt */}
            <p className="text-center text-xs text-slate-500 mt-2">
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-black text-primary hover:underline"
              >
                Đăng ký ngay
              </button>
            </p>
          </form>
        )}

        {/* ════ 4. SIGNUP MODE FORM ════ */}
        {mode === 'signup' && !isForgotMode && !pendingRegistrationEmail && (
          <form onSubmit={handleRegister} className="flex flex-col gap-2.5">
            {/* Segment Control Toggle Role */}
            <div className="flex h-11 w-full items-center rounded-xl bg-slate-50 p-1 gap-1 border border-slate-200/60 select-none flex-shrink-0">
              <button
                type="button"
                onClick={() => setRole('Applicant')}
                className={`flex-1 h-full rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                  role === 'Applicant' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined !text-[16px]">person</span>
                Người tìm việc
              </button>
              <button
                type="button"
                onClick={() => setRole('Employer')}
                className={`flex-1 h-full rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                  role === 'Employer' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined !text-[16px]">business</span>
                Nhà tuyển dụng
              </button>
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-bold text-slate-600 mb-1 pl-1 block">Họ</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-10 px-3 text-xs font-semibold placeholder:text-slate-400 transition-colors"
                  placeholder="Nguyễn"
                  type="text"
                  required
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs font-bold text-slate-600 mb-1 pl-1 block">Tên</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-10 px-3 text-xs font-semibold placeholder:text-slate-400 transition-colors"
                  placeholder="Văn A"
                  type="text"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-0.5">
              <label className="text-xs font-bold text-slate-600 mb-1 pl-1 block">Địa chỉ Email</label>
              <div className="relative">
                <span className="material-symbols-outlined !text-base text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">mail</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-10 pl-9 pr-4 text-xs font-semibold placeholder:text-slate-400 transition-colors"
                  placeholder="name@example.com"
                  type="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-0.5">
              <label className="text-xs font-bold text-slate-600 mb-1 pl-1 block">Mật khẩu</label>
              <div className="relative">
                <span className="material-symbols-outlined !text-base text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">lock</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-10 pl-9 pr-9 text-xs font-semibold placeholder:text-slate-400 transition-colors"
                  placeholder="Tối thiểu 8 ký tự"
                  type={showRegisterPassword ? 'text' : 'password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center h-8 w-8 rounded-full"
                >
                  <span className="material-symbols-outlined !text-base">{showRegisterPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-0.5">
              <label className="text-xs font-bold text-slate-600 mb-1 pl-1 block">Xác nhận mật khẩu</label>
              <div className="relative">
                <span className="material-symbols-outlined !text-base text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">lock_reset</span>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-10 pl-9 pr-9 text-xs font-semibold placeholder:text-slate-400 transition-colors"
                  placeholder="Nhập lại mật khẩu"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center h-8 w-8 rounded-full"
                >
                  <span className="material-symbols-outlined !text-base">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center rounded-xl h-11 bg-gradient-to-r from-primary to-primary-dk text-white font-bold text-xs shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all gap-1.5 mt-1.5 disabled:opacity-75"
            >
              <span>{isLoading ? 'Đang đăng ký...' : 'Đăng ký tài khoản'}</span>
              {!isLoading && <span className="material-symbols-outlined !text-lg">arrow_forward</span>}
            </button>

            {/* Toggle prompt */}
            <p className="text-center text-xs text-slate-500 mt-1">
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-black text-primary hover:underline"
              >
                Đăng nhập
              </button>
            </p>
          </form>
        )}
        </div>


      </div>
    </div>
  );
}
