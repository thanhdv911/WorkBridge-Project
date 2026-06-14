import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthModal } from '../contexts/AuthModalContext';
import { signalRService } from '../services/signalrService';
import toast from 'react-hot-toast';
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
  const { logoutUser } = useAuthModal();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    try {
      signalRService.stop();
    } catch (err) {
      console.error('Error stopping SignalR on logout:', err);
    }
    localStorage.clear();
    logoutUser();
    toast.success('Đã đăng xuất thành công');
    navigate('/login');
  };

  // Basic role check (In a real app, verify from decoded JWT)
  const isEmployer = localStorage.getItem('role') === 'Employer';

  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // VIP Promo Banner States removed

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
          // VIP banner logic removed
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
      trend: '+12%',
      trendUp: true,
      icon: 'work',
      color: 'text-primary',
      bg: 'bg-sky-50'
    },
    {
      label: 'Tổng đơn ứng tuyển',
      value: loadingStats ? '...' : (statsData?.totalApplications ?? 0),
      trend: '+24%',
      trendUp: true,
      icon: 'description',
      color: 'text-blue-500',
      bg: 'bg-blue-50'
    },
    {
      label: 'Ứng viên phù hợp',
      value: loadingStats ? '...' : `${statsData?.suitablePercentage ?? 0}%`,
      trend: '+5%',
      trendUp: true,
      icon: 'how_to_reg',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50'
    },
    {
      label: 'Đánh giá doanh nghiệp',
      value: loadingStats ? '...' : `${statsData?.rating ?? 5.0} ★`,
      trend: '-',
      trendUp: true,
      icon: 'star',
      color: 'text-amber-500',
      bg: 'bg-amber-50'
    },
    {
      label: 'Điểm uy tín tuyển dụng',
      value: loadingStats ? '...' : `${statsData?.reputationScore ?? 100} / 100`,
      trend: 'Tốt',
      trendUp: true,
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
        <div className="flex overflow-x-auto lg:grid lg:grid-cols-3 xl:grid-cols-5 gap-4 pb-4 lg:pb-0 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {stats.map((stat, idx) => (
            <div key={idx} className="applicant-card anim-fadeUp relative p-6 flex flex-col gap-3 flex-shrink-0 snap-start w-[260px] lg:w-auto border border-slate-200/60 bg-surface rounded-[24px] transition-all hover:shadow-card hover:border-primary/20" style={{animationDelay: `${idx * 0.1}s`}}>
               <div className="flex items-center justify-between">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                   <span className="material-symbols-outlined !text-[20px]">{stat.icon}</span>
                 </div>
                 <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${stat.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                   {stat.trendUp ? <span className="material-symbols-outlined !text-[14px]">trending_up</span> : <span className="material-symbols-outlined !text-[14px]">trending_down</span>}
                   {stat.trend}
                 </div>
               </div>
               <div>
                 <p className="text-[28px] font-display font-black text-ink tracking-tight">{stat.value}</p>
                 <p className="text-[13px] font-semibold text-slate-500 mt-0.5">{stat.label}</p>
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1440px] min-w-0 gap-6 px-4 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:px-8">
        <aside className="profile-sidebar-card h-fit rounded-2xl p-2 lg:p-3 lg:sticky lg:top-24 flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          
          <div className="hidden lg:block text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 pt-2 pb-1">Quản lý chung</div>
          
          <button
            onClick={() => handleTabChange('profile')}
            className={`flex-shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'profile' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">domain</span>Hồ sơ công ty
          </button>

          <button
            onClick={() => handleTabChange('vip')}
            className={`flex-shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'vip' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">workspace_premium</span>Doanh nghiệp VIP
          </button>

          <div className="hidden lg:block text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 pt-4 pb-1 mt-2 border-t border-slate-100/50">Tuyển dụng</div>

          <button
            onClick={() => handleTabChange('post-job')}
            className={`flex-shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'post-job' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">post_add</span>Đăng tin
          </button>

          <button
            onClick={() => handleTabChange('manage-posts')}
            className={`flex-shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'manage-posts' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">list_alt</span>Quản lý tin
          </button>

          <button
            onClick={() => handleTabChange('review-applicants')}
            className={`flex-shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'review-applicants' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">group</span>Duyệt ứng viên
          </button>

          <button
            onClick={() => handleTabChange('interviews')}
            className={`flex-shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'interviews' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">event</span>Phỏng vấn
          </button>

          <button
            onClick={() => handleTabChange('offers')}
            className={`flex-shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'offers' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">contract</span>Lời mời
          </button>

          <div className="hidden lg:block text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 pt-4 pb-1 mt-2 border-t border-slate-100/50">Vận hành nội bộ</div>

          <button
            onClick={() => handleTabChange('branches')}
            className={`flex-shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'branches' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">storefront</span>Chi nhánh
          </button>

          <button
            onClick={() => handleTabChange('employees')}
            className={`flex-shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'employees' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">badge</span>Nhân viên
          </button>

          <button
            onClick={() => handleTabChange('shifts')}
            className={`flex-shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'shifts' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">calendar_month</span>Ca làm việc
          </button>

          <button
            onClick={() => handleTabChange('payroll')}
            className={`flex-shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-bold transition-colors ${activeTab === 'payroll' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <span className="material-symbols-outlined !text-lg text-inherit">payments</span>Bảng lương
          </button>
          
          <hr className="hidden lg:block my-2 border-slate-100" />
          <div className="lg:hidden w-[1px] bg-slate-200 mx-1 flex-shrink-0 my-2"></div>
          
          <button
            onClick={handleLogout}
            className="flex-shrink-0 snap-start lg:w-full flex items-center gap-2 lg:gap-3 px-4 py-2.5 lg:py-3 rounded-xl text-sm font-bold transition-colors text-rose-500 hover:bg-rose-50/80"
          >
            <span className="material-symbols-outlined !text-lg text-rose-500">logout</span>Đăng xuất
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


    </div>
  );
}
