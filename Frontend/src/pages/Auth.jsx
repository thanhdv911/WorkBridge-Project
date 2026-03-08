import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useGoogleLogin, GoogleLogin } from '@react-oauth/google';
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';
import api from '../services/api';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      toast.success(`Welcome back, ${response.data.fullName}!`);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('userId', response.data.userId);
      localStorage.setItem('fullName', response.data.fullName);
      localStorage.setItem('user', JSON.stringify(response.data));
      
      if (response.data.role === 'Employer') {
        navigate('/employer-dashboard');
      } else {
        navigate('/'); 
      }
    } catch (err) {
      toast.error(err.response?.data || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
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
      toast.success('Account created successfully!');
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('user', JSON.stringify(response.data));
      
      if (response.data.role === 'Employer') {
        navigate('/employer-dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // NOTE: useGoogleLogin by default returns an Access Token, not ID Token
      // To get ID token properly we must use the standard <GoogleLogin> component OR fetch userinfo 
      // Since our API expects an IdToken (from ValidationSettings), we fetch the user profile from google directly
      // OR we can change backend to accept access token. For now, fetch profile and let it pass OR pass access token to backend
      try {
        setIsLoading(true);
        // Best approach with useGoogleLogin (Implicit flow) is to fetch userinfo from Google API first...
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const googleUser = await res.json();
        
        // However, our backend GoogleJsonWebSignature.ValidateAsync expects an ID token.
        // We will need to either adjust backend or use proper GoogleLogin component. 
        // For standard useGoogleLogin, we will just send the access_token and let backend know it is standard oauth, 
        // BUT wait, our backend strictly uses `ValidateAsync(request.IdToken)`.
        // The easiest fix for now is to use the actual ID Token or change backend. Let's assume we use GoogleLogin instead.
      } catch (err) {
        toast.error("Google authentication failed");
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => toast.error('Google Sign-In Failed'),
  });

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/google', { IdToken: credentialResponse.credential });
      toast.success(`Welcome, ${response.data.fullName}!`);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('user', JSON.stringify(response.data));
      if (response.data.role === 'Employer') {
        navigate('/employer-dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data || 'Google Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google login was interrupted or failed.');
  };

  const responseFacebook = async (response) => {
    if (response.accessToken) {
      setIsLoading(true);
      try {
        const res = await api.post('/auth/facebook', { AccessToken: response.accessToken });
        toast.success(`Welcome, ${res.data.fullName}!`);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', res.data.role);
        localStorage.setItem('user', JSON.stringify(res.data));
        if (res.data.role === 'Employer') {
          navigate('/employer-dashboard');
        } else {
          navigate('/');
        }
      } catch (err) {
        toast.error(err.response?.data || 'Facebook login failed.');
      } finally {
        setIsLoading(false);
      }
    } else {
      toast.error('Facebook login was cancelled or failed.');
    }
  };

  // In a real app we'd just use React Router or state, but for the mockup fidelity:
  const heading = isLogin ? 'LOGIN' : 'CREATE ACCOUNT';
  const subHeading = isLogin 
    ? 'Please enter your details to sign in.' 
    : 'Join thousands of students finding their perfect job.';

  // The panels
  const showLogin = () => setIsLogin(true);
  const showRegister = () => setIsLogin(false);

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-50 font-display text-slate-900 min-h-screen flex flex-col antialiased">
      {/* ═══════ HEADER ═══════ */}
      <header className="glass sticky top-0 z-50 border-b border-slate-200/50">
        <div className="max-w-[1320px] mx-auto flex items-center px-6 lg:px-10 h-16">
          <div className="flex-1 flex items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
                <span className="material-symbols-outlined !text-xl text-white">work</span>
              </div>
              <span className="text-lg font-extrabold tracking-tight">Work<span className="text-primary">Bridge</span></span>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link className="text-sm font-medium text-slate-500 hover:text-primary transition-colors" to="/">Home</Link>
            <Link className="text-sm font-medium text-slate-500 hover:text-primary transition-colors" to="/jobs">Find Jobs</Link>
            <Link className="text-sm font-medium text-slate-500 hover:text-primary transition-colors" to="/post-job">Post a Job</Link>
          </nav>
          <div className="flex-1 flex items-center justify-end gap-3">
             {/* Same page, so basically no-op or just set state */}
            <button onClick={showLogin} className="hidden sm:inline-flex items-center h-10 px-5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">Login</button>
            <button onClick={showRegister} className="inline-flex items-center h-10 px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">Sign Up Free</button>
          </div>
        </div>
      </header>

      {/* ═══════ MAIN ═══════ */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative w-full lg:max-h-[calc(100vh-64px)]">
        {/* Background decorative blobs */}
        <div className="blob-deco w-40 h-40 bg-accent/20 -top-10 left-[8%] blur-[60px] hidden md:block"></div>
        <div className="blob-deco w-32 h-32 bg-primary/15 bottom-10 right-[10%] blur-[50px] hidden md:block"></div>

        {/* ═══ AUTH CARD ═══ */}
        <div className="auth-card w-full max-w-[1020px] bg-white rounded-3xl lg:rounded-[2rem] shadow-2xl shadow-slate-300/40 flex flex-col lg:flex-row relative lg:h-[800px] lg:max-h-[calc(100vh-120px)] my-auto mx-auto border border-slate-100">

          {/* Corner blobs */}
          <div className="blob-deco w-20 h-20 bg-accent/30 -top-6 -left-6 blur-[30px] hidden lg:block"></div>
          <div className="blob-deco w-16 h-16 bg-slate-300/40 -bottom-5 -right-5 blur-[25px] hidden lg:block"></div>

          {/* ── LEFT: Form ── */}
          <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 md:px-12 lg:px-14 py-8 lg:py-12 relative z-10 w-full overflow-y-auto">

            {/* Heading */}
            <div className="anim-fadeUp text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{heading}</h2>
              <p className="text-slate-400 mt-2 text-sm">{subHeading}</p>
            </div>

            {/* Login / Register toggle */}
            <div className="anim-fadeUp-d1 flex h-12 w-full max-w-sm mx-auto items-center rounded-2xl bg-slate-100 p-1.5 gap-1 mb-6">
              <button 
                onClick={showLogin} 
                className={`flex-1 h-full rounded-xl text-sm font-bold transition-all ${isLogin ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                Sign In
              </button>
              <button 
                onClick={showRegister} 
                className={`flex-1 h-full rounded-xl text-sm font-bold transition-all ${!isLogin ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                Create Account
              </button>
            </div>

            {/* ════ LOGIN FORM ════ */}
            {isLogin && (
              <form onSubmit={handleLogin} className="flex flex-col gap-4 anim-fadeUp-d2 max-w-sm mx-auto w-full flex-shrink-0">
                
                {/* Username / Email */}
                <div className="relative">
                  <span className="material-symbols-outlined !text-xl text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">person</span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-4 text-sm placeholder:text-slate-400 transition-colors" placeholder="Email" type="email" required />
                </div>

                {/* Password */}
                <div className="relative">
                  <span className="material-symbols-outlined !text-xl text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">lock</span>
                  <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-4 text-sm placeholder:text-slate-400 transition-colors" placeholder="Password" type="password" required />
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input className="rounded border-slate-300 text-primary focus:ring-primary/30 w-4 h-4 cursor-pointer" type="checkbox" defaultChecked/>
                    <span className="text-sm text-slate-500">Remember me</span>
                  </label>
                  <button type="button" className="text-xs font-semibold text-primary hover:text-primary-dk transition-colors">Forgot password?</button>
                </div>

                {/* Submit */}
                <button type="submit" disabled={isLoading} className="flex items-center justify-center rounded-xl h-12 bg-gradient-to-r from-accent to-violet-500 text-white font-bold text-sm shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02] transition-all gap-2 mt-1 disabled:opacity-70 disabled:hover:scale-100">
                  <span>{isLoading ? 'Logging in...' : 'Login Now'}</span>
                  {!isLoading && <span className="material-symbols-outlined !text-xl">arrow_forward</span>}
                </button>

                {/* Divider */}
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold">Login with Others</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Social buttons */}
                <div className="w-full flex justify-center">
                   <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      useOneTap
                      theme="outline"
                      size="large"
                      width="350px"
                      text="signin_with"
                    />
                </div>
                <FacebookLogin
                  appId={import.meta.env.VITE_FACEBOOK_APP_ID}
                  callback={responseFacebook}
                  render={renderProps => (
                    <button 
                      type="button" 
                      onClick={renderProps.onClick}
                      className="flex items-center justify-center gap-3 w-full rounded-xl h-10 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-sm font-semibold transition-all">
                      <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Login with <span className="font-extrabold">Facebook</span>
                    </button>
                  )}
                />

                {/* Switch prompt */}
                <p className="text-center text-sm text-slate-500 mt-2">
                  Don't have an account? <button type="button" onClick={showRegister} className="font-bold text-accent hover:underline">Create Account</button>
                </p>
              </form>
            )}

            {/* ════ REGISTER FORM ════ */}
            {!isLogin && (
              <form onSubmit={handleRegister} className="flex flex-col gap-4 anim-fadeUp-d2 max-w-sm mx-auto w-full pb-4 flex-shrink-0">
                {/* Role toggle */}
                <div className="flex h-11 w-full items-center rounded-xl bg-slate-50 p-1 gap-1 border border-slate-200/60 flex-shrink-0">
                  <label className="tab-toggle flex-1 h-full cursor-pointer relative">
                    <input checked={role === 'Applicant'} onChange={() => setRole('Applicant')} name="reg_role" type="radio" value="Applicant" className="peer sr-only"/>
                    <span className="flex items-center justify-center w-full h-full rounded-lg text-xs font-semibold text-slate-500 transition-all gap-1.5 peer-checked:bg-white peer-checked:text-primary peer-checked:shadow-sm">
                      <span className="material-symbols-outlined !text-[16px]">person</span> Job Seeker
                    </span>
                  </label>
                  <label className="tab-toggle flex-1 h-full cursor-pointer relative">
                    <input checked={role === 'Employer'} onChange={() => setRole('Employer')} name="reg_role" type="radio" value="Employer" className="peer sr-only"/>
                    <span className="flex items-center justify-center w-full h-full rounded-lg text-xs font-semibold text-slate-500 transition-all gap-1.5 peer-checked:bg-white peer-checked:text-primary peer-checked:shadow-sm">
                      <span className="material-symbols-outlined !text-[16px]">business</span> Employer
                    </span>
                  </label>
                </div>

                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="material-symbols-outlined !text-xl text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">person</span>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-3 text-sm placeholder:text-slate-400 transition-colors" placeholder="First name" type="text" required/>
                  </div>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 px-4 text-sm placeholder:text-slate-400 transition-colors" placeholder="Last name" type="text" required/>
                </div>

                {/* Email */}
                <div className="relative">
                  <span className="material-symbols-outlined !text-xl text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">mail</span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-4 text-sm placeholder:text-slate-400 transition-colors" placeholder="you@example.com" type="email" required/>
                </div>

                {/* Password */}
                <div className="relative">
                  <span className="material-symbols-outlined !text-xl text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">lock</span>
                  <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-4 text-sm placeholder:text-slate-400 transition-colors" placeholder="Min. 8 characters" type="password" required minLength="8"/>
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
                  <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 h-12 pl-11 pr-4 text-sm placeholder:text-slate-400 transition-colors" placeholder="Re-enter your password" type="password" required/>
                </div>

                {/* Terms */}
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input required className="rounded border-slate-300 text-accent focus:ring-accent/30 w-4 h-4 mt-0.5 cursor-pointer" type="checkbox"/>
                  <span className="text-sm text-slate-500 leading-relaxed">
                    I agree to the <a href="#" className="text-accent font-semibold hover:underline">Terms of Service</a> and <a href="#" className="text-accent font-semibold hover:underline">Privacy Policy</a>
                  </span>
                </label>

                {/* Submit */}
                <button type="submit" disabled={isLoading} className="flex items-center justify-center rounded-xl h-12 bg-gradient-to-r from-accent to-violet-500 text-white font-bold text-sm shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-[1.02] transition-all gap-2 disabled:opacity-70 disabled:hover:scale-100">
                  <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
                  {!isLoading && <span className="material-symbols-outlined !text-xl">arrow_forward</span>}
                </button>

                {/* Divider */}
                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold">or sign up with</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Social */}
                <div className="w-full flex justify-center">
                   <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      useOneTap
                      theme="outline"
                      size="large"
                      width="350px"
                      text="signup_with"
                    />
                </div>
                <FacebookLogin
                  appId={import.meta.env.VITE_FACEBOOK_APP_ID}
                  callback={responseFacebook}
                  render={renderProps => (
                    <button 
                      type="button" 
                      onClick={renderProps.onClick}
                      className="flex items-center justify-center gap-3 w-full rounded-xl h-10 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-sm font-semibold transition-all">
                      <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Sign up with <span className="font-extrabold">Facebook</span>
                    </button>
                  )}
                />

                {/* Switch prompt */}
                <p className="text-center text-sm text-slate-500 mt-2">
                  Already have an account? <button type="button" onClick={showLogin} className="font-bold text-accent hover:underline">Sign In</button>
                </p>
              </form>
            )}
          </div>

          {/* ── RIGHT: Illustration Panel ── */}
          <div className="hidden lg:flex w-[46%] bg-gradient-to-br from-accent via-violet-500 to-indigo-500 relative overflow-hidden rounded-[2rem] m-3 flex-col items-center justify-center wavy-bg">

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
                  <h3 className="text-white text-xl font-black tracking-tight">Find Your Match</h3>
                  <p className="text-white/70 text-sm mt-1.5 leading-relaxed">Connect with thousands of opportunities tailored for students.</p>
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
                  <div className="text-white/50 text-[11px]">Active jobs</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/10">
                <div className="w-9 h-9 rounded-lg bg-sky-400/20 flex items-center justify-center">
                  <span className="material-symbols-outlined !text-lg text-sky-300">groups</span>
                </div>
                <div>
                  <div className="text-white font-bold text-base">12K+</div>
                  <div className="text-white/50 text-[11px]">Students hired</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
