import React, { useEffect, useState, useMemo } from 'react';
import api, { API_BASE_URL } from '../../services/api';
import { translatePayUnit } from '../../utils/translate';

// Helper to format date in Vietnamese
const getFormattedToday = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
};

// Generate X-axis dates ending at today, 6 days apart (fallback dates)
const generateChartDates = () => {
  const dates = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 6);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    dates.push(`${day}/${month}`);
  }
  return dates;
};

// Reverses "MM/dd" date from backend C# to "dd/MM" standard Vietnamese date format
const formatGrowthDate = (dateStr) => {
  if (!dateStr || !dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('/');
  return `${parts[1]}/${parts[0]}`;
};

// Safely generate initials
const getSafeInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
};

export default function JobMarketDashboard() {
  const [latestJobs, setLatestJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  
  // Real Statistics from Backend
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Categories & Counts for real distribution
  const [categories, setCategories] = useState([]);
  const [allJobs, setAllJobs] = useState([]);

  // Counter states for count-up animation
  const [jobsMonthCount, setJobsMonthCount] = useState(0);
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [companiesCount, setCompaniesCount] = useState(0);

  // Hover states for tooltips
  const [activeLineIndex, setActiveLineIndex] = useState(null);
  const [activeBarIndex, setActiveBarIndex] = useState(null);

  // Dropdown filter
  const [chartFilter, setChartFilter] = useState('Ngành nghề');
  const [showDropdown, setShowDropdown] = useState(false);

  // Today's date string
  const todayStr = useMemo(() => getFormattedToday(), []);

  // Fallback X-axis dates
  const fallbackDates = useMemo(() => generateChartDates(), []);

  // 1. Fetch real latest 3 jobs
  useEffect(() => {
    setLoadingJobs(true);
    api.get('/jobs?page=1&pageSize=3')
      .then(res => {
        const items = res?.data?.items || res?.data?.Items || [];
        setLatestJobs(items);
      })
      .catch(err => {
        console.error('Error fetching latest jobs for dashboard:', err);
      })
      .finally(() => {
        setLoadingJobs(false);
      });
  }, []);

  // 2. Fetch real stats and categories
  useEffect(() => {
    setLoadingStats(true);
    api.get('/home/stats')
      .then(res => {
        setStats(res.data);
      })
      .catch(err => {
        console.error('Error fetching dashboard stats:', err);
      })
      .finally(() => {
        setLoadingStats(false);
      });

    api.get('/home/categories')
      .then(res => {
        setCategories(res.data || []);
      })
      .catch(err => {
        console.error('Error fetching categories for dashboard:', err);
      });

    // Fetch up to 100 jobs to calculate real distribution in frontend
    api.get('/jobs?page=1&pageSize=100')
      .then(res => {
        const items = res?.data?.items || res?.data?.Items || [];
        setAllJobs(items);
      })
      .catch(err => {
        console.error('Error fetching jobs for distribution:', err);
      });
  }, []);

  // 3. Trigger counter animations when stats data is loaded
  useEffect(() => {
    if (!stats) return;

    const rawNewJobs = stats.newJobsThisMonth ?? stats.NewJobsThisMonth ?? 0;
    const rawTotalJobs = stats.totalJobs ?? stats.TotalJobs ?? 0;
    const rawTotalEmployers = stats.totalEmployers ?? stats.TotalEmployers ?? 0;

    const animateValue = (target, setter, duration = 1200) => {
      let startTimestamp = null;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        setter(Math.floor(progress * target));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    };

    animateValue(rawNewJobs, setJobsMonthCount, 1000);
    animateValue(rawTotalJobs, setActiveJobsCount, 1200);
    animateValue(rawTotalEmployers, setCompaniesCount, 1400);
  }, [stats]);

  // 4. Line Chart Data (Dynamic scaling using C# Backend JobGrowth stats)
  const lineChartData = useMemo(() => {
    const rawJobGrowth = stats?.jobGrowth || stats?.JobGrowth || [];
    const rawTotalJobs = stats?.totalJobs ?? stats?.TotalJobs ?? 0;

    if (!stats || rawJobGrowth.length === 0) {
      return fallbackDates.map(date => ({ label: date, value: rawTotalJobs }));
    }

    // Sort growth points chronologically by date
    const growth = [...rawJobGrowth].sort((a, b) => (a.date || a.Date).localeCompare(b.date || b.Date));

    // Calculate cumulative active jobs over the 30-day timeframe
    let runningTotal = rawTotalJobs;
    const points = [];

    for (let i = growth.length - 1; i >= 0; i--) {
      const gDate = growth[i].date || growth[i].Date;
      const gCount = growth[i].count || growth[i].Count || 0;
      
      points.unshift({
        label: formatGrowthDate(gDate),
        value: runningTotal
      });
      runningTotal = Math.max(0, runningTotal - gCount);
    }

    // Slice to show last 6 intervals or pad with dates
    if (points.length > 6) {
      return points.slice(-6);
    }
    while (points.length < 6 && points.length > 0) {
      points.unshift({
        label: '',
        value: points[0].value
      });
    }

    return points.length === 0 ? fallbackDates.map(date => ({ label: date, value: 0 })) : points;
  }, [stats, fallbackDates]);

  // Determine Line Chart Range
  const lineChartRange = useMemo(() => {
    const values = lineChartData.map(d => d.value);
    const maxVal = Math.max(...values, 5); // ensure min scale max is at least 5
    const minVal = Math.min(...values, 0); // start y-axis from 0
    return { min: minVal, max: maxVal };
  }, [lineChartData]);

  // Map Line Data to SVG Viewbox coordinates (500x200)
  const linePoints = useMemo(() => {
    const range = lineChartRange.max - lineChartRange.min;
    return lineChartData.map((d, index) => {
      const x = 55 + index * (430 / 5);
      const y = range === 0 
        ? 95 
        : 170 - ((d.value - lineChartRange.min) / range) * 150;
      return { x, y, label: d.label, value: d.value };
    });
  }, [lineChartData, lineChartRange]);

  // Line Path D string
  const linePathD = useMemo(() => {
    if (linePoints.length === 0) return '';
    return linePoints.reduce((acc, p, i) => {
      return acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
    }, '');
  }, [linePoints]);

  // Area Path D string underneath line
  const areaPathD = useMemo(() => {
    if (linePoints.length === 0) return '';
    const first = linePoints[0];
    const last = linePoints[linePoints.length - 1];
    return `${linePathD} L ${last.x} 170 L ${first.x} 170 Z`;
  }, [linePoints, linePathD]);

  // 5. Bar Chart Data (Dynamic based on selected filter)
  const barChartData = useMemo(() => {
    let list = [];
    const counts = {};

    if (chartFilter === 'Ngành nghề') {
      allJobs.forEach(job => {
        const catId = job.categoryId || job.CategoryId;
        if (catId) counts[catId] = (counts[catId] || 0) + 1;
      });
      list = categories.map(cat => {
        const catId = cat.categoryId || cat.CategoryId;
        return {
          category: cat.name || cat.categoryName || cat.Name || cat.CategoryName,
          value: counts[catId] || 0
        };
      });
    } else if (chartFilter === 'Khu vực') {
      allJobs.forEach(job => {
        let loc = job.city || job.City;
        if (!loc) {
          const fullLoc = job.location || job.Location || '';
          loc = fullLoc.split(',').pop().trim();
        }
        if (!loc || loc.toLowerCase() === 'việt nam') loc = 'Khác';
        counts[loc] = (counts[loc] || 0) + 1;
      });
      list = Object.keys(counts).map(key => ({ category: key, value: counts[key] }));
    } else if (chartFilter === 'Hình thức') {
      allJobs.forEach(job => {
        let type = job.jobType || job.JobType || 'Khác';
        if (type.toLowerCase() === 'parttime') type = 'Bán thời gian';
        if (type.toLowerCase() === 'fulltime') type = 'Toàn thời gian';
        if (type.toLowerCase() === 'freelance') type = 'Tự do';
        counts[type] = (counts[type] || 0) + 1;
      });
      list = Object.keys(counts).map(key => ({ category: key, value: counts[key] }));
    }

    // Sort descending by actual job count
    list.sort((a, b) => b.value - a.value);

    // Take top 5
    const top5 = list.slice(0, 5);
    const fallbackCategories = ['A', 'B', 'C', 'D', 'E'];
    while (top5.length < 5) {
      top5.push({
        category: fallbackCategories[top5.length],
        value: 0
      });
    }

    const colorPills = [
      { color: 'url(#barBlueGrad)', legendColor: '#0284c7' },
      { color: 'url(#barPurpleGrad)', legendColor: '#8b5cf6' },
      { color: 'url(#barOrangeGrad)', legendColor: '#f97316' },
      { color: 'url(#barCyanGrad)', legendColor: '#0d9488' },
      { color: 'url(#barYellowGrad)', legendColor: '#ca8a04' },
    ];

    return top5.map((item, idx) => {
      const displayCategory = item.category || 'Khác';
      return {
        ...item,
        category: displayCategory.length > 11 ? displayCategory.slice(0, 10) + '..' : displayCategory,
        color: colorPills[idx].color,
        legendColor: colorPills[idx].legendColor
      };
    });
  }, [allJobs, categories, chartFilter]);

  // Determine Bar Chart Max Range
  const barChartYMax = useMemo(() => {
    const values = barChartData.map(d => d.value);
    return Math.max(...values, 5); // Min peak height is 5
  }, [barChartData]);

  // Map Bar Data to Viewbox (500x200)
  const barWidth = 36;
  const barGap = (435 - 5 * barWidth) / 6;

  const barItems = useMemo(() => {
    return barChartData.map((d, index) => {
      const x = 50 + barGap + index * (barWidth + barGap);
      const height = (d.value / barChartYMax) * 150;
      const y = 170 - height;
      return { ...d, x, y, height };
    });
  }, [barChartData, barChartYMax]);

  return (
    <section className="home-section market-dashboard-section mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="market-dashboard-container relative overflow-hidden rounded-3xl p-6 lg:p-8">
        
        {/* Glow decorative effects */}
        <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[#1392ec]/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-20 -bottom-20 h-60 w-60 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
                {/* Title row */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-sky-200/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-[#1392ec] animate-ping" />
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              Thị trường việc làm hôm nay
              <span className="text-[#1392ec] font-black bg-white/95 px-3.5 py-0.5 rounded-xl text-base lg:text-lg tracking-wide border border-sky-200 shadow-sm">
                {todayStr}
              </span>
            </h2>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="relative z-10 mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_2fr]">
          
          {/* LEFT PANEL: Latest jobs with mascot */}
          <div className="flex flex-col justify-between rounded-2xl border border-sky-100 bg-white/95 p-5 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-shadow relative overflow-hidden">
            
            {/* Robot and Headline row */}
            <div className="flex items-start gap-4 mb-4">
              <div className="relative shrink-0 select-none market-mascot-animation">
                <div className="absolute -inset-1.5 rounded-full bg-[#1392ec]/20 blur-md pointer-events-none" />
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white bg-gradient-to-br from-sky-50 to-white shadow-[0_8px_16px_rgba(19,146,236,0.15)] flex items-center justify-center">
                  <img 
                    src="/market-mascot-light.png" 
                    alt="WorkBridge AI Mascot" 
                    className="w-full h-full object-cover scale-[1.05]"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-wide">Việc làm mới nhất</h3>
                <p className="text-xs text-slate-650 font-semibold leading-relaxed mt-1">
                  Được cập nhật tự động liên tục theo thời gian thực từ các đối tác tin cậy.
                </p>
              </div>
            </div>

            {/* Live Job Postings List */}
            <div className="space-y-3 flex-1 flex flex-col justify-center my-3">
              {loadingJobs ? (
                // Skeleton loading
                [...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-100/60 animate-pulse border border-slate-200/40" />
                ))
              ) : latestJobs.length === 0 ? (
                <div className="py-8 text-center text-xs font-bold text-slate-800">
                  <span className="material-symbols-outlined !text-3xl text-slate-800 block mb-1">work_off</span>
                  Không có tin tuyển dụng mới
                </div>
              ) : (
                latestJobs.map((job) => {
                  const companyInitials = getSafeInitials(job.companyName || job.CompanyName);
                  const titleStr = job.title || job.Title || '';
                  const compNameStr = job.companyName || job.CompanyName || '';
                  const locationStr = job.location || job.Location || 'Việt Nam';
                  const payRateVal = job.payRate ?? job.PayRate;
                  const payUnitVal = job.payUnit ?? job.PayUnit;
                  const logoUrlStr = job.companyLogoUrl || job.CompanyLogoUrl;
                  const jobPostIdVal = job.jobPostId ?? job.JobPostId;

                  return (
                    <a
                      key={jobPostIdVal}
                      href={`/jobs/${jobPostIdVal}`}
                      className="group flex items-center gap-3 rounded-xl border border-sky-100/50 bg-white p-3.5 transition-all duration-350 hover:border-[#1392ec]/60 hover:bg-sky-50/50 hover:shadow-md"
                    >
                      {/* Logo container */}
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-xs font-bold text-white transition-all group-hover:border-[#1392ec]/40">
                        {logoUrlStr ? (
                          <img 
                            src={logoUrlStr.startsWith('http') ? logoUrlStr : `${API_BASE_URL}${logoUrlStr.startsWith('/') ? '' : '/'}${logoUrlStr}`}
                            alt={compNameStr}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="bg-gradient-to-br from-[#1392ec] to-purple-600 w-full h-full flex items-center justify-center font-bold">
                            {companyInitials}
                          </span>
                        )}
                      </div>

                      {/* Text details */}
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-xs font-black text-slate-800 group-hover:text-[#1392ec] transition-colors leading-snug">
                          {titleStr}
                        </h4>
                        <p className="truncate text-[10.5px] font-bold text-slate-700 mt-0.5">
                          {compNameStr}
                        </p>
                      </div>

                      {/* Info side badges */}
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black text-[#1392ec] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100/60 shadow-sm">
                          {payRateVal ? `${payRateVal.toLocaleString('vi-VN')} ${translatePayUnit(payUnitVal)}` : 'Thỏa thuận'}
                        </span>
                        <span className="text-[9.5px] font-bold text-slate-700 truncate max-w-[80px]">
                          {locationStr.split(',').pop().trim()}
                        </span>
                      </div>
                    </a>
                  );
                })
              )}
            </div>

            {/* Action link */}
            <a 
              href="/jobs" 
              className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-[#1392ec] hover:from-sky-500 hover:to-blue-600 text-white font-black text-xs py-3.5 shadow-[0_8px_20px_rgba(19,146,236,0.3)] hover:shadow-[0_12px_25px_rgba(19,146,236,0.4)] hover:-translate-y-0.5 transition-all active:scale-95"
            >
              Xem tất cả cơ hội tuyển dụng
              <span className="material-symbols-outlined !text-sm font-black">arrow_forward</span>
            </a>

          </div>

          {/* RIGHT PANEL: Stats & Charts */}
          <div className="flex flex-col justify-between gap-5 relative">
            
            {/* Top Row: 3 statistical counters */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  value: jobsMonthCount.toLocaleString('vi-VN'),
                  label: 'Việc làm mới tháng này',
                  border: 'border-sky-100 hover:border-sky-300',
                  valueColor: 'text-sky-500',
                  bg: 'bg-white/95'
                },
                {
                  value: activeJobsCount.toLocaleString('vi-VN'),
                  label: 'Việc làm đang tuyển',
                  border: 'border-purple-100 hover:border-purple-300',
                  valueColor: 'text-purple-600',
                  bg: 'bg-white/95'
                },
                {
                  value: companiesCount.toLocaleString('vi-VN'),
                  label: 'Doanh nghiệp tuyển dụng',
                  border: 'border-emerald-100 hover:border-emerald-300',
                  valueColor: 'text-emerald-500',
                  bg: 'bg-white/95'
                }
              ].map((card, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col justify-center rounded-2xl border ${card.border} ${card.bg} p-4 text-center hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-xl`}
                >
                  <h3 className={`text-sm sm:text-xl lg:text-3xl font-black ${card.valueColor} tracking-tight leading-none`}>
                    {card.value}
                  </h3>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-600 leading-tight mt-2 break-words">
                    {card.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom Row: Charts grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
              
              {/* Chart 1: Line Chart */}
              <div className="rounded-2xl border border-sky-100 bg-white/95 p-4 flex flex-col justify-between relative shadow-xl hover:shadow-2xl transition-shadow">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <h4 className="text-xs lg:text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#1392ec] shadow-sm animate-pulse" />
                    Tăng trưởng cơ hội việc làm (Lũy kế)
                  </h4>
                </div>

                {/* SVG Area (Proportional aspect ratio) */}
                <div className="relative w-full aspect-[5/2] mt-1 select-none">
                  {loadingStats ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800">
                      Đang tải dữ liệu...
                    </div>
                  ) : (
                    <svg className="w-full h-full" viewBox="0 0 500 200">
                      <defs>
                        {/* Gradients */}
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#1392ec" />
                          <stop offset="100%" stopColor="#00f2fe" />
                        </linearGradient>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1392ec" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#1392ec" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Dotted Grid lines */}
                      <line x1="55" y1="20" x2="485" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.85" />
                      <line x1="55" y1="57.5" x2="485" y2="57.5" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.85" />
                      <line x1="55" y1="95" x2="485" y2="95" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.85" />
                      <line x1="55" y1="132.5" x2="485" y2="132.5" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.85" />
                      <line x1="55" y1="170" x2="485" y2="170" stroke="#cbd5e1" strokeWidth="1.2" />

                      {/* Y-Axis labels */}
                      <text x="45" y="24" fill="#64748b" fontSize="10" fontWeight="900" textAnchor="end">
                        {lineChartRange.max.toLocaleString('vi-VN')}
                      </text>
                      <text x="45" y="99" fill="#64748b" fontSize="10" fontWeight="900" textAnchor="end">
                        {Math.floor((lineChartRange.max + lineChartRange.min) / 2).toLocaleString('vi-VN')}
                      </text>
                      <text x="45" y="174" fill="#64748b" fontSize="10" fontWeight="900" textAnchor="end">
                        {lineChartRange.min.toLocaleString('vi-VN')}
                      </text>

                      {/* X-Axis labels */}
                      {linePoints.map((p, idx) => (
                        <text key={idx} x={p.x} y="190" fill="#64748b" fontSize="10" fontWeight="900" textAnchor="middle">
                          {p.label}
                        </text>
                      ))}

                      {/* Area path */}
                      <path d={areaPathD} fill="url(#areaGrad)" />

                      {/* Line path */}
                      <path d={linePathD} fill="none" stroke="url(#lineGrad)" strokeWidth="3.2" strokeLinecap="round" />

                      {/* Interactive Circles on vertices */}
                      {linePoints.map((p, idx) => (
                        <circle 
                          key={idx} 
                          cx={p.x} 
                          cy={p.y} 
                          r={activeLineIndex === idx ? "7.5" : "5.5"} 
                          fill={activeLineIndex === idx ? "#00f2fe" : "#1392ec"} 
                          stroke="#ffffff" 
                          strokeWidth="2.2"
                          className="cursor-pointer transition-all duration-150"
                          onMouseEnter={() => setActiveLineIndex(idx)}
                          onMouseLeave={() => setActiveLineIndex(null)}
                        />
                      ))}
                    </svg>
                  )}

                  {/* SVG Tooltip */}
                  {activeLineIndex !== null && linePoints[activeLineIndex] && (
                    <div 
                      className="absolute z-30 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-black text-white shadow-xl pointer-events-none"
                      style={{
                        left: `${(linePoints[activeLineIndex].x / 500) * 100}%`,
                        top: `${(linePoints[activeLineIndex].y / 200) * 100 - 30}%`,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      {linePoints[activeLineIndex].value.toLocaleString('vi-VN')} việc làm
                    </div>
                  )}
                </div>
              </div>

              {/* Chart 2: Bar Chart */}
              <div className="rounded-2xl border border-sky-100 bg-white/95 p-4 flex flex-col justify-between relative shadow-xl hover:shadow-2xl transition-shadow">
                
                {/* Header with Industry Dropdown */}
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2 relative z-20">
                  <h4 className="text-xs lg:text-sm font-black text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="h-2 w-2 rounded-full bg-purple-500 shadow-sm" />
                    Top tuyển dụng theo:
                  </h4>

                  {/* Filter dropdown trigger */}
                  <div className="relative ml-2">
                    <button 
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="flex items-center gap-1 rounded bg-white border border-slate-200 px-2 py-1 text-[10.5px] font-black text-[#1392ec] transition-colors hover:bg-sky-50 whitespace-nowrap"
                    >
                      {chartFilter}
                      <span className="material-symbols-outlined !text-[14px]">expand_more</span>
                    </button>
                    {showDropdown && (
                      <div className="absolute right-0 mt-1 w-28 rounded-lg border border-slate-200 bg-white p-1 shadow-xl text-[10px] font-black text-slate-700 z-50">
                        {['Ngành nghề', 'Khu vực'].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => {
                              setChartFilter(opt);
                              setShowDropdown(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded transition-colors ${chartFilter === opt ? 'bg-[#1392ec]/10 text-[#1392ec]' : 'hover:bg-slate-50'}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* SVG Area (Proportional aspect ratio) */}
                <div className="relative w-full aspect-[5/2] mt-1 select-none">
                  {categories.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800">
                      Đang phân tích dữ liệu...
                    </div>
                  ) : (
                    <svg className="w-full h-full" viewBox="0 0 500 200">
                      <defs>
                        <linearGradient id="barBlueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00f2fe" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                        <linearGradient id="barPurpleGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#c084fc" />
                          <stop offset="100%" stopColor="#6b21a8" />
                        </linearGradient>
                        <linearGradient id="barOrangeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fb923c" />
                          <stop offset="100%" stopColor="#c2410c" />
                        </linearGradient>
                        <linearGradient id="barCyanGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2dd4bf" />
                          <stop offset="100%" stopColor="#0e7490" />
                        </linearGradient>
                        <linearGradient id="barYellowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#facc15" />
                          <stop offset="100%" stopColor="#a16207" />
                        </linearGradient>
                      </defs>

                      {/* Dotted Grid lines */}
                      <line x1="50" y1="20" x2="485" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.85" />
                      <line x1="50" y1="70" x2="485" y2="70" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.85" />
                      <line x1="50" y1="120" x2="485" y2="120" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.85" />
                      <line x1="50" y1="170" x2="485" y2="170" stroke="#cbd5e1" strokeWidth="1.2" />

                      {/* Y-Axis labels */}
                      <text x="40" y="24" fill="#64748b" fontSize="10" fontWeight="900" textAnchor="end">
                        {barChartYMax.toLocaleString('vi-VN')}
                      </text>
                      <text x="40" y="99" fill="#64748b" fontSize="10" fontWeight="900" textAnchor="end">
                        {Math.floor(barChartYMax / 2).toLocaleString('vi-VN')}
                      </text>
                      <text x="40" y="174" fill="#64748b" fontSize="10" fontWeight="900" textAnchor="end">0</text>

                      {/* Bars */}
                      {barItems.map((bar, idx) => (
                        <rect 
                          key={idx}
                          x={bar.x}
                          y={bar.y}
                          width={barWidth}
                          height={bar.height}
                          fill={bar.color}
                          rx="4"
                          ry="4"
                          className="cursor-pointer transition-all duration-300 hover:brightness-110 hover:shadow-md"
                          style={{
                            transformOrigin: `${bar.x + barWidth/2}px 170px`,
                            transform: activeBarIndex === idx ? 'scaleY(1.03)' : 'scaleY(1)'
                          }}
                          onMouseEnter={() => setActiveBarIndex(idx)}
                          onMouseLeave={() => setActiveBarIndex(null)}
                        />
                      ))}

                      {/* Real X-Axis labels underneath the columns */}
                      {barItems.map((bar, idx) => (
                        <text 
                          key={idx}
                          x={bar.x + barWidth / 2}
                          y="188"
                          fill="#64748b"
                          fontSize="8.5"
                          fontWeight="900"
                          textAnchor="middle"
                        >
                          {bar.category}
                        </text>
                      ))}
                    </svg>
                  )}

                  {/* SVG Tooltip */}
                  {activeBarIndex !== null && barItems[activeBarIndex] && (
                    <div 
                      className="absolute z-30 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-black text-white shadow-xl pointer-events-none"
                      style={{
                        left: `${((barItems[activeBarIndex].x + barWidth / 2) / 500) * 100}%`,
                        top: `${(barItems[activeBarIndex].y / 200) * 100 - 20}%`,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      {barItems[activeBarIndex].value.toLocaleString('vi-VN')} tin tuyển dụng
                    </div>
                  )}
                </div>

                {/* Colored Legend Dots */}
                <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 border-t border-slate-100 pt-2.5 mt-2">
                  {barChartData.map((d, idx) => (
                    <span key={idx} className="flex items-center gap-1.5 text-[9.5px] font-black text-slate-800">
                      <span className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: d.legendColor }} />
                      {d.category}
                    </span>
                  ))}
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
