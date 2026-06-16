import React, { useState } from 'react';
import ReportModal from '../shared/ReportModal';

export default function ProfileCover({ user, onEditClick, isOwnProfile = true, ratingStats }) {
  const [showReportModal, setShowReportModal] = useState(false);
  const userRole = localStorage.getItem('role');
  const initials = user?.fullName
    ? user.fullName.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'
    : 'U';
  const translateStudyYear = (value) => {
    switch (value) {
      case '1st Year Student': return 'Sinh viên năm 1';
      case '2nd Year Student': return 'Sinh viên năm 2';
      case '3rd Year Student': return 'Sinh viên năm 3';
      case '4th Year Student': return 'Sinh viên năm 4';
      case 'Graduated': return 'Đã tốt nghiệp';
      default: return value || 'Chưa cập nhật năm học';
    }
  };

  let strength = 30;
  if (user?.phone) strength += 10;
  if (user?.address) strength += 10;
  if (user?.university) strength += 20;
  if (user?.aboutMe) strength += 30;

  const reputationScore = Number.isFinite(Number(user?.reputationScore)) ? Number(user.reputationScore) : 100;

  return (
    <section className="relative animate-fadeIn">
      <div className="profile-cover-band h-56">
        <div className="absolute right-[8%] top-10 hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black text-sky-50 shadow-lg shadow-sky-950/10 backdrop-blur md:inline-flex">
          Hồ sơ WorkBridge
        </div>
      </div>
      <div className="relative z-10 mx-auto -mt-24 w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="profile-cover-card">
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end">
            <div className="profile-avatar relative h-28 w-28 rounded-2xl border-4 border-white overflow-hidden bg-slate-100 flex-shrink-0">
              <img
                src={user?.avatarUrl || "/default-avatar.png"}
                alt={user?.fullName || "User"}
                className="h-full w-full object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
              />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-black text-primary">
                <span className="material-symbols-outlined !text-[15px]">verified</span>
                {userRole === 'Admin' ? 'Hồ sơ Quản trị viên' : 'Hồ sơ ứng viên'}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black text-slate-950 sm:text-3xl leading-none">{user?.fullName || 'Người dùng WorkBridge'}</h1>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  {isOwnProfile && userRole !== 'Admin' && (
                    <div className="inline-flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-black text-primary" title="Độ hoàn thiện hồ sơ">
                      <span className="material-symbols-outlined !text-[12px] text-primary">analytics</span>
                      <span>Hoàn thiện: {strength}%</span>
                    </div>
                  )}
                  {userRole !== 'Admin' && (
                    <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${
                      reputationScore >= 90
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : reputationScore >= 80
                          ? 'border-sky-100 bg-sky-50 text-sky-700'
                          : 'border-rose-100 bg-rose-50 text-rose-700'
                    }`} title="Uy tín cá nhân">
                      <span className="material-symbols-outlined !text-[12px] filled">verified_user</span>
                      <span>Uy tín: {reputationScore}/100</span>
                    </div>
                  )}
                </div>
              </div>
              {userRole !== 'Admin' && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                    <span className="material-symbols-outlined !text-[16px] text-primary">school</span>
                    {translateStudyYear(user?.studyYear)} · {user?.university || 'Chưa cập nhật trường'} {user?.major ? `(${user.major})` : ''}
                  </p>
                  {ratingStats?.totalReviews > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 shadow-sm">
                      <span className="material-symbols-outlined !text-[14px] text-amber-500 filled">star</span>
                      <span className="text-xs font-black text-amber-700">{ratingStats?.averageRating || 0}</span>
                      <span className="text-[10px] font-bold text-amber-500">({ratingStats?.totalReviews || 0} đánh giá)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {isOwnProfile ? (
              <button
                onClick={onEditClick}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary-dk"
              >
                <span className="material-symbols-outlined !text-lg">edit</span>
                Chỉnh sửa hồ sơ
              </button>
            ) : (
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-5 text-sm font-bold text-rose-600 transition-all hover:bg-rose-100"
              >
                <span className="material-symbols-outlined !text-lg">flag</span>
                Báo cáo người dùng
              </button>
            )}
          </div>
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
