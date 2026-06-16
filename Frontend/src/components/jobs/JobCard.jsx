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

  return (
    <Link to={`/jobs/${job.jobPostId}`} className={`jobs-card !min-h-0 !h-fit ${job.isFeatured ? 'is-featured' : ''}`}>
      {job.isFeatured && (
        <span
          title="Tin đăng từ doanh nghiệp VIP"
          className={`jobs-featured-badge ${onToggleSave ? 'has-save' : ''}`}
        >
          <span className="material-symbols-outlined">local_fire_department</span>
        </span>
      )}

      <div className="jobs-card-head">
        <div className="jobs-card-logo-wrap">
          {job.companyLogoUrl ? (
            <img 
              src={job.companyLogoUrl.startsWith('http') ? job.companyLogoUrl : `${API_BASE_URL}${job.companyLogoUrl.startsWith('/') ? '' : '/'}${job.companyLogoUrl}`} 
              alt={job.companyName} 
              className="jobs-card-logo"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-400 to-[#1392ec] text-white font-bold text-base rounded-xl">
              {getInitials(job.companyName)}
            </div>
          )}
        </div>

        <div className="jobs-card-title">
          <h3>{job.title}</h3>
          <p>{job.companyName} · {job.location || 'Việt Nam'}</p>
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

      <div className="jobs-card-chips">
        {job.isFeatured && <span className="jobs-chip is-hot">Việc hot</span>}
        <span className="jobs-chip is-green">{translateJobType(job.jobType)}</span>
        <span className={`jobs-chip ${getShiftTone(shift)}`}>{translateShift(shift)}</span>
        {categoryName !== 'Chung' && <span className={`jobs-chip ${getCategoryTone(categoryName)}`}>{translateCategory(categoryName)}</span>}
        {job.position && <span className="jobs-chip is-indigo">Vị trí: {job.position}</span>}
        {job.vacancies && <span className="jobs-chip is-rose">Tuyển: {job.vacancies}</span>}
      </div>

      <p className="mt-2.5 text-[13px] font-semibold text-slate-700 overflow-hidden text-ellipsis whitespace-nowrap">{job.description}</p>

      <div className="jobs-card-footer">
        <div className="jobs-card-pay">
          <span>{payRate}</span>
          <small>{translatePayUnit(job.payUnit)}</small>
        </div>
        <span className="jobs-card-time">
          <span className="material-symbols-outlined">schedule</span>
          Đăng {timeStr}
        </span>
      </div>
    </Link>
  );
}
