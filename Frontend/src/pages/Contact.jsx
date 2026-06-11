import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { openAdminChat, WORKBRIDGE_FACEBOOK_URL, WORKBRIDGE_SUPPORT_EMAIL } from '../utils/contactAdmin';

const contactItems = [
  ['forum', 'Trò chuyện cùng Admin', 'Kênh xử lý sự cố nhanh nhất cho các vấn đề về tài khoản, xác thực, và báo cáo vi phạm.'],
  ['mark_email_unread', 'Gửi Email Hỗ trợ', 'Thích hợp cho các yêu cầu phức tạp, cung cấp hình ảnh minh chứng hoặc đóng góp ý kiến.'],
  ['public', 'Kênh Truyền Thông', 'Cập nhật nhanh nhất về các thay đổi chính sách, bảo trì hệ thống và tính năng mới.']
];

export default function Contact() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 pt-24 pb-32 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 via-slate-900 to-slate-950"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        
        <div className="relative mx-auto max-w-5xl px-6 lg:px-8 text-center z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-blue-200 mb-6 backdrop-blur-sm">
            <span className="material-symbols-outlined !text-[16px]">headset_mic</span>
            Liên Hệ WorkBridge
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6">
            Chúng tôi luôn ở đây<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">để lắng nghe bạn.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base sm:text-lg font-medium text-slate-300 leading-relaxed">
            Dù bạn đang gặp khó khăn, cần hướng dẫn hay muốn đóng góp ý kiến để WorkBridge tốt hơn, đừng ngần ngại kết nối với đội ngũ của chúng tôi.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 lg:px-8 -mt-16 relative z-20">
        
        {/* Contact Cards Grid */}
        <section className="grid gap-6 md:grid-cols-3 mb-16">
          {contactItems.map(([icon, title, text]) => (
            <article key={title} className="group relative rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/40 border border-slate-100 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                <span className="material-symbols-outlined !text-3xl">{icon}</span>
              </div>
              <h3 className="mb-3 text-lg font-bold text-slate-900">{title}</h3>
              <p className="text-sm font-medium leading-relaxed text-slate-500">{text}</p>
            </article>
          ))}
        </section>

        {/* Primary Contact CTA */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 mb-16">
          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-gradient-to-br from-white to-slate-50/80">
              <span className="mb-4 inline-block text-xs font-black uppercase tracking-widest text-blue-600">Hỗ Trợ Nhanh Chóng</span>
              <h2 className="mb-4 text-3xl font-black tracking-tight text-slate-900">
                Trực tiếp với Quản trị viên
              </h2>
              <p className="mb-8 text-base font-medium leading-relaxed text-slate-500">
                Đội ngũ Admin sẵn sàng hỗ trợ kiểm tra tài khoản, giải quyết khiếu nại, và hướng dẫn tính năng. Nút nhắn tin sẽ kết nối thẳng vào hệ thống trò chuyện nội bộ của WorkBridge.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button 
                  type="button" 
                  onClick={() => openAdminChat(navigate)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 hover:shadow-blue-600/40 hover:-translate-y-0.5"
                >
                  <span className="material-symbols-outlined !text-lg">chat</span>
                  Nhắn cho Admin
                </button>
                <a 
                  href={`mailto:${WORKBRIDGE_SUPPORT_EMAIL}`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <span className="material-symbols-outlined !text-lg">mail</span>
                  Gửi Email
                </a>
              </div>
            </div>
            <div className="relative hidden md:block bg-slate-950 p-12 overflow-hidden">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent"></div>
               <div className="h-full flex flex-col justify-center relative z-10">
                 <h3 className="text-xl font-bold text-white mb-6">Thông tin cần chuẩn bị</h3>
                 <ul className="space-y-5">
                   {[
                     'Email đăng ký hoặc ID tài khoản WorkBridge.',
                     'Đường dẫn công việc hoặc hồ sơ liên quan.',
                     'Mô tả chi tiết lỗi và ảnh chụp màn hình (nếu có).'
                   ].map((item, idx) => (
                     <li key={idx} className="flex items-start gap-3">
                       <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                         <span className="material-symbols-outlined !text-sm">done</span>
                       </span>
                       <span className="text-sm font-medium text-slate-300 leading-relaxed">{item}</span>
                     </li>
                   ))}
                 </ul>
               </div>
            </div>
          </div>
        </section>

        {/* Footer Navigation */}
        <div className="flex justify-center mt-12">
          <Link 
            to="/about" 
            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
          >
            <span className="material-symbols-outlined !text-[18px]">arrow_back</span>
            Về trang Giới Thiệu
          </Link>
        </div>
      </main>
    </div>
  );
}
