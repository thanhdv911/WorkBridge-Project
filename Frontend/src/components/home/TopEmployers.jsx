import React from 'react';

const EMPLOYERS = [
  { id: 1, name: 'FPT Software', className: 'md:col-span-2 md:row-span-2', jobs: 342, tags: ['IT', 'Outsourcing'], logo: 'https://logo.clearbit.com/fptsoftware.com' },
  { id: 6, name: 'Shopee', className: 'md:col-span-2 md:row-span-1', jobs: 412, tags: ['E-commerce', 'Tech'], logo: 'https://logo.clearbit.com/shopee.vn' },
  { id: 4, name: 'Momo', className: 'md:col-span-1 md:row-span-1', jobs: 89, tags: ['Fintech'], logo: 'https://logo.clearbit.com/momo.vn' },
  { id: 5, name: 'Tiki', className: 'md:col-span-1 md:row-span-1', jobs: 64, tags: ['Retail'], logo: 'https://logo.clearbit.com/tiki.vn' },
  { id: 2, name: 'VNG Corp', className: 'md:col-span-2 md:row-span-2', jobs: 128, tags: ['Game', 'Zalo'], logo: 'https://logo.clearbit.com/vng.com.vn' },
  { id: 3, name: 'Viettel', className: 'md:col-span-1 md:row-span-2', jobs: 256, tags: ['Telecom'], logo: 'https://logo.clearbit.com/viettel.vn' },
  { id: 7, name: 'Grab', className: 'md:col-span-1 md:row-span-2', jobs: 215, tags: ['Ride-hailing'], logo: 'https://logo.clearbit.com/grab.com' },
];

export default function TopEmployers() {
  return (
    <section className="relative py-28 overflow-hidden bg-[#0f172a] mt-8 mx-4 sm:mx-6 lg:mx-8 rounded-[3rem] shadow-2xl mb-16">
      <style>{`
        @keyframes bento-blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .anim-bento-blob { animation: bento-blob 8s infinite ease-in-out; }
        .anim-delay-2000 { animation-delay: 2s; }
        .anim-delay-4000 { animation-delay: 4s; }
      `}</style>
      
      {/* Vibrant Background Orbs (Dark Mode Glassmorphism) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-500/20 blur-[100px] rounded-full mix-blend-screen anim-bento-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/20 blur-[100px] rounded-full mix-blend-screen anim-bento-blob anim-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-teal-500/10 blur-[100px] rounded-full mix-blend-screen anim-bento-blob anim-delay-4000" />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20 text-sky-300 font-bold text-sm mb-6 shadow-lg backdrop-blur-md">
            <span className="material-symbols-outlined !text-[18px]">verified</span>
            Đối tác chiến lược
          </div>
          <h2 className="text-4xl md:text-[54px] font-black text-white tracking-tight mb-6 drop-shadow-xl leading-tight">
            Top Doanh Nghiệp Hàng Đầu
          </h2>
          <p className="text-slate-300 text-lg md:text-xl font-medium max-w-3xl mx-auto leading-relaxed">
            Hợp tác cùng các tập đoàn công nghệ & thương mại điện tử lớn nhất, mang đến hàng ngàn cơ hội đột phá cho sự nghiệp của bạn.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-4 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[180px]">
          {EMPLOYERS.map((company, index) => (
            <div 
              key={company.id}
              className={`group relative rounded-[2rem] bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_30px_60px_rgba(19,146,236,0.3)] hover:-translate-y-2 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-500 overflow-hidden cursor-pointer flex flex-col justify-center items-center p-6 ${company.className}`}
              style={{ animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both` }}
            >
              {/* Internal glowing light effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-sky-400/10 to-indigo-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0 pointer-events-none" />
              
              {/* Logo with bright white circular backdrop for visibility */}
              <div className="relative z-10 flex-1 flex items-center justify-center w-full h-full transform group-hover:scale-110 group-hover:-translate-y-4 transition-all duration-500">
                <div className="absolute w-[140px] h-[140px] bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500" />
                <img 
                  src={company.logo} 
                  alt={company.name} 
                  onError={(e) => { 
                    e.target.onerror = null; 
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=ffffff&color=0f172a&size=200&font-size=0.33&bold=true`; 
                  }}
                  className="relative z-20 max-h-[80px] max-w-[170px] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] brightness-0 invert group-hover:brightness-100 group-hover:invert-0 transition-all duration-700"
                />
              </div>

              {/* Hover reveal content */}
              <div className="absolute bottom-0 inset-x-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-20 flex justify-between items-end">
                 <div className="bg-white/95 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-2xl border border-white/20">
                   <div className="text-[10px] font-black tracking-widest text-slate-400 mb-1">CƠ HỘI MỞ</div>
                   <div className="text-xl font-black text-[#1392ec]">{company.jobs}+ Việc làm</div>
                 </div>
                 
                 <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 transform rotate-[-45deg] group-hover:rotate-0 transition-transform duration-500">
                    <span className="material-symbols-outlined !text-[24px]">arrow_forward</span>
                 </div>
              </div>

              {/* Tags (floating at top) */}
              <div className="absolute top-5 left-5 flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 -translate-y-4 group-hover:translate-y-0 transition-all duration-500 z-20">
                {company.tags.map(tag => (
                  <span key={tag} className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-wider text-white border border-white/20 shadow-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

