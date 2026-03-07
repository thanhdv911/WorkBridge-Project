export default function Header() {
  return (
    <header className="glass sticky top-0 z-50 border-b border-slate-200/50">
      <div className="max-w-[1320px] mx-auto flex items-center px-6 lg:px-10 h-16">
        <div className="flex-1 flex items-center">
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
              <span className="material-symbols-outlined !text-xl text-white">work</span>
            </div>
            <span className="text-lg font-extrabold tracking-tight">
              Work<span className="text-primary">Bridge</span>
            </span>
          </a>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a className="relative text-sm font-semibold text-primary after:absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-primary after:rounded" href="/">
            Home
          </a>
          <a className="text-sm font-medium text-slate-500 hover:text-primary transition-colors" href="/jobs">
            Find Jobs
          </a>
          <a className="text-sm font-medium text-slate-500 hover:text-primary transition-colors" href="/post-job">
            Post a Job
          </a>
        </nav>
        <div className="flex-1 flex items-center justify-end gap-3">
          <a href="/login" className="hidden sm:inline-flex items-center h-10 px-5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
            Login
          </a>
          <a href="/signup" className="inline-flex items-center h-10 px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
            Sign Up Free
          </a>
        </div>
      </div>
    </header>
  );
}
