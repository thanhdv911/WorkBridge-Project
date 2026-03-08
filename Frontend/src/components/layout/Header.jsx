import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    toast.success('Logged out successfully');
    navigate('/login');
  };
  
  return (
    <header className="glass sticky top-0 z-50 border-b border-slate-200/50">
      <div className="max-w-[1320px] mx-auto flex items-center px-6 lg:px-10 h-16">
        <div className="flex-1 flex items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
              <span className="material-symbols-outlined !text-xl text-white">work</span>
            </div>
            <span className="text-lg font-extrabold tracking-tight">
              Work<span className="text-primary">Bridge</span>
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
          {isLoggedIn && userRole !== 'Employer' && (
            <Link 
              to="/profile" 
              className={`text-sm font-semibold transition-colors ${location.pathname === '/profile' ? 'text-primary relative after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded' : 'text-slate-500 hover:text-primary'}`}
            >
              Profile
            </Link>
          )}
        </nav>
        <div className="flex-1 flex items-center justify-end gap-3">
          {isLoggedIn ? (
            <>
              <button className="relative w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors tooltip-trigger">
                <span className="material-symbols-outlined text-slate-500 !text-xl">notifications</span>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] text-white font-bold flex items-center justify-center">2</span>
              </button>
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
