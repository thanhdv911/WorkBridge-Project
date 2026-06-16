import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../services/api';
import { presenceRealtimeService } from '../services/presenceRealtimeService';
import GoongAddressPicker from '../components/shared/GoongAddressPicker';
import { translateCategory, translatePayUnit } from '../utils/translate';
import { getVisitorId, PRESENCE_REFRESH_MS } from '../utils/presence';
import toast from 'react-hot-toast';
import JobMarketDashboard from '../components/home/JobMarketDashboard';
import EmployerHomeFeatures from '../components/home/EmployerHomeFeatures';

const compactLocationLabel = (label = '') => {
  const parts = String(label || '').split(',').map(part => part.trim()).filter(Boolean);
  if (parts.length <= 2) return label;

  const clean = (value) => value
    .replace(/^(Thành phố|Tỉnh|Quận|Huyện|Thị xã|Phường|Xã)\s+/i, '')
    .trim();

  const province = clean(parts[parts.length - 1] || '');
  const district = clean(parts[parts.length - 2] || '');
  return [district, province].filter(Boolean).join(', ') || label;
};

const formatPayRate = (value) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toLocaleString('vi-VN') : value;
};

const normalizePresence = (payload = {}) => ({
  users: Array.isArray(payload.users) ? payload.users : [],
  page: Math.max(1, Number(payload.page || 1)),
  totalPages: Math.max(1, Number(payload.totalPages || 1)),
  updatedAt: payload.updatedAt || null
});

const presenceRoleLabel = (roleName = '') => {
  if (roleName === 'Employer') return 'Doanh nghiệp';
  if (roleName === 'Applicant') return 'Ứng viên';
  return 'Thành viên';
};

const canUseHeroPointerTilt = () => (
  typeof window !== 'undefined'
  && window.matchMedia('(pointer: fine)').matches
  && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

function useHeroPointerTilt() {
  const heroRef = useRef(null);
  const [pointerEffects] = useState(canUseHeroPointerTilt);

  useEffect(() => {
    if (!pointerEffects) return undefined;

    const hero = heroRef.current;
    if (!hero) return undefined;

    let frameId = 0;
    let lastEvent = null;
    let idleTimer = 0;

    const resetTilt = () => {
      hero.style.setProperty('--home-tilt-x', '0deg');
      hero.style.setProperty('--home-tilt-y', '0deg');
      hero.style.setProperty('--home-shift-x', '0px');
      hero.style.setProperty('--home-shift-y', '0px');
      hero.style.setProperty('--home-field-x', '50%');
      hero.style.setProperty('--home-field-y', '50%');
    };

    const startIdleMotion = () => {
      resetTilt();
      hero.classList.add('home-idle');
    };

    startIdleMotion();

    const handlePointerMove = (event) => {
      hero.classList.remove('home-idle');
      lastEvent = event;
      window.clearTimeout(idleTimer);
      if (frameId) return;

      frameId = window.requestAnimationFrame(() => {
        const hero = heroRef.current;
        if (!hero || !lastEvent) {
          frameId = 0;
          return;
        }

        const rect = hero.getBoundingClientRect();
        const x = ((lastEvent.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((lastEvent.clientY - rect.top) / rect.height - 0.5) * 2;
        const clampedX = Math.max(-1, Math.min(1, x));
        const clampedY = Math.max(-1, Math.min(1, y));

        hero.style.setProperty('--home-tilt-x', `${clampedX * 5}deg`);
        hero.style.setProperty('--home-tilt-y', `${clampedY * -4}deg`);
        hero.style.setProperty('--home-shift-x', `${clampedX * 16}px`);
        hero.style.setProperty('--home-shift-y', `${clampedY * 12}px`);
        hero.style.setProperty('--home-field-x', `${50 + clampedX * 9}%`);
        hero.style.setProperty('--home-field-y', `${50 + clampedY * 8}%`);
        frameId = 0;
      });

      idleTimer = window.setTimeout(startIdleMotion, 620);
    };

    const handlePointerLeave = () => {
      window.clearTimeout(idleTimer);
      startIdleMotion();
    };

    hero.addEventListener('pointermove', handlePointerMove, { passive: true });
    hero.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      hero.removeEventListener('pointermove', handlePointerMove);
      hero.removeEventListener('pointerleave', handlePointerLeave);
      hero.classList.remove('home-idle');
      window.clearTimeout(idleTimer);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [pointerEffects]);

  return { heroRef, pointerEffects };
}

function usePresenceSnapshot(page = 1, pageSize = 5) {
  const [presence, setPresence] = useState(() => normalizePresence());

  useEffect(() => {
    let cancelled = false;
    const visitorId = getVisitorId();

    const refreshPresence = async () => {
      try {
        const res = await api.post('/home/presence', { visitorId, page, pageSize });
        if (!cancelled) setPresence(normalizePresence(res.data));
      } catch {
        if (!cancelled) {
          setPresence((current) => current || normalizePresence());
        }
      }
    };

    refreshPresence();
    const intervalId = window.setInterval(refreshPresence, PRESENCE_REFRESH_MS);

    const handleVisibilityChange = () => {
      if (!cancelled && document.visibilityState === 'visible') {
        refreshPresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', refreshPresence);
    window.addEventListener('online', refreshPresence);
    presenceRealtimeService.on('HomePresenceChanged', refreshPresence);
    presenceRealtimeService.start();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', refreshPresence);
      window.removeEventListener('online', refreshPresence);
      presenceRealtimeService.off('HomePresenceChanged', refreshPresence);
    };
  }, [page, pageSize]);

  return presence;
}

export default function Home() {
  const { heroRef, pointerEffects } = useHeroPointerTilt();
  const userRole = localStorage.getItem('role');

  if (userRole === 'Employer') {
    return (
      <div className={`home-shell home-perf-lite relative overflow-x-hidden ${pointerEffects ? 'home-allow-tilt' : ''}`}>
        <Hero heroRef={heroRef} userRole={userRole} />
        <EmployerHomeFeatures />
      </div>
    );
  }

  if (userRole === 'Admin') {
    return (
      <div className={`home-shell home-perf-lite relative overflow-x-hidden ${pointerEffects ? 'home-allow-tilt' : ''}`}>
        <Hero heroRef={heroRef} userRole={userRole} />
      </div>
    );
  }

  return (
    <div className={`home-shell home-perf-lite relative overflow-x-hidden ${pointerEffects ? 'home-allow-tilt' : ''}`}>
      <Hero heroRef={heroRef} userRole={userRole} />
      <LatestJobs />
      <JobMarketDashboard />
      <Categories />
      <HowItWorks />
      <Testimonials />
      <CTA />
    </div>
  );
}

const QUICK_CITIES = [
  { label: 'Toàn quốc', value: '' },
  { label: 'Hà Nội', value: 'Hà Nội' },
  { label: 'TP. HCM', value: 'Hồ Chí Minh' },
  { label: 'Đà Nẵng', value: 'Đà Nẵng' },
  { label: 'TP. Huế', value: 'Huế' }
];

function Hero({ heroRef, userRole }) {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [showLocationCard, setShowLocationCard] = useState(false);
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [address, setAddress] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const locationRef = useRef(null);
  const displayLocationLabel = compactLocationLabel(selectedLabel);

  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
      title: 'WorkBridge AI CV Reviewer',
      subtitle: 'Đánh giá CV của bạn bằng Trí tuệ Nhân tạo chỉ trong 10 giây.',
      badge: 'Tính năng HOT',
      badgeColor: 'bg-primary',
      link: '/profile'
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80',
      title: 'VIP Doanh Nghiệp',
      subtitle: 'Tìm kiếm nhân sự part-time nhanh chóng, hỗ trợ chấm công bằng QR code.',
      badge: 'Doanh nghiệp',
      badgeColor: 'bg-blue-500',
      link: '/signup'
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80',
      title: 'Việc Làm Verified 100%',
      subtitle: 'Đi làm ngay, không lo lừa đảo. Thanh toán lương minh bạch và rõ ràng.',
      badge: 'Cam kết',
      badgeColor: 'bg-amber-500',
      link: '/jobs'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleClearLocation = () => {
    setProvince('');
    setDistrict('');
    setWard('');
    setAddress('');
    setSelectedLabel('');
    setShowLocationCard(false);
  };

  const handleApplyLocation = () => {
    const parts = [];
    if (address.trim()) parts.push(address.trim());
    if (ward) parts.push(ward);
    if (district) parts.push(district);
    if (province) parts.push(province);

    setSelectedLabel(parts.join(', '));
    setShowLocationCard(false);
  };

  const handleQuickCitySelect = (cityValue, cityLabel) => {
    if (!cityValue) {
      setProvince('');
      setDistrict('');
      setWard('');
      setAddress('');
      setSelectedLabel('');
    } else {
      setProvince(cityValue);
      setDistrict('');
      setWard('');
      setAddress('');
      setSelectedLabel(cityLabel);
    }
    setShowLocationCard(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setShowLocationCard(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();

    const parts = [];
    if (address.trim()) parts.push(address.trim());
    if (ward) parts.push(ward);
    if (district) parts.push(district);
    if (province) parts.push(province);

    const finalLocation = parts.join(', ');
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('keyword', keyword.trim());
    if (finalLocation) params.set('location', finalLocation);

    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <section
      ref={heroRef}
      className="home-hero relative z-10 px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:pb-16 lg:pt-16"
    >
      <div className="home-motion-field" aria-hidden="true" />

      <div className="mx-auto grid max-w-7xl items-center gap-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="relative z-20 min-w-0">
          <div className="home-eyebrow mb-5 inline-flex items-center gap-2">
            <span className="material-symbols-outlined !text-[17px]">verified</span>
            Hệ thống kết nối part-time sinh viên
          </div>

          <h1 className="home-kinetic-title mb-4" aria-label={userRole === 'Admin' ? "Quản Trị Hệ Thống WorkBridge" : userRole === 'Employer' ? "Tìm Kiếm Nhân Sự Part-Time Nhanh Chóng" : "Tìm Việc Bán Thời Gian Hoàn Hảo Cho Bạn"}>
            <span>{userRole === 'Admin' ? "Quản Trị Hệ Thống" : userRole === 'Employer' ? "Tìm Kiếm Nhân Sự" : "Tìm Việc Bán Thời Gian"}</span>
            <span>{userRole === 'Admin' ? "WorkBridge Platform" : userRole === 'Employer' ? "Part-Time Hoàn Hảo" : "Hoàn Hảo Cho Bạn"}</span>
          </h1>

          <p className="mt-4 max-w-[610px] break-words text-base font-semibold leading-7 text-slate-600">
            {userRole === 'Admin'
              ? "Trung tâm quản trị toàn diện hệ thống WorkBridge. Giám sát hoạt động, quản lý người dùng và duy trì nền tảng kết nối nhân sự ổn định."
              : userRole === 'Employer' 
                ? "Kết nối với hàng ngàn sinh viên năng động. Đăng tin tuyển dụng nhanh chóng, quản lý ca làm việc hiệu quả và tối ưu hóa nhân sự của bạn."
                : "Kết nối sinh viên với công việc linh hoạt. Tích lũy kinh nghiệm, tạo thu nhập và phát triển sự nghiệp — theo lịch trình của bạn."}
          </p>

          {userRole === 'Admin' ? (
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button onClick={() => navigate('/admin-dashboard')} className="button-swipe h-[60px] px-8 rounded-[20px] bg-primary text-[15px] font-black text-white transition hover:bg-primary-dk shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined !text-xl">admin_panel_settings</span>
                Vào trang quản trị ngay
              </button>
            </div>
          ) : userRole === 'Employer' ? (
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button onClick={() => navigate('/employer-dashboard?tab=post-job')} className="button-swipe h-[60px] px-8 rounded-[20px] bg-primary text-[15px] font-black text-white transition hover:bg-primary-dk shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined !text-xl">post_add</span>
                Đăng tin tuyển dụng ngay
              </button>
              <button onClick={() => navigate('/employer-dashboard')} className="h-[60px] px-8 rounded-[20px] border-2 border-slate-200 bg-white text-[15px] font-black text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined !text-xl">dashboard</span>
                Đến trang quản lý
              </button>
            </div>
          ) : (
            <form onSubmit={handleSearch} className="home-search mt-8">
              <div className="home-search-field">
                <span className="material-symbols-outlined text-slate-400 !text-xl">search</span>
                <input
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  placeholder="Chức danh, từ khóa..."
                  type="text"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </div>

              <div className="relative min-w-0 flex-[1.25]" ref={locationRef}>
                <button
                  type="button"
                  onClick={() => setShowLocationCard((current) => !current)}
                  className="home-location-trigger w-full"
                  title={selectedLabel}
                >
                  <span className="material-symbols-outlined shrink-0 text-slate-400 !text-xl">location_on</span>
                  <span className={`min-w-0 flex-1 truncate text-left text-sm ${selectedLabel ? 'font-black text-slate-800' : 'font-semibold text-slate-400'}`}>
                    {displayLocationLabel || 'Chọn khu vực...'}
                  </span>
                  <span className="material-symbols-outlined shrink-0 text-slate-400 !text-xl transition-transform duration-200" style={{ transform: showLocationCard ? 'rotate(180deg)' : 'rotate(0)' }}>
                    keyboard_arrow_down
                  </span>
                </button>

                {showLocationCard && (
                  <div className="home-location-popover">
                    <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2.5 text-sm font-black text-slate-800">
                      <span className="material-symbols-outlined text-primary !text-lg">explore</span>
                      Khu vực tìm kiếm
                    </div>

                    <div className="space-y-4">
                      {/* Quick Cities Selection */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Chọn nhanh thành phố</span>
                        <div className="flex flex-wrap gap-2">
                          {QUICK_CITIES.map((city) => {
                            const isActive = city.value === '' ? (!province && !address) : (province === city.value);
                            return (
                              <button
                                key={city.label}
                                type="button"
                                onClick={() => handleQuickCitySelect(city.value, city.label)}
                                className={`home-quick-city-pill ${isActive ? 'active' : ''}`}
                              >
                                {city.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3">
                        <GoongAddressPicker
                          value={{ address, ward, district, city: province }}
                          onChange={(next) => {
                            setAddress(next.address);
                            setWard(next.ward);
                            setDistrict(next.district);
                            setProvince(next.city);
                          }}
                          label="Hoặc nhập địa chỉ chi tiết:"
                          placeholder="Gõ quận huyện, tên đường để tìm kiếm..."
                          showAdminFields={false}
                          detailLabel={null}
                          showMapLink={false}
                          compact
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleClearLocation}
                          className="h-10 flex-1 rounded-xl border border-slate-200 text-xs font-black text-slate-500 transition hover:bg-slate-50 active:translate-y-px"
                        >
                          Xóa
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyLocation}
                          className="button-swipe h-10 flex-1 rounded-xl bg-primary text-xs font-black text-white transition hover:bg-primary-dk active:translate-y-px"
                        >
                          Áp dụng
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="button-swipe home-search-button">
                <span className="material-symbols-outlined !text-xl">search</span>
                Tìm kiếm
              </button>
            </form>
          )}

          <div className="home-trust-row mt-6 flex flex-wrap items-center gap-3 text-sm font-bold text-slate-500">
            {[
              ['star', 'Đánh giá 4.8 / 5'],
              ['shield', 'Nhà tuyển dụng xác minh'],
              ['bolt', 'Ứng tuyển nhanh']
            ].map(([icon, label]) => (
              <span key={label} className="home-trust-pill">
                <span className="material-symbols-outlined !text-[17px]">{icon}</span>
                {label}
              </span>
            ))}
          </div>

          <div className="home-hero-ribbon mt-6" aria-label="Điểm mạnh WorkBridge">
            {['60 giây tạo hồ sơ', 'Ca làm rõ ràng', 'Nhắn tin trực tiếp', 'Theo dõi chấm công'].map((item, index) => (
              <span key={item} className="home-ribbon-pill" style={{ '--home-delay': `${index * 90}ms` }}>
                {item}
              </span>
            ))}
          </div>

          <OnlinePresencePanel />

        </div>

        {/* Cột Phải: Slide Banner tự động trượt kiểu TopCV */}
        <div className="relative w-full h-[380px] home-slideshow-container rounded-3xl overflow-hidden shadow-2xl border border-slate-100 hidden xl:block z-20">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`home-slide-item absolute inset-0 ${index === currentSlide ? 'active' : ''}`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="home-slide-gradient" />
              <div className="absolute bottom-0 left-0 right-0 p-8 z-20 text-white">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3 text-white ${slide.badgeColor}`}>
                  {slide.badge}
                </span>
                <h2 className="text-3xl font-black mb-2 leading-tight tracking-tight">
                  {slide.title}
                </h2>
                <p className="text-sm text-slate-200 mb-4 max-w-[45ch] font-medium leading-relaxed">
                  {slide.subtitle}
                </p>
                <a
                  href={slide.link}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-dk text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                >
                  Khám phá ngay
                  <span className="material-symbols-outlined !text-sm">arrow_forward</span>
                </a>
              </div>
            </div>
          ))}
          
          {/* Carousel Indicators (Dots) */}
          <div className="absolute bottom-6 right-8 z-30 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'bg-primary w-6' : 'bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

function OnlinePresencePanel() {
  const [page, setPage] = useState(1);
  const presence = usePresenceSnapshot(page, 5);
  const onlineUsers = presence.users || [];
  const totalPages = Math.max(1, presence.totalPages || 1);
  const currentPage = Math.min(page, totalPages);
  const hasPages = totalPages > 1;

  const goToPreviousPage = () => setPage(Math.max(1, currentPage - 1));
  const goToNextPage = () => setPage(Math.min(totalPages, currentPage + 1));

  return (
    <aside className="home-presence-card" aria-label="Người dùng đang online">
      <div className="home-presence-head">
        <div className="flex items-center gap-2">
          <span className="home-presence-dot" aria-hidden="true" />
          <p className="text-[11px] font-black text-primary">Đang online</p>
        </div>
      </div>

      <div className="home-presence-users">
        {onlineUsers.length > 0 ? onlineUsers.map((user) => (
          <article key={user.userId} className="home-presence-user">
            <div className="min-w-0">
              <p className="home-presence-name">{user.fullName || 'Người dùng WorkBridge'}</p>
              <p className="home-presence-role">{presenceRoleLabel(user.roleName)}</p>
            </div>
          </article>
        )) : (
          <p className="home-presence-empty">Chưa có thành viên đăng nhập đang online</p>
        )}
      </div>

      {hasPages && (
        <div className="home-presence-pages" aria-label="Phân trang người online">
          <button
            type="button"
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            aria-label="Xem nhóm online trước"
          >
            <span className="material-symbols-outlined !text-[17px]">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            aria-label="Xem nhóm online sau"
          >
            <span className="material-symbols-outlined !text-[17px]">chevron_right</span>
          </button>
        </div>
      )}
    </aside>
  );
}

const getCategorySvg = (name) => {
  const lower = (name || '').toLowerCase().trim();
  
  // Ẩm thực & Đồ uống
  if (lower.includes('food') || lower.includes('beverage') || lower === 'f&b' || lower.includes('ẩm thực') || lower.includes('uống')) {
    return (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M29 20H33C35.2 20 37 21.8 37 24C37 26.2 35.2 28 33 28H29" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
        <path d="M11 17H30C30 17 30 28 24 31C18 31 16 31 13 28L11 17Z" fill="#1392ec" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
        <path d="M16 8C16.5 10 15.5 11 16 13" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M20 7C20.5 9 19.5 10 20 12" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M24 8C24.5 10 23.5 11 24 13" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M9 36H31" stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    );
  }
  
  // Gia sư & Dạy kèm (Tutoring)
  if (lower.includes('tutor') || lower.includes('gia sư') || lower.includes('dạy kèm') || lower.includes('học')) {
    return (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 10L42 17L24 24L6 17L24 10Z" fill="#1e293b" />
        <path d="M13 21.5V29C13 32 18 33.5 24 33.5C30 33.5 35 32 35 29V21.5" fill="#1392ec" stroke="#1e293b" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M35 17.5V28L38 29.5" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Giao hàng & Vận chuyển (Delivery)
  if (lower.includes('delivery') || lower.includes('ship') || lower.includes('giao hàng') || lower.includes('vận chuyển')) {
    return (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="16" width="20" height="16" rx="2" fill="#1392ec" stroke="#1e293b" strokeWidth="3" />
        <path d="M30 20H37L40 25V32H30V20Z" fill="#38bdf8" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="17" cy="34" r="4" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" />
        <circle cx="34" cy="34" r="4" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" />
        <path d="M3 20H6" stroke="#1392ec" strokeWidth="3" strokeLinecap="round" />
        <path d="M2 25H5" stroke="#1392ec" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  // Bán lẻ & Cửa hàng (Retail)
  if (lower.includes('retail') || lower.includes('store') || lower.includes('bán lẻ') || lower.includes('cửa hàng') || lower.includes('bán hàng') || lower.includes('doanh')) {
    return (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 13H38L41 21H7L10 13Z" fill="#1e293b" />
        <path d="M9 21C11.5 21 11.5 18 13.5 18C15.5 18 15.5 21 17.5 21C19.5 21 19.5 18 21.5 18C23.5 18 23.5 21 25.5 21C27.5 21 27.5 18 29.5 18C31.5 18 31.5 21 33.5 21C35.5 21 35.5 18 37.5 18C39.5 18 39.5 21 40 21" stroke="#1392ec" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="10" y="21" width="28" height="15" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
        <rect x="21" y="28" width="6" height="8" fill="#1392ec" stroke="#1e293b" strokeWidth="1.5" />
      </svg>
    );
  }

  // Tiếp thị & Quảng cáo (Marketing / Campaign)
  if (lower.includes('marketing') || lower.includes('pr') || lower.includes('quảng cáo') || lower.includes('tiếp thị')) {
    return (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M28 17L16 23H9V29H16L28 35V17Z" fill="#1392ec" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
        <path d="M28 14.5C30.5 14.5 32 20 32 26C32 32 30.5 37.5 28 37.5V14.5Z" fill="#38bdf8" stroke="#1e293b" strokeWidth="2.5" />
        <path d="M16 29L14.5 35H18.5L17 29" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
        <path d="M36 19C38 21.5 38 29.5 36 32" stroke="#1392ec" strokeWidth="3" strokeLinecap="round" />
        <path d="M41 15C44 19 44 32 41 36" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Sáng tạo & Thiết kế (Creative / Design)
  if (lower.includes('creative') || lower.includes('design') || lower.includes('sáng tạo') || lower.includes('thiết kế') || lower.includes('mỹ thuật')) {
    return (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 10C13 10 6 17 6 27C6 36 15 41 25 41C34 41 41 34 41 24C41 16 33 10 24 10Z" fill="#1e293b" />
        <circle cx="14" cy="20" r="3" fill="#1392ec" />
        <circle cx="24" cy="17" r="3" fill="#38bdf8" />
        <circle cx="33" cy="22" r="3" fill="#60a5fa" />
        <circle cx="30" cy="32" r="3" fill="#93c5fd" />
        <circle cx="20" cy="30" r="4.5" fill="#ffffff" />
      </svg>
    );
  }

  // Văn phòng & Hành chính (Office / Admin / Human Resources)
  if (lower.includes('office') || lower.includes('admin') || lower.includes('văn phòng') || lower.includes('hành chính') || lower.includes('nhân sự') || lower.includes('pháp chế')) {
    return (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="18" width="28" height="18" rx="2.5" fill="#1e293b" stroke="#1e293b" strokeWidth="1" />
        <path d="M18 18V13C18 12 18.8 11 20 11H28C29.2 11 30 12 30 13V18" stroke="#1e293b" strokeWidth="3" fill="none" />
        <rect x="21" y="24" width="6" height="6" rx="1" fill="#1392ec" stroke="#1e293b" strokeWidth="1.5" />
        <path d="M10 23H38" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Công nghệ thông tin (IT / Tech / Developer)
  if (lower.includes('tech') || lower.includes('it') || lower.includes('công nghệ') || lower.includes('tin học')) {
    return (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="13" width="28" height="19" rx="2" fill="#1e293b" />
        <rect x="13" y="16" width="22" height="13" fill="#1392ec" />
        <path d="M7 32H41L38 36H10L7 32Z" fill="#1e293b" />
        <text x="24" y="25" fill="#ffffff" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">IT</text>
      </svg>
    );
  }

  // Tài chính - Ngân hàng (Finance / Banking)
  if (lower.includes('finance') || lower.includes('bank') || lower.includes('tài chính') || lower.includes('ngân hàng') || lower.includes('bảo hiểm')) {
    return (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 10L8 19H40L24 10Z" fill="#1e293b" />
        <rect x="12" y="19" width="4" height="13" fill="#1392ec" />
        <rect x="22" y="19" width="4" height="13" fill="#1392ec" />
        <rect x="32" y="19" width="4" height="13" fill="#1392ec" />
        <rect x="6" y="32" width="36" height="5" fill="#1e293b" />
        <circle cx="24" cy="27" r="4.5" fill="#38bdf8" stroke="#1e293b" strokeWidth="1" />
      </svg>
    );
  }

  // Bất động sản (Real Estate)
  if (lower.includes('real') || lower.includes('estate') || lower.includes('đất') || lower.includes('sản') || lower.includes('nhà')) {
    return (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="15" width="12" height="22" rx="1" fill="#1e293b" />
        <rect x="13" y="18" width="2.5" height="3" fill="#ffffff" opacity="0.8" />
        <rect x="16.5" y="18" width="2.5" height="3" fill="#ffffff" opacity="0.8" />
        <rect x="13" y="24" width="2.5" height="3" fill="#ffffff" opacity="0.8" />
        <rect x="16.5" y="24" width="2.5" height="3" fill="#ffffff" opacity="0.8" />
        <rect x="13" y="30" width="2.5" height="3" fill="#ffffff" opacity="0.8" />
        <rect x="16.5" y="30" width="2.5" height="3" fill="#ffffff" opacity="0.8" />
        <path d="M22 26L31 18L40 26V37H22V26Z" fill="#1392ec" stroke="#1e293b" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="28" y="31" width="6" height="6" fill="#1e293b" />
      </svg>
    );
  }

  // Kế toán - Kiểm toán (Accounting)
  if (lower.includes('account') || lower.includes('kế toán') || lower.includes('kiểm toán') || lower.includes('thuế')) {
    return (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="12" width="24" height="24" rx="2.5" fill="#1e293b" />
        <rect x="15" y="15" width="18" height="6" fill="#ffffff" />
        <rect x="15" y="24" width="4.5" height="3" rx="0.5" fill="#1392ec" />
        <rect x="21.5" y="24" width="4.5" height="3" rx="0.5" fill="#1392ec" />
        <rect x="28" y="24" width="4.5" height="3" rx="0.5" fill="#1392ec" />
        <rect x="15" y="29" width="4.5" height="3" rx="0.5" fill="#1392ec" />
        <rect x="21.5" y="29" width="4.5" height="3" rx="0.5" fill="#1392ec" />
        <rect x="28" y="29" width="4.5" height="3" rx="0.5" fill="#38bdf8" />
        <circle cx="34" cy="34" r="5" fill="#38bdf8" stroke="#1e293b" strokeWidth="1" />
        <path d="M32 34L33.5 35.5L36 32.5" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Default / Other
  return (
    <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="16" width="24" height="18" rx="2" fill="#1e293b" />
      <path d="M18 16V12C18 11.5 18.5 11 19 11H29C29.5 11 30 11.5 30 12V16" stroke="#1e293b" strokeWidth="2.5" fill="none" />
      <circle cx="24" cy="25" r="3" fill="#1392ec" />
    </svg>
  );
};

function Categories() {
  const [categories, setCategories] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/home/categories'),
      api.get('/jobs?page=1&pageSize=200')
    ])
      .then(([catRes, jobsRes]) => {
        setCategories(catRes.data || []);
        
        const items = jobsRes?.data?.items || jobsRes?.data?.Items || [];
        const counts = {};
        items.forEach(job => {
          const catId = job.categoryId || job.CategoryId;
          if (catId) {
            counts[catId] = (counts[catId] || 0) + 1;
          }
        });
        setCategoryCounts(counts);
      })
      .catch((err) => {
        console.error('Error fetching home categories & counts:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!loading && categories.length === 0) {
    return null;
  }

  return (
    <section className="home-section home-slide-categories mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeader
        title="Top danh mục nổi bật"
        titleClassName="!text-2xl lg:!text-3xl !text-[#1392ec]"
        actionHref="/jobs"
        actionLabel="Xem tất cả"
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="home-category-skeleton" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState icon="category" title="Chưa có danh mục nào" text="Danh mục sẽ xuất hiện khi admin cập nhật dữ liệu." />
      ) : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {categories.slice(0, 8).map((category, index) => {
            const categoryName = category.categoryName || category.name;
            const jobCount = categoryCounts[category.categoryId] || 0;

            const CATEGORY_IMAGES = [
              "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1561070791-2526d30994b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1503387762-592deb58ef4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
            ];
            
            const imgSrc = CATEGORY_IMAGES[index % CATEGORY_IMAGES.length];

            return (
              <a
                key={category.categoryId}
                className="group relative flex flex-col justify-end p-6 rounded-3xl overflow-hidden min-h-[220px] shadow-sm hover:shadow-2xl hover:shadow-[#1392ec]/20 transition-all duration-500 hover:-translate-y-2 border border-slate-200/50 hover:border-transparent"
                href={`/jobs?category=${category.categoryId}`}
                style={{
                  '--home-delay': `${index * 55}ms`
                }}
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <img 
                    src={imgSrc} 
                    alt={categoryName} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                </div>
                
                {/* Subtle Overlay for Text Readability */}
                <div className="absolute inset-0 bg-slate-900/40 group-hover:bg-[#1392ec]/50 transition-colors duration-500" />
                
                {/* Content - Centered to fix empty space */}
                <div className="relative z-10 flex flex-col h-full justify-center items-center text-center p-4">
                  <div className="transform transition-transform duration-500 group-hover:-translate-y-2">
                    <h3 className="text-xl sm:text-2xl font-black text-white mb-3 drop-shadow-lg leading-tight">
                      {translateCategory(categoryName)}
                    </h3>
                    
                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full backdrop-blur-md bg-white/20 border border-white/30 shadow-sm transition-all duration-300 group-hover:bg-white group-hover:text-[#1392ec] text-white">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {jobCount.toLocaleString('vi-VN')} việc làm
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}

          {/* Padding Card if exactly 7 categories to balance the grid */}
          {categories.length === 7 && (
            <a
              className="group relative flex flex-col justify-center items-center p-6 rounded-3xl overflow-hidden min-h-[220px] shadow-sm hover:shadow-2xl hover:shadow-[#1392ec]/20 transition-all duration-500 hover:-translate-y-2 border-2 border-dashed border-sky-200 hover:border-transparent bg-sky-50/30 hover:bg-sky-50"
              href="/jobs"
              style={{ '--home-delay': `385ms` }}
            >
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-md mb-3 group-hover:scale-110 transition-transform duration-500">
                <span className="material-symbols-outlined !text-3xl text-[#1392ec]">arrow_forward</span>
              </div>
              <h3 className="text-lg font-black text-slate-700 group-hover:text-[#1392ec] transition-colors">
                Khám phá thêm
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-1">Xem tất cả ngành nghề</p>
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: 'Tạo hồ sơ',
      text: 'Đăng ký và xây dựng hồ sơ sinh viên của bạn chỉ trong 3 phút. Nêu bật kỹ năng và lịch rảnh.',
      icon: 'assignment_ind',
      color: 'from-sky-400 to-blue-600',
      iconColor: 'text-blue-500'
    },
    {
      title: 'Khám phá việc làm',
      text: 'Tìm kiếm vị trí bán thời gian phù hợp với lịch trình, địa điểm và sở thích của bạn.',
      icon: 'travel_explore',
      color: 'from-emerald-400 to-teal-600',
      iconColor: 'text-emerald-500'
    },
    {
      title: 'Ứng tuyển & Nhận việc',
      text: 'Ứng tuyển chỉ với một cú nhấp. Nhà tuyển dụng phản hồi nhanh — phần lớn trong vòng 48 giờ.',
      icon: 'handshake',
      color: 'from-violet-400 to-purple-600',
      iconColor: 'text-violet-500'
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-12 pt-8 pb-16 mb-16 bg-white rounded-3xl">
      <div className="text-center mb-16">
        <h2 className="text-3xl lg:text-4xl font-black text-primary mb-4 tracking-tight">Cách Thức Hoạt Động</h2>
        <p className="text-slate-500 text-lg">Ba bước đơn giản đến cơ hội tiếp theo</p>
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* Vertical Line */}
        <div className="absolute left-[39px] lg:left-1/2 top-8 bottom-8 w-1 bg-slate-100 lg:-translate-x-1/2 rounded-full" />

        {steps.map((step, index) => {
          const isEven = index % 2 !== 0;
          
          return (
            <div 
              key={step.title}
              className={`relative flex flex-col lg:flex-row items-center gap-8 lg:gap-16 mb-24 last:mb-0 ${isEven ? 'lg:flex-row-reverse' : ''}`}
            >
              {/* Timeline Marker */}
              <div className="absolute left-[20px] lg:left-1/2 top-10 lg:top-1/2 w-10 h-10 lg:-translate-y-1/2 lg:-translate-x-1/2 rounded-full bg-white border-[3px] border-[#1392ec] flex items-center justify-center font-black text-[#1392ec] z-10 shadow-lg shadow-sky-100/50">
                {index + 1}
              </div>

              {/* Text Content */}
              <div className={`w-full lg:w-1/2 pl-24 lg:pl-0 ${isEven ? 'lg:pr-16 lg:text-right' : 'lg:pl-16 lg:text-left'} pt-8 lg:pt-0`}>
                <h3 className="text-2xl lg:text-[28px] font-black text-slate-900 mb-4 tracking-tight">{step.title}</h3>
                <p className="text-slate-500 leading-relaxed text-base lg:text-lg">{step.text}</p>
              </div>

              {/* Graphic Block */}
              <div className={`w-full lg:w-1/2 pl-24 lg:pl-0 ${isEven ? 'lg:pl-16' : 'lg:pr-16'}`}>
                <div className="group relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden bg-white border border-slate-200/60 shadow-2xl shadow-slate-200/40 flex flex-col items-center justify-center transition-all duration-500 hover:-translate-y-2 hover:shadow-sky-200/60">
                  {/* Background decoration */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500`} />
                  <div className={`absolute -right-16 -top-16 w-56 h-56 bg-gradient-to-br ${step.color} rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />
                  <div className={`absolute -left-16 -bottom-16 w-56 h-56 bg-gradient-to-br ${step.color} rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-500`} />
                  
                  {/* Inner Grid Pattern */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
                  
                  {/* Icon Container */}
                  <div className={`relative z-10 w-28 h-28 rounded-3xl bg-white shadow-xl border border-slate-100 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500 ${step.iconColor}`}>
                    <span className="material-symbols-outlined !text-6xl">{step.icon}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const LOCATION_PILLS = [
  { label: 'Ngẫu Nhiên', filter: '' },
  { label: 'Hà Nội', filter: 'Hà Nội' },
  { label: 'Thành phố Hồ Chí Minh (cũ)', filter: 'Hồ Chí Minh' },
  { label: 'Đà Nẵng', filter: 'Đà Nẵng' },
  { label: 'Miền Bắc', filter: 'Hải Phòng' },
  { label: 'Miền Nam', filter: 'Bình Dương' }
];

const SALARY_PILLS = [
  { label: 'Tất cả', filter: '' },
  { label: 'Từ 20 nghìn/giờ', filter: '20000' },
  { label: 'Từ 40 nghìn/giờ', filter: '40000' },
  { label: 'Từ 100 nghìn/giờ', filter: '100000' }
];

function LatestJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterMode, setFilterMode] = useState('location'); // 'location' | 'salary'
  const [selectedLocPill, setSelectedLocPill] = useState('Ngẫu Nhiên');
  const [selectedSalaryPill, setSelectedSalaryPill] = useState('Tất cả');
  const [savedJobIds, setSavedJobIds] = useState([]);
  
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const isApplicant = role && role.toLowerCase() === 'applicant';
  const pillsRef = useRef(null);

  useEffect(() => {
    if (isApplicant && token) {
      api.get('/savedjobs/ids', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setSavedJobIds(res.data || []))
        .catch(err => console.error('Error fetching saved job IDs:', err));
    }
  }, [token, isApplicant]);

  useEffect(() => {
    setLoading(true);
    const selectedLocObj = LOCATION_PILLS.find(p => p.label === selectedLocPill);
    const filterLoc = selectedLocObj ? selectedLocObj.filter : '';

    const selectedSalObj = SALARY_PILLS.find(p => p.label === selectedSalaryPill);
    const filterSal = selectedSalObj ? selectedSalObj.filter : '';
    
    let url = `/jobs?page=${page}&pageSize=9`;
    if (filterLoc) url += `&location=${encodeURIComponent(filterLoc)}`;
    if (filterSal) url += `&minSalary=${filterSal}`;

    api.get(url)
      .then(res => {
        setJobs(res.data.items || []);
        setTotalPages(res.data.totalPages || 1);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching jobs:', err);
        setLoading(false);
      });
  }, [page, selectedLocPill]);

  const handleToggleSave = async (jobId) => {
    if (!token) {
      toast.error('Vui lòng đăng nhập để lưu việc làm.');
      return;
    }
    if (!isApplicant) {
      toast.error('Chỉ ứng viên mới có thể lưu việc làm.');
      return;
    }
    const isSaved = savedJobIds.includes(jobId);
    try {
      if (isSaved) {
        await api.delete(`/savedjobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSavedJobIds(prev => prev.filter(id => id !== jobId));
        toast.success('Đã bỏ lưu việc làm.');
        window.dispatchEvent(new Event('savedJobsChanged'));
      } else {
        await api.post(`/savedjobs/${jobId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSavedJobIds(prev => [...prev, jobId]);
        toast.success('Đã lưu việc làm.');
        window.dispatchEvent(new Event('savedJobsChanged'));
      }
    } catch (err) {
      console.error('Error toggling save job:', err);
      toast.error('Không thể cập nhật trạng thái lưu việc.');
    }
  };

  const scrollPills = (direction) => {
    if (pillsRef.current) {
      const scrollAmount = 200;
      pillsRef.current.scrollLeft += direction === 'left' ? -scrollAmount : scrollAmount;
    }
  };

  return (
    <section className="home-section home-jobs-section mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="home-jobs-content space-y-6">
        
        {/* REDESIGNED HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight home-best-title">
              Việc làm nổi bật
            </h2>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <div className="home-best-badge-ai">
              <span className="material-symbols-outlined !text-[15px] animate-pulse">psychology</span>
              Đề xuất bởi WORKBRIDGE AI
            </div>
          </div>
          
          <div className="flex items-center gap-4 self-end md:self-auto">
            <a href="/jobs" className="text-sm font-bold text-slate-500 hover:text-[#1392ec] flex items-center gap-1 transition-colors">
              Xem tất cả
              <span className="material-symbols-outlined !text-base">arrow_forward</span>
            </a>
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="home-best-header-arrow"
                aria-label="Trang trước"
              >
                <span className="material-symbols-outlined !text-lg">chevron_left</span>
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="home-best-header-arrow"
                aria-label="Trang sau"
              >
                <span className="material-symbols-outlined !text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* REDESIGNED FILTERS ROW */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-shrink-0">
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="home-best-filter-select appearance-none !pr-10 !pl-10 cursor-pointer hover:border-[#1392ec] transition-all outline-none focus:ring-2 focus:ring-[#1392ec]/20 bg-white"
            >
              <option value="location">Lọc theo: Địa điểm</option>
              <option value="salary">Lọc theo: Mức lương</option>
            </select>
            <span className="material-symbols-outlined !text-lg text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">filter_list</span>
            <span className="material-symbols-outlined !text-base text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">expand_more</span>
          </div>
          
          <div className="flex items-center gap-2 flex-1 min-w-0 max-w-2xl sm:justify-end">
            <button onClick={() => scrollPills('left')} className="home-best-pill-arrow" aria-label="Cuộn trái">
              <span className="material-symbols-outlined !text-base">chevron_left</span>
            </button>
            
            <div ref={pillsRef} className="home-best-pills-container flex-1">
              {filterMode === 'location' && LOCATION_PILLS.map((pill) => (
                <button
                  key={pill.label}
                  onClick={() => {
                    setSelectedLocPill(pill.label);
                    setPage(1);
                  }}
                  className={`home-best-pill ${selectedLocPill === pill.label ? 'active' : ''}`}
                >
                  {pill.label}
                </button>
              ))}
              
              {filterMode === 'salary' && SALARY_PILLS.map((pill) => (
                <button
                  key={pill.label}
                  onClick={() => {
                    setSelectedSalaryPill(pill.label);
                    setPage(1);
                  }}
                  className={`home-best-pill ${selectedSalaryPill === pill.label ? 'active' : ''}`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
            
            <button onClick={() => scrollPills('right')} className="home-best-pill-arrow" aria-label="Cuộn phải">
              <span className="material-symbols-outlined !text-base">chevron_right</span>
            </button>
          </div>
        </div>

        {/* REDESIGNED GRID */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-44 rounded-2xl bg-slate-100 animate-pulse border border-slate-200/50" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState icon="work_off" title="Chưa có việc làm nào" text="Hãy thử điều chỉnh bộ lọc địa điểm khác." />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {jobs.map((job) => (
              <FeaturedJobCard 
                key={job.jobPostId} 
                job={job} 
                isSaved={savedJobIds.includes(job.jobPostId)}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        )}

        {/* BOTTOM PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="home-best-footer-pagination">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="home-best-page-btn"
              aria-label="Trang trước"
            >
              <span className="material-symbols-outlined !text-base">chevron_left</span>
            </button>
            
            <p className="home-best-page-text">
              Trang <span>{page}</span> / {totalPages}
            </p>
            
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="home-best-page-btn"
              aria-label="Trang sau"
            >
              <span className="material-symbols-outlined !text-base">chevron_right</span>
            </button>
          </div>
        )}

      </div>
    </section>
  );
}

function FeaturedJobCard({ job, isSaved, onToggleSave }) {
  const isVip = Boolean(job.isFeatured);
  const initials = getInitials(job.companyName);
  
  const payRateFormatted = job.payRate ? job.payRate.toLocaleString('vi-VN') : '';
  const salaryText = payRateFormatted ? `${payRateFormatted} ${translatePayUnit(job.payUnit)}` : 'Thỏa thuận';
  
  const locationLabel = compactLocationLabel(job.location) || 'Việt Nam';

  // Badges: Visual highlights for featured/VIP jobs
  const hasTopBadge = isVip;
  const hasHotBadge = isVip;
  
  return (
    <article className={`home-best-card ${isVip ? 'is-vip' : ''}`}>
      {isVip && (
        <div className="home-best-vip-badge" title="Tin tuyển dụng nổi bật / VIP">
          <span className="material-symbols-outlined">bolt</span>
        </div>
      )}

      {/* Company Logo */}
      <div className="home-best-card-logo-wrap">
        {job.companyLogoUrl ? (
          <img 
            src={job.companyLogoUrl.startsWith('http') ? job.companyLogoUrl : `${API_BASE_URL}${job.companyLogoUrl.startsWith('/') ? '' : '/'}${job.companyLogoUrl}`} 
            alt={job.companyName} 
            className="home-best-card-logo"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-400 to-[#1392ec] text-white font-bold text-lg rounded-xl">
            {initials}
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="home-best-card-info">
        <div>
          {/* Badge Tags */}
          <div className="home-best-card-tags">
            {hasTopBadge && <span className="home-best-tag is-top">TOP</span>}
            {hasHotBadge && <span className="home-best-tag is-hot">NỔI BẬT</span>}
          </div>

          {/* Job Title */}
          <h3 className="home-best-card-title">
            <a href={`/jobs/${job.jobPostId}`}>{job.title}</a>
          </h3>

          {/* Company Name */}
          <p className="home-best-card-company" title={job.companyName}>
            {job.companyName}
          </p>
        </div>

        {/* Footer Meta */}
        <div className="home-best-card-footer">
          <div className="home-best-card-meta">
            <span className="home-best-meta-pill is-salary">
              {salaryText}
            </span>
            <span className="home-best-meta-pill">
              {locationLabel}
            </span>
          </div>

          {/* Save Button */}
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSave(job.jobPostId);
            }}
            className={`jobs-save-button ${isSaved ? 'is-saved' : ''}`}
            aria-label={isSaved ? "Bỏ lưu việc làm" : "Lưu việc làm"}
          >
            <span className="material-symbols-outlined !text-xl">
              {isSaved ? 'bookmark' : 'bookmark_border'}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}

function Testimonials() {
  const testimonials = [
    {
      initials: 'AT',
      name: 'Trần Văn An',
      role: 'Sinh viên CNTT • ĐH Bách Khoa',
      text: '"Tìm được công việc gia sư hoàn hảo phù hợp lịch học. Nộp đơn thứ Hai, được nhận việc thứ Tư!"'
    },
    {
      initials: 'ML',
      name: 'Lê Văn Minh',
      role: 'Marketing • ĐH Kinh tế Quốc dân',
      text: '"Chất lượng nhà tuyển dụng ở đây tốt hơn nhiều so với các nền tảng khác. Tôi đã làm ở một quán cà phê tuyệt vời 3 tháng — tìm được ở đây."'
    },
    {
      initials: 'TH',
      name: 'Phạm Thanh Hà',
      role: 'Thiết kế • RMIT',
      text: '"Yêu thích tính năng ứng tuyển nhanh! Ứng tuyển 5 vị trí trong một buổi tối và có 3 buổi phỏng vấn vào cuối tuần."'
    },
  ];

  return (
    <section className="home-section home-testimonials-section mx-auto max-w-7xl px-6 sm:px-10 lg:px-12 py-12 bg-sky-50/20 border border-sky-100/40 rounded-3xl relative overflow-hidden shadow-sm shadow-sky-100/20 my-16">
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#1392ec]/5 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-sky-300/5 blur-3xl pointer-events-none" />

      <SectionHeader
        title="Sinh Viên Nói Gì"
        titleClassName="!text-2xl lg:!text-3xl !text-[#1392ec]"
        description="Tham gia cùng hàng nghìn sinh viên đã tìm được việc bán thời gian lý tưởng"
      />

      <div className="home-testimonial-grid">
        {testimonials.map((item, index) => (
          <article
            key={item.name}
            className="group home-testimonial-card shine-hover flex flex-col justify-between p-6 bg-slate-50/40 border border-slate-200/50 rounded-2xl hover:border-[#1392ec] hover:bg-white hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300"
            style={{ '--home-delay': `${index * 110}ms` }}
          >
            <div className="flex items-center gap-3">
              {/* White-bordered circular avatar badge matching HowItWorks */}
              <div className="relative shrink-0 w-11 h-11 rounded-full border-2 border-white bg-sky-50 shadow-sm shadow-sky-200/40 flex items-center justify-center font-black text-xs text-[#1392ec] transition-all duration-300 group-hover:bg-white group-hover:shadow-md">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#1392ec]/10 to-transparent opacity-60 pointer-events-none rounded-full" />
                <span className="relative z-10">{item.initials}</span>
              </div>
              <div>
                <h3 className="group-hover:text-[#1392ec] transition-colors">{item.name}</h3>
                <p>{item.role}</p>
              </div>
            </div>
            <div className="home-stars mt-3" aria-label="5 sao">
              {[...Array(5)].map((_, starIndex) => (
                <span key={starIndex} className="material-symbols-outlined filled !text-[18px]">star</span>
              ))}
            </div>
            <p className="home-testimonial-text mt-3">{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  let getStartedHref = '/signup';
  if (token) {
    if (userRole === 'Employer') {
      getStartedHref = '/employer-dashboard';
    } else if (userRole === 'Admin') {
      getStartedHref = '/admin-dashboard';
    } else {
      getStartedHref = '/jobs';
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
      {/* Outer wrapper for absolute-positioning the illustration outside the panel */}
      <div className="relative">

        {/* Panel — right padding on lg to leave space for the floating illustration */}
        <div className="home-cta-panel lg:pr-72 xl:pr-80">
          <img src="/workbridge-mark.png" alt="" className="home-cta-mark" aria-hidden="true" />

          <div className="relative z-10 flex flex-1 flex-col gap-5">
            <div>
              <h2 className="home-section-title mt-3 text-slate-950">
              Sẵn sàng tìm cơ hội?
              </h2>
              <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
                Tham gia cùng hàng nghìn sinh viên đang vừa học vừa làm. Tạo tài khoản miễn phí và bắt đầu ứng tuyển ngay hôm nay.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href={getStartedHref} className="button-swipe home-cta-primary">
                Bắt đầu miễn phí
                <span className="material-symbols-outlined !text-xl">arrow_forward</span>
              </a>
              <a href="/jobs" className="home-cta-secondary">
                Tìm việc
              </a>
            </div>
          </div>
        </div>

        {/* Illustration — OUTSIDE the panel, floating freely on the right */}
        <img
          src="/cta-illustration.png"
          alt=""
          aria-hidden="true"
          draggable="false"
          className="pointer-events-none select-none hidden lg:block"
          style={{
            position: 'absolute',
            right: '0px',
            bottom: '0px',
            height: '320px',
            width: 'auto',
            mixBlendMode: 'multiply',
          }}
        />
      </div>
    </section>
  );
}

function SectionHeader({ title, description, actionHref, actionLabel, titleClassName = "" }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className={`home-section-title max-w-3xl text-slate-950 ${titleClassName}`}>
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">{description}</p>
        )}
      </div>

      {actionHref && (
        <a href={actionHref} className="home-section-link">
          {actionLabel}
          <span className="material-symbols-outlined !text-[18px]">arrow_forward</span>
        </a>
      )}
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="home-empty-state">
      <span className="material-symbols-outlined !text-[42px] text-slate-300">{icon}</span>
      <h3 className="mt-3 text-base font-black text-slate-800">{title}</h3>
      <p className="mt-1 text-sm font-semibold text-slate-400">{text}</p>
    </div>
  );
}

function timeAgo(dateStr, referenceTime) {
  if (!dateStr) return 'Gần đây';
  const diff = Math.floor((referenceTime - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

