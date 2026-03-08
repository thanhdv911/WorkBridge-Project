import React from 'react';
import { Link } from 'react-router-dom';

export default function JobCard({ job }) {
  // Use mapping configs for badged to replicate html visuals
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

  return (
    <Link to={`/jobs/${job.id}`} className="card-lift bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden group">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${job.iconBg} flex items-center justify-center flex-shrink-0 shadow-md`}>
            <span className="material-symbols-outlined text-white !text-xl">{job.icon}</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-primary transition-colors">{job.title}</h3>
            <p className="text-xs text-slate-400 truncate">{job.company} · {job.location}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${typeStyles[job.type] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
            {job.type}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${shiftStyles[job.shift] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
            {job.shift}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${catStyles[job.category] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
            {job.category}
          </span>
        </div>
        
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">{job.description}</p>
        
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-sm font-bold text-primary">{job.salary.toLocaleString()}₫<span className="text-xs font-normal text-slate-400">/hr</span></span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <span className="material-symbols-outlined !text-[14px]">schedule</span>Posted {job.timePosted}
          </span>
        </div>
      </div>
    </Link>
  );
}
