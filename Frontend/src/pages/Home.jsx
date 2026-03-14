import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// New Demo Assets
import heroImage from '../assets/herodemo.png';
import techIcon from '../assets/cat_tech_demo.png';
import cafeIcon from '../assets/cat_cafe_demo.png';
import eduIcon from '../assets/cat_edu_demo.png';
import deliveryIcon from '../assets/cat_delivery_demo.png';
import ctaIcon from '../assets/cta_success_demo.png';
import howItWorksImage from '../assets/how_it_works_demo.png';
import appsImage from '../assets/apps_demo.png';

export default function Home() {
  return (
    <div className="bg-bg-light">
      <Hero />
      <Stats />
      <Categories />
      <HowItWorks />
      <LatestJobs />
      <Pricing />
      <Testimonials />
      <CTA />
    </div>
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
    <section className="relative overflow-hidden pt-12 lg:pt-20">
      <div className="hero-blob w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(19,146,236,.12),transparent_70%)] -top-40 -right-20 absolute rotate-12"></div>
      <div className="hero-blob w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(124,58,237,.1),transparent_70%)] -bottom-40 -left-20 absolute -rotate-12"></div>

      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative z-10">
            <div className="anim-fadeUp inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-[0.2em] mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Next-Gen Job Platform
            </div>

            <h1 className="anim-fadeUp-d1 text-5xl lg:text-[4.2rem] font-black leading-[1.05] tracking-tight text-slate-900">
              Bridge Your <br />
              <span className="grad-text">Future</span> Career.
            </h1>

            <p className="anim-fadeUp-d2 mt-8 text-xl text-slate-500 leading-relaxed max-w-lg font-medium">
              The smartest way for students to find flexible part-time jobs. Build experience, gain skills, and earn income — all in one place.
            </p>

            <form onSubmit={handleSearch} className="anim-fadeUp-d3 mt-10 p-2 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 flex flex-col md:flex-row gap-2">
              <div className="flex-1 flex items-center px-6 py-4 bg-slate-50 rounded-[2rem] focus-within:bg-white focus-within:ring-2 ring-primary/20 transition-all border border-transparent">
                <span className="material-symbols-outlined text-slate-400">search</span>
                <input className="w-full bg-transparent border-none focus:outline-none px-3 text-sm font-bold placeholder-slate-400" placeholder="Web Design, Marketing..." type="text" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <button type="submit" className="h-[60px] px-10 bg-gradient-to-r from-primary to-primary-dk text-white rounded-[2rem] font-black text-sm hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                Search Jobs <span className="material-symbols-outlined !text-xl">arrow_forward</span>
              </button>
            </form>
          </div>

          <div className="hidden lg:block relative">
             <div className="relative w-full aspect-square max-w-[500px] mx-auto">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-[80px]"></div>
                
                {/* Hero Illustration */}
                <div className="absolute inset-0 z-0 opacity-80 pointer-events-none anim-float">
                  <img src={heroImage} alt="Student Illustration" className="w-full h-full object-contain" />
                </div>

                {/* Floating Card 1 */}
                <div className="anim-float absolute top-0 right-0 z-20 bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/50 w-[280px]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center text-white font-black">TA</div>
                    <div>
                      <div className="font-black text-slate-800">Premium Barista</div>
                      <div className="text-xs text-slate-400 font-bold">The Alley • District 1</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100/50">
                    <span className="text-primary font-black">25k/hr</span>
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">Applied</span>
                  </div>
                </div>

                {/* Floating Card 2 */}
                <div className="anim-float-d absolute bottom-10 left-0 z-10 bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white/50 w-[260px]">
                   <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined filled">check_circle</span>
                      </div>
                      <div className="text-sm font-black text-slate-800">Application Approved!</div>
                   </div>
                   <div className="text-xs text-slate-400 font-bold">Grab HQ just invited you for an interview</div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const items = [
    { value: '1,200+', label: 'Active Jobs', color: 'text-primary' },
    { value: '450+', label: 'Verified Partners', color: 'text-accent' },
    { value: '15k+', label: 'Students', color: 'text-emerald-500' },
    { value: '98%', label: 'Success Rate', color: 'text-amber-500' },
  ];

  return (
    <section className="max-w-[1200px] mx-auto px-6 -mt-10 relative z-30">
      <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-white p-2 grid grid-cols-2 md:grid-cols-4 gap-2">
        {items.map((item, i) => (
          <div key={i} className="py-10 text-center rounded-[2rem] hover:bg-white transition-colors">
            <div className={`text-4xl font-black ${item.color} mb-1 anim-countPop`} style={{ animationDelay: `${i * 0.1}s` }}>
              {item.value}
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Categories() {
  const cats = [
    { name: 'Food & Beverage', count: 420, icon: 'restaurant', grad: 'from-orange-400 to-rose-500', img: cafeIcon },
    { name: 'Creative Tech', count: 185, icon: 'code', grad: 'from-blue-500 to-indigo-600', img: techIcon },
    { name: 'Education', count: 215, icon: 'school', grad: 'from-violet-500 to-purple-600', img: eduIcon },
    { name: 'Delivery Service', count: 310, icon: 'local_shipping', grad: 'from-sky-400 to-blue-600', img: deliveryIcon },
  ];

  return (
    <section className="max-w-[1320px] mx-auto px-6 lg:px-10 py-24">
      <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900">Explore <span className="text-primary">Categories</span></h2>
          <p className="text-slate-500 mt-4 text-lg max-w-md font-medium">Find specialized opportunities that match your unique skills and academy path.</p>
        </div>
        <a href="/jobs" className="group flex items-center gap-3 font-black text-sm uppercase tracking-wider text-slate-400 hover:text-primary transition-colors">
          View all 12+ Sectors <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-all"><span className="material-symbols-outlined !text-xl">arrow_forward</span></div>
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cats.map((cat, i) => (
          <a key={i} href="/jobs" className="group card-lift bg-white border border-slate-100 p-8 rounded-[2.5rem] flex flex-col items-center text-center overflow-hidden">
            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${cat.grad} flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform mb-6 relative overflow-hidden`}>
              {cat.img ? (
                <img src={cat.img} alt={cat.name} className="w-full h-full object-cover opacity-90 group-hover:scale-125 transition-transform" />
              ) : (
                <span className="material-symbols-outlined !text-4xl">{cat.icon}</span>
              )}
            </div>
            <h3 className="text-xl font-black text-slate-800">{cat.name}</h3>
            <p className="text-slate-400 text-sm font-bold mt-2">{cat.count} Active Jobs</p>
          </a>
        ))}
      </div>
    </section>
  );
}

function LatestJobs() {
  const mockJobs = [
    { id: 1, title: 'Premium Barista', company: 'The Alley', initials: 'TA', color: 'from-pink-500 to-rose-400', loc: 'District 1, HCMC', pay: '25k', unit: 'hr', type: 'Part-time', tag: 'Hot' },
    { id: 2, title: 'Junior Content Creator', company: 'FPT Software', initials: 'FPT', color: 'from-orange-500 to-amber-400', loc: 'Thu Duc, HCMC', pay: '5M', unit: 'mo', type: 'Internship', tag: 'New' },
    { id: 3, title: 'English Teaching Assistant', company: 'VUS English', initials: 'VUS', color: 'from-blue-600 to-sky-400', loc: 'Láng Hạ, Hanoi', pay: '150k', unit: 'session', type: 'Flexible', tag: 'Tutor' },
    { id: 4, title: 'UI/UX Design Intern', company: 'Grab', initials: 'GR', color: 'from-emerald-500 to-teal-400', loc: 'District 7, HCMC', pay: '4M', unit: 'mo', type: 'Remote', tag: 'Remote' },
    { id: 5, title: 'Luxury Event Staff', company: 'VinGroup', initials: 'VIN', color: 'from-amber-600 to-yellow-500', loc: 'Nha Trang', pay: '500k', unit: 'day', type: 'Contract', tag: 'Event' },
    { id: 6, title: 'Retail Associate', company: 'Uniqlo', initials: 'UQ', color: 'from-rose-600 to-red-400', loc: 'Dong Khoi, HCMC', pay: '30k', unit: 'hr', type: 'Part-time', tag: 'Urgent' },
  ];

  return (
    <section className="bg-slate-900 py-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-white">Recommended <span className="grad-text">For You</span></h2>
          <p className="text-slate-400 mt-4 text-lg font-medium">Curated job opportunities tailored for student life.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mockJobs.map((job) => (
            <div key={job.id} className="group bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${job.color} flex items-center justify-center text-white font-black text-xl shadow-lg`}>
                  {job.initials}
                </div>
                <span className="bg-primary/20 text-primary text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-primary/30">
                   {job.tag}
                </span>
              </div>
              <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors">{job.title}</h3>
              <p className="text-slate-400 text-sm font-bold mt-2">{job.company} • {job.loc}</p>
              
              <div className="flex flex-wrap gap-2 mt-6">
                <span className="bg-white/5 text-slate-300 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-white/5">
                   {job.type}
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-emerald-500/10">
                   {job.pay}/{job.unit}
                </span>
              </div>

              <div className="mt-auto pt-8 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">Posted 2h ago</span>
                <a href={`/jobs/${job.id}`} className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-black text-xs hover:bg-primary hover:text-white transition-all shadow-xl shadow-black/20">
                   Full Details
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
           <button className="px-12 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full font-black text-sm border border-white/10 transition-all">
              Load More Opportunities
           </button>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    { name: 'Standard', price: 'Free', desc: 'Perfect for local small business owners looking for student help.', features: ['Post 3 jobs per month', 'Standard Support', 'Candidate Filter'] },
    { name: 'Professional', price: '$29', desc: 'Boost your recruitment with advanced tools and priority listing.', features: ['Unlimited Job Posts', 'Featured Job Badge', 'Direct Chat Access', 'Priority Support'], popular: true },
    { name: 'Enterprise', price: '$99', desc: 'Full-scale talent acquisition for major corporations.', features: ['Custom Branding', 'API Integration', 'Dedicated Manager', 'Analytics Dashboard'] },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
        <div className="text-center mb-16">
           <h1 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4">Pricing Plans</h1>
           <h2 className="text-4xl font-black text-slate-900">Choose your <span className="text-primary">Recruitment</span> Power</h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div key={i} className={`relative p-10 rounded-[3rem] border transition-all ${plan.popular ? 'border-primary shadow-2xl shadow-primary/10 bg-slate-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
              {plan.popular && <span className="absolute top-6 right-10 bg-primary text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-primary/30">Most Popular</span>}
              <h3 className="text-2xl font-black text-slate-800">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900">{plan.price}</span>
                {plan.price !== 'Free' && <span className="text-slate-400 font-bold">/mo</span>}
              </div>
              <p className="mt-6 text-slate-500 text-sm font-medium leading-relaxed">{plan.desc}</p>
              
              <ul className="mt-10 space-y-4">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <span className="material-symbols-outlined text-primary !text-lg">check_circle</span> {f}
                  </li>
                ))}
              </ul>

              <button className={`w-full mt-10 py-5 rounded-2xl font-black text-sm transition-all ${plan.popular ? 'bg-primary text-white shadow-xl shadow-primary/25 hover:shadow-primary/40' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { num: '01', title: 'Smart Profile', desc: 'Create a dynamic profile highlighting your local availability.' },
    { num: '02', title: 'One-Click Apply', desc: 'Review shifts and apply instantly with verified student status.' },
    { num: '03', title: 'Get Hired', desc: 'Join the community of 15k students finding jobs locally.' },
  ];

  return (
    <section className="bg-slate-50 py-24">
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-20 items-center">
        <div>
           <h2 className="text-4xl font-black text-slate-900 leading-tight">Finding work has never been <span className="text-primary">Easier</span>.</h2>
           <p className="mt-6 text-slate-500 text-lg font-medium leading-relaxed">We simplified the recruitment process so you can focus on your studies while building your wallet.</p>
           
           <div className="mt-12 space-y-8">
              {steps.map(s => (
                <div key={s.num} className="flex items-start gap-6 group">
                   <div className="text-5xl font-black text-slate-200 group-hover:text-primary transition-colors">{s.num}</div>
                   <div>
                      <h3 className="text-xl font-black text-slate-800">{s.title}</h3>
                      <p className="text-slate-400 text-sm font-bold mt-1 max-w-xs">{s.desc}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
        <div className="relative">
           <div className="aspect-square bg-white rounded-[4rem] shadow-2xl border border-slate-100 flex items-center justify-center p-12 overflow-hidden">
              <div className="w-full h-full bg-slate-50 rounded-[3rem] border border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden">
                 <img src={howItWorksImage} alt="How it works" className="w-full h-full object-contain opacity-90 anim-float" />
                 {/* Small floating app preview */}
                 <div className="absolute -bottom-4 -right-4 w-1/2 aspect-video bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 anim-float-d">
                    <img src={appsImage} alt="App Preview" className="w-full h-full object-cover rounded-xl" />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const reviews = [
    { name: 'An Tran', role: 'IT Student @ FPT University', text: '"Found a perfect tutoring gig that fits my class schedule perfectly. The UX is amazing!"', initials: 'AT', grad: 'from-blue-400 to-indigo-500' },
    { name: 'Kieu My', role: 'Business @ RMIT', text: '"I love how fast I can chat with employers. Verified jobs only, no scams. 10/10 recommend."', initials: 'KM', grad: 'from-pink-400 to-rose-500' },
    { name: 'Minh Quan', role: 'Marketing @ NEU', text: '"WorkBridge changed my POV about part-time work. Professional companies, real money."', initials: 'MQ', grad: 'from-emerald-400 to-teal-500' },
  ];

  return (
    <section className="py-24">
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
         <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900">Loved by <span className="text-primary">15,000+</span> Students</h2>
         </div>
         <div className="grid md:grid-cols-3 gap-8">
            {reviews.map((r, i) => (
              <div key={i} className="quote-card bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                 <p className="text-lg font-bold text-slate-600 leading-relaxed italic mb-8">{r.text}</p>
                 <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${r.grad} flex items-center justify-center text-white font-black`}>{r.initials}</div>
                    <div>
                       <div className="font-black text-slate-800">{r.name}</div>
                       <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{r.role}</div>
                    </div>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="max-w-[1320px] mx-auto px-6 lg:px-10 pb-24">
      <div className="relative overflow-hidden rounded-[4rem] bg-slate-900 p-16 md:p-24 text-center">
        <div className="absolute inset-0 wavy-bg opacity-10"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
        
        {/* Success Illustration Background */}
        <div className="absolute left-0 bottom-0 w-[300px] h-[300px] opacity-20 pointer-events-none anim-float-d translate-y-1/4 -translate-x-1/4">
           <img src={ctaIcon} alt="Success Illustration" className="w-full h-full object-contain" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
           <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">Ready to Land Your <br /><span className="grad-text">Dream</span> Part-Time Job?</h2>
           <p className="mt-8 text-slate-400 text-lg font-medium leading-relaxed">Join the fastest growing student talent community in Vietnam. It takes less than 2 minutes to start.</p>
           
           <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/auth" className="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-primary to-primary-dk text-white rounded-[2rem] font-black text-sm shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all anim-pulse-glow">
                 Create Free Account
              </a>
              <a href="/jobs" className="w-full sm:w-auto px-12 py-5 bg-white/5 text-white rounded-[2rem] font-black text-sm border border-white/10 hover:bg-white/10 transition-all">
                 Browse Opportunities
              </a>
           </div>
        </div>
      </div>
    </section>
  );
}
