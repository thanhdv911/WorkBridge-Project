import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import GoongAddressPicker from '../components/shared/GoongAddressPicker';
import { translateCategory, translatePayUnit } from '../utils/translate';

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

    const handlePointerMove = (event) => {
      lastEvent = event;
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
    };

    const resetTilt = () => {
      hero.style.setProperty('--home-tilt-x', '0deg');
      hero.style.setProperty('--home-tilt-y', '0deg');
      hero.style.setProperty('--home-shift-x', '0px');
      hero.style.setProperty('--home-shift-y', '0px');
      hero.style.setProperty('--home-field-x', '50%');
      hero.style.setProperty('--home-field-y', '50%');
    };

    hero.addEventListener('pointermove', handlePointerMove, { passive: true });
    hero.addEventListener('pointerleave', resetTilt);

    return () => {
      hero.removeEventListener('pointermove', handlePointerMove);
      hero.removeEventListener('pointerleave', resetTilt);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [pointerEffects]);

  return { heroRef, pointerEffects };
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
      className="home-hero relative z-10 px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-10 lg:pt-10"
    >
      <div className="home-motion-field" aria-hidden="true" />

      <div className="mx-auto grid max-w-7xl items-center gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(520px,.82fr)]">
        <div className="relative z-20 min-w-0">
          <div className="home-eyebrow mb-5 inline-flex items-center gap-2">
            <span className="material-symbols-outlined !text-[17px]">verified</span>
            WorkBridge Part-time Network
          </div>

          <h1 className="home-kinetic-title" aria-label="Tìm Việc Bán Thời Gian Hoàn Hảo Cho Bạn">
            <span>Tìm Việc Bán Thời Gian</span>
            <span>Hoàn Hảo Cho Bạn</span>
          </h1>

          <p className="mt-4 max-w-[610px] break-words text-base font-semibold leading-7 text-slate-600">
            Kết nối sinh viên với công việc linh hoạt. Tích lũy kinh nghiệm, tạo thu nhập và phát triển sự nghiệp — theo lịch trình của bạn.
          </p>

          <form onSubmit={handleSearch} className="home-search mt-6">
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
                className="home-location-trigger"
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

          <div className="home-hero-ribbon mt-5" aria-label="Điểm mạnh WorkBridge">
            {['60 giây tạo hồ sơ', 'Ca làm rõ ràng', 'Nhắn tin trực tiếp', 'Theo dõi chấm công'].map((item, index) => (
              <span key={item} className="home-ribbon-pill" style={{ '--home-delay': `${index * 90}ms` }}>
                {item}
              </span>
            ))}
          </div>

        </div>

        <div className="home-scene relative hidden min-h-[430px] xl:block" aria-label="Minh họa WorkBridge">
          <div className="home-scene-grid" aria-hidden="true" />
          <img src="/workbridge-mark.png" alt="WorkBridge" className="home-brand-mark" />

          <div className="home-live-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-primary">Gợi ý ca phù hợp</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">3 việc mới gần bạn</h2>
              </div>
              <div className="home-live-badge">
                <span className="material-symbols-outlined !text-[15px]">radio_button_checked</span>
                Live
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {[
                ['Ca sáng', 'Nhân viên pha chế', '35.000đ/giờ', 'Cách 1.8 km'],
                ['Ca tối', 'Trợ lý cửa hàng', '42.000đ/giờ', 'Ưu tiên sinh viên'],
                ['Cuối tuần', 'Gia sư tiếng Anh', '90.000đ/giờ', 'Lịch linh hoạt']
              ].map(([slot, title, pay, note], index) => (
                <div key={title} className="home-mini-job" style={{ '--home-delay': `${index * 80}ms` }}>
                  <div>
                    <p className="text-[11px] font-black text-slate-400">{slot}</p>
                    <h3 className="mt-0.5 text-sm font-black text-slate-900">{title}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-primary">{pay}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-400">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="home-floating-note home-floating-note-a">
            <span className="material-symbols-outlined !text-[19px] text-primary">task_alt</span>
            Hồ sơ đã sẵn sàng
          </div>

          <div className="home-floating-note home-floating-note-b">
            <span className="material-symbols-outlined !text-[19px] text-primary">schedule</span>
            Lọc theo ca rảnh
          </div>

          <div className="home-orbit-chip home-orbit-chip-a">
            <span>Ứng tuyển</span>
            <strong>1 chạm</strong>
          </div>

          <div className="home-orbit-chip home-orbit-chip-b">
            <span>Phản hồi</span>
            <strong>nhanh</strong>
          </div>
        </div>
      </div>
    </section>
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
        description="Kéo xuống là các nhóm việc trượt vào từ hai phía để bạn chọn nhanh hơn."
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
          title="Việc làm đang mở"
          description="Các cơ hội mới nhất được gom lại để bạn xem nhanh, lọc nhanh và ứng tuyển ngay."
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
      className={`home-job-card shine-hover ${isFeatured ? 'home-job-featured' : ''}`}
      style={{ '--home-delay': `${index * 70}ms` }}
    >
      <div className="flex items-start justify-between gap-4">
        {job.companyLogoUrl ? (
          <img src={job.companyLogoUrl} alt={job.companyName} className="h-12 w-12 rounded-2xl border border-slate-100 object-cover" />
        ) : (
          <div className="home-company-avatar">{initials}</div>
        )}

        {isFeatured ? (
          <span className="home-job-badge">
            <span className="material-symbols-outlined !text-[15px]">local_fire_department</span>
            Việc hot
          </span>
        ) : isNew ? (
          <span className="home-job-badge home-job-badge-soft">Mới</span>
        ) : null}
      </div>

      <div className="mt-5">
        <h3 className="line-clamp-2 min-h-[3.25rem] text-xl font-black leading-snug text-slate-950">{job.title}</h3>
        <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-500">
          {job.companyName} · {job.location || 'Việt Nam'}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="home-job-chip">
          <span className="material-symbols-outlined !text-[14px]">schedule</span>
          {job.jobType}
        </span>
        {job.payRate && (
          <span className="home-job-chip">
            <span className="material-symbols-outlined !text-[14px]">payments</span>
            {formatPayRate(job.payRate)} {translatePayUnit(job.payUnit)}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5">
        <span className="text-xs font-bold text-slate-400">{timeAgo(job.createdAt, renderedAt)}</span>
        <a href={`/jobs/${job.jobPostId}`} className="button-swipe home-job-action">
          Ứng tuyển
          <span className="material-symbols-outlined !text-[16px]">arrow_forward</span>
        </a>
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
              <div className="home-story-mini-avatar">{item.initials}</div>
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

