import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { presenceRealtimeService } from '../services/presenceRealtimeService';
import GoongAddressPicker from '../components/shared/GoongAddressPicker';
import { translateCategory, translatePayUnit } from '../utils/translate';
import { getVisitorId, PRESENCE_REFRESH_MS } from '../utils/presence';

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

  return (
    <div className={`home-shell home-perf-lite relative overflow-x-hidden ${pointerEffects ? 'home-allow-tilt' : ''}`}>
      <Hero heroRef={heroRef} />
      <LatestJobs />
      <Categories />
      <HowItWorks />
      <Testimonials />
      <CTA />
    </div>
  );
}

function Hero({ heroRef }) {
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

          <h1 className="home-kinetic-title mb-4" aria-label="Tìm Việc Bán Thời Gian Hoàn Hảo Cho Bạn">
            <span>Tìm Việc Bán Thời Gian</span>
            <span>Hoàn Hảo Cho Bạn</span>
          </h1>

          <p className="mt-4 max-w-[610px] break-words text-base font-semibold leading-7 text-slate-600">
            Kết nối sinh viên với công việc linh hoạt. Tích lũy kinh nghiệm, tạo thu nhập và phát triển sự nghiệp — theo lịch trình của bạn.
          </p>

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
                  <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-black text-slate-800">
                    <span className="material-symbols-outlined text-primary !text-lg">explore</span>
                    Khu vực tìm kiếm
                  </div>

                  <div className="space-y-3.5">
                    <GoongAddressPicker
                      value={{ address, ward, district, city: province }}
                      onChange={(next) => {
                        setAddress(next.address);
                        setWard(next.ward);
                        setDistrict(next.district);
                        setProvince(next.city);
                      }}
                      label="Khu vực tìm kiếm"
                      placeholder="Gõ tỉnh, quận, phường hoặc tên đường..."
                      showMapLink={false}
                      compact
                    />

                    <div className="flex gap-2 pt-1.5">
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

const CATEGORY_ICONS = {
  default: { icon: 'work', tone: 'home-category-blue' },
  food: { icon: 'restaurant', tone: 'home-category-coral' },
  beverage: { icon: 'local_cafe', tone: 'home-category-coral' },
  tutor: { icon: 'school', tone: 'home-category-indigo' },
  delivery: { icon: 'local_shipping', tone: 'home-category-blue' },
  retail: { icon: 'storefront', tone: 'home-category-mint' },
  tech: { icon: 'code', tone: 'home-category-indigo' },
  design: { icon: 'palette', tone: 'home-category-coral' },
  marketing: { icon: 'campaign', tone: 'home-category-amber' },
  admin: { icon: 'business_center', tone: 'home-category-slate' },
};

function getCategoryStyle(name) {
  if (!name) return CATEGORY_ICONS.default;
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(CATEGORY_ICONS)) {
    if (key !== 'default' && lower.includes(key)) return value;
  }
  return CATEGORY_ICONS.default;
}

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/home/categories')
      .then(res => setCategories(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && categories.length === 0) {
    return null;
  }

  return (
    <section className="home-section home-slide-categories mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeader
        title="Khám phá theo danh mục"
        description="Các nhóm ngành nghề phổ biến được thiết kế trực quan giúp bạn lọc việc nhanh chóng."
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
        <div className="home-side-grid grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.slice(0, 8).map((category, index) => {
            const categoryName = category.categoryName || category.name;
            const style = getCategoryStyle(categoryName);

            return (
              <a
                key={category.categoryId}
                className="home-category-card shine-hover"
                href={`/jobs?category=${category.categoryId}`}
                style={{ '--home-delay': `${index * 55}ms` }}
              >
                <div className={`home-category-icon ${style.tone}`}>
                  <span className="material-symbols-outlined !text-[27px]">{style.icon}</span>
                </div>
                <h3 className="mt-4 text-center text-sm font-black text-slate-950 sm:text-base">{translateCategory(categoryName)}</h3>
              </a>
            );
          })}
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
    },
    {
      title: 'Khám phá việc làm',
      text: 'Tìm kiếm vị trí bán thời gian phù hợp với lịch trình, địa điểm và sở thích của bạn.',
    },
    {
      title: 'Ứng tuyển & Nhận việc',
      text: 'Ứng tuyển chỉ với một cú nhấp. Nhà tuyển dụng phản hồi nhanh — phần lớn trong vòng 48 giờ.',
    },
  ];

  return (
    <section className="home-section home-steps-section mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeader
        title="Cách Thức Hoạt Động"
        description="Ba bước đơn giản đến cơ hội tiếp theo"
      />

      <div className="home-steps-timeline">
        {steps.map((step, index) => (
          <article
            key={step.title}
            className="home-step-card shine-hover"
            style={{ '--home-delay': `${index * 100}ms` }}
          >
            <div className="home-step-number">{index + 1}</div>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LatestJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renderedAt] = useState(() => Date.now());

  useEffect(() => {
    api.get('/home/latest-jobs')
      .then(res => {
        setJobs(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section className="home-section home-jobs-section mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="home-jobs-content">
        <SectionHeader
          title="Việc làm nổi bật"
          description="Các cơ hội mới nhất được kết nối trực tiếp, phản hồi nhanh chóng từ doanh nghiệp."
          actionHref="/jobs"
          actionLabel="Xem tất cả việc làm"
        />

        {loading ? (
          <div className="home-jobs-grid grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="home-job-skeleton" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState icon="work_off" title="Chưa có việc làm nào" text="Hãy quay lại sau, cơ hội mới sẽ được cập nhật tại đây." />
        ) : (
          <div className="home-jobs-grid grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job, index) => (
              <JobCard key={job.jobPostId} job={job} index={index} renderedAt={renderedAt} />
            ))}
          </div>
        )}

        <div className="home-jobs-footer mt-7 flex justify-center">
          <a href="/jobs" className="home-outline-button">
            <span className="material-symbols-outlined !text-xl">grid_view</span>
            Xem toàn bộ việc làm
          </a>
        </div>
      </div>
    </section>
  );
}

function JobCard({ job, index, renderedAt }) {
  const initials = getInitials(job.companyName);
  const isNew = job.createdAt && (renderedAt - new Date(job.createdAt)) < 24 * 3600 * 1000;
  const isFeatured = Boolean(job.isFeatured);

  return (
    <article
      className={`home-job-card shine-hover flex flex-col justify-between ${isFeatured ? 'home-job-featured' : ''}`}
      style={{ '--home-delay': `${index * 70}ms` }}
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          {job.companyLogoUrl ? (
            <img src={job.companyLogoUrl} alt={job.companyName} className="h-12 w-12 rounded-2xl border border-slate-100 object-cover" />
          ) : (
            <div className="home-company-avatar flex items-center justify-center bg-gradient-to-br from-sky-400 to-primary text-white font-bold rounded-2xl">{initials}</div>
          )}

          {isFeatured ? (
            <span className="home-job-badge flex items-center gap-1">
              <span className="material-symbols-outlined !text-[15px] text-primary">local_fire_department</span>
              Việc hot
            </span>
          ) : isNew ? (
            <span className="home-job-badge home-job-badge-soft">Mới</span>
          ) : null}
        </div>

        <div className="mt-5">
          <h3 className="line-clamp-2 min-h-[3.25rem] text-lg font-black leading-snug text-slate-950 hover:text-primary transition-colors">
            <a href={`/jobs/${job.jobPostId}`}>{job.title}</a>
          </h3>
          <p className="mt-1.5 line-clamp-1 text-sm font-bold text-slate-500">
            {job.companyName}
          </p>
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400 flex items-center gap-1">
            <span className="material-symbols-outlined !text-sm text-slate-400">location_on</span>
            {compactLocationLabel(job.location) || 'Việt Nam'}
          </p>
        </div>
      </div>

      <div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="home-job-chip">
            <span className="material-symbols-outlined !text-[14px]">schedule</span>
            {job.jobType}
          </span>
          {job.payRate && (
            <span className="home-job-chip text-primary bg-sky-50 border border-sky-100/60 font-black">
              <span className="material-symbols-outlined !text-[14px] text-primary">payments</span>
              {formatPayRate(job.payRate)} {translatePayUnit(job.payUnit)}
            </span>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-[11px] font-bold text-slate-400">{timeAgo(job.createdAt, renderedAt)}</span>
          <a href={`/jobs/${job.jobPostId}`} className="button-swipe home-job-action">
            Ứng tuyển ngay
            <span className="material-symbols-outlined !text-[15px]">arrow_forward</span>
          </a>
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
    <section className="home-section home-testimonials-section mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeader
        title="Sinh Viên Nói Gì"
        description="Tham gia cùng hàng nghìn sinh viên đã tìm được việc bán thời gian lý tưởng"
      />

      <div className="home-testimonial-grid">
        {testimonials.map((item, index) => (
          <article key={item.name} className="home-testimonial-card shine-hover" style={{ '--home-delay': `${index * 110}ms` }}>
            <div className="flex items-center gap-3">
              <div className="home-story-mini-avatar flex items-center justify-center bg-primary text-white font-bold rounded-xl">{item.initials}</div>
              <div>
                <h3>{item.name}</h3>
                <p>{item.role}</p>
              </div>
            </div>
            <div className="home-stars" aria-label="5 sao">
              {[...Array(5)].map((_, starIndex) => (
                <span key={starIndex} className="material-symbols-outlined filled !text-[18px]">star</span>
              ))}
            </div>
            <p className="home-testimonial-text">{item.text}</p>
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
      <div className="home-cta-panel">
        <img src="/workbridge-mark.png" alt="" className="home-cta-mark" aria-hidden="true" />
        <div className="relative z-10 max-w-2xl">
          <h2 className="home-section-title mt-3 text-slate-950">
            Sẵn sàng tìm cơ hội tiếp theo?
          </h2>
          <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
            Tham gia cùng hàng nghìn sinh viên đang vừa học vừa làm. Tạo tài khoản miễn phí và bắt đầu ứng tuyển ngay hôm nay.
          </p>
        </div>
        <div className="relative z-10 mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0">
          <a href={getStartedHref} className="button-swipe home-cta-primary">
            Bắt đầu miễn phí
            <span className="material-symbols-outlined !text-xl">arrow_forward</span>
          </a>
          <a href="/jobs" className="home-cta-secondary">
            Tìm việc
          </a>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ title, description, actionHref, actionLabel }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className="home-section-title max-w-3xl text-slate-950">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">{description}</p>
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

