import React from 'react';

const EmployerOverview = ({ statsData, loadingStats, onNavigate }) => {
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
    <div className="space-y-6 anim-fadeUp">
      <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h2 className="text-xl font-black text-slate-800 mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary !text-[28px]">monitoring</span>
            Thống kê tổng quan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="p-5 flex flex-col justify-center gap-3 border border-slate-100 bg-slate-50/50 rounded-2xl hover:border-slate-300 transition-colors" style={{animationDelay: `${idx * 0.1}s`}}>
               <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center mb-1`}>
                    <span className={`material-symbols-outlined ${stat.color} !text-[24px]`}>{stat.icon}</span>
               </div>
               <div>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{stat.label}</p>
                   <p className="text-2xl font-black tracking-tight text-slate-900 mt-1">{stat.value}</p>
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
         <h2 className="text-xl font-black text-slate-800 mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 !text-[28px]">bolt</span>
            Truy cập nhanh
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button onClick={() => onNavigate('post-job')} className="flex items-center gap-4 p-5 rounded-2xl border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left shadow-sm">
                <div className="w-14 h-14 rounded-[16px] bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined !text-[28px]">add</span>
                </div>
                <div>
                    <h3 className="font-bold text-[15px] text-slate-800 group-hover:text-primary transition-colors">Đăng tin tuyển dụng</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Tạo ngay một tin tuyển dụng mới</p>
                </div>
            </button>
            <button onClick={() => onNavigate('review-applicants')} className="flex items-center gap-4 p-5 rounded-2xl border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left shadow-sm">
                <div className="w-14 h-14 rounded-[16px] bg-amber-500/10 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined !text-[28px]">group</span>
                </div>
                <div>
                    <h3 className="font-bold text-[15px] text-slate-800 group-hover:text-amber-600 transition-colors">Duyệt hồ sơ</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Xem danh sách ứng viên mới</p>
                </div>
            </button>
            <button onClick={() => onNavigate('payroll')} className="flex items-center gap-4 p-5 rounded-2xl border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left shadow-sm">
                <div className="w-14 h-14 rounded-[16px] bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined !text-[28px]">payments</span>
                </div>
                <div>
                    <h3 className="font-bold text-[15px] text-slate-800 group-hover:text-emerald-600 transition-colors">Chốt bảng lương</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Quản lý lương tháng này</p>
                </div>
            </button>
        </div>
      </div>
    </div>
  );
};

export default EmployerOverview;
