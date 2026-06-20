import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function EmployerHomeFeatures() {
  const navigate = useNavigate();

  return (
    <div className="home-employer-sections">


      {/* ── Tính năng nổi bật — alternating layout ── */}


      {/* Feature A: Tuyển dụng — image right */}
      <section className="relative min-h-[520px] flex items-center overflow-hidden bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 text-xs font-black rounded-full uppercase tracking-widest mb-4">Tuyển dụng</span>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6 leading-tight">
                Tiếp cận Hàng Ngàn Sinh Viên Chỉ Trong Vài Phút
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                Chỉ cần đăng tin tuyển dụng, hệ thống AI sẽ tự động phân phối đến đúng sinh viên có kỹ năng và lịch rảnh phù hợp trong bán kính bạn chọn.
              </p>
              <ul className="space-y-3 mb-8">
                {['Lọc hồ sơ tự động theo kỹ năng & kinh nghiệm', 'Duyệt ứng viên chỉ với 1 nút bấm', 'Thông báo real-time khi có đơn mới'].map((t, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                    <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined !text-[13px] text-white">check</span>
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/employer-dashboard')} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                Đăng tin tuyển dụng ngay
                <span className="material-symbols-outlined !text-[18px]">arrow_forward</span>
              </button>
            </div>

            {/* Image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl h-[380px] lg:h-[440px]">
              <img
                src="https://images.unsplash.com/photo-1573496799515-eebbb63814f2?auto=format&fit=crop&q=80&w=800"
                alt="Sinh viên Việt Nam tìm việc"
                className="w-full h-full object-cover"
              />
              {/* Floating badge */}
              <div className="absolute bottom-6 left-6 bg-white rounded-2xl shadow-xl px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined !text-xl text-white">person_check</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Vừa nhận được</p>
                  <p className="text-sm font-black text-slate-900">12 hồ sơ phù hợp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature B: Ca làm & Chấm công — image left, dark bg */}
      <section className="relative overflow-hidden">
        {/* Background photo */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&q=80&w=1920"
            alt="Quán cà phê Việt Nam"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/30" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <span className="inline-block px-3 py-1 bg-sky-500/20 text-sky-300 text-xs font-black rounded-full uppercase tracking-widest mb-4 border border-sky-500/30">Ca làm & Chấm công</span>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">
                Quản Lý Lịch Làm Việc Thông Minh, Không Còn Nhầm Lẫn
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                Nhân viên tự đăng ký ca rảnh, hệ thống tự động xếp ca tối ưu, tránh trùng lịch hoàn toàn. Chấm công bằng GPS hoặc QR Code, chính xác đến từng phút.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { icon: 'location_on', label: 'Chấm công GPS' },
                  { icon: 'qr_code_scanner', label: 'Chấm công QR' },
                  { icon: 'schedule', label: 'Xếp ca tự động' },
                  { icon: 'notifications', label: 'Nhắc lịch real-time' },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                    <span className="material-symbols-outlined !text-xl text-sky-400">{f.icon}</span>
                    <span className="text-white text-sm font-semibold">{f.label}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/employer-dashboard?tab=shifts')} className="inline-flex items-center gap-2 px-6 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors">
                Xem tính năng Ca làm
                <span className="material-symbols-outlined !text-[18px]">arrow_forward</span>
              </button>
            </div>

            {/* Right spacer — shows photo through bg */}
            <div className="hidden lg:block" />
          </div>
        </div>
      </section>

      {/* Feature C: Lương — image right, light bg */}
      <section className="bg-white py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-600 text-xs font-black rounded-full uppercase tracking-widest mb-4">Tính lương & Thanh toán</span>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6 leading-tight">
                Bảng Lương Tự Động, Chi Trả Nhanh Chóng Qua PayOS
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                Không còn tính toán thủ công. Hệ thống tự động cộng giờ làm, tính lương, xuất bảng lương và hỗ trợ thanh toán trực tiếp qua ví điện tử.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  { icon: 'calculate', color: 'bg-emerald-100 text-emerald-600', title: 'Tự động tính lương theo giờ', desc: 'Dựa trên dữ liệu chấm công thực tế, không sai sót.' },
                  { icon: 'payments', color: 'bg-blue-100 text-blue-600', title: 'Thanh toán qua PayOS', desc: 'Chuyển lương trực tiếp vào ví điện tử, ngân hàng nhân viên.' },
                  { icon: 'description', color: 'bg-amber-100 text-amber-600', title: 'Xuất báo cáo PDF / Excel', desc: 'Lưu trữ hồ sơ lương chuẩn mực, dễ dàng kê khai thuế.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                      <span className="material-symbols-outlined !text-xl">{item.icon}</span>
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{item.title}</p>
                      <p className="text-slate-500 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/employer-dashboard?tab=payroll')} className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors">
                Xem tính năng Bảng lương
                <span className="material-symbols-outlined !text-[18px]">arrow_forward</span>
              </button>
            </div>

            {/* Image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl h-[400px] lg:h-[460px]">
              <img
                src="https://images.unsplash.com/photo-1553484771-371a605b060b?auto=format&fit=crop&q=80&w=800"
                alt="Bảng lương và tài chính"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-6 right-6 bg-emerald-500 rounded-2xl shadow-xl px-5 py-4 text-white">
                <p className="text-xs font-semibold opacity-80 mb-0.5">Bảng lương tháng 6</p>
                <p className="text-2xl font-black">Đã gửi ✓</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. VIP Call-to-action — full photo background ── */}
      <section className="relative min-h-[500px] flex items-center">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=1920"
            alt="Team Việt Nam họp"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/90 to-orange-700/90" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center w-full">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/20 text-white text-xs font-black tracking-widest uppercase mb-8 border border-white/30 backdrop-blur-sm">
            <span className="material-symbols-outlined !text-[16px]">workspace_premium</span>
            WorkBridge Business VIP
          </span>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
            Mở Khóa Toàn Bộ <br className="hidden md:block" />Sức Mạnh Quản Trị
          </h2>
          <p className="text-xl text-white/85 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
            Ghim tin không giới hạn, xếp ca AI siêu tốc, báo cáo nâng cao và hỗ trợ 1-1 từ chuyên gia nhân sự WorkBridge.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate('/employer-dashboard?tab=vip')}
              className="group h-14 px-10 rounded-2xl bg-white text-amber-600 text-base font-black hover:scale-105 hover:shadow-2xl transition-all flex items-center justify-center gap-2"
            >
              Nâng cấp VIP ngay
              <span className="material-symbols-outlined !text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
            <button
              onClick={() => navigate('/employer-dashboard')}
              className="h-14 px-10 rounded-2xl bg-white/20 backdrop-blur-sm text-white text-base font-bold hover:bg-white/30 border border-white/30 transition-all flex items-center justify-center gap-2"
            >
              Dùng thử miễn phí
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
