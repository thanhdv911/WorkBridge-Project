import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function EmployerHomeFeatures() {
  const navigate = useNavigate();

  return (
    <div className="home-employer-sections relative bg-slate-50 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-slate-100 to-transparent pointer-events-none"></div>
      <div className="absolute top-20 -right-40 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute top-96 -left-40 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* ── 1. Core Advantages Section (Glassmorphism) ── */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20 anim-fadeUp">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black tracking-widest uppercase mb-4">
              <span className="material-symbols-outlined !text-[16px]">stars</span>
              Tại sao chọn WorkBridge
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6 leading-tight">
              Lợi Thế Cạnh Tranh Tuyệt Đối
            </h2>
            <p className="text-lg font-medium text-slate-600">
              Công nghệ tiên phong giúp doanh nghiệp tối ưu nguồn lực nhân sự, giảm thiểu 80% chi phí tuyển dụng truyền thống.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Background line connecting cards */}
            <div className="hidden md:block absolute top-1/2 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent -translate-y-1/2 -z-10"></div>
            
            <div className="group relative p-1 rounded-[2.5rem] bg-gradient-to-b from-white/80 to-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-b from-sky-500/0 to-sky-500/5 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative h-full p-8 lg:p-10 rounded-[2.25rem] bg-white/50">
                 <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-sky-500/30 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  <span className="material-symbols-outlined !text-4xl text-white">verified_user</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">Ứng viên xác thực</h3>
                <p className="text-slate-600 leading-relaxed font-medium">Hồ sơ sinh viên được xác minh danh tính rõ ràng bằng eKYC, đảm bảo nguồn nhân lực uy tín và an toàn tuyệt đối cho doanh nghiệp.</p>
              </div>
            </div>
            
            <div className="group relative p-1 rounded-[2.5rem] bg-gradient-to-b from-white/80 to-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 md:translate-y-8 hover:translate-y-6">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/0 to-indigo-500/5 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative h-full p-8 lg:p-10 rounded-[2.25rem] bg-white/50">
                 <div className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-indigo-500/30 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  <span className="material-symbols-outlined !text-4xl text-white">memory</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">Công nghệ lõi AI</h3>
                <p className="text-slate-600 leading-relaxed font-medium">Hệ thống matching ứng viên thông minh dựa trên kỹ năng và lịch rảnh, giúp giảm thiểu 80% thời gian lọc hồ sơ thủ công.</p>
              </div>
            </div>
            
            <div className="group relative p-1 rounded-[2.5rem] bg-gradient-to-b from-white/80 to-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/0 to-emerald-500/5 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative h-full p-8 lg:p-10 rounded-[2.25rem] bg-white/50">
                 <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/30 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  <span className="material-symbols-outlined !text-4xl text-white">hub</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">Hệ sinh thái khép kín</h3>
                <p className="text-slate-600 leading-relaxed font-medium">Giải pháp "All-in-one": Đăng tin, Duyệt đơn, Sắp ca tự động, Chấm công, và Trả lương trực tiếp trên một nền tảng duy nhất.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Bento Grid Features ── */}
      <section className="py-24 relative z-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6">
              Nền Tảng Quản Trị Nhân Sự Toàn Diện
            </h2>
            <p className="text-lg font-medium text-slate-600">
              Các công cụ tiên tiến giúp bạn tối đa hóa hiệu suất quản lý đội ngũ nhân viên part-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(280px,auto)]">
            
            {/* Feature 1 (Large) */}
            <div className="md:col-span-2 lg:col-span-2 row-span-2 group relative bg-[#0B1120] rounded-[2.5rem] p-10 lg:p-14 overflow-hidden shadow-2xl transition-all duration-500 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 opacity-50"></div>
              <div className="absolute -right-32 -top-32 w-96 h-96 bg-primary/30 rounded-full blur-[100px] group-hover:bg-primary/40 transition-colors duration-700"></div>
              
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center mb-8">
                    <span className="material-symbols-outlined !text-4xl text-white">group_add</span>
                  </div>
                  <h3 className="text-3xl lg:text-4xl font-black text-white mb-6 leading-tight">Tuyển dụng thần tốc,<br/>chính xác.</h3>
                  <p className="text-slate-300 text-lg leading-relaxed font-medium max-w-md">
                    Thuật toán của WorkBridge tự động kết nối tin tuyển dụng của bạn với hàng ngàn sinh viên có kỹ năng và lịch rảnh phù hợp nhất.
                  </p>
                </div>
                
                <div className="mt-12 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md text-white text-sm font-bold border border-white/20">
                    <span className="material-symbols-outlined !text-[18px] text-emerald-400">check_circle</span> Lọc hồ sơ tự động
                  </span>
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md text-white text-sm font-bold border border-white/20">
                    <span className="material-symbols-outlined !text-[18px] text-emerald-400">check_circle</span> Phỏng vấn 1-chạm
                  </span>
                </div>
              </div>
            </div>

            {/* Feature 2 (Medium) */}
            <div className="md:col-span-1 lg:col-span-2 bg-gradient-to-br from-sky-50 to-white rounded-[2.5rem] p-8 lg:p-10 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-500 group overflow-hidden relative">
              <div className="absolute right-0 bottom-0 w-64 h-64 bg-sky-100/50 rounded-tl-full -z-10 group-hover:scale-110 transition-transform duration-700"></div>
              <div className="w-14 h-14 bg-sky-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-sky-500/20 group-hover:-translate-y-1 transition-transform">
                <span className="material-symbols-outlined !text-3xl text-white">calendar_month</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">Quản lý Ca Làm Thông Minh</h3>
              <p className="text-slate-600 leading-relaxed font-medium mb-8">
                Hệ thống tự động sắp xếp và tối ưu hóa ca làm việc dựa trên đăng ký của nhân viên, loại bỏ hoàn toàn sự chồng chéo lịch.
              </p>
              <button onClick={() => navigate('/employer-dashboard?tab=shifts')} className="mt-auto inline-flex items-center gap-2 text-sky-600 font-bold text-sm hover:text-sky-700 transition-colors">
                Khám phá tính năng <span className="material-symbols-outlined !text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>

            {/* Feature 3 (Small) */}
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-[2.5rem] p-8 lg:p-10 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
               <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-200/40 rounded-full blur-2xl group-hover:bg-emerald-300/40 transition-colors"></div>
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20 group-hover:-translate-y-1 transition-transform">
                <span className="material-symbols-outlined !text-3xl text-white">payments</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">Chấm Công & Tính Lương</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">
                Chấm công GPS/Wifi chính xác. Tự động xuất bảng lương cuối tháng.
              </p>
            </div>

            {/* Feature 4 (Small) */}
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-[2.5rem] p-8 lg:p-10 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
               <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-amber-200/40 rounded-full blur-2xl group-hover:bg-amber-300/40 transition-colors"></div>
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20 group-hover:-translate-y-1 transition-transform">
                <span className="material-symbols-outlined !text-3xl text-white">query_stats</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">Báo Cáo Chuyên Sâu</h3>
              <p className="text-slate-600 leading-relaxed text-sm font-medium">
                Theo dõi hiệu suất và chi phí nhân sự qua hệ thống biểu đồ trực quan.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── 3. Interactive How It Works ── */}
      <section className="py-24 bg-white relative">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6">
              Quy Trình Siêu Đơn Giản
            </h2>
            <p className="text-lg font-medium text-slate-600">
              Tìm kiếm và quản lý đội ngũ nhân sự part-time chất lượng cao chỉ với 4 bước.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connecting Line */}
            <div className="hidden lg:block absolute top-[4.5rem] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-slate-200 via-primary/30 to-slate-200 border-t border-dashed border-slate-300"></div>

            {[
              { icon: 'post_add', title: '1. Đăng Tin', desc: 'Mô tả công việc và mức lương nhanh chóng qua form thông minh.' },
              { icon: 'manage_search', title: '2. Khớp Lệnh', desc: 'AI chủ động gửi tin đến ứng viên phù hợp nhất trong bán kính 5km.' },
              { icon: 'handshake', title: '3. Chốt Đơn', desc: 'Phỏng vấn online hoặc offline, duyệt ứng viên chỉ bằng 1 nút bấm.' },
              { icon: 'auto_graph', title: '4. Vận Hành', desc: 'Sắp xếp ca làm, chấm công, tính lương hoàn toàn tự động.' }
            ].map((step, index) => (
              <div key={index} className="relative group text-center z-10">
                <div className="w-36 h-36 mx-auto bg-slate-50 border-4 border-white rounded-[2rem] flex items-center justify-center mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] group-hover:border-primary/20 group-hover:bg-primary/5 group-hover:-translate-y-2 transition-all duration-500 relative">
                  {/* Outer glow on hover */}
                  <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                  <span className="material-symbols-outlined !text-[48px] text-slate-400 group-hover:text-primary transition-colors duration-500">{step.icon}</span>
                </div>
                <h4 className="text-xl font-black text-slate-900 mb-3">{step.title}</h4>
                <p className="text-slate-600 font-medium leading-relaxed max-w-xs mx-auto">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. VIP Premium Call To Action ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-black rounded-[3rem] p-10 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl">
          
          {/* Gold glowing accents */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/20 rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-yellow-500/20 rounded-full blur-[100px]"></div>
          
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border border-amber-500/30 backdrop-blur-md mb-8">
              <span className="material-symbols-outlined !text-[20px] text-amber-400">workspace_premium</span>
              <span className="text-amber-400 text-sm font-black tracking-widest uppercase">WorkBridge Enterprise VIP</span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight tracking-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
              Khai Phóng Quyền Năng Quản Trị
            </h2>
            
            <p className="text-xl font-medium text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Trải nghiệm ghim tin không giới hạn, thuật toán xếp ca siêu tốc độ và đặc quyền hỗ trợ 1-1 từ chuyên gia nhân sự WorkBridge.
            </p>
            
            <button onClick={() => navigate('/employer-dashboard?tab=vip')} className="group relative h-16 px-10 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-lg font-black hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] transition-all overflow-hidden flex items-center justify-center gap-3">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
              <span className="relative z-10">Nâng cấp VIP ngay</span>
              <span className="material-symbols-outlined !text-2xl relative z-10 group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
