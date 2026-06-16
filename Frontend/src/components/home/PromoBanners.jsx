import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PromoBanners() {
  const navigate = useNavigate();

  return (
    <section className="py-20 relative overflow-hidden">
      <style>{`
        @keyframes scan-laser {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .anim-scan {
          animation: scan-laser 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes spin-slow {
          100% { transform: rotate(360deg); }
        }
        .anim-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative w-full rounded-[3rem] overflow-hidden bg-[#0a0f25] border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)] group cursor-pointer" onClick={() => navigate('/profile')}>
          
          {/* Animated Background Gradients */}
          <div className="absolute inset-0 z-0">
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[80%] bg-blue-600/30 blur-[120px] rounded-full mix-blend-screen group-hover:bg-blue-500/40 transition-colors duration-700" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[60%] bg-purple-600/30 blur-[120px] rounded-full mix-blend-screen group-hover:bg-fuchsia-500/40 transition-colors duration-700" />
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center">
            
            {/* Left Content */}
            <div className="w-full md:w-1/2 p-10 md:p-16 lg:p-20 text-center md:text-left flex flex-col items-center md:items-start justify-center">
              <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-black uppercase tracking-widest mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <span className="material-symbols-outlined !text-[16px] text-purple-400 anim-spin-slow">magic_button</span>
                Tính Năng Đột Phá
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-[56px] font-black text-white mb-6 leading-[1.1] tracking-tight">
                Tạo CV Cùng <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 animate-gradient-x">
                  Trí Tuệ Nhân Tạo
                </span>
              </h2>
              
              <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed max-w-lg font-medium">
                Không biết bắt đầu từ đâu? WorkBridge AI sẽ phân tích kỹ năng và tự động xây dựng bản CV hoàn hảo cho bạn chỉ trong <span className="text-cyan-400 font-bold drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">10 giây</span>.
              </p>
              
              <button className="relative overflow-hidden group/btn bg-white text-slate-900 px-10 py-5 rounded-2xl font-black text-lg transition-all shadow-[0_10px_30px_rgba(255,255,255,0.15)] hover:shadow-[0_15px_40px_rgba(34,211,238,0.3)] flex items-center gap-3 hover:-translate-y-1">
                <span className="relative z-10">Trải nghiệm AI ngay</span>
                <span className="material-symbols-outlined !text-[22px] relative z-10 group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                {/* Button hover gradient sweep */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-200 to-white opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
              </button>
            </div>

            {/* Right Content - Mock UI */}
            <div className="w-full md:w-1/2 p-8 md:p-12 lg:pr-20 flex justify-center items-center">
              <div className="relative w-full max-w-md aspect-[4/5] bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_30px_60px_rgba(0,0,0,0.5)] transform md:rotate-3 hover:rotate-0 transition-transform duration-700 overflow-hidden">
                
                {/* Laser line */}
                <div className="absolute left-0 w-full h-[2px] bg-cyan-400 shadow-[0_0_20px_4px_rgba(34,211,238,0.6)] anim-scan z-50" />
                
                {/* Decorative header */}
                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-white/10">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5">
                    <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-white !text-[20px]">person</span>
                    </div>
                  </div>
                  <div>
                    <div className="h-3 w-24 bg-white/20 rounded-full mb-2" />
                    <div className="h-2 w-16 bg-white/10 rounded-full" />
                  </div>
                </div>

                {/* Mock content blocks */}
                <div className="space-y-6">
                  <div>
                    <div className="h-2 w-20 bg-blue-400/50 rounded-full mb-3" />
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-white/10 rounded-full" />
                      <div className="h-2 w-5/6 bg-white/10 rounded-full" />
                      <div className="h-2 w-4/6 bg-white/10 rounded-full" />
                    </div>
                  </div>
                  <div>
                    <div className="h-2 w-24 bg-purple-400/50 rounded-full mb-3" />
                    <div className="flex gap-2 mb-2">
                       <div className="h-6 w-16 bg-white/5 rounded-md border border-white/10" />
                       <div className="h-6 w-20 bg-white/5 rounded-md border border-white/10" />
                       <div className="h-6 w-14 bg-white/5 rounded-md border border-white/10" />
                    </div>
                  </div>
                </div>

                {/* Processing Badge */}
                <div className="absolute bottom-6 right-6 bg-cyan-900/40 border border-cyan-500/50 px-4 py-2 rounded-xl backdrop-blur-md flex items-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                  <span className="material-symbols-outlined text-cyan-400 !text-[18px] anim-spin-slow">settings</span>
                  <span className="text-cyan-400 text-xs font-bold tracking-wide">Đang phân tích...</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
