import React from 'react';

const EMPLOYERS = [
  { id: 1, name: 'FPT Software', logo: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=300&q=80' },
  { id: 2, name: 'VNG Corporation', logo: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=300&q=80' },
  { id: 3, name: 'Viettel', logo: 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?auto=format&fit=crop&w=300&q=80' },
  { id: 4, name: 'Momo', logo: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=300&q=80' },
  { id: 5, name: 'Tiki', logo: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=300&q=80' },
  { id: 6, name: 'Shopee', logo: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=300&q=80' },
  { id: 7, name: 'Grab', logo: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=300&q=80' },
  { id: 8, name: 'Gojek', logo: 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?auto=format&fit=crop&w=300&q=80' },
];

export default function TopEmployers() {
  return (
    <section className="bg-white py-16 border-b border-slate-100 overflow-hidden shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center">
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-wide">Nhà tuyển dụng hàng đầu</h2>
        <p className="text-slate-500 mt-3 text-lg font-medium">Hàng ngàn cơ hội việc làm từ các tập đoàn uy tín nhất</p>
      </div>

      <div className="relative w-full flex overflow-x-hidden py-4">
        {/* Left fade gradient */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 lg:w-64 bg-gradient-to-r from-white to-transparent z-10" />
        
        <div className="flex animate-marquee whitespace-nowrap">
          {/* Double the array to make seamless loop */}
          {[...EMPLOYERS, ...EMPLOYERS, ...EMPLOYERS, ...EMPLOYERS].map((company, index) => (
            <div 
              key={`${company.id}-${index}`} 
              className="mx-6 flex items-center justify-center w-[220px] h-[110px] rounded-[2rem] bg-slate-50 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer group"
            >
              <img 
                src={company.logo} 
                alt={company.name} 
                className="max-h-[60px] max-w-[150px] object-contain opacity-70 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0 transform group-hover:scale-110"
              />
            </div>
          ))}
        </div>

        {/* Right fade gradient */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 lg:w-64 bg-gradient-to-l from-white to-transparent z-10" />
      </div>
    </section>
  );
}
