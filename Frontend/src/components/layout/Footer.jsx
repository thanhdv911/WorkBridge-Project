export default function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-800/50">
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4 group">
              <svg viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-9 w-auto group-hover:scale-105 transition-transform duration-300">
                <circle cx="32" cy="15" r="11" stroke="#1392EC" strokeWidth="4" fill="none"/>
                <path d="M26 18 Q32 22 38 18" stroke="#1392EC" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <path d="M7 68 C7 68 12 46 32 44" stroke="#1392EC" strokeWidth="4" strokeLinecap="round" fill="none"/>
                <path d="M57 68 C57 68 52 46 32 44" stroke="#1392EC" strokeWidth="4" strokeLinecap="round" fill="none"/>
                <path d="M32 44 L26 50" stroke="#1392EC" strokeWidth="3.5" strokeLinecap="round"/>
                <path d="M32 44 L38 50" stroke="#1392EC" strokeWidth="3.5" strokeLinecap="round"/>
                <path d="M29 50 L32 48 L35 50 L32 70 Z" fill="#1A1A2E"/>
              </svg>
              <span className="text-xl font-black tracking-tight flex items-center leading-none">
                <span className="text-slate-900">Work</span>
                <span className="text-[#1392EC]">Bridge</span>
              </span>
            </a>
            <p className="text-sm text-slate-500 leading-relaxed">Connecting students with flexible work opportunities.</p>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-4 uppercase tracking-wider">For Students</h4>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><a href="/jobs" className="hover:text-primary transition-colors">Browse Jobs</a></li>
              <li><a href="/profile" className="hover:text-primary transition-colors">My Profile</a></li>
              <li><a href="/my-applications" className="hover:text-primary transition-colors">Applications</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-4 uppercase tracking-wider">For Employers</h4>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><a href="/post-job" className="hover:text-primary transition-colors">Post a Job</a></li>
              <li><a href="/review-applicants" className="hover:text-primary transition-colors">Review Applicants</a></li>
              <li><a href="/dashboard" className="hover:text-primary transition-colors">Dashboard</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><a href="/about" className="hover:text-primary transition-colors">About</a></li>
              <li><a href="/contact" className="hover:text-primary transition-colors">Contact</a></li>
              <li><a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">&copy; 2026 WorkBridge. All rights reserved.</p>
          <div className="flex gap-3">
            <a href="#" className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors">
              <span className="material-symbols-outlined !text-lg">language</span>
            </a>
            <a href="#" className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors">
              <span className="material-symbols-outlined !text-lg">mail</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
