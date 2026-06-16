import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PromoBanners() {
  const navigate = useNavigate();

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-gradient-to-r from-primary to-blue-700 flex flex-col md:flex-row items-center cursor-pointer group" onClick={() => navigate('/profile')}>
          
          {/* Background Decorations */}
          <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl transform group-hover:scale-110 transition-transform duration-700"></div>
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-400 opacity-20 rounded-full blur-2xl transform group-hover:scale-110 transition-transform duration-700"></div>

          {/* Text Content */}
          <div className="relative z-10 w-full md:w-1/2 p-10 md:p-16 text-white text-center md:text-left">
            <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest mb-6 border border-white/30 shadow-sm">
              Tính Năng Đột Phá
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight drop-shadow-md">
              Tạo CV Bằng Trí Tuệ Nhân Tạo
            </h2>
            <p className="text-lg text-blue-100 mb-10 leading-relaxed font-medium">
              Không biết bắt đầu từ đâu? WorkBridge AI sẽ phân tích kỹ năng của bạn và tạo ra một bản CV hoàn hảo để thu hút hàng ngàn nhà tuyển dụng chỉ trong <span className="font-bold text-white">10 giây</span>.
            </p>
            <button className="bg-white text-primary px-8 py-4 rounded-2xl font-black hover:bg-slate-50 transition-all shadow-xl hover:shadow-2xl flex items-center gap-3 w-full sm:w-auto justify-center mx-auto md:mx-0 group-hover:-translate-y-1">
              Trải nghiệm AI ngay
              <span className="material-symbols-outlined !text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>

          {/* Image Content */}
          <div className="relative z-10 w-full md:w-1/2 h-64 md:h-auto self-stretch">
            <img 
              src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=800&q=80" 
              alt="AI CV Creation" 
              className="w-full h-full object-cover rounded-tl-[4rem] rounded-bl-[4rem] md:rounded-tl-[6rem] md:rounded-br-none md:rounded-bl-[6rem] shadow-[-10px_0_30px_rgba(0,0,0,0.2)] transform group-hover:scale-[1.02] transition-transform duration-700"
            />
          </div>

        </div>
      </div>
    </section>
  );
}
