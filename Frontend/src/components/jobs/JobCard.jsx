import React from 'react';
import { Link } from 'react-router-dom';
import { translateCategory, translateJobType, translateShift, translatePayUnit } from '../../utils/translate';

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

  const categoryName = job.categoryName || 'Chung';
  const mockShift = job.shift || 'Linh hoạt'; // Assuming fallback if not in join

  // Format the posted time
  const timePostedDate = job.createdAt ? new Date(job.createdAt) : new Date();
  const diffHours = Math.round((new Date() - timePostedDate) / (1000 * 60 * 60));
  const timeStr = diffHours > 24 ? `${Math.round(diffHours / 24)} ngày trước` : `${diffHours} giờ trước`;

  const containerClasses = job.isFeatured
    ? "card-lift bg-gradient-to-br from-sky-50/60 via-white to-blue-50/40 border-blue-200 dark:border-blue-500/40 shadow-md shadow-blue-500/10 rounded-2xl overflow-hidden group relative"
    : "card-lift bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden group";

  const iconContainerClass = job.isFeatured
    ? "w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20"
    : "w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-md";

  const payColorClass = job.isFeatured ? "text-sm font-bold text-blue-600" : "text-sm font-bold text-primary";

  return (
    <Link to={`/jobs/${job.jobPostId}`} className={containerClasses}>
      {job.isFeatured && (
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-400"></div>
      )}
      {job.isFeatured && (
        <div
          title="Tin đăng từ Doanh nghiệp VIP"
          className={`absolute top-3 ${onToggleSave ? 'right-14' : 'right-3'} z-10 w-8 h-8 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shadow-sm shadow-blue-500/10 ring-2 ring-white`}
        >
          <span className="text-base leading-none">🔥</span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={iconContainerClass}>
            <span className="material-symbols-outlined text-white !text-xl">work</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-primary transition-colors flex items-center gap-1">
              {job.title}
            </h3>
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
          {job.isFeatured && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold border bg-blue-50 text-blue-700 border-blue-100 uppercase tracking-wider select-none">
              🔥 Việc Hot
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${typeStyles[job.jobType] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
            {translateJobType(job.jobType)}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${shiftStyles[mockShift] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
            {translateShift(mockShift)}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${catStyles[categoryName] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
            {translateCategory(categoryName)}
          </span>
          {job.position && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-indigo-50 text-indigo-600 border-indigo-100">
              Vị trí: {job.position}
            </span>
          )}
          {job.vacancies && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-rose-50 text-rose-600 border-rose-100">
              Tuyển: {job.vacancies}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">{job.description}</p>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className={payColorClass}>{job.payRate?.toLocaleString() || 0} {translatePayUnit(job.payUnit)}</span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <span className="material-symbols-outlined !text-[14px]">schedule</span>Đăng {timeStr}
          </span>
        </div>
      </div>
    </Link>
  );
}
