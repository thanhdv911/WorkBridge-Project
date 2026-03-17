import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

// --- Scoring Engine ---
function scoreJob(job, profile) {
  let score = 0;
  const reasons = [];

  const jobText = `${job.title} ${job.description || ''}`.toLowerCase();
  const profileText = `${profile.major || ''} ${profile.aboutMe || ''} ${profile.university || ''}`.toLowerCase();

  // 1. Keyword match between job text and profile text (up to 40pts)
  const profileWords = profileText.split(/\W+/).filter(w => w.length > 3);
  const uniqueWords = [...new Set(profileWords)];
  let kwMatches = 0;
  uniqueWords.forEach(w => { if (jobText.includes(w)) kwMatches++; });
  const kwScore = Math.min(40, Math.round((kwMatches / Math.max(uniqueWords.length, 1)) * 40 * 4));
  score += kwScore;

  // 2. Major-based category match (up to 30pts)
  const major = (profile.major || '').toLowerCase();
  const categoryMap = [
    { keys: ['it', 'software', 'computer', 'data', 'tech', 'code', 'lập trình', 'công nghệ'], jobKeys: ['developer', 'data', 'it', 'game', 'lập trình', 'analyst', 'tech'], label: '💻 Tech major match' },
    { keys: ['marketing', 'business', 'quản trị', 'kinh doanh', 'thương mại'], jobKeys: ['marketing', 'sales', 'social', 'media', 'campaign', 'quản lý'], label: '📊 Business major match' },
    { keys: ['english', 'language', 'ngoại ngữ', 'education', 'sư phạm', 'dạy'], jobKeys: ['gia sư', 'teacher', 'tutoring', 'english', 'dạy', 'education'], label: '📚 Education major match' },
    { keys: ['hotel', 'tourism', 'khách sạn', 'du lịch', 'hospitality', 'pha chế'], jobKeys: ['pha chế', 'barista', 'café', 'phục vụ', 'nhà hàng', 'hotel'], label: '☕ Hospitality major match' },
    { keys: ['logistics', 'supply', 'vận tải', 'giao nhận', 'shipping'], jobKeys: ['shipper', 'delivery', 'giao hàng', 'kho', 'warehouse', 'logistics'], label: '🛵 Logistics major match' },
  ];
  for (const cat of categoryMap) {
    const majorMatch = cat.keys.some(k => major.includes(k));
    const jobMatch = cat.jobKeys.some(k => jobText.includes(k));
    if (majorMatch && jobMatch) {
      score += 30;
      reasons.push(cat.label);
      break;
    }
  }

  // 3. Job type vs study year match (up to 20pts)
  const year = (profile.studyYear || '').toLowerCase();
  const jobType = (job.jobType || '').toLowerCase();
  if ((year.includes('1st') || year.includes('2nd')) && (jobType === 'part-time' || jobType === 'flexible')) {
    score += 20;
    reasons.push('🕐 Flexible schedule match');
  } else if ((year.includes('3rd') || year.includes('4th')) && (jobType === 'internship' || jobType === 'freelance')) {
    score += 20;
    reasons.push('🎓 Internship-ready match');
  } else if (year.includes('graduated')) {
    score += 15;
    reasons.push('💼 Full-time ready');
  } else {
    score += 10;
  }

  // 4. Trending bonus (10pts)
  if (job.isTrending) {
    score += 10;
    reasons.push('📈 Trending now');
  }

  if (kwScore > 10) reasons.push('🔍 Keyword match');

  return { score: Math.min(100, score), reasons };
}

function getMatchColor(score) {
  if (score >= 80) return { bar: 'bg-emerald-500', bg: 'bg-emerald-50/50 border-emerald-100/60', text: 'text-emerald-600', label: 'Excellent Match' };
  if (score >= 60) return { bar: 'bg-blue-500', bg: 'bg-blue-50/50 border-blue-100/60', text: 'text-blue-600', label: 'Good Match' };
  if (score >= 40) return { bar: 'bg-amber-500', bg: 'bg-amber-50/50 border-amber-100/60', text: 'text-amber-600', label: 'Fair Match' };
  return { bar: 'bg-slate-400', bg: 'bg-slate-50/50 border-slate-100/60', text: 'text-slate-500', label: 'Weak Match' };
}

function getJobIcon(title = '') {
  const t = title.toLowerCase();
  if (t.includes('pha chế') || t.includes('barista') || t.includes('cafe')) return { icon: 'local_cafe', color: 'from-orange-400 to-rose-500' };
  if (t.includes('gia sư') || t.includes('tutoring') || t.includes('dạy') || t.includes('english')) return { icon: 'school', color: 'from-blue-500 to-indigo-600' };
  if (t.includes('shipper') || t.includes('giao hàng') || t.includes('delivery')) return { icon: 'delivery_dining', color: 'from-sky-400 to-blue-600' };
  if (t.includes('kho') || t.includes('warehouse') || t.includes('điều phối')) return { icon: 'inventory_2', color: 'from-slate-500 to-slate-700' };
  if (t.includes('developer') || t.includes('analyst') || t.includes('data') || t.includes('lập trình') || t.includes('game')) return { icon: 'terminal', color: 'from-indigo-500 to-purple-600' };
  if (t.includes('marketing') || t.includes('media') || t.includes('social') || t.includes('content')) return { icon: 'campaign', color: 'from-pink-500 to-rose-600' };
  if (t.includes('quản lý') || t.includes('manager')) return { icon: 'manage_accounts', color: 'from-amber-400 to-orange-500' };
  return { icon: 'work', color: 'from-primary to-accent' };
}

export default function AIMatching() {
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [filterMin, setFilterMin] = useState(0);
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadAndMatch();
  }, []);

  const loadAndMatch = async () => {
    if (!token) { toast.error('Please login first.'); setLoading(false); return; }
    setLoading(true);
    setAnalyzing(true);
    try {
      const [profileRes, jobsRes] = await Promise.all([
        api.get('/profile/applicant', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/jobs?pageSize=50'),
      ]);
      const prof = profileRes.data;
      const jobs = jobsRes.data.items || [];
      setProfile(prof);

      // Simulate a small AI "thinking" delay for UX
      await new Promise(r => setTimeout(r, 1200));

      const scored = jobs
        .map(job => ({ ...job, ...scoreJob(job, prof) }))
        .sort((a, b) => b.score - a.score);
      setMatches(scored);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load AI matches.');
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const displayed = matches.filter(m => m.score >= filterMin);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFCFF] flex flex-col items-center justify-center gap-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-primary/10 border-t-primary animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl">🤖</span>
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-800 mb-2">Analyzing Your Profile...</h2>
          <p className="text-slate-500">Our AI is finding the best matches for you</p>
        </div>
        <div className="flex gap-2">
          {['Profile', 'Skills', 'Schedule', 'Scoring'].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-primary animate-pulse`} style={{ animationDelay: `${i * 0.2}s` }}></div>
              <span className="text-xs font-bold text-slate-400">{step}</span>
              {i < 3 && <span className="text-slate-200 text-xs">→</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FBFCFF] min-h-screen pb-20 font-display relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(19,146,236,0.07),transparent_70%)] -translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(124,58,237,0.06),transparent_70%)] translate-y-1/4 -translate-x-1/4 pointer-events-none" />

      {/* Hero Header */}
      <div className="relative z-10 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-[0.2em] mb-6 border border-primary/20 anim-fadeUp">
          <span className="text-lg">🤖</span> AI-Powered Matching
        </div>
        <h1 className="anim-fadeUp-d1 text-5xl font-black text-slate-800 tracking-tight leading-none mb-4">
          Jobs Picked <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Just For You</span>
        </h1>
        <p className="anim-fadeUp-d2 text-slate-500 text-lg font-medium max-w-xl mx-auto leading-relaxed">
          Our AI analyzed your major, skills, and schedule to rank the most suitable opportunities.
        </p>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 relative z-10">
        {/* Profile Summary Card */}
        {profile && (
          <div className="anim-fadeUp-d3 mb-10 p-1 rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/10 shadow-xl shadow-primary/5">
            <div className="bg-white/70 backdrop-blur-md rounded-[2.3rem] p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-primary/20 flex-shrink-0">
                {(profile.fullName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-black text-slate-800 text-xl">{profile.fullName}</div>
                <div className="text-slate-500 text-sm mt-1">
                  {[profile.major, profile.university, profile.studyYear].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.major && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-[11px] font-black uppercase tracking-wider rounded-full border border-primary/10">📚 {profile.major}</span>
                )}
                {profile.studyYear && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-600 text-[11px] font-black uppercase tracking-wider rounded-full border border-violet-100">🎓 {profile.studyYear}</span>
                )}
                <button
                  onClick={loadAndMatch}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-[11px] font-black uppercase tracking-wider rounded-full hover:bg-primary-dk transition-colors shadow-md shadow-primary/20"
                >
                  <span className="material-symbols-outlined !text-[14px]">refresh</span> Re-analyze
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800">{displayed.length} Matches Found</h2>
            <p className="text-slate-400 text-sm font-medium mt-0.5">Ranked by compatibility with your profile</p>
          </div>
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Min Match</span>
            {[0, 40, 60, 80].map(v => (
              <button
                key={v}
                onClick={() => setFilterMin(v)}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${filterMin === v ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-400 hover:text-primary'}`}
              >
                {v === 0 ? 'All' : `${v}%+`}
              </button>
            ))}
          </div>
        </div>

        {/* Job Match Cards Grid */}
        {displayed.length === 0 ? (
          <div className="bg-white/40 backdrop-blur-xl rounded-[3rem] border border-white p-20 text-center shadow-2xl shadow-slate-200/40">
            <div className="text-6xl mb-6">🤷</div>
            <h2 className="text-2xl font-black text-slate-800">No matches at this threshold</h2>
            <p className="text-slate-500 mt-3 font-medium">Try lowering the minimum match % or update your profile with more skills.</p>
            <button onClick={() => setFilterMin(0)} className="mt-8 px-8 py-3 bg-primary text-white rounded-2xl font-black text-sm hover:bg-primary-dk transition-colors shadow-xl shadow-primary/20">
              Show All Results
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayed.map((job, i) => {
              const mc = getMatchColor(job.score);
              const ji = getJobIcon(job.title);
              return (
                <Link
                  key={job.jobPostId}
                  to={`/jobs/${job.jobPostId}`}
                  className={`group relative p-1 rounded-[2.5rem] border ${mc.bg} shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="bg-white/60 backdrop-blur-md rounded-[2.3rem] p-7 h-full flex flex-col">
                    {/* Match % Badge */}
                    <div className="flex items-start justify-between mb-6">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${ji.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
                        <span className="material-symbols-outlined !text-2xl">{ji.icon}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-black ${mc.text}`}>{job.score}%</div>
                        <div className={`text-[10px] font-black uppercase tracking-widest ${mc.text}`}>{mc.label}</div>
                        {/* Match bar */}
                        <div className="mt-1 h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden ml-auto">
                          <div className={`h-full ${mc.bar} rounded-full transition-all duration-700`} style={{ width: `${job.score}%` }}></div>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-slate-800 group-hover:text-primary transition-colors leading-tight mb-1">
                      {job.title}
                    </h3>
                    <p className="text-sm text-slate-400 font-bold mb-4">{job.companyName} · {job.location}</p>

                    {/* Reason Chips */}
                    {job.reasons && job.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {job.reasons.slice(0, 3).map((r, ri) => (
                          <span key={ri} className="px-2.5 py-1 rounded-lg bg-white/80 border border-slate-100 text-[10px] font-black text-slate-500 shadow-sm">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between pt-5 border-t border-white/50">
                      <div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Salary</div>
                        <div className="text-base font-black text-primary">{job.payRate?.toLocaleString() || 'Negotiable'} {job.payUnit}</div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-black group-hover:bg-primary transition-colors shadow-lg shadow-black/10">
                        View Job <span className="material-symbols-outlined !text-sm">arrow_forward</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Bottom tip */}
        <div className="mt-16 text-center">
          <p className="text-slate-400 text-sm font-medium">
            🧠 Improve your match scores by completing your{' '}
            <Link to="/profile" className="text-primary font-black hover:underline">profile</Link> with more details about your skills and goals.
          </p>
        </div>
      </div>
    </div>
  );
}
