import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import WorkBridgeLogo from '../components/shared/WorkBridgeLogo';
import { openAdminChat, WORKBRIDGE_FACEBOOK_URL, WORKBRIDGE_SUPPORT_EMAIL } from '../utils/contactAdmin';

const impactStats = [
  { value: '60s', label: 'Tạo hồ sơ nhanh', icon: 'timer' },
  { value: '24/7', label: 'Kết nối liên tục', icon: 'all_inclusive' },
  { value: '100%', label: 'Xác thực uy tín', icon: 'verified' }
];

const audiences = [
  {
    icon: 'school',
    title: 'Ứng viên',
    desc: 'Tìm việc bán thời gian theo lịch rảnh, ứng tuyển nhanh chóng và quản lý ca làm dễ dàng.',
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  },
  {
    icon: 'storefront',
    title: 'Doanh nghiệp',
    desc: 'Đăng tin tuyển dụng, chọn lọc hồ sơ uy tín, xếp ca làm việc và quản lý nhân sự hiệu quả.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50'
  },
  {
    icon: 'admin_panel_settings',
    title: 'Hệ thống',
    desc: 'Đảm bảo môi trường kết nối an toàn, minh bạch, hỗ trợ giải quyết vấn đề nhanh chóng.',
    color: 'text-purple-600',
    bg: 'bg-purple-50'
  }
];

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-8">
      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-6 text-center">
        <div className="absolute left-1/2 top-0 -z-10 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-blue-400/20 blur-[100px]" />
        
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-600 shadow-sm backdrop-blur">
          <span className="material-symbols-outlined !text-[16px]">info</span>
          Giới thiệu WorkBridge
        </div>
        
        <h1 className="mx-auto max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Nền tảng kết nối việc làm <br />
          <span className="bg-gradient-to-r from-blue-600 to-sky-400 bg-clip-text text-transparent">bán thời gian thông minh</span>
        </h1>
        
        <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-relaxed text-slate-700 sm:text-lg">
          Làm cho việc tìm kiếm ca làm việc và tuyển dụng nhân sự trở nên gọn gàng, minh bạch và đáng tin cậy hơn bao giờ hết.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/jobs" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700">
            <span className="material-symbols-outlined !text-[20px]">work</span>
            Khám phá việc làm
          </Link>
          <button type="button" onClick={() => openAdminChat(navigate)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-8 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <span className="material-symbols-outlined !text-[20px]">chat</span>
            Nhắn admin
          </button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="mx-auto mt-16 max-w-4xl px-6">
        <div className="grid grid-cols-3 gap-4 rounded-3xl border border-white bg-white/60 p-2 shadow-xl shadow-slate-200/50 backdrop-blur-md">
          {impactStats.map((stat, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center rounded-2xl bg-white py-6 text-center shadow-sm">
              <span className={`material-symbols-outlined mb-2 !text-3xl text-slate-300`}>{stat.icon}</span>
              <strong className="text-3xl font-black tracking-tight text-slate-800">{stat.value}</strong>
              <span className="mt-1 text-xs font-bold text-slate-700">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* For Who Section */}
      <section className="mx-auto mt-24 max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Thiết kế cho tất cả mọi người</h2>
          <p className="mt-2 text-sm font-semibold text-slate-700">Hệ sinh thái WorkBridge kết nối chặt chẽ ba góc nhìn khác biệt.</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {audiences.map((aud, idx) => (
            <div key={idx} className="group flex flex-col items-center rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm transition hover:shadow-xl hover:shadow-slate-200/50">
              <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${aud.bg} ${aud.color} transition-transform group-hover:scale-110`}>
                <span className="material-symbols-outlined !text-3xl">{aud.icon}</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">{aud.title}</h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-700">{aud.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission / Contact */}
      <section className="mx-auto mt-24 max-w-4xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 text-center text-white sm:px-16 sm:py-16">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-600/30 blur-[80px]" />
          <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-emerald-600/20 blur-[80px]" />
          
          <div className="relative z-10">
            <h2 className="text-2xl font-black sm:text-3xl">Gắn kết cơ hội. Mở lối tương lai.</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
              WorkBridge ra đời để xóa bỏ rào cản thông tin giữa người tìm việc và doanh nghiệp tuyển dụng. Hãy cùng chúng tôi xây dựng một môi trường làm việc tử tế.
            </p>
            
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a href={WORKBRIDGE_FACEBOOK_URL} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-6 text-sm font-bold text-white shadow-sm backdrop-blur transition hover:bg-white/20">
                <span className="material-symbols-outlined !text-[18px]">public</span>
                Theo dõi Fanpage
              </a>
              <a href={`mailto:${WORKBRIDGE_SUPPORT_EMAIL}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-6 text-sm font-bold text-white shadow-sm backdrop-blur transition hover:bg-white/20">
                <span className="material-symbols-outlined !text-[18px]">mail</span>
                {WORKBRIDGE_SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
