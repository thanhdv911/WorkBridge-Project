import React, { useState } from 'react';
import ReportModal from '../shared/ReportModal';

export default function ProfileCover({ user, onEditClick, isOwnProfile = true, ratingStats = { averageRating: 0, totalReviews: 0 } }) {
  const [showReportModal, setShowReportModal] = useState(false);
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <section className="relative">
      <div className="h-44 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(19,146,236,.2),transparent_70%)] -top-32 right-0 absolute rounded-full blur-[60px] pointer-events-none"></div>
        <div className="w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(124,58,237,.12),transparent_70%)] -bottom-20 -left-10 absolute rounded-full blur-[60px] pointer-events-none"></div>
      </div>
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 -mt-14 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-black border-4 border-white shadow-xl">
            {initials}
          </div>
          <div className="flex-1 pb-1">
            <h1 className="text-2xl font-black tracking-tight">{user?.fullName || 'Anonymous User'}</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <span className="material-symbols-outlined !text-[16px]">school</span>
                {user?.studyYear || 'Student'} · {user?.university || 'University Not Set'} {user?.major ? `(${user.major})` : ''}
              </p>
              {ratingStats.totalReviews > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100 shadow-sm animate-fadeIn">
                  <span className="material-symbols-outlined !text-[14px] text-amber-500 filled">star</span>
                  <span className="text-xs font-black text-amber-700">{ratingStats.averageRating}</span>
                  <span className="text-[10px] text-amber-400 font-bold ml-0.5">({ratingStats.totalReviews})</span>
                </div>
              )}
            </div>
          </div>
          {isOwnProfile ? (
            <button
              onClick={onEditClick}
              className="inline-flex items-center h-10 px-5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined !text-lg">edit</span>Edit Profile
            </button>
          ) : (
            <button
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center h-10 px-5 rounded-xl text-sm font-semibold text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-colors gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined !text-lg">flag</span>Report User
            </button>
          )}
        </div>
      </div>

      {!isOwnProfile && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          entityId={user?.userId}
          entityType="User"
          entityTitle={user?.fullName}
        />
      )}
    </section>
  );
}
