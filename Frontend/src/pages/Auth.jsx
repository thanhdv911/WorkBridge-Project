import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';
import api from '../services/api';
import toast from 'react-hot-toast';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import WorkBridgeLogo from '../components/shared/WorkBridgeLogo';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  || '336931851953-adc02j9sbgou7oga3t1uiu6abfe7av80.apps.googleusercontent.com';
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || '2748475085516950';

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
  const hasGoogleLogin = Boolean(GOOGLE_CLIENT_ID);
  const hasFacebookLogin = Boolean(FACEBOOK_APP_ID);

  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);

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
      toast.error(err.response?.data || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
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
      toast.success('Tạo tài khoản thành công!');
      persistSession(response.data);

      if (response.data.role === 'Employer') {
        navigate('/employer-dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
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
      toast.error(err.response?.data || 'Đăng nhập Google thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Đăng nhập Google bị gián đoạn hoặc thất bại.');
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
      toast.error(err.response?.data?.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  const responseFacebook = async (response) => {
    if (response.accessToken) {
      setIsLoading(true);
      try {
        const res = await api.post('/auth/facebook', { AccessToken: response.accessToken });
        toast.success(`Chào mừng, ${res.data.fullName}!`);
        persistSession(res.data);
        if (res.data.role === 'Employer') {
          navigate('/employer-dashboard');
        } else {
          navigate('/');
        }
      } catch (err) {
        toast.error(err.response?.data || 'Đăng nhập Facebook thất bại.');
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.error('Đăng nhập Facebook bị hủy hoặc thất bại.');
    }
  };

  // In a real app we'd just use React Router or state, but for the mockup fidelity:
  const heading = isLogin ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ';
  const subHeading = isLogin
    ? 'Vui lòng nhập thông tin để đăng nhập.'
    : 'Tham gia cùng hàng nghìn sinh viên tìm được việc làm lý tưởng.';

  // The panels
  const showLogin = () => {
    setIsLogin(true);
    if (location.pathname !== '/login') {
      navigate('/login');
    }
  };

  const showRegister = () => {
    setIsLogin(false);
    if (location.pathname !== '/signup') {
      navigate('/signup');
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-50 font-display text-slate-900 min-h-screen flex flex-col antialiased overflow-x-hidden">
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
            <button onClick={showLogin} className="hidden sm:inline-flex items-center h-10 px-5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">Đăng nhập</button>
            <button onClick={showRegister} className="inline-flex items-center h-10 px-3 sm:px-5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all whitespace-nowrap">Đăng ký miễn phí</button>
          </div>
        </div>
      </header>

      {/* ═══════ MAIN ═══════ */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 relative w-full overflow-x-hidden">
        {/* Background decorative blobs */}
        <div className="blob-deco w-40 h-40 bg-accent/20 -top-10 left-[8%] blur-[60px] hidden md:block"></div>
        <div className="blob-deco w-32 h-32 bg-primary/15 bottom-10 right-[10%] blur-[50px] hidden md:block"></div>

        {/* ═══ AUTH CARD ═══ */}
        <div className="auth-card w-full max-w-[980px] bg-white rounded-3xl lg:rounded-[2rem] shadow-2xl shadow-slate-300/40 grid xl:grid-cols-[minmax(0,1fr)_420px] relative my-auto mx-auto border border-slate-100 overflow-hidden">

          {/* Corner blobs */}
          <div className="blob-deco w-20 h-20 bg-accent/30 -top-6 -left-6 blur-[30px] hidden lg:block"></div>
          <div className="blob-deco w-16 h-16 bg-slate-300/40 -bottom-5 -right-5 blur-[25px] hidden lg:block"></div>

          {/* ── LEFT: Form ── */}
          <div className="min-w-0 flex flex-col justify-center px-5 sm:px-8 lg:px-10 py-7 sm:py-9 lg:py-10 relative z-10 w-full">

            {/* Heading */}
            <div className="anim-fadeUp text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{heading}</h2>
              <p className="text-slate-400 mt-2 text-sm">{subHeading}</p>
            </div>

            {/* Login / Register toggle */}
            <div className="anim-fadeUp-d1 flex h-12 w-full max-w-[320px] sm:max-w-sm mx-auto items-center rounded-2xl bg-slate-100 p-1.5 gap-1 mb-6">
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
                  <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-4 text-sm placeholder:text-slate-400 transition-colors" placeholder="Mật khẩu" type="password" required />
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
                <button type="submit" disabled={isLoading} className="flex items-center justify-center rounded-xl h-12 bg-gradient-to-r from-accent to-violet-500 text-white font-bold text-sm shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02] transition-all gap-2 mt-1 disabled:opacity-70 disabled:hover:scale-100">
                  <span>{isLoading ? 'Đang đăng nhập...' : 'Đăng nhập ngay'}</span>
                  {!isLoading && <span className="material-symbols-outlined !text-xl">arrow_forward</span>}
                </button>

                {(hasGoogleLogin || hasFacebookLogin) && (
                  <ErrorBoundary fallback={<p className="text-center text-xs text-slate-400">Đăng nhập mạng xã hội tạm thời không khả dụng.</p>}>
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold">Đăng nhập bằng cách khác</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    {hasGoogleLogin && (
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
                    )}
                    {hasFacebookLogin && (
                      <FacebookLogin
                        appId={FACEBOOK_APP_ID}
                        callback={responseFacebook}
                        render={renderProps => (
                          <button
                            type="button"
                            onClick={renderProps.onClick}
                            className="flex items-center justify-center gap-3 w-full rounded-xl h-10 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-sm font-semibold transition-all">
                            <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            Đăng nhập với <span className="font-extrabold">Facebook</span>
                          </button>
                        )}
                      />
                    )}
                  </ErrorBoundary>
                )}

                {/* Switch prompt */}
                <p className="text-center text-sm text-slate-500 mt-2">
                  Chưa có tài khoản? <button type="button" onClick={showRegister} className="font-bold text-accent hover:underline">Đăng ký</button>
                </p>
              </form>
            )}

            {/* ════ REGISTER FORM ════ */}
            {!isLogin && (
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
                  <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-4 text-sm placeholder:text-slate-400 transition-colors" placeholder="Tối thiểu 8 ký tự" type="password" required minLength="8"/>
                </div>

                {/* Password strength (Dynamic but currently simple UI representation) */}
                <div className="flex gap-1.5">
                  <div className={`h-1 flex-1 rounded-full ${password.length > 0 ? 'bg-accent' : 'bg-slate-200'}`}></div>
                  <div className={`h-1 flex-1 rounded-full ${password.length >= 4 ? 'bg-accent' : 'bg-slate-200'}`}></div>
                  <div className={`h-1 flex-1 rounded-full ${password.length >= 8 ? 'bg-accent' : 'bg-slate-200'}`}></div>
                  <div className={`h-1 flex-1 rounded-full ${password.length >= 10 && /[A-Z]/.test(password) ? 'bg-accent' : 'bg-slate-200'}`}></div>
                </div>

                {/* Confirm password */}
                <div className="relative">
                  <span className="material-symbols-outlined !text-xl text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">lock</span>
                  <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-4 text-sm placeholder:text-slate-400 transition-colors" placeholder="Nhập lại mật khẩu" type="password" required/>
                </div>

                {/* Terms */}
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input required className="rounded border-slate-300 text-accent focus:ring-accent/30 w-4 h-4 mt-0.5 cursor-pointer" type="checkbox"/>
                  <span className="text-sm text-slate-500 leading-relaxed">
                    Tôi đồng ý với <a href="#" className="text-accent font-semibold hover:underline">Điều khoản dịch vụ</a> và <a href="#" className="text-accent font-semibold hover:underline">Chính sách bảo mật</a>
                  </span>
                </label>

                {/* Submit */}
                <button type="submit" disabled={isLoading} className="flex items-center justify-center rounded-xl h-12 bg-gradient-to-r from-accent to-violet-500 text-white font-bold text-sm shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02] transition-all gap-2 disabled:opacity-70 disabled:hover:scale-100">
                  <span>{isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}</span>
                  {!isLoading && <span className="material-symbols-outlined !text-xl">arrow_forward</span>}
                </button>

                {(hasGoogleLogin || hasFacebookLogin) && (
                  <ErrorBoundary fallback={<p className="text-center text-xs text-slate-400">Đăng ký mạng xã hội tạm thời không khả dụng.</p>}>
                    <div className="relative flex items-center py-1">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold">hoặc đăng ký với</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    {hasGoogleLogin && (
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
                    )}
                    {hasFacebookLogin && (
                      <FacebookLogin
                        appId={FACEBOOK_APP_ID}
                        callback={responseFacebook}
                        render={renderProps => (
                          <button
                            type="button"
                            onClick={renderProps.onClick}
                            className="flex items-center justify-center gap-3 w-full rounded-xl h-10 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-sm font-semibold transition-all">
                            <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                            Đăng ký với <span className="font-extrabold">Facebook</span>
                          </button>
                        )}
                      />
                    )}
                  </ErrorBoundary>
                )}

                {/* Switch prompt */}
                <p className="text-center text-sm text-slate-500 mt-2">
                  Đã có tài khoản? <button type="button" onClick={showLogin} className="font-bold text-accent hover:underline">Đăng nhập</button>
                </p>
              </form>
            )}
          </div>

          {/* ── RIGHT: Illustration Panel ── */}
          <div className="hidden xl:flex min-h-[620px] bg-gradient-to-br from-accent via-violet-500 to-indigo-500 relative overflow-hidden rounded-[2rem] m-3 flex-col items-center justify-center wavy-bg">

            {/* Decorative organic shapes */}
            <div className="blob-deco w-60 h-60 bg-white/10 -top-16 -right-16 blur-[40px]"></div>
            <div className="blob-deco w-40 h-40 bg-indigo-400/20 bottom-10 -left-10 blur-[30px]"></div>

            {/* Wavy decorative arcs */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.06]" viewBox="0 0 500 500" fill="none">
              <path d="M-50 250c80-120 180 60 280-20s180 100 280-10" stroke="white" strokeWidth="1.5"/>
              <path d="M-50 300c80-120 180 60 280-20s180 100 280-10" stroke="white" strokeWidth="1.5"/>
              <path d="M-50 200c80-120 180 60 280-20s180 100 280-10" stroke="white" strokeWidth="1.5"/>
              <path d="M-50 350c80-100 160 40 260-20s200 100 280-10" stroke="white" strokeWidth="1"/>
              <path d="M-50 150c80-100 160 40 260-20s200 100 280-10" stroke="white" strokeWidth="1"/>
            </svg>

            {/* Glass card with illustration content */}
            <div className="relative z-10 flex flex-col items-center gap-6 px-8">
              {/* Glass frame */}
              <div className="anim-fadeLeft bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl shadow-black/10 flex flex-col items-center gap-5 max-w-[300px]">
                {/* Big icon illustration */}
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur flex items-center justify-center border border-white/20">
                  <span className="material-symbols-outlined !text-6xl text-white/90">handshake</span>
                </div>
                <div className="text-center">
                  <h3 className="text-white text-xl font-black tracking-tight">Tìm Việc Phù Hợp</h3>
                  <p className="text-white/70 text-sm mt-1.5 leading-relaxed">Kết nối với hàng nghìn cơ hội dành riêng cho sinh viên.</p>
                </div>
              </div>

              {/* Floating badge */}
              <div className="anim-float absolute -right-4 top-1/2 -translate-y-1/2">
                <div className="w-12 h-12 rounded-full bg-white shadow-lg shadow-black/10 flex items-center justify-center">
                  <span className="material-symbols-outlined filled !text-2xl text-amber-500">bolt</span>
                </div>
              </div>
            </div>

            {/* Bottom stats row */}
            <div className="relative z-10 flex items-center gap-6 mt-8 px-8">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/10">
                <div className="w-9 h-9 rounded-lg bg-emerald-400/20 flex items-center justify-center">
                  <span className="material-symbols-outlined !text-lg text-emerald-300">trending_up</span>
                </div>
                <div>
                  <div className="text-white font-bold text-base">5,000+</div>
                  <div className="text-white/50 text-[11px]">Việc đang tuyển</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/10">
                <div className="w-9 h-9 rounded-lg bg-sky-400/20 flex items-center justify-center">
                  <span className="material-symbols-outlined !text-lg text-sky-300">groups</span>
                </div>
                <div>
                  <div className="text-white font-bold text-base">12K+</div>
                  <div className="text-white/50 text-[11px]">Sinh viên được tuyển</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {showForgotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
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
