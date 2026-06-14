import React from 'react';
import { Link } from 'react-router-dom';
import { translateCategory, translateJobType, translateShift, translatePayUnit } from '../../utils/translate';
import { API_BASE_URL } from '../../services/api';

const getInitials = (name) => {
  if (!name) return '??';
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
};

const getCategoryTone = (categoryName = '') => {
  const value = categoryName.toLowerCase();
  if (value.includes('tutor') || value.includes('gia')) return 'is-indigo';
  if (value.includes('delivery') || value.includes('giao')) return 'is-emerald';
  if (value.includes('retail') || value.includes('bán')) return 'is-pink';
  if (value.includes('marketing')) return 'is-violet';
  if (value.includes('creative') || value.includes('design')) return 'is-amber';
  if (value.includes('office')) return 'is-slate';
  return 'is-blue';
};

const getShiftTone = (shift = '') => {
  const value = shift.toLowerCase();
  if (value.includes('afternoon')) return 'is-amber';
  if (value.includes('evening')) return 'is-orange';
  if (value.includes('weekend')) return 'is-rose';
  if (value.includes('remote')) return 'is-sky';
  return 'is-blue';
};

const formatTimeAgo = (dateStr) => {
  const timePostedDate = dateStr ? new Date(dateStr) : new Date();
  const diffHours = Math.max(0, Math.round((new Date() - timePostedDate) / (1000 * 60 * 60)));
  return diffHours > 24 ? `${Math.round(diffHours / 24)} ngày trước` : `${diffHours} giờ trước`;
};

export default function JobCard({ job, isSaved = false, onToggleSave }) {
  const categoryName = job.categoryName || 'Chung';
  const shift = job.shift || 'Flexible';
  const timeStr = formatTimeAgo(job.createdAt);
  const payRate = job.payRate?.toLocaleString('vi-VN') || 0;
  
  // High density info
  const isUrgent = job.vacancies >= 5;
  const locationStr = job.district && job.city ? `${job.district}, ${job.city}` : (job.location || 'Việt Nam');

  return (
    <Link to={`/jobs/${job.jobPostId}`} className={`group relative flex flex-col p-5 bg-surface border border-slate-200/60 rounded-[20px] transition-all duration-300 hover:shadow-premium hover:-translate-y-1 hover:border-primary/30 ${job.isFeatured ? 'bg-gradient-to-b from-amber-50/50 to-surface border-amber-200/50' : ''}`}>
      {job.isFeatured && (
        <span
          title="Tin đăng từ doanh nghiệp VIP"
          className={`jobs-featured-badge ${onToggleSave ? 'has-save' : ''}`}
        >
          <span className="material-symbols-outlined">local_fire_department</span>
        </span>
      )}

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex-shrink-0 bg-slate-50 flex items-center justify-center">
              {job.companyLogoUrl ? (
                <img 
                  src={job.companyLogoUrl.startsWith('http') ? job.companyLogoUrl : `${API_BASE_URL}${job.companyLogoUrl.startsWith('/') ? '' : '/'}${job.companyLogoUrl}`} 
                  alt={job.companyName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-primary-dk text-white font-bold text-lg">
                  {getInitials(job.companyName)}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-display text-lg font-bold text-ink leading-tight group-hover:text-primary transition-colors line-clamp-1">{job.title}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-semibold text-slate-600 line-clamp-1">{job.companyName}</span>
                {job.isVipEmployer && (
                  <span className="material-symbols-outlined !text-[16px] text-primary" title="Doanh nghiệp xác thực">verified</span>
                )}
                <span className="text-slate-300">•</span>
                <span className="text-sm text-slate-500 line-clamp-1 flex items-center gap-1">
                  <span className="material-symbols-outlined !text-[14px]">location_on</span>
                  {locationStr}
                </span>
              </div>
            </div>
          </div>

        {onToggleSave && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleSave(job.jobPostId);
            }}
            className={`jobs-save-button ${isSaved ? 'is-saved' : ''}`}
            aria-label={isSaved ? 'Bỏ lưu việc làm' : 'Lưu việc làm'}
          >
            <span className="material-symbols-outlined !text-xl">
              {isSaved ? 'bookmark' : 'bookmark_border'}
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {job.isFeatured && <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700"><span className="material-symbols-outlined !text-[14px] mr-1">local_fire_department</span>Việc Hot</span>}
        {isUrgent && <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-700">Tuyển gấp {job.vacancies} người</span>}
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">{translateJobType(job.jobType)}</span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700">{translateShift(shift)}</span>
      </div>

      <p className="text-[13px] font-medium text-slate-500 line-clamp-2 mb-4 leading-relaxed">{job.description}</p>

      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-baseline gap-1 text-primary">
          <span className="text-lg font-black">{payRate}</span>
          <span className="text-xs font-bold text-slate-500">/{translatePayUnit(job.payUnit)}</span>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <span className="material-symbols-outlined !text-[14px]">schedule</span>
          Đăng {timeStr}
        </span>
      </div>
    </Link>
  );
}
