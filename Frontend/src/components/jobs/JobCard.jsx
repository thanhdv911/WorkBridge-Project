import React from 'react';
import { Link } from 'react-router-dom';

export default function JobCard({ job, isSaved = false, onToggleSave }) {
  const typeStyles = {
    'Part-time': 'bg-green-50 text-green-600 border-green-100',
    'Flexible': 'bg-green-50 text-green-600 border-green-100',
    'Freelance': 'bg-green-50 text-green-600 border-green-100',
    'Internship': 'bg-green-50 text-green-600 border-green-100',
  };

  const shiftStyles = {
    'Morning': 'bg-blue-50 text-blue-600 border-blue-100',
    'Afternoon': 'bg-yellow-50 text-yellow-600 border-yellow-100',
    'Evening': 'bg-orange-50 text-orange-600 border-orange-100',
    'Weekend': 'bg-rose-50 text-rose-600 border-rose-100',
    'Remote': 'bg-sky-50 text-sky-600 border-sky-100'
  };

  const catStyles = {
    'F&B': 'bg-purple-50 text-purple-600 border-purple-100',
    'Tutoring': 'bg-indigo-50 text-indigo-600 border-indigo-100',
    'Delivery': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Retail': 'bg-pink-50 text-pink-600 border-pink-100',
    'Marketing': 'bg-violet-50 text-violet-600 border-violet-100',
    'Creative': 'bg-amber-50 text-amber-600 border-amber-100',
    'Service': 'bg-red-50 text-red-600 border-red-100',
    'Office': 'bg-slate-100 text-slate-600 border-slate-200'
  };

  const getJobAssets = (title = "") => {
    const t = title.toLowerCase();
    if (t.includes('pha chế') || t.includes('barista') || t.includes('coffee') || t.includes('cafe')) 
      return { icon: 'local_cafe', color: 'from-orange-400 to-rose-500' };
    if (t.includes('gia sư') || t.includes('tutoring') || t.includes('dạy') || t.includes('teacher') || t.includes('english')) 
      return { icon: 'school', color: 'from-blue-500 to-indigo-600' };
    if (t.includes('shipper') || t.includes('giao hàng') || t.includes('delivery')) 
      return { icon: 'delivery_dining', color: 'from-sky-400 to-blue-600' };
    if (t.includes('kho') || t.includes('warehouse') || t.includes('điều phối')) 
      return { icon: 'inventory_2', color: 'from-slate-500 to-slate-700' };
    if (t.includes('developer') || t.includes('it') || t.includes('analyst') || t.includes('data') || t.includes('lập trình') || t.includes('game')) 
      return { icon: 'terminal', color: 'from-indigo-500 to-purple-600' };
    if (t.includes('marketing') || t.includes('media') || t.includes('social') || t.includes('content')) 
      return { icon: 'campaign', color: 'from-pink-500 to-rose-600' };
    if (t.includes('bán lẻ') || t.includes('retail') || t.includes('sales') || t.includes('lấy hàng') || t.includes('shop')) 
      return { icon: 'storefront', color: 'from-emerald-400 to-teal-600' };
    if (t.includes('quản lý') || t.includes('manager')) 
      return { icon: 'manage_accounts', color: 'from-amber-400 to-orange-500' };
    
    return { icon: 'work', color: 'from-primary to-accent' };
  };

  const assets = getJobAssets(job.title);
  const mockShift = job.shift || 'Flexible'; 

  return (
    <Link to={`/jobs/${job.jobPostId}`} className="card-lift bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden group">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${assets.color} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
            <span className="material-symbols-outlined text-white !text-xl">{assets.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-primary transition-colors">{job.title}</h3>
            <p className="text-xs text-slate-400 truncate">{job.companyName} · {job.location}</p>
          </div>
          
          {onToggleSave && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave(job.jobPostId);
              }}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                isSaved 
                ? 'bg-rose-50 border-rose-100 text-rose-500 shadow-sm shadow-rose-100' 
                : 'bg-white border-slate-200 text-slate-400 hover:text-rose-400 hover:border-rose-100'
              }`}
            >
              <span className={`material-symbols-outlined !text-xl ${isSaved ? 'filled' : ''}`}>
                favorite
              </span>
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${typeStyles[job.jobType] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
            {job.jobType}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${shiftStyles[mockShift] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
            {mockShift}
          </span>
        </div>
        
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">{job.description}</p>
        
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400">Salary</span>
            <span className="text-sm font-bold text-primary">{job.payRate?.toLocaleString() || 0} {job.payUnit}</span>
          </div>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const token = localStorage.getItem('token');
              if (!token) {
                navigate('/login');
              } else {
                navigate(`/jobs/${job.jobPostId}`);
              }
            }}
            className="px-4 py-2 bg-slate-900 border border-slate-900 text-white rounded-xl text-[11px] font-black hover:bg-primary hover:border-primary transition-all shadow-lg shadow-black/5"
          >
            Apply
          </button>
        </div>
      </div>
    </Link>
  );
}
