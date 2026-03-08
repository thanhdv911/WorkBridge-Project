import React from 'react';

export default function HeroSearch() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-14">
      <div className="hero-blob w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(19,146,236,.2),transparent_70%)] -top-20 -right-10 absolute blur-[60px] pointer-events-none rounded-full"></div>
      <div className="hero-blob w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(124,58,237,.15),transparent_70%)] -bottom-16 -left-10 absolute blur-[60px] pointer-events-none rounded-full"></div>
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 relative z-10">
        <h1 className="anim-fadeUp text-3xl lg:text-4xl font-black tracking-tight">Explore <span className="grad-text">142 Part-Time Jobs</span></h1>
        <p className="anim-fadeUp-d1 mt-2 text-slate-400 text-sm max-w-lg">Discover flexible opportunities that fit your schedule. Filter by category, pay, and location.</p>
        {/* Search bar */}
        <div className="anim-fadeUp-d2 mt-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-2 flex flex-col sm:flex-row gap-2 max-w-3xl">
          <div className="flex-1 flex items-center bg-white/10 rounded-xl px-3">
            <span className="material-symbols-outlined text-slate-300 !text-xl">search</span>
            <input className="w-full bg-transparent border-none focus:ring-0 placeholder-slate-400 text-white h-12 px-3 text-sm" placeholder="Job title, keywords..." type="text"/>
          </div>
          <div className="flex-1 flex items-center bg-white/10 rounded-xl px-3">
            <span className="material-symbols-outlined text-slate-300 !text-xl">location_on</span>
            <input className="w-full bg-transparent border-none focus:ring-0 placeholder-slate-400 text-white h-12 px-3 text-sm" placeholder="City or remote..." type="text"/>
          </div>
          <button className="h-12 px-7 bg-gradient-to-r from-primary to-primary-dk text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all whitespace-nowrap flex items-center gap-2">
            <span className="material-symbols-outlined !text-xl">search</span>Search
          </button>
        </div>
      </div>
    </section>
  );
}
