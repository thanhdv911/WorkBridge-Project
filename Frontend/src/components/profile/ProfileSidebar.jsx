import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { signalRService } from '../../services/signalrService';

export default function ProfileSidebar({ user, isOwnProfile = true }) {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('role');

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

  const handleLogout = () => {
    signalRService.stop(); // cleanly disconnect on logout
    localStorage.clear();
    toast.success('Đã đăng xuất thành công');
    navigate('/login');
  };

  return (
    <aside className="profile-sidebar-card anim-fadeUp h-fit rounded-2xl p-5">
      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-xs font-black uppercase text-primary">
            <span className="material-symbols-outlined text-primary !text-lg">contact_mail</span>
            Thông tin liên hệ
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm">
              <span className="material-symbols-outlined text-slate-800 !text-lg">mail</span>
              <span className="truncate font-semibold text-slate-800 select-all" title={user?.email}>{user?.email || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm">
              <span className="material-symbols-outlined text-slate-800 !text-lg">phone</span>
              <span className="font-semibold text-slate-800">{user?.phone || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm">
              <span className="material-symbols-outlined text-slate-800 !text-lg">location_on</span>
              <span className="line-clamp-1 font-semibold text-slate-800" title={user?.address}>{user?.address || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm">
              <span className="material-symbols-outlined text-slate-800 !text-lg">calendar_today</span>
              <span className="font-medium text-slate-700">Tham gia {formattedDate}</span>
            </div>
          </div>
        </section>

        {isOwnProfile && (
          <section className="space-y-3 border-t border-slate-200/70 pt-5">
            <h3 className="text-xs font-black uppercase text-primary">Điều hướng nhanh</h3>
            <nav className="space-y-1">
              {userRole !== 'Admin' && quickLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-slate-800 hover:bg-sky-50 hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined !text-lg">{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
              {userRole === 'Admin' && (
                <NavLink
                  to="/admin-dashboard"
                  className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-slate-800 hover:bg-sky-50 hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined !text-lg">admin_panel_settings</span>
                  Quản trị hệ thống
                </NavLink>
              )}
            </nav>

            <div className="border-t border-slate-200/70 pt-4 mt-4">
              <button
                onClick={handleLogout}
                className="flex w-full min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100/50"
              >
                <span className="material-symbols-outlined !text-lg">logout</span>
                Đăng xuất tài khoản
              </button>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
