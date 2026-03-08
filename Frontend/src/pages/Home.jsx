import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <Categories />
      <HowItWorks />
      <LatestJobs />
      <Testimonials />
      <CTA />
    </>
  );
}

function Hero() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (location) params.set('location', location);
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="hero-blob w-[520px] h-[520px] bg-[radial-gradient(circle,rgba(19,146,236,.16),transparent_70%)] -top-28 -right-20 absolute"></div>
      <div className="hero-blob w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(124,58,237,.12),transparent_70%)] -bottom-24 -left-16 absolute"></div>

      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-10 items-center">
          {/* Left */}
          <div className="max-w-xl">
            <div className="anim-fadeUp inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6">
              <span className="material-symbols-outlined !text-[15px]">trending_up</span>
              #1 Platform for Part-Time Jobs
            </div>

            <h1 className="anim-fadeUp-d1 text-4xl sm:text-5xl lg:text-[3.4rem] font-black leading-[1.1] tracking-tight">
              Find Your <span className="grad-text">Perfect</span><br />Part-Time Job
            </h1>

            <p className="anim-fadeUp-d2 mt-6 text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
              Connecting students with flexible work. Build experience, earn income, and grow your career — on your own schedule.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="anim-fadeUp-d3 mt-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/70 dark:border-slate-700/50 p-2 flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 border border-transparent focus-within:border-primary/40 transition-colors">
                <span className="material-symbols-outlined text-slate-400 !text-xl">search</span>
                <input
                  className="w-full bg-transparent border-none focus:outline-none placeholder-slate-400 h-12 px-3 text-sm"
                  placeholder="Job title, keywords..."
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                />
              </div>
              <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 border border-transparent focus-within:border-primary/40 transition-colors">
                <span className="material-symbols-outlined text-slate-400 !text-xl">location_on</span>
                <input
                  className="w-full bg-transparent border-none focus:outline-none placeholder-slate-400 h-12 px-3 text-sm"
                  placeholder="City or district..."
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>
              <button type="submit" className="h-12 px-7 bg-gradient-to-r from-primary to-primary-dk text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all whitespace-nowrap flex items-center gap-2">
                <span className="material-symbols-outlined !text-xl">search</span> Search
              </button>
            </form>

            {/* Trust */}
            <div className="anim-fadeUp-d4 mt-6 flex flex-wrap items-center gap-5 text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined filled !text-[17px] text-amber-400">star</span>4.8 / 5 rating</span>
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined !text-[17px] text-green-500">verified</span>Verified employers</span>
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined !text-[17px] text-primary">bolt</span>Instant apply</span>
            </div>
          </div>

          {/* Right — floating cards */}
          <div className="hidden lg:flex justify-center relative min-h-[430px]">
            <div className="absolute w-[360px] h-[360px] rounded-full bg-gradient-to-br from-primary/8 to-accent/8 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            {/* Card A */}
            <div className="anim-float absolute top-2 left-6 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-5 w-[258px]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white font-bold text-sm shadow-md">SB</div>
                <div>
                  <div className="text-sm font-bold">Barista</div>
                  <div className="text-xs text-slate-400">Starbucks &bull; NYC</div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-md">$17.50/hr</span>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-2 py-0.5 rounded-md">Part-Time</span>
              </div>
            </div>
            {/* Card B */}
            <div className="anim-float-d absolute bottom-6 right-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-5 w-[246px]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">FD</div>
                <div>
                  <div className="text-sm font-bold">Delivery Driver</div>
                  <div className="text-xs text-slate-400">FastDash &bull; Ho Chi Minh City</div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-md">100k/hr</span>
                <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-md">Weekends</span>
              </div>
            </div>
            {/* Card C — mini notification */}
            <div className="anim-float absolute top-1/2 right-0 -translate-y-1/2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500 !text-xl">check_circle</span>
              </div>
              <div>
                <div className="text-sm font-bold">Application Sent!</div>
                <div className="text-xs text-slate-400">Just now</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/home/stats')
      .then(res => setStats(res.data))
      .catch(() => {}); // keep null on error → shows placeholders
  }, []);

  const items = [
    { value: stats ? `${stats.totalJobs?.toLocaleString()}+` : '...', label: 'Active Jobs' },
    { value: stats ? `${stats.totalEmployers?.toLocaleString()}+` : '...', label: 'Employers' },
    { value: stats ? `${stats.totalUsers?.toLocaleString()}+` : '...', label: 'Students Joined' },
    { value: stats ? `${stats.totalApplications?.toLocaleString()}+` : '...', label: 'Applications' },
  ];

  return (
    <section className="relative -mt-5 z-10 max-w-[1120px] mx-auto px-6 lg:px-10">
      <div className="bg-white dark:bg-slate-800/80 backdrop-blur rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border border-slate-200/50 dark:border-slate-700/40 grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 dark:divide-slate-700/40">
        {items.map((item, i) => (
          <div key={i} className="p-6 md:p-8 text-center">
            <div className="text-3xl md:text-4xl font-extrabold text-primary anim-countPop" style={{ animationDelay: `${i * 0.12}s` }}>
              {item.value}
            </div>
            <div className="text-sm text-slate-500 mt-1 font-medium">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const CATEGORY_ICONS = {
  default: { icon: 'work', gradient: 'from-slate-400 to-slate-500', shadow: 'shadow-slate-200/60' },
  'food': { icon: 'restaurant', gradient: 'from-orange-400 to-rose-500', shadow: 'shadow-orange-200/60' },
  'beverage': { icon: 'local_cafe', gradient: 'from-orange-400 to-amber-500', shadow: 'shadow-orange-200/60' },
  'tutor': { icon: 'school', gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-200/60' },
  'delivery': { icon: 'local_shipping', gradient: 'from-sky-400 to-blue-600', shadow: 'shadow-sky-200/60' },
  'retail': { icon: 'storefront', gradient: 'from-emerald-400 to-teal-600', shadow: 'shadow-emerald-200/60' },
  'tech': { icon: 'code', gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-200/60' },
  'design': { icon: 'palette', gradient: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-200/60' },
  'marketing': { icon: 'campaign', gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-200/60' },
  'admin': { icon: 'admin_panel_settings', gradient: 'from-gray-500 to-slate-600', shadow: 'shadow-gray-200/60' },
};

function getCategoryStyle(name) {
  if (!name) return CATEGORY_ICONS.default;
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_ICONS)) {
    if (key !== 'default' && lower.includes(key)) return val;
  }
  return CATEGORY_ICONS.default;
}

function Categories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/admin/categories')
      .then(res => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  return (
    <section className="max-w-[1320px] mx-auto px-6 lg:px-10 mt-20">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Browse by <span className="grad-text">Category</span></h2>
          <p className="text-slate-500 mt-2 text-sm">Explore opportunities in the fields you love</p>
        </div>
        <a className="hidden sm:inline-flex items-center gap-1 text-primary hover:text-primary-dk font-semibold text-sm" href="/jobs">
          View all <span className="material-symbols-outlined !text-[18px]">arrow_forward</span>
        </a>
      </div>

      {categories.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 p-7 animate-pulse">
              <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 mx-auto mb-4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded mx-auto w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {categories.slice(0, 8).map(cat => {
            const style = getCategoryStyle(cat.categoryName);
            return (
              <a
                key={cat.categoryId}
                className="card-lift flex flex-col items-center gap-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 p-7 group"
                href={`/jobs?category=${cat.categoryId}`}
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${style.gradient} flex items-center justify-center text-white shadow-lg ${style.shadow} group-hover:scale-110 transition-transform`}>
                  <span className="material-symbols-outlined !text-3xl">{style.icon}</span>
                </div>
                <div className="text-center">
                  <h3 className="font-bold">{cat.categoryName}</h3>
                  <p className="text-slate-400 text-sm mt-1">{cat.jobCount ?? 0} jobs</p>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="max-w-[1320px] mx-auto px-6 lg:px-10 py-20">
      <div className="text-center mb-14">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">How It <span className="grad-text">Works</span></h2>
        <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">Three simple steps to your next opportunity</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
        {/* Connector */}
        <div className="hidden md:block absolute top-[40px] left-[16.67%] right-[16.67%] h-[2px] bg-gradient-to-r from-primary/20 via-accent/20 to-emerald-400/20"></div>
        {[
          { num: '1', title: 'Create Profile', desc: 'Sign up and build your student profile in under 3 minutes. Highlight skills and availability.', gradient: 'from-primary to-sky-400', shadow: 'shadow-primary/20' },
          { num: '2', title: 'Discover Jobs', desc: 'Browse curated part-time positions matched to your schedule, location, and interests.', gradient: 'from-accent to-purple-400', shadow: 'shadow-accent/20' },
          { num: '3', title: 'Apply & Get Hired', desc: 'One-click apply and track progress. Employers respond fast — most within 48 hours.', gradient: 'from-emerald-500 to-teal-400', shadow: 'shadow-emerald-300/20' },
        ].map(step => (
          <div key={step.num} className="flex flex-col items-center text-center group">
            <div className={`relative z-10 w-[72px] h-[72px] rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white font-extrabold text-2xl shadow-lg ${step.shadow} group-hover:scale-110 transition-transform`}>{step.num}</div>
            <h3 className="text-lg font-bold mt-5 mb-2">{step.title}</h3>
            <p className="text-sm text-slate-500 max-w-[260px]">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Recently';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const EMPLOYER_COLORS = [
  'from-blue-500 to-sky-400',
  'from-violet-500 to-purple-600',
  'from-orange-400 to-amber-500',
  'from-emerald-500 to-teal-400',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-600',
];

function LatestJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/home/latest-jobs')
      .then(res => { setJobs(res.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section className="bg-white dark:bg-slate-900/40 border-y border-slate-100 dark:border-slate-800/50 py-20">
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
        <div className="flex items-end justify-between mb-9">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Latest <span className="grad-text">Jobs</span></h2>
            <p className="text-slate-500 mt-2 text-sm">Fresh opportunities posted today</p>
          </div>
          <a className="hidden sm:inline-flex items-center gap-1 text-primary font-semibold text-sm" href="/jobs">
            View all <span className="material-symbols-outlined !text-[18px]">arrow_forward</span>
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 p-6 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
                  <div className="w-16 h-6 rounded-lg bg-slate-100 dark:bg-slate-700"></div>
                </div>
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded w-1/2 mb-4"></div>
                <div className="flex gap-2 mb-6">
                  <div className="h-7 bg-slate-100 dark:bg-slate-700/50 rounded-lg w-24"></div>
                  <div className="h-7 bg-slate-100 dark:bg-slate-700/50 rounded-lg w-24"></div>
                </div>
                <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded w-24"></div>
                  <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded-xl w-24"></div>
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <span className="material-symbols-outlined !text-5xl mb-3 block">work_off</span>
            <p>No jobs available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {jobs.map((job, idx) => {
              const initials = getInitials(job.companyName);
              const colorClass = EMPLOYER_COLORS[idx % EMPLOYER_COLORS.length];
              const isNew = job.createdAt && (Date.now() - new Date(job.createdAt)) < 24 * 3600 * 1000;

              return (
                <div key={job.jobPostId} className="card-lift bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 p-6 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    {job.companyLogoUrl ? (
                      <img src={job.companyLogoUrl} alt={job.companyName} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold shadow-md`}>
                        {initials}
                      </div>
                    )}
                    {isNew ? (
                      <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> New
                      </span>
                    ) : job.jobType === 'Remote' ? (
                      <span className="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 text-[11px] font-bold px-2.5 py-1 rounded-lg">Remote</span>
                    ) : null}
                  </div>

                  <h3 className="text-lg font-bold mb-1">{job.title}</h3>
                  <p className="text-slate-500 text-sm mb-4">{job.companyName} &bull; {job.location || 'Vietnam'}</p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined !text-[14px] text-slate-400">schedule</span>
                      {job.jobType}
                    </span>
                    {job.payRate && (
                      <span className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                        <span className="material-symbols-outlined !text-[14px] text-green-500">payments</span>
                        {job.payRate.toLocaleString()}/{job.payUnit}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <span className="material-symbols-outlined !text-[14px]">schedule</span>
                      {timeAgo(job.createdAt)}
                    </span>
                    <a
                      href={`/jobs/${job.jobPostId}`}
                      className="inline-flex items-center gap-1 text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
                    >
                      Apply <span className="material-symbols-outlined !text-[16px]">arrow_forward</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <a href="/jobs" className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary font-semibold py-3 px-8 rounded-xl transition-all shadow-sm hover:shadow-md">
            <span className="material-symbols-outlined !text-xl">grid_view</span> Browse All Jobs
          </a>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="max-w-[1320px] mx-auto px-6 lg:px-10 py-20">
      <div className="text-center mb-14">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">What Students <span className="grad-text">Say</span></h2>
        <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">Join thousands who found their perfect part-time job</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { initials: 'AT', name: 'An Tran', role: 'CS Student • FIT', gradient: 'from-pink-400 to-rose-500', stars: 5, text: '"Found a perfect tutoring gig that fits my class schedule. Applied on Monday, got hired by Wednesday!"' },
          { initials: 'ML', name: 'Minh Le', role: 'Marketing • NEU', gradient: 'from-sky-400 to-blue-600', stars: 5, text: '"The quality of employers here is way better than other platforms. I\'ve been working at an amazing café for 3 months — found it here."' },
          { initials: 'SP', name: 'Sarah Park', role: 'Design • RMIT', gradient: 'from-emerald-400 to-teal-500', stars: 4, text: '"Love the instant apply feature! Applied for 5 positions in one evening and had 3 interviews by the weekend."' },
        ].map((t, i) => (
          <div key={i} className="quote-card relative card-lift bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-sm`}>{t.initials}</div>
              <div>
                <div className="font-bold text-sm">{t.name}</div>
                <div className="text-xs text-slate-400">{t.role}</div>
              </div>
            </div>
            <div className="flex gap-0.5 mb-3">
              {[...Array(5)].map((_, s) => (
                <span key={s} className={`material-symbols-outlined ${s < t.stars ? 'filled' : ''} !text-[16px] text-amber-400`}>star</span>
              ))}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{t.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="max-w-[1320px] mx-auto px-6 lg:px-10 pb-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 md:p-16">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/15 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-lg text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">Ready to Find Your Next Opportunity?</h2>
            <p className="text-slate-300 mt-3 leading-relaxed">Join thousands of students already earning while learning. Create your free account and start applying today.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="/auth" className="inline-flex items-center justify-center h-12 px-8 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-sky-400 hover:shadow-xl hover:shadow-primary/30 transition-all anim-pulse-glow">
              Get Started Free <span className="material-symbols-outlined !text-xl ml-2">arrow_forward</span>
            </a>
            <a href="/jobs" className="inline-flex items-center justify-center h-12 px-8 rounded-xl text-sm font-semibold text-slate-200 border border-slate-600 hover:border-slate-400 hover:text-white transition-colors">
              Browse Jobs
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
