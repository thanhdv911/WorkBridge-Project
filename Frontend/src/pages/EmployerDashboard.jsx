import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import EmployerProfileTab from '../components/employer/EmployerProfileTab';
import EmployerJobForm from '../components/employer/EmployerJobForm';
import EmployerManagePosts from '../components/employer/EmployerManagePosts';
import EmployerApplicantReview from '../components/employer/EmployerApplicantReview';
import EmployerEmployees from '../components/employer/EmployerEmployees';
import EmployerBranches from '../components/employer/EmployerBranches';
import EmployerOffers from '../components/employer/EmployerOffers';
import EmployerShifts from '../components/employer/EmployerShifts';
import EmployerPayroll from '../components/employer/EmployerPayroll';
import EmployerInterviews from '../components/employer/EmployerInterviews';
import EmployerVipTab from '../components/employer/EmployerVipTab';

export default function EmployerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Basic role check (In a real app, verify from decoded JWT)
  const isEmployer = localStorage.getItem('role') === 'Employer';

  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // VIP Promo Banner States
  const [showVipBanner, setShowVipBanner] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
    } else if (!isEmployer) {
      navigate('/profile');
    }
  }, [token, isEmployer, navigate]);

  useEffect(() => {
    const checkVipAndShowBanner = async () => {
      try {
        const response = await api.get('/subscriptions/status');
        const vip = response.data.isVip;
        localStorage.setItem('isVip', vip ? 'true' : 'false');

        if (!vip) {
          const hideUntil = localStorage.getItem('hideVipBannerUntil');
          if (!hideUntil || Number(hideUntil) < Date.now()) {
            setShowVipBanner(true);
          }
        }
      } catch (error) {
        console.error('Error checking VIP for banner:', error);
      }
    };

    if (token && isEmployer) {
      fetchDashboardStats();
      checkVipAndShowBanner();
    }
  }, [token, isEmployer]);

  const handleCloseVipBanner = () => {
    if (dontShowAgain) {
      const expireTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      localStorage.setItem('hideVipBannerUntil', String(expireTime));
    }
    setShowVipBanner(false);
  };

  const handleGoToVip = () => {
    handleCloseVipBanner();
    handleTabChange('vip');
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/employer/dashboard/stats');
      setStatsData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (!token || !isEmployer) {
    return null;
  }

  // Real statistics data matching user preferences
  const stats = [
    {
      label: 'Tin tuyển dụng',
      value: loadingStats ? '...' : (statsData?.jobPostCount ?? 0),
      icon: 'work',
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    {
      label: 'Tổng đơn ứng tuyển',
      value: loadingStats ? '...' : (statsData?.totalApplications ?? 0),
      icon: 'description',
      color: 'text-blue-500',
      bg: 'bg-blue-50'
    },
    {
      label: 'Ứng viên phù hợp',
      value: loadingStats ? '...' : `${statsData?.suitablePercentage ?? 0}%`,
      icon: 'how_to_reg',
      color: 'text-green-500',
      bg: 'bg-green-50'
    },
    {
      label: 'Đánh giá doanh nghiệp',
      value: loadingStats ? '...' : `${statsData?.rating ?? 5.0} ★`,
      icon: 'star',
      color: 'text-amber-500',
      bg: 'bg-amber-50'
    },
    {
      label: 'Điểm uy tín tuyển dụng',
      value: loadingStats ? '...' : `${statsData?.reputationScore ?? 100} / 100`,
      icon: 'verified_user',
      color: (statsData?.reputationScore ?? 100) >= 90
        ? 'text-emerald-500'
        : (statsData?.reputationScore ?? 100) >= 80
        ? 'text-amber-500'
        : 'text-rose-500',
      bg: (statsData?.reputationScore ?? 100) >= 90
        ? 'bg-emerald-50'
        : (statsData?.reputationScore ?? 100) >= 80
        ? 'bg-amber-50'
        : 'bg-rose-50'
    }
  ];

  return (
    <div className="applicant-shell min-h-[calc(100vh-64px)] overflow-x-hidden pb-16 font-display text-slate-900">
      <section className="applicant-page-hero">
        <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col justify-between gap-4 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div>
            <span className="applicant-eyebrow">
              <span className="material-symbols-outlined !text-[15px]">domain</span>
              Không gian doanh nghiệp
            </span>
            <h1 className="anim-fadeUp mt-4 text-3xl font-black text-white lg:text-4xl">
              Quản lý tuyển dụng
            </h1>
            <p className="anim-fadeUp-d1 mt-2 max-w-2xl text-sm font-medium leading-relaxed text-sky-100">
              Quản lý hồ sơ công ty, tin tuyển dụng, ứng viên, ca làm và bảng lương trong một bảng điều khiển đồng bộ.
            </p>
          </div>
          <button
            onClick={() => handleTabChange('post-job')}
            className="anim-fadeUp-d2 inline-flex items-center h-11 px-6 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all gap-2 flex-shrink-0"
          >
            <span className="material-symbols-outlined !text-xl">add</span>Đăng tin mới
          </button>
        </div>
      </section>

      <div className="applicant-page-content mx-auto mb-8 w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="applicant-card anim-fadeUp card-lift p-5" style={{animationDelay: `${idx * 0.12}s`}}>
               <div className="flex items-center justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined ${stat.color} !text-2xl`}>{stat.icon}</span>
                  </div>
               </div>
               <p className="text-3xl font-black text-slate-800">{stat.value}</p>
               <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1440px] min-w-0 gap-6 px-4 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8 lg:px-8">
        <aside className="profile-sidebar-card h-fit rounded-2xl p-3 lg:sticky lg:top-24">
          <button
            onClick={() => handleTabChange('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'profile' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">domain</span>Hồ sơ công ty
          </button>

          <button
            onClick={() => handleTabChange('vip')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'vip' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">workspace_premium</span>Doanh nghiệp VIP
          </button>

          <button
            onClick={() => handleTabChange('post-job')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'post-job' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">post_add</span>Đăng tin
          </button>

          <button
            onClick={() => handleTabChange('manage-posts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'manage-posts' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">list_alt</span>Quản lý tin
          </button>

          <button
            onClick={() => handleTabChange('review-applicants')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'review-applicants' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">group</span>Duyệt ứng viên
          </button>

          <button
            onClick={() => handleTabChange('branches')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'branches' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">storefront</span>Chi nhánh
          </button>

          <button
            onClick={() => handleTabChange('interviews')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'interviews' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">event</span>Phỏng vấn
          </button>

          <button
            onClick={() => handleTabChange('offers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'offers' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">contract</span>Lời mời
          </button>

          <button
            onClick={() => handleTabChange('employees')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'employees' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">badge</span>Nhân viên
          </button>

          <button
            onClick={() => handleTabChange('shifts')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'shifts' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">calendar_month</span>Ca làm việc
          </button>

          <button
            onClick={() => handleTabChange('payroll')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'payroll' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">payments</span>Bảng lương
          </button>
        </aside>

        <main className="min-w-0">
          {activeTab === 'profile' && <EmployerProfileTab />}
          {activeTab === 'post-job' && (
            <EmployerJobForm
              editingJobId={searchParams.get('editId')}
              onSuccess={() => handleTabChange('manage-posts')}
            />
          )}
          {activeTab === 'manage-posts' && (
            <EmployerManagePosts
              onEditJob={(jobId) => setSearchParams({ tab: 'post-job', editId: jobId })}
            />
          )}
          {activeTab === 'review-applicants' && <EmployerApplicantReview />}
          {activeTab === 'branches' && <EmployerBranches />}
          {activeTab === 'interviews' && <EmployerInterviews />}
          {activeTab === 'offers' && <EmployerOffers />}
          {activeTab === 'employees' && <EmployerEmployees />}
          {activeTab === 'shifts' && <EmployerShifts />}
          {activeTab === 'payroll' && <EmployerPayroll />}
          {activeTab === 'vip' && <EmployerVipTab />}
        </main>
      </div>

      {/* Premium VIP Pop-up Advertisement Modal */}
      {showVipBanner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl border border-amber-500/30 max-w-lg w-full p-6 relative shadow-2xl overflow-hidden anim-fadeUp">
            {/* Background glowing gradients */}
            <div className="absolute w-64 h-64 bg-amber-500/10 rounded-full blur-[40px] -top-10 -right-10 pointer-events-none"></div>

            {/* Close button X */}
            <button
              onClick={handleCloseVipBanner}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined !text-lg">close</span>
            </button>

            <div className="text-center mt-2">
              {/* Crown Icon */}
              <div className="w-16 h-16 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="material-symbols-outlined !text-3xl text-amber-400">workspace_premium</span>
              </div>

              <h3 className="text-xl font-black text-amber-300 tracking-tight">
                NÂNG CẤP DOANH NGHIỆP VIP
              </h3>
              <p className="text-xs text-slate-400 mt-1">Mở khóa sức mạnh AI để quản trị nhân sự tối ưu nhất</p>
            </div>

            {/* List of benefits */}
            <div className="my-6 space-y-3.5">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex gap-3 items-start hover:border-amber-500/20 transition-all">
                <span className="material-symbols-outlined text-amber-400 !text-xl shrink-0">smart_toy</span>
                <div>
                  <h4 className="text-xs font-bold text-white">Xếp ca tự động AI</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Thuật toán Heuristic tự động sắp lịch thông minh cho toàn bộ nhân sự trong 2 giây.</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex gap-3 items-start hover:border-amber-500/20 transition-all">
                <span className="material-symbols-outlined text-amber-400 !text-xl shrink-0">payments</span>
                <div>
                  <h4 className="text-xs font-bold text-white">Tính lương tự động một chạm</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tự động kết xuất bảng công, tính thưởng và khấu trừ phạt đi muộn/quên checkout.</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex gap-3 items-start hover:border-amber-500/20 transition-all">
                <span className="material-symbols-outlined text-amber-400 !text-xl shrink-0">push_pin</span>
                <div>
                  <h4 className="text-xs font-bold text-white">Đăng tin không giới hạn & Ghim đầu tin</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Standard giới hạn 3 tin. VIP đăng không giới hạn, tin đăng luôn được ghim đầu trang.</p>
                </div>
              </div>
            </div>

            {/* Checkbox block */}
            <div className="flex items-center gap-2 mb-6 select-none bg-slate-800/40 p-2.5 rounded-xl border border-slate-800/80">
              <input
                type="checkbox"
                id="dontShowAgain"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 cursor-pointer"
              />
              <label htmlFor="dontShowAgain" className="text-[10.5px] font-bold text-slate-300 cursor-pointer">
                Không hiển thị lại quảng cáo này trong 24 giờ tới
              </label>
            </div>

            {/* CTA action */}
            <div className="flex gap-3">
              <button
                onClick={handleCloseVipBanner}
                className="flex-1 h-11 rounded-2xl border border-white/10 hover:bg-white/5 text-xs font-bold transition-all text-slate-300"
              >
                Để sau
              </button>
              <button
                onClick={handleGoToVip}
                className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-black text-xs transition-all shadow-lg shadow-amber-500/10"
              >
                Khám phá & Nâng cấp VIP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
