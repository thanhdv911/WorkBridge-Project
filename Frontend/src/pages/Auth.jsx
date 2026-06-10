import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api, { getApiErrorMessage } from '../services/api';
import toast from 'react-hot-toast';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import WorkBridgeLogo from '../components/shared/WorkBridgeLogo';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  || '336931851953-adc02j9sbgou7oga3t1uiu6abfe7av80.apps.googleusercontent.com';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(location.pathname === '/login');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('Applicant'); // Applicant or Employer
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingRegistrationEmail, setPendingRegistrationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendingCode, setResendingCode] = useState(false);
  const hasGoogleLogin = Boolean(GOOGLE_CLIENT_ID);

  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam === 'Employer' || roleParam === 'Applicant') {
      setRole(roleParam);
    }
  }, [location.search]);

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

      if (response.data.role === 'Employer') {
        navigate('/employer-dashboard');
      } else {
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
      setPendingRegistrationEmail('');
      setVerificationCode('');

      if (response.data.role === 'Employer') {
        navigate('/employer-dashboard');
      } else {
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
      if (response.data.role === 'Employer') {
        navigate('/employer-dashboard');
      } else {
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

  const openForgotPassword = () => {
    setForgotEmail(email);
    setShowForgotModal(true);
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
      setShowForgotModal(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Không thể gửi yêu cầu đặt lại mật khẩu.'));
    } finally {
      setForgotSubmitting(false);
    }
  };

  const heading = isLogin ? 'ĐĂNG NHẬP' : (pendingRegistrationEmail ? 'XÁC THỰC EMAIL' : 'ĐĂNG KÝ');
  const subHeading = isLogin
    ? 'Vui lòng nhập thông tin để đăng nhập.'
    : pendingRegistrationEmail
      ? 'Tài khoản chỉ được tạo sau khi email được xác thực.'
    : 'Tham gia cùng hàng nghìn sinh viên tìm được việc làm lý tưởng.';

  // The panels
  const showLogin = () => {
    setIsLogin(true);
    setPendingRegistrationEmail('');
    if (location.pathname !== '/login') {
      navigate('/login');
    }
  };

  const showRegister = () => {
    setIsLogin(false);
    setPendingRegistrationEmail('');
    if (location.pathname !== '/signup') {
      navigate('/signup');
    }
  };

  return (
    <div className="auth-shell-blue font-display text-slate-900 min-h-screen flex flex-col antialiased overflow-x-hidden">
      {/* ═══════ HEADER ═══════ */}
      <header className="glass sticky top-0 z-50 border-b border-slate-200/50">
        <div className="w-full mx-auto flex items-center justify-between gap-3 px-4 sm:px-4 sm:px-6 lg:px-8 h-20">
          <div className="flex items-center min-w-0">
            <Link to="/" className="flex items-center group" aria-label="WorkBridge">
              <WorkBridgeLogo imageClassName="h-14 w-auto max-w-[232px] drop-shadow-[0_8px_18px_rgba(37,99,235,0.18)] transition-transform duration-200 group-hover:scale-[1.02]" />
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link className="text-sm font-medium text-slate-500 hover:text-primary transition-colors" to="/">Trang chủ</Link>
            <Link className="text-sm font-medium text-slate-500 hover:text-primary transition-colors" to="/jobs">Tìm việc</Link>
            <Link className="text-sm font-medium text-slate-500 hover:text-primary transition-colors" to="/post-job">Đăng tin tuyển dụng</Link>
          </nav>
          <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">
             {/* Same page, so basically no-op or just set state */}
            <button onClick={showLogin} className="hidden sm:inline-flex items-center h-10 px-5 rounded-xl text-sm font-semibold text-slate-700 bg-sky-50 hover:bg-sky-100 hover:text-primary transition-colors">Đăng nhập</button>
            <button onClick={showRegister} className="inline-flex items-center h-10 px-3 sm:px-5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all whitespace-nowrap">Đăng ký miễn phí</button>
          </div>
        </div>
      </header>

      {/* ═══════ MAIN ═══════ */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 relative w-full overflow-x-hidden">
        {/* Background decorative blobs */}
        <div className="blob-deco w-40 h-40 bg-sky-300/30 -top-10 left-[8%] blur-[60px] hidden md:block"></div>
        <div className="blob-deco w-32 h-32 bg-primary/20 bottom-10 right-[10%] blur-[50px] hidden md:block"></div>

        {/* ═══ AUTH CARD ═══ */}
        <div className="auth-card auth-card-premium w-full max-w-[1040px] bg-white rounded-3xl lg:rounded-[2rem] shadow-2xl shadow-sky-200/50 grid xl:grid-cols-[minmax(0,1fr)_440px] relative my-auto mx-auto border border-sky-100/80 overflow-hidden">

          {/* Corner blobs */}
          <div className="blob-deco w-20 h-20 bg-primary/20 -top-6 -left-6 blur-[30px] hidden lg:block"></div>
          <div className="blob-deco w-16 h-16 bg-slate-300/40 -bottom-5 -right-5 blur-[25px] hidden lg:block"></div>

          {/* ── LEFT: Form ── */}
          <div className="min-w-0 flex flex-col justify-center px-5 sm:px-8 lg:px-10 py-7 sm:py-9 lg:py-10 relative z-10 w-full">

            {/* Heading */}
            <div className="anim-fadeUp text-center mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-extrabold text-primary shadow-sm shadow-sky-100">
                <span className="material-symbols-outlined !text-[15px]">verified</span>
                Truy cập WorkBridge
              </div>
              <h2 className="mt-4 text-2xl sm:text-3xl font-black tracking-normal text-slate-950">{heading}</h2>
              <p className="text-slate-500 mt-2 text-sm">{subHeading}</p>
            </div>

            {/* Login / Register toggle */}
            <div className="anim-fadeUp-d1 flex h-12 w-full max-w-[320px] sm:max-w-sm mx-auto items-center rounded-2xl bg-sky-50 p-1.5 gap-1 mb-6 border border-sky-100/80">
              <button
                onClick={showLogin}
                className={`flex-1 h-full rounded-xl text-sm font-bold transition-all ${isLogin ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                Đăng nhập
              </button>
              <button
                onClick={showRegister}
                className={`flex-1 h-full rounded-xl text-sm font-bold transition-all ${!isLogin ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                Đăng ký
              </button>
            </div>

            {/* ════ LOGIN FORM ════ */}
            {isLogin && (
              <form onSubmit={handleLogin} className="flex flex-col gap-4 anim-fadeUp-d2 max-w-[320px] sm:max-w-sm mx-auto w-full flex-shrink-0">

                {/* Username / Email */}
                <div className="relative">
                  <span className="material-symbols-outlined !text-xl text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">person</span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-4 text-sm placeholder:text-slate-400 transition-colors" placeholder="Email" type="email" required />
                </div>

                {/* Password */}
                <div className="relative">
                  <span className="material-symbols-outlined !text-xl text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">lock</span>
                  <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-12 text-sm placeholder:text-slate-400 transition-colors" placeholder="Mật khẩu" type={showLoginPassword ? 'text' : 'password'} required />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((value) => !value)}
                    className="auth-password-toggle"
                    aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    title={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <span className="material-symbols-outlined !text-[20px]">{showLoginPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input className="rounded border-slate-300 text-primary focus:ring-primary/30 w-4 h-4 cursor-pointer" type="checkbox" defaultChecked/>
                    <span className="text-sm text-slate-500">Ghi nhớ đăng nhập</span>
                  </label>
                  <button type="button" onClick={openForgotPassword} className="text-xs font-semibold text-primary hover:text-primary-dk transition-colors">Quên mật khẩu?</button>
                </div>

                {/* Submit */}
                <button type="submit" disabled={isLoading} className="auth-primary-button flex items-center justify-center rounded-xl h-12 bg-gradient-to-r from-primary to-primary-dk text-white font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all gap-2 mt-1 disabled:opacity-70 disabled:hover:scale-100">
                  <span>{isLoading ? 'Đang đăng nhập...' : 'Đăng nhập ngay'}</span>
                  {!isLoading && <span className="material-symbols-outlined !text-xl">arrow_forward</span>}
                </button>

                {hasGoogleLogin && (
                  <ErrorBoundary fallback={<p className="text-center text-xs text-slate-400">Đăng nhập mạng xã hội tạm thời không khả dụng.</p>}>
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold">hoặc tiếp tục với Google</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <div className="w-full flex justify-center overflow-hidden">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        theme="outline"
                        size="large"
                        width="280"
                        text="signin_with"
                      />
                    </div>
                  </ErrorBoundary>
                )}

                {/* Switch prompt */}
                <p className="text-center text-sm text-slate-500 mt-2">
                  Chưa có tài khoản? <button type="button" onClick={showRegister} className="font-bold text-primary hover:underline">Đăng ký</button>
                </p>
              </form>
            )}

            {/* ════ EMAIL VERIFICATION FORM ════ */}
            {!isLogin && pendingRegistrationEmail && (
              <form onSubmit={handleVerifyRegistration} className="flex flex-col gap-4 anim-fadeUp-d2 max-w-[320px] sm:max-w-sm mx-auto w-full pb-4 flex-shrink-0">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                    <span className="material-symbols-outlined !text-[26px]">mark_email_read</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900">Xác thực email</h3>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    Nhập mã 6 số đã gửi đến <span className="font-black text-primary">{pendingRegistrationEmail}</span>.
                  </p>
                </div>

                <div className="relative">
                  <span className="material-symbols-outlined !text-xl text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">pin</span>
                  <input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-4 text-center text-2xl font-black tracking-[0.35em] placeholder:tracking-normal placeholder:text-sm placeholder:font-semibold placeholder:text-slate-400 transition-colors"
                    placeholder="Nhập mã"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                </div>

                <button type="submit" disabled={isLoading} className="auth-primary-button flex items-center justify-center rounded-xl h-12 bg-gradient-to-r from-primary to-primary-dk text-white font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all gap-2 disabled:opacity-70 disabled:hover:scale-100">
                  <span>{isLoading ? 'Đang xác thực...' : 'Xác thực và tạo tài khoản'}</span>
                  {!isLoading && <span className="material-symbols-outlined !text-xl">verified</span>}
                </button>

                <div className="flex items-center justify-between gap-3 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPendingRegistrationEmail('')}
                    className="text-slate-400 transition-colors hover:text-slate-700"
                  >
                    Sửa thông tin
                  </button>
                  <button
                    type="button"
                    onClick={handleResendVerificationCode}
                    disabled={resendingCode}
                    className="text-primary transition-colors hover:text-primary-dk disabled:opacity-50"
                  >
                    {resendingCode ? 'Đang gửi lại...' : 'Gửi lại mã'}
                  </button>
                </div>
              </form>
            )}

            {/* ════ REGISTER FORM ════ */}
            {!isLogin && !pendingRegistrationEmail && (
              <form onSubmit={handleRegister} className="flex flex-col gap-4 anim-fadeUp-d2 max-w-[320px] sm:max-w-sm mx-auto w-full pb-4 flex-shrink-0">
                {/* Role toggle */}
                <div className="flex h-11 w-full items-center rounded-xl bg-slate-50 p-1 gap-1 border border-slate-200/60 flex-shrink-0">
                  <label className="tab-toggle flex-1 h-full cursor-pointer relative">
                    <input checked={role === 'Applicant'} onChange={() => setRole('Applicant')} name="reg_role" type="radio" value="Applicant" className="peer sr-only"/>
                    <span className="flex items-center justify-center w-full h-full rounded-lg text-xs font-semibold text-slate-500 transition-all gap-1.5 peer-checked:bg-white peer-checked:text-primary peer-checked:shadow-sm">
                      <span className="material-symbols-outlined !text-[16px]">person</span> Người tìm việc
                    </span>
                  </label>
                  <label className="tab-toggle flex-1 h-full cursor-pointer relative">
                    <input checked={role === 'Employer'} onChange={() => setRole('Employer')} name="reg_role" type="radio" value="Employer" className="peer sr-only"/>
                    <span className="flex items-center justify-center w-full h-full rounded-lg text-xs font-semibold text-slate-500 transition-all gap-1.5 peer-checked:bg-white peer-checked:text-primary peer-checked:shadow-sm">
                      <span className="material-symbols-outlined !text-[16px]">business</span> Nhà tuyển dụng
                    </span>
                  </label>
                </div>

                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="material-symbols-outlined !text-xl text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">person</span>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-3 text-sm placeholder:text-slate-400 transition-colors" placeholder="Họ" type="text" required/>
                  </div>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 px-4 text-sm placeholder:text-slate-400 transition-colors" placeholder="Tên" type="text" required/>
                </div>

                {/* Email */}
                <div className="relative">
                  <span className="material-symbols-outlined !text-xl text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">mail</span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-4 text-sm placeholder:text-slate-400 transition-colors" placeholder="you@example.com" type="email" required/>
                </div>

                {/* Password */}
                <div className="relative">
                  <span className="material-symbols-outlined !text-xl text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">lock</span>
                  <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-12 text-sm placeholder:text-slate-400 transition-colors" placeholder="Tối thiểu 8 ký tự" type={showRegisterPassword ? 'text' : 'password'} required minLength="8"/>
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((value) => !value)}
                    className="auth-password-toggle"
                    aria-label={showRegisterPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    title={showRegisterPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <span className="material-symbols-outlined !text-[20px]">{showRegisterPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>

                {/* Password strength (Dynamic but currently simple UI representation) */}
                <div className="flex gap-1.5">
                  <div className={`h-1 flex-1 rounded-full transition-colors ${password.length > 0 ? 'bg-primary' : 'bg-slate-200'}`}></div>
                  <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 4 ? 'bg-primary' : 'bg-slate-200'}`}></div>
                  <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 8 ? 'bg-primary' : 'bg-slate-200'}`}></div>
                  <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 10 && /[A-Z]/.test(password) ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                </div>

                {/* Confirm password */}
                <div className="relative">
                  <span className="material-symbols-outlined !text-xl text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">lock</span>
                  <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-12 text-sm placeholder:text-slate-400 transition-colors" placeholder="Nhập lại mật khẩu" type={showConfirmPassword ? 'text' : 'password'} required/>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="auth-password-toggle"
                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu nhập lại' : 'Hiện mật khẩu nhập lại'}
                    title={showConfirmPassword ? 'Ẩn mật khẩu nhập lại' : 'Hiện mật khẩu nhập lại'}
                  >
                    <span className="material-symbols-outlined !text-[20px]">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>

                {/* Terms */}
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input required className="rounded border-slate-300 text-primary focus:ring-primary/30 w-4 h-4 mt-0.5 cursor-pointer" type="checkbox"/>
                  <span className="text-sm text-slate-500 leading-relaxed">
                    Tôi đồng ý với <Link to="/terms" className="text-primary font-semibold hover:underline">Điều khoản dịch vụ</Link> và <Link to="/privacy" className="text-primary font-semibold hover:underline">Chính sách bảo mật</Link>
                  </span>
                </label>

                {/* Submit */}
                <button type="submit" disabled={isLoading} className="auth-primary-button flex items-center justify-center rounded-xl h-12 bg-gradient-to-r from-primary to-primary-dk text-white font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all gap-2 disabled:opacity-70 disabled:hover:scale-100">
                  <span>{isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}</span>
                  {!isLoading && <span className="material-symbols-outlined !text-xl">arrow_forward</span>}
                </button>

                {hasGoogleLogin && (
                  <ErrorBoundary fallback={<p className="text-center text-xs text-slate-400">Đăng ký mạng xã hội tạm thời không khả dụng.</p>}>
                    <div className="relative flex items-center py-1">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold">hoặc đăng ký với Google</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <div className="w-full flex justify-center overflow-hidden">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        theme="outline"
                        size="large"
                        width="280"
                        text="signup_with"
                      />
                    </div>
                  </ErrorBoundary>
                )}

                {/* Switch prompt */}
                <p className="text-center text-sm text-slate-500 mt-2">
                  Đã có tài khoản? <button type="button" onClick={showLogin} className="font-bold text-primary hover:underline">Đăng nhập</button>
                </p>
              </form>
            )}
          </div>

          {/* ── RIGHT: Image Panel ── */}
          <div className="auth-visual-panel hidden xl:flex min-h-[620px] relative overflow-hidden rounded-[2rem] m-3 flex-col justify-between p-7" aria-hidden="true">
            <div className="auth-visual-scan"></div>
            <div className="blob-deco w-64 h-64 bg-sky-300/25 -top-16 -right-16 blur-[44px]"></div>
            <div className="blob-deco w-44 h-44 bg-cyan-200/20 bottom-24 -left-14 blur-[36px]"></div>

            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/20 px-3.5 py-2 text-xs font-extrabold text-white shadow-lg shadow-sky-950/10 backdrop-blur-md">
                <span className="material-symbols-outlined filled !text-[16px] text-emerald-300">radio_button_checked</span>
                ca làm phù hợp
              </div>
              <div className="auth-orbit-chip">
                <span className="material-symbols-outlined filled !text-xl">bolt</span>
              </div>
            </div>

            <div className="relative z-10">
              <div className="auth-photo-card">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold text-sky-100">Gợi ý trong hôm nay</p>
                    <h3 className="mt-2 text-3xl font-black leading-tight tracking-normal text-white">Tìm ca làm nhanh hơn</h3>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center border border-white/20">
                    <span className="material-symbols-outlined !text-3xl text-white">work</span>
                  </div>
                </div>

                <div className="mt-7 space-y-3">
                  <div className="auth-mini-row">
                    <span className="material-symbols-outlined !text-[18px] text-cyan-200">schedule</span>
                    <div>
                      <div className="text-sm font-extrabold text-white">Ca tối gần trường</div>
                      <div className="text-[11px] font-semibold text-white/60">Ưu tiên lịch rảnh của bạn</div>
                    </div>
                    <strong>42k</strong>
                  </div>
                  <div className="auth-mini-row">
                    <span className="material-symbols-outlined !text-[18px] text-emerald-200">verified_user</span>
                    <div>
                      <div className="text-sm font-extrabold text-white">Nhà tuyển dụng xác minh</div>
                      <div className="text-[11px] font-semibold text-white/60">Ứng tuyển tự tin hơn</div>
                    </div>
                    <strong>1 chạm</strong>
                  </div>
                </div>
              </div>

              <div className="auth-floating-badge auth-badge-a">
                <span className="material-symbols-outlined !text-[18px] text-sky-500">chat</span>
                phản hồi nhanh
              </div>
              <div className="auth-floating-badge auth-badge-b">
                <span className="material-symbols-outlined !text-[18px] text-emerald-500">task_alt</span>
                hồ sơ sẵn sàng
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-4">
              <div className="auth-stat-tile">
                <span className="material-symbols-outlined !text-xl text-cyan-200">trending_up</span>
                <div>
                  <div className="text-lg font-black text-white">5,000+</div>
                  <div className="text-[11px] font-semibold text-white/60">việc đang mở</div>
                </div>
              </div>
              <div className="auth-stat-tile">
                <span className="material-symbols-outlined !text-xl text-emerald-200">groups</span>
                <div>
                  <div className="text-lg font-black text-white">12K+</div>
                  <div className="text-[11px] font-semibold text-white/60">sinh viên kết nối</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showForgotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <form onSubmit={handleForgotPassword} className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Đặt lại mật khẩu</h2>
                <p className="mt-1 text-sm text-slate-500">Nhập email đã đăng ký, WorkBridge sẽ gửi link đặt lại mật khẩu nếu tài khoản tồn tại.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <span className="material-symbols-outlined !text-xl text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">mail</span>
                <input
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-4 text-sm placeholder:text-slate-400 transition-colors"
                  placeholder="email@example.com"
                  type="email"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={forgotSubmitting}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-dk text-white font-bold text-sm disabled:opacity-60"
              >
                {forgotSubmitting ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
