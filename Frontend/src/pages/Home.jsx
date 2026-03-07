import React from 'react';

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
            <div className="anim-fadeUp-d3 mt-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/70 dark:border-slate-700/50 p-2 flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 border border-transparent focus-within:border-primary/40 transition-colors">
                <span className="material-symbols-outlined text-slate-400 !text-xl">search</span>
                <input className="w-full bg-transparent border-none focus:outline-none placeholder-slate-400 h-12 px-3 text-sm" placeholder="Job title, keywords..." type="text" />
              </div>
              <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-3 border border-transparent focus-within:border-primary/40 transition-colors">
                <span className="material-symbols-outlined text-slate-400 !text-xl">location_on</span>
                <input className="w-full bg-transparent border-none focus:outline-none placeholder-slate-400 h-12 px-3 text-sm" placeholder="City or remote..." type="text" />
              </div>
              <button className="h-12 px-7 bg-gradient-to-r from-primary to-primary-dk text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all whitespace-nowrap flex items-center gap-2">
                <span className="material-symbols-outlined !text-xl">search</span> Search
              </button>
            </div>

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
                  <div className="text-xs text-slate-400">FastDash &bull; Chicago</div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-md">$20/hr + Tips</span>
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
  return (
    <section className="relative -mt-5 z-10 max-w-[1120px] mx-auto px-6 lg:px-10">
      <div className="bg-white dark:bg-slate-800/80 backdrop-blur rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-slate-900/40 border border-slate-200/50 dark:border-slate-700/40 grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 dark:divide-slate-700/40">
        <div className="p-6 md:p-8 text-center">
          <div className="text-3xl md:text-4xl font-extrabold text-primary anim-countPop">5,000+</div>
          <div className="text-sm text-slate-500 mt-1 font-medium">Active Jobs</div>
        </div>
        <div className="p-6 md:p-8 text-center">
          <div className="text-3xl md:text-4xl font-extrabold text-primary anim-countPop" style={{ animationDelay: '.12s' }}>320+</div>
          <div className="text-sm text-slate-500 mt-1 font-medium">Employers</div>
        </div>
        <div className="p-6 md:p-8 text-center">
          <div className="text-3xl md:text-4xl font-extrabold text-primary anim-countPop" style={{ animationDelay: '.24s' }}>12K+</div>
          <div className="text-sm text-slate-500 mt-1 font-medium">Students Hired</div>
        </div>
        <div className="p-6 md:p-8 text-center">
          <div className="text-3xl md:text-4xl font-extrabold text-primary anim-countPop" style={{ animationDelay: '.36s' }}>95%</div>
          <div className="text-sm text-slate-500 mt-1 font-medium">Satisfaction</div>
        </div>
      </div>
    </section>
  );
}

function Categories() {
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        <a className="card-lift flex flex-col items-center gap-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 p-7 group" href="/jobs">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-200/60 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined !text-3xl">restaurant</span>
          </div>
          <div className="text-center">
            <h3 className="font-bold">Food &amp; Beverage</h3>
            <p className="text-slate-400 text-sm mt-1">1,204 jobs</p>
          </div>
        </a>
        <a className="card-lift flex flex-col items-center gap-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 p-7 group" href="/jobs">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-violet-200/60 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined !text-3xl">school</span>
          </div>
          <div className="text-center">
            <h3 className="font-bold">Tutoring</h3>
            <p className="text-slate-400 text-sm mt-1">856 jobs</p>
          </div>
        </a>
        <a className="card-lift flex flex-col items-center gap-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 p-7 group" href="/jobs">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-200/60 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined !text-3xl">local_shipping</span>
          </div>
          <div className="text-center">
            <h3 className="font-bold">Delivery</h3>
            <p className="text-slate-400 text-sm mt-1">2,341 jobs</p>
          </div>
        </a>
        <a className="card-lift flex flex-col items-center gap-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 p-7 group" href="/jobs">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200/60 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined !text-3xl">storefront</span>
          </div>
          <div className="text-center">
            <h3 className="font-bold">Retail</h3>
            <p className="text-slate-400 text-sm mt-1">1,890 jobs</p>
          </div>
        </a>
      </div>
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
        {/* Step 1 */}
        <div className="flex flex-col items-center text-center group">
          <div className="relative z-10 w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-primary to-sky-400 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">1</div>
          <h3 className="text-lg font-bold mt-5 mb-2">Create Profile</h3>
          <p className="text-sm text-slate-500 max-w-[260px]">Sign up and build your student profile in under 3 minutes. Highlight skills and availability.</p>
        </div>
        {/* Step 2 */}
        <div className="flex flex-col items-center text-center group">
          <div className="relative z-10 w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-accent to-purple-400 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-accent/20 group-hover:scale-110 transition-transform">2</div>
          <h3 className="text-lg font-bold mt-5 mb-2">Discover Jobs</h3>
          <p className="text-sm text-slate-500 max-w-[260px]">Browse curated part-time positions matched to your schedule, location, and interests.</p>
        </div>
        {/* Step 3 */}
        <div className="flex flex-col items-center text-center group">
          <div className="relative z-10 w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-emerald-300/20 group-hover:scale-110 transition-transform">3</div>
          <h3 className="text-lg font-bold mt-5 mb-2">Apply &amp; Get Hired</h3>
          <p className="text-sm text-slate-500 max-w-[260px]">One-click apply and track progress. Employers respond fast — most within 48 hours.</p>
        </div>
      </div>
    </section>
  );
}

function LatestJobs() {
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Job 1 */}
          <div className="card-lift bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white font-bold shadow-md">SB</div>
              <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> New
              </span>
            </div>
            <h3 className="text-lg font-bold mb-1">Barista (Part-Time)</h3>
            <p className="text-slate-500 text-sm mb-4">Starbucks &bull; New York, NY</p>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined !text-[14px] text-slate-400">schedule</span>15-20 hrs/wk
              </span>
              <span className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined !text-[14px] text-green-500">payments</span>$17.50/hr
              </span>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1"><span className="material-symbols-outlined !text-[14px]">schedule</span>2 hours ago</span>
              <a href="/jobs/1" className="inline-flex items-center gap-1 text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all">Apply <span className="material-symbols-outlined !text-[16px]">arrow_forward</span></a>
            </div>
          </div>

          {/* Job 2 */}
          <div className="card-lift bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold shadow-md">AM</div>
              <span className="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 text-[11px] font-bold px-2.5 py-1 rounded-lg">Remote</span>
            </div>
            <h3 className="text-lg font-bold mb-1">Math Tutor</h3>
            <p className="text-slate-500 text-sm mb-4">Academic Masters &bull; Remote</p>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined !text-[14px] text-slate-400">schedule</span>Flexible
              </span>
              <span className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined !text-[14px] text-green-500">payments</span>$25.00/hr
              </span>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1"><span className="material-symbols-outlined !text-[14px]">schedule</span>5 hours ago</span>
              <a href="/jobs/2" className="inline-flex items-center gap-1 text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all">Apply <span className="material-symbols-outlined !text-[16px]">arrow_forward</span></a>
            </div>
          </div>

          {/* Job 3 */}
          <div className="card-lift bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">FD</div>
              <span className="bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                <span className="material-symbols-outlined !text-[14px]">local_fire_department</span> Urgent
              </span>
            </div>
            <h3 className="text-lg font-bold mb-1">Delivery Driver</h3>
            <p className="text-slate-500 text-sm mb-4">FastDash &bull; Chicago, IL</p>
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined !text-[14px] text-slate-400">schedule</span>Weekends
              </span>
              <span className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined !text-[14px] text-green-500">payments</span>$20/hr + Tips
              </span>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1"><span className="material-symbols-outlined !text-[14px]">schedule</span>1 day ago</span>
              <a href="/jobs/3" className="inline-flex items-center gap-1 text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all">Apply <span className="material-symbols-outlined !text-[16px]">arrow_forward</span></a>
            </div>
          </div>
        </div>

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
        {/* T1 */}
        <div className="quote-card relative card-lift bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm">AT</div>
            <div>
              <div className="font-bold text-sm">An Tran</div>
              <div className="text-xs text-slate-400">CS Student &bull; NYU</div>
            </div>
          </div>
          <div className="flex gap-0.5 mb-3">
            <span className="material-symbols-outlined filled !text-[16px] text-amber-400">star</span>
            <span className="material-symbols-outlined filled !text-[16px] text-amber-400">star</span>
            <span className="material-symbols-outlined filled !text-[16px] text-amber-400">star</span>
            <span className="material-symbols-outlined filled !text-[16px] text-amber-400">star</span>
            <span className="material-symbols-outlined filled !text-[16px] text-amber-400">star</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">"Found a perfect tutoring gig that fits my class schedule. Applied on Monday, got hired by Wednesday!"</p>
        </div>
        {/* T2 */}
        <div className="quote-card relative card-lift bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">ML</div>
            <div>
              <div className="font-bold text-sm">Minh Le</div>
              <div className="text-xs text-slate-400">Marketing &bull; UCLA</div>
            </div>
          </div>
          <div className="flex gap-0.5 mb-3">
            <span className="material-symbols-outlined filled !text-[16px] text-amber-400">star</span>
            <span className="material-symbols-outlined filled !text-[16px] text-amber-400">star</span>
            <span className="material-symbols-outlined filled !text-[16px] text-amber-400">star</span>
            <span className="material-symbols-outlined filled !text-[16px] text-amber-400">star</span>
            <span className="material-symbols-outlined filled !text-[16px] text-amber-400">star</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">"The quality of employers here is way better than other platforms. I've been working at an amazing café for 3 months — found it here."</p>
        </div>
        {/* T3 */}
        <div className="quote-card relative card-lift bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">SP</div>
            <div>
              <div className="font-bold text-sm">Sarah Park</div>
              <div className="text-xs text-slate-400">Design &bull; RISD</div>
            </div>
          </div>
          <div className="flex gap-0.5 mb-3">
            <span className="material-symbols-outlined filled !text-[16px] text-amber-400">star</span>
            <span className="material-symbols-outlined filled !text-[16px] text-amber-400">star</span>
            <span className="material-symbols-outlined filled !text-[16px] text-amber-400">star</span>
            <span className="material-symbols-outlined filled !text-[16px] text-amber-400">star</span>
            <span className="material-symbols-outlined !text-[16px] text-slate-300">star</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">"Love the instant apply feature! Applied for 5 positions in one evening and had 3 interviews by the weekend."</p>
        </div>
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
            <a href="/register" className="inline-flex items-center justify-center h-12 px-8 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-sky-400 hover:shadow-xl hover:shadow-primary/30 transition-all anim-pulse-glow">
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
