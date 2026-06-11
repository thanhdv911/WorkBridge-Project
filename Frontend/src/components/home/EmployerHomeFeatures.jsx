import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function EmployerHomeFeatures() {
  const navigate = useNavigate();

  return (
    <div className="home-employer-sections bg-slate-50/50">
      {/* ── 1. Statistics Section ── */}
      <section className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 text-center">
            <div className="space-y-2">
              <h3 className="text-4xl md:text-5xl font-black text-[#1392ec]">50,000+</h3>
              <p className="text-sm md:text-base font-bold text-slate-500">Sinh viên sẵn sàng làm việc</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl md:text-5xl font-black text-[#1392ec]">10,000+</h3>
              <p className="text-sm md:text-base font-bold text-slate-500">Tin tuyển dụng đã đăng</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl md:text-5xl font-black text-[#1392ec]">5,000+</h3>
              <p className="text-sm md:text-base font-bold text-slate-500">Doanh nghiệp tin dùng</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl md:text-5xl font-black text-[#1392ec]">100%</h3>
              <p className="text-sm md:text-base font-bold text-slate-500">Tự động hóa tính lương</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Bento Grid Features ── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 mb-4">
              Nền Tảng Quản Trị Nhân Sự Toàn Diện
            </h2>
            <p className="text-lg font-medium text-slate-500">
              Cung cấp các công cụ tiên tiến giúp bạn tuyển dụng nhanh chóng và quản lý đội ngũ nhân viên part-time dễ dàng hơn bao giờ hết.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-8 lg:p-12 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">
                <span className="material-symbols-outlined !text-3xl text-blue-600">group_add</span>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-3">Tuyển dụng ứng viên nhanh chóng</h3>
              <p className="text-slate-600 leading-relaxed font-medium max-w-md">
                Thuật toán của WorkBridge tự động kết nối tin tuyển dụng của bạn với hàng ngàn sinh viên có kỹ năng và lịch rảnh phù hợp nhất.
              </p>
              <div className="mt-8 flex gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100/50 text-blue-700 text-xs font-bold border border-blue-200/50">
                  <span className="material-symbols-outlined !text-[14px]">check</span> Lọc hồ sơ AI
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100/50 text-blue-700 text-xs font-bold border border-blue-200/50">
                  <span className="material-symbols-outlined !text-[14px]">check</span> Duyệt đơn 1-chạm
                </span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="col-span-1 bg-white border border-slate-200 rounded-3xl p-8 lg:p-10 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mb-6 border border-sky-100">
                <span className="material-symbols-outlined !text-3xl text-sky-500">calendar_month</span>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-3">Quản lý Ca Làm & Lịch Trình</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium mb-6">
                Tự động sắp xếp ca làm việc thông minh dựa trên lịch rảnh của sinh viên. Loại bỏ hoàn toàn sự trùng lặp ca.
              </p>
              <button onClick={() => navigate('/employer-dashboard?tab=shifts')} className="text-sky-600 font-bold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
                Xem tính năng <span className="material-symbols-outlined !text-base">arrow_forward</span>
              </button>
            </div>

            {/* Feature 3 */}
            <div className="col-span-1 bg-white border border-slate-200 rounded-3xl p-8 lg:p-10 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6 border border-green-100">
                <span className="material-symbols-outlined !text-3xl text-green-500">payments</span>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-3">Chấm Công & Tính Lương</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium mb-6">
                Chấm công GPS hoặc QR Code. Bảng lương được tự động cập nhật theo thời gian thực và tích hợp chi trả PayOS.
              </p>
              <button onClick={() => navigate('/employer-dashboard?tab=payroll')} className="text-green-600 font-bold text-sm inline-flex items-center gap-1 hover:gap-2 transition-all">
                Xem tính năng <span className="material-symbols-outlined !text-base">arrow_forward</span>
              </button>
            </div>

            {/* Feature 4 */}
            <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-8 lg:p-12 shadow-lg relative overflow-hidden group">
              <div className="w-14 h-14 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center mb-6 border border-white/10">
                <span className="material-symbols-outlined !text-3xl text-white">query_stats</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Báo Cáo Phân Tích Chuyên Sâu</h3>
              <p className="text-slate-400 leading-relaxed font-medium max-w-md">
                Theo dõi hiệu suất nhân viên, chi phí lương và thống kê biến động nhân sự với các biểu đồ trực quan, giúp bạn đưa ra quyết định kinh doanh tốt hơn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. How It Works ── */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 mb-4">
              Cách Thức Hoạt Động
            </h2>
            <p className="text-lg font-medium text-slate-500">
              Quy trình tuyển dụng và quản lý nhân sự được đơn giản hóa tối đa với WorkBridge.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Desktop Connect Line */}
            <div className="hidden lg:block absolute top-12 left-1/4 right-1/4 h-[2px] bg-sky-100 -z-10"></div>

            <div className="relative text-center">
              <div className="w-24 h-24 mx-auto bg-white border-4 border-sky-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined !text-[40px] text-sky-500">post_add</span>
              </div>
              <h4 className="text-lg font-black text-slate-800 mb-2">1. Đăng Tin</h4>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                Tạo tin tuyển dụng miễn phí trong vài phút, mô tả rõ yêu cầu ca làm.
              </p>
            </div>

            <div className="relative text-center">
              <div className="w-24 h-24 mx-auto bg-white border-4 border-sky-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined !text-[40px] text-sky-500">manage_search</span>
              </div>
              <h4 className="text-lg font-black text-slate-800 mb-2">2. Kết Nối</h4>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                Hệ thống tự động thông báo và gửi hồ sơ ứng viên phù hợp nhất đến bạn.
              </p>
            </div>

            <div className="relative text-center">
              <div className="w-24 h-24 mx-auto bg-white border-4 border-sky-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined !text-[40px] text-sky-500">handshake</span>
              </div>
              <h4 className="text-lg font-black text-slate-800 mb-2">3. Tuyển Dụng</h4>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                Phỏng vấn và chốt nhận ứng viên ngay trên ứng dụng, đưa vào hệ thống nhân sự.
              </p>
            </div>

            <div className="relative text-center">
              <div className="w-24 h-24 mx-auto bg-white border-4 border-sky-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined !text-[40px] text-sky-500">auto_graph</span>
              </div>
              <h4 className="text-lg font-black text-slate-800 mb-2">4. Quản Lý</h4>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                Quản lý ca làm, theo dõi chấm công và tính lương thưởng dễ dàng.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. VIP Call To Action ── */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2rem] lg:rounded-[3rem] p-10 lg:p-16 text-center text-white relative overflow-hidden shadow-2xl shadow-amber-500/20">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
          <div className="absolute w-96 h-96 bg-white/20 rounded-full blur-[80px] -top-20 -left-20"></div>
          <div className="absolute w-96 h-96 bg-black/10 rounded-full blur-[80px] -bottom-20 -right-20"></div>
          
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-white text-sm font-black tracking-widest uppercase mb-6 border border-white/30 shadow-sm">
              <span className="material-symbols-outlined !text-[18px]">workspace_premium</span>
              WorkBridge Business VIP
            </span>
            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
              Mở khóa toàn bộ sức mạnh AI<br className="hidden md:block"/> để quản trị nhân sự tối ưu
            </h2>
            <p className="text-lg font-medium text-white/90 mb-10 max-w-2xl mx-auto">
              Ghim tin tuyển dụng không giới hạn, sử dụng thuật toán xếp ca tự động trong 2 giây và tích hợp thanh toán lương qua thẻ tín dụng doanh nghiệp.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => navigate('/employer-dashboard?tab=vip')} className="h-[60px] px-10 rounded-2xl bg-white text-amber-600 text-[15px] font-black hover:scale-105 hover:shadow-xl transition-all flex items-center justify-center gap-2">
                Nâng cấp VIP ngay
                <span className="material-symbols-outlined !text-xl">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
