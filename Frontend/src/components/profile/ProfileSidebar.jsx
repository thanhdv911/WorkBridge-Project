import React from 'react';
import { NavLink } from 'react-router-dom';

export default function ProfileSidebar({ user, isOwnProfile = true }) {
  let strength = 30;
  if (user?.phone) strength += 10;
  if (user?.address) strength += 10;
  if (user?.university) strength += 20;
  if (user?.aboutMe) strength += 30;

  const getFormattedJoinedDate = (dateStr) => {
    if (!dateStr) return 'Chưa rõ';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Chưa rõ' : d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  };

  const formattedDate = getFormattedJoinedDate(user?.createdAt);
  const reputationScore = Number.isFinite(Number(user?.reputationScore)) ? Number(user.reputationScore) : 100;
  const reportCount = Number.isFinite(Number(user?.reportCount)) ? Number(user.reportCount) : 0;
  const reputationTone = reputationScore >= 90
    ? 'from-emerald-500 to-teal-500 text-emerald-700 bg-emerald-50 border-emerald-100'
    : reputationScore >= 80
      ? 'from-sky-500 to-cyan-500 text-sky-700 bg-sky-50 border-sky-100'
      : 'from-rose-500 to-orange-500 text-rose-700 bg-rose-50 border-rose-100';
  const reputationGradient = reputationTone.split(' ').slice(0, 2).join(' ');
  const shouldShowReputationHint = isOwnProfile && reputationScore < 100;
  const reputationNote = shouldShowReputationHint
    ? 'Hãy cập nhật hồ sơ để tăng điểm uy tín.'
    : reportCount > 0
      ? `${reportCount} báo cáo đã ghi nhận`
      : 'Chưa có báo cáo vi phạm';

  const quickLinks = [
    { to: '/my-applications', icon: 'description', label: 'Đơn ứng tuyển' },
    { to: '/saved-jobs', icon: 'bookmark', label: 'Việc đã lưu' },
    { to: '/offers', icon: 'contract', label: 'Lời mời nhận việc' },
    { to: '/interviews', icon: 'event_available', label: 'Phỏng vấn' },
    { to: '/payslips', icon: 'receipt_long', label: 'Phiếu lương' }
  ];

  return (
    <aside className="profile-sidebar-card anim-fadeUp h-fit rounded-2xl p-5">
      <div className="space-y-5">
        {isOwnProfile && (
          <section className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-500">Độ hoàn thiện hồ sơ</h3>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  {strength < 100 ? 'Bổ sung thêm thông tin để hồ sơ nổi bật hơn.' : 'Hồ sơ đã sẵn sàng để ứng tuyển.'}
                </p>
              </div>
              <span className="text-2xl font-black text-primary">{strength}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-dk transition-all duration-1000"
                style={{ width: `${strength}%` }}
              />
            </div>
          </section>
        )}

        <section className={`rounded-2xl border p-4 ${reputationTone}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase opacity-70">Uy tín cá nhân</p>
              <div className="mt-1 flex items-end gap-1">
                <span className="text-3xl font-black text-slate-950">{reputationScore}</span>
                <span className="pb-1 text-xs font-black opacity-70">/100</span>
              </div>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${reputationGradient} text-white shadow-lg shadow-slate-200`}>
              <span className="material-symbols-outlined filled">verified_user</span>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${reputationGradient}`}
              style={{ width: `${Math.max(0, Math.min(100, reputationScore))}%` }}
            />
          </div>
          <p className={`mt-2 flex items-start gap-1.5 text-[11px] font-bold leading-relaxed ${shouldShowReputationHint ? 'opacity-95' : 'opacity-75'}`}>
            {shouldShowReputationHint && (
              <span className="material-symbols-outlined !text-[14px]">tips_and_updates</span>
            )}
            <span>{reputationNote}</span>
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
            <span className="material-symbols-outlined text-primary !text-lg">contact_mail</span>
            Thông tin liên hệ
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm">
              <span className="material-symbols-outlined text-slate-400 !text-lg">mail</span>
              <span className="truncate font-semibold text-slate-600 select-all" title={user?.email}>{user?.email || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm">
              <span className="material-symbols-outlined text-slate-400 !text-lg">phone</span>
              <span className="font-semibold text-slate-600">{user?.phone || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm">
              <span className="material-symbols-outlined text-slate-400 !text-lg">location_on</span>
              <span className="line-clamp-1 font-semibold text-slate-600" title={user?.address}>{user?.address || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm">
              <span className="material-symbols-outlined text-slate-400 !text-lg">calendar_today</span>
              <span className="font-medium text-slate-500">Tham gia {formattedDate}</span>
            </div>
          </div>
        </section>

        {isOwnProfile && (
          <section className="space-y-3 border-t border-slate-200/70 pt-5">
            <h3 className="text-xs font-black uppercase text-slate-500">Điều hướng nhanh</h3>
            <nav className="space-y-1">
              {quickLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-slate-600 hover:bg-sky-50 hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined !text-lg">{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </section>
        )}
      </div>
    </aside>
  );
}
