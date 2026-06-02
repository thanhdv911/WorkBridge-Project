import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE_URL } from '../services/api';
import GoongAddressPicker from '../components/shared/GoongAddressPicker';
import { translateCategory, translatePayUnit } from '../utils/translate';
import { getVisitorId } from '../utils/presence';

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

const toAbsoluteAssetUrl = (url) => {
  if (!url) return '';
  const value = String(url).trim();
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <LatestJobs />
      <Categories />
      <HowItWorks />
      <Testimonials />
      <CTA />
    </>
  );
}

function Hero() {
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
    let parts = [];
    if (address.trim()) parts.push(address.trim());
    if (ward) parts.push(ward);
    if (district) parts.push(district);
    if (province) parts.push(province);

    const label = parts.join(', ');
    setSelectedLabel(label);
    setShowLocationCard(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setShowLocationCard(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();

    // Automatically apply whatever is currently selected in the popover
    let parts = [];
    if (address.trim()) parts.push(address.trim());
    if (ward) parts.push(ward);
    if (district) parts.push(district);
    if (province) parts.push(province);
    const finalLocation = parts.join(', ');

    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (finalLocation) params.set('location', finalLocation);
    navigate(`/jobs?${params.toString()}`);
  };

  return (
    <section className="relative z-20">
      {/* Decorative blobs inside a wrapper to prevent overflow without clipping search popover */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-inherit">
        <div className="hero-blob w-[520px] h-[520px] bg-[radial-gradient(circle,rgba(19,146,236,.16),transparent_70%)] -top-28 -right-20 absolute"></div>
        <div className="hero-blob w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(124,58,237,.12),transparent_70%)] -bottom-24 -left-16 absolute"></div>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28">
        <div className="grid lg:grid-cols-[1fr_auto] gap-10 lg:gap-14 xl:gap-20 items-center">
          {/* Left */}
          <div>
            <div className="anim-fadeUp inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6">
              <span className="material-symbols-outlined !text-[15px]">trending_up</span>
              #1 Nền tảng việc làm bán thời gian
            </div>

            <h1 className="anim-fadeUp-d1 text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-black leading-[1.1] tracking-tight">
              Tìm Việc Bán Thời Gian <span className="grad-text">Hoàn Hảo</span><br className="hidden sm:block" /> Cho Bạn
            </h1>

            <p className="anim-fadeUp-d2 mt-5 sm:mt-6 text-base sm:text-lg text-slate-500 leading-relaxed max-w-xl">
              Kết nối sinh viên với công việc linh hoạt. Tích lũy kinh nghiệm, tạo thu nhập và phát triển sự nghiệp — theo lịch trình của bạn.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="anim-fadeUp-d3 mt-7 sm:mt-8 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/70 p-2 flex flex-col sm:flex-row gap-2 relative">
              <div className="min-w-0 sm:basis-[230px] sm:flex-[1.05] flex items-center bg-slate-50 rounded-xl px-3 border border-transparent focus-within:border-primary/40 transition-colors">
                <span className="material-symbols-outlined text-slate-400 !text-xl">search</span>
                <input
                  className="min-w-0 w-full bg-transparent border-none focus:outline-none placeholder-slate-400 h-11 sm:h-12 px-3 text-sm"
                  placeholder="Chức danh, từ khóa..."
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                />
              </div>

              {/* Structured Location Selector */}
              <div className="min-w-0 sm:flex-[1.35] relative" ref={locationRef}>
                <div
                  onClick={() => setShowLocationCard(!showLocationCard)}
                  className="w-full bg-slate-50 rounded-xl px-3 border border-slate-200/40 hover:border-slate-300 transition-all h-11 sm:h-12 flex items-center justify-between cursor-pointer select-none"
                  title={selectedLabel}
                >
                  <div className="min-w-0 flex items-center gap-2 overflow-hidden mr-2">
                    <span className="material-symbols-outlined text-slate-400 !text-xl flex-shrink-0">location_on</span>
                    <span className={`text-sm truncate ${selectedLabel ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                      {displayLocationLabel || "Chọn khu vực..."}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 !text-xl transition-transform duration-200" style={{ transform: showLocationCard ? 'rotate(180deg)' : 'rotate(0)' }}>
                    keyboard_arrow_down
                  </span>
                </div>

                {showLocationCard && (
                  <div className="absolute top-[calc(100%+8px)] left-0 sm:left-auto sm:right-0 z-50 w-full sm:w-[400px] bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-5">
                    <div className="text-center font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 text-sm uppercase tracking-wider flex items-center justify-center gap-2">
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

                      <div className="pt-1.5 flex gap-2">
                        <button
                          type="button"
                          onClick={handleClearLocation}
                          className="flex-1 h-10 border border-slate-200 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors"
                        >
                          Xóa
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyLocation}
                          className="flex-1 h-10 bg-gradient-to-r from-primary to-primary-dk text-white rounded-xl font-bold text-xs hover:shadow-lg hover:shadow-primary/20 transition-all"
                        >
                          Áp dụng
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button type="submit" className="shrink-0 h-11 sm:h-12 px-6 sm:px-7 bg-gradient-to-r from-primary to-primary-dk text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all whitespace-nowrap flex items-center justify-center gap-2">
                <span className="material-symbols-outlined !text-xl">search</span> Tìm kiếm
              </button>
            </form>

            {/* Trust */}
            <div className="anim-fadeUp-d4 mt-5 sm:mt-6 flex flex-wrap items-center gap-4 sm:gap-5 text-xs sm:text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined filled !text-[17px] text-amber-400">star</span>Đánh giá 4.8 / 5</span>
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined !text-[17px] text-green-500">verified</span>Nhà tuyển dụng đã xác minh</span>
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined !text-[17px] text-primary">bolt</span>Ứng tuyển nhanh</span>
            </div>

            <OnlineVisitorsCard />
          </div>

          {/* Right — floating cards */}
          <div className="hidden lg:flex justify-center relative w-[460px] xl:w-[540px] 2xl:w-[580px] min-h-[430px]">
            <div className="absolute w-[360px] xl:w-[420px] h-[360px] xl:h-[420px] rounded-full bg-gradient-to-br from-primary/8 to-accent/8 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            {/* Card A */}
            <div className="anim-float absolute top-2 left-0 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 w-[280px] xl:w-[300px]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white font-bold text-sm shadow-md">SB</div>
                <div>
                  <div className="text-sm font-bold">Nhân viên pha chế</div>
                  <div className="text-xs text-slate-400">Highland Coffee &bull; TP.HCM</div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="bg-green-50 text-green-600 text-[11px] font-bold px-2.5 py-1 rounded-lg">35.000đ/giờ</span>
                <span className="bg-slate-100 text-slate-500 text-[11px] font-semibold px-2.5 py-1 rounded-lg">Bán thời gian</span>
              </div>
            </div>
            {/* Card B */}
            <div className="anim-float-d absolute bottom-6 right-0 bg-white rounded-2xl shadow-xl border border-slate-100 p-5 w-[270px] xl:w-[290px]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">FD</div>
                <div>
                  <div className="text-sm font-bold">Tài xế giao hàng</div>
                  <div className="text-xs text-slate-400">GrabExpress &bull; TP.HCM</div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="bg-green-50 text-green-600 text-[11px] font-bold px-2.5 py-1 rounded-lg">100k/giờ</span>
                <span className="bg-blue-50 text-blue-600 text-[11px] font-bold px-2.5 py-1 rounded-lg">Cuối tuần</span>
              </div>
            </div>
            {/* Card C — mini notification */}
            <div className="anim-float absolute top-1/2 right-[-10px] xl:right-0 -translate-y-1/2 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500 !text-xl">check_circle</span>
              </div>
              <div>
                <div className="text-sm font-bold">Đã gửi đơn ứng tuyển!</div>
                <div className="text-xs text-slate-400">Vừa xong</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OnlineVisitorsCard() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 4;

  useEffect(() => {
    let cancelled = false;
    const visitorId = getVisitorId();

    const sendHeartbeat = async () => {
      try {
        const res = await api.post('/home/presence', { visitorId, page, pageSize });
        if (cancelled) return;

        const nextTotalPages = Math.max(1, Number(res.data?.totalPages) || 1);
        setOnlineUsers(Array.isArray(res.data?.users) ? res.data.users : []);
        setTotalPages(nextTotalPages);
        setPage(Math.min(Number(res.data?.page) || page, nextTotalPages));
      } catch {
        if (!cancelled) setOnlineUsers([]);
      }
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 25000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [page]);

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;
  const visiblePageStart = Math.min(Math.max(1, page - 2), Math.max(1, totalPages - 4));
  const visiblePages = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, index) => visiblePageStart + index
  );

  return (
    <div className="anim-fadeUp-d4 relative mt-5 max-w-[430px] overflow-hidden rounded-2xl border border-emerald-100/80 bg-white/90 p-3 shadow-lg shadow-emerald-100/60 backdrop-blur">
      <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-emerald-300/30 blur-2xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-14 left-8 h-28 w-28 rounded-full bg-sky-300/20 blur-2xl animate-pulse" />

      <div className="relative z-10">
        <div className="grid gap-2">
          {onlineUsers.length > 0 ? onlineUsers.map((user) => {
            const avatarUrl = toAbsoluteAssetUrl(user.avatarUrl);
            const isEmployer = user.roleName === 'Employer';

            return (
              <div key={user.userId} className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white/85 px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-100 hover:shadow-md hover:shadow-emerald-100/70">
                <div className="relative h-9 w-9 shrink-0 rounded-full">
                  <span className="absolute inset-0 rounded-full bg-emerald-300/30 opacity-0 blur-md transition group-hover:opacity-100" />
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user.fullName} className="relative h-9 w-9 rounded-full object-cover ring-1 ring-slate-100" />
                  ) : (
                    <div className={`relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-black text-white ${isEmployer ? 'bg-gradient-to-br from-blue-500 to-sky-500' : 'bg-gradient-to-br from-emerald-500 to-teal-500'}`}>
                      {getInitials(user.fullName)}
                    </div>
                  )}
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-70 animate-ping" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black text-slate-800">{user.fullName}</div>
                  <div className={`text-[11px] font-bold ${isEmployer ? 'text-blue-500' : 'text-emerald-500'}`}>
                    {isEmployer ? 'Doanh nghiệp' : 'Cá nhân'}
                  </div>
                </div>

                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.15)]" />
              </div>
            );
          }) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white/75 px-3 py-4 text-center text-xs font-semibold text-slate-400">
              Chưa có người dùng online.
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={!canGoPrev}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-slate-400 transition hover:border-emerald-200 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Trang trước"
            >
              <span className="material-symbols-outlined !text-[16px]">chevron_left</span>
            </button>

            <div className="flex items-center gap-1">
              {visiblePages.map((dotPage) => (
                <button
                  key={dotPage}
                  type="button"
                  onClick={() => setPage(dotPage)}
                  className={`h-1.5 rounded-full transition-all ${page === dotPage ? 'w-5 bg-emerald-500' : 'w-1.5 bg-slate-200 hover:bg-emerald-200'}`}
                  aria-label={`Trang ${dotPage}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={!canGoNext}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-slate-400 transition hover:border-emerald-200 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Trang sau"
            >
              <span className="material-symbols-outlined !text-[16px]">chevron_right</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/home/stats')
      .then(res => setStats(res.data))
      .catch(() => {}); // keep null on error → shows placeholders
  }, []);

  const formatCount = (value) => (value ?? 0).toLocaleString();

  const items = [
    { value: stats ? formatCount(stats.totalJobs) : '...', label: 'Việc đang tuyển' },
    { value: stats ? formatCount(stats.totalEmployers) : '...', label: 'Nhà tuyển dụng' },
    { value: stats ? formatCount(stats.totalApplicants) : '...', label: 'Sinh viên tham gia' },
    { value: stats ? formatCount(stats.totalApplications) : '...', label: 'Đơn ứng tuyển' },
  ];

  return (
    <section className="relative -mt-3 sm:-mt-5 z-10 w-full mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white backdrop-blur rounded-2xl shadow-xl shadow-slate-200/40 border border-[#e5e1d8]/50 grid grid-cols-2 md:grid-cols-4 divide-x divide-[#e5e1d8]/40">
        {items.map((item, i) => (
          <div key={i} className="p-4 sm:p-6 md:p-8 text-center">
            <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary anim-countPop" style={{ animationDelay: `${i * 0.12}s` }}>
              {item.value}
            </div>
            <div className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const CATEGORY_ICONS = {
  default: { icon: 'work', gradient: 'from-slate-400 to-slate-500', shadow: 'shadow-slate-200/60' },
  'food': { icon: 'restaurant', gradient: 'from-orange-400 to-rose-500', shadow: 'shadow-orange-200/60' },
  'beverage': { icon: 'local_cafe', gradient: 'from-orange-400 to-amber-500', shadow: 'shadow-orange-200/60' },
  'tutor': { icon: 'school', gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-200/60' },
  'delivery': { icon: 'local_shipping', gradient: 'from-sky-400 to-blue-600', shadow: 'shadow-sky-200/60' },
  'retail': { icon: 'storefront', gradient: 'from-emerald-400 to-teal-600', shadow: 'shadow-emerald-200/60' },
  'tech': { icon: 'code', gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-200/60' },
  'design': { icon: 'palette', gradient: 'from-pink-500 to-rose-500', shadow: 'shadow-pink-200/60' },
  'marketing': { icon: 'campaign', gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-200/60' },
  'admin': { icon: 'admin_panel_settings', gradient: 'from-gray-500 to-slate-600', shadow: 'shadow-gray-200/60' },
};

function getCategoryStyle(name) {
  if (!name) return CATEGORY_ICONS.default;
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_ICONS)) {
    if (key !== 'default' && lower.includes(key)) return val;
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

  return (
    <section className="w-full mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-20">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">Khám phá theo <span className="grad-text">Danh mục</span></h2>
          <p className="text-slate-500 mt-2 text-sm">Khám phá cơ hội trong lĩnh vực bạn yêu thích</p>
        </div>
        <a className="hidden sm:inline-flex items-center gap-1 text-primary hover:text-primary-dk font-semibold text-sm" href="/jobs">
          Xem tất cả <span className="material-symbols-outlined !text-[18px]">arrow_forward</span>
        </a>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/80 p-7 animate-pulse">
              <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 mx-auto mb-4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded mx-auto w-1/2"></div>
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 text-center text-sm text-slate-500">
          Chưa có danh mục nào.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {categories.slice(0, 8).map(cat => {
            const categoryName = cat.categoryName || cat.name;
            const style = getCategoryStyle(categoryName);
            return (
              <a
                key={cat.categoryId}
                className="card-lift flex flex-col items-center gap-3 sm:gap-4 rounded-2xl border border-[#e5e1d8]/50 bg-white p-5 sm:p-7 group"
                href={`/jobs?category=${cat.categoryId}`}
              >
                <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${style.gradient} flex items-center justify-center text-white shadow-lg ${style.shadow} group-hover:scale-110 transition-transform`}>
                  <span className="material-symbols-outlined !text-2xl sm:!text-3xl">{style.icon}</span>
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-sm sm:text-base">{translateCategory(categoryName)}</h3>
                  <p className="text-slate-400 text-sm mt-1">{cat.jobCount ?? 0} việc làm</p>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
      <div className="text-center mb-14">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">Cách Thức <span className="grad-text">Hoạt Động</span></h2>
        <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">Ba bước đơn giản đến cơ hội tiếp theo</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
        {/* Connector */}
        <div className="hidden md:block absolute top-[40px] left-[16.67%] right-[16.67%] h-[2px] bg-gradient-to-r from-primary/20 via-accent/20 to-emerald-400/20"></div>
        {[
          { num: '1', title: 'Tạo hồ sơ', desc: 'Đăng ký và xây dựng hồ sơ sinh viên của bạn chỉ trong 3 phút. Nêu bật kỹ năng và lịch rảnh.', gradient: 'from-primary to-sky-400', shadow: 'shadow-primary/20' },
          { num: '2', title: 'Khám phá việc làm', desc: 'Tìm kiếm vị trí bán thời gian phù hợp với lịch trình, địa điểm và sở thích của bạn.', gradient: 'from-accent to-purple-400', shadow: 'shadow-accent/20' },
          { num: '3', title: 'Ứng tuyển & Nhận việc', desc: 'Ứng tuyển chỉ với một cú nhấp. Nhà tuyển dụng phản hồi nhanh — phần lớn trong vòng 48 giờ.', gradient: 'from-emerald-500 to-teal-400', shadow: 'shadow-emerald-300/20' },
        ].map(step => (
          <div key={step.num} className="flex flex-col items-center text-center group">
            <div className={`relative z-10 w-[72px] h-[72px] rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white font-extrabold text-2xl shadow-lg ${step.shadow} group-hover:scale-110 transition-transform`}>{step.num}</div>
            <h3 className="text-lg font-bold mt-5 mb-2">{step.title}</h3>
            <p className="text-sm text-slate-500 max-w-[260px]">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
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
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const EMPLOYER_COLORS = [
  'from-blue-500 to-sky-400',
  'from-violet-500 to-purple-600',
  'from-orange-400 to-amber-500',
  'from-emerald-500 to-teal-400',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-600',
];

function LatestJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renderedAt] = useState(() => Date.now());

  useEffect(() => {
    api.get('/home/latest-jobs')
      .then(res => { setJobs(res.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section className="bg-white border-y border-[#e5e1d8]/50 py-12 sm:py-20">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-9">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">Việc Làm <span className="grad-text">Mới Nhất</span></h2>
            <p className="text-slate-500 mt-2 text-sm">Cơ hội mới nhất được đăng hôm nay</p>
          </div>
          <a className="hidden sm:inline-flex items-center gap-1 text-primary font-semibold text-sm" href="/jobs">
            Xem tất cả <span className="material-symbols-outlined !text-[18px]">arrow_forward</span>
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 p-6 animate-pulse">
                <div className="flex justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700"></div>
                  <div className="w-16 h-6 rounded-lg bg-slate-100 dark:bg-slate-700"></div>
                </div>
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded w-1/2 mb-4"></div>
                <div className="flex gap-2 mb-6">
                  <div className="h-7 bg-slate-100 dark:bg-slate-700/50 rounded-lg w-24"></div>
                  <div className="h-7 bg-slate-100 dark:bg-slate-700/50 rounded-lg w-24"></div>
                </div>
                <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
                  <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded w-24"></div>
                  <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded-xl w-24"></div>
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <span className="material-symbols-outlined !text-5xl mb-3 block">work_off</span>
            <p>Chưa có việc làm nào. Hãy quay lại sau!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {jobs.map((job, idx) => {
              const initials = getInitials(job.companyName);
              const colorClass = EMPLOYER_COLORS[idx % EMPLOYER_COLORS.length];
              const isNew = job.createdAt && (renderedAt - new Date(job.createdAt)) < 24 * 3600 * 1000;

              const cardClass = job.isFeatured
                ? "card-lift bg-gradient-to-br from-sky-50/60 via-white to-blue-50/40 border-blue-200 dark:border-blue-500/40 shadow-md shadow-blue-500/10 relative overflow-hidden rounded-2xl p-5 sm:p-6 flex flex-col"
                : "card-lift bg-white rounded-2xl border border-[#e5e1d8]/50 p-5 sm:p-6 flex flex-col";

              const logoStyle = job.isFeatured
                ? "w-12 h-12 rounded-xl object-cover border-2 border-blue-400 shadow-sm shadow-blue-400/20"
                : "w-12 h-12 rounded-xl object-cover border border-slate-100";

              const initialsContainerClass = job.isFeatured
                ? "w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20"
                : `w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold shadow-md`;

              const applyButtonClass = job.isFeatured
                ? "inline-flex items-center gap-1 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all border border-blue-400/25"
                : "inline-flex items-center gap-1 text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all";

              return (
                <div key={job.jobPostId} className={cardClass}>
                  {job.isFeatured && (
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-400"></div>
                  )}

                  <div className="flex justify-between items-start mb-4">
                    {job.companyLogoUrl ? (
                      <img src={job.companyLogoUrl} alt={job.companyName} className={logoStyle} />
                    ) : (
                      <div className={initialsContainerClass}>
                        {initials}
                      </div>
                    )}
                    {job.isFeatured ? (
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-extrabold px-3 py-1 rounded-lg flex items-center gap-1 uppercase tracking-wider select-none">
                        🔥 Việc Hot
                      </span>
                    ) : isNew ? (
                      <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Mới
                      </span>
                    ) : job.jobType === 'Remote' ? (
                      <span className="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 text-[11px] font-bold px-2.5 py-1 rounded-lg">Từ xa</span>
                    ) : null}
                  </div>

                  <h3 className="text-lg font-bold mb-1 flex items-center gap-1.5">
                    {job.title}
                  </h3>
                  <p className="text-slate-500 text-sm mb-4">{job.companyName} &bull; {job.location || 'Việt Nam'}</p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined !text-[14px] text-slate-400">schedule</span>
                      {job.jobType}
                    </span>
                    {job.payRate && (
                      <span className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                        <span className="material-symbols-outlined !text-[14px] text-green-500">payments</span>
                        {job.payRate.toLocaleString()} {translatePayUnit(job.payUnit)}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-4 border-t border-[#e5e1d8]/40 flex items-center justify-between">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <span className="material-symbols-outlined !text-[14px]">schedule</span>
                      {timeAgo(job.createdAt, renderedAt)}
                    </span>
                    <a
                      href={`/jobs/${job.jobPostId}`}
                      className={applyButtonClass}
                    >
                      Ứng tuyển <span className="material-symbols-outlined !text-[16px]">arrow_forward</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <a href="/jobs" className="inline-flex items-center gap-2 bg-white text-slate-700 border border-[#e5e1d8]/60 hover:border-primary hover:text-primary font-semibold py-3 px-8 rounded-xl transition-all shadow-sm hover:shadow-md">
            <span className="material-symbols-outlined !text-xl">grid_view</span> Xem tất cả việc làm
          </a>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
      <div className="text-center mb-14">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">Sinh Viên <span className="grad-text">Nói Gì</span></h2>
        <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">Tham gia cùng hàng nghìn sinh viên đã tìm được việc bán thời gian lý tưởng</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { initials: 'AT', name: 'Trần Văn An', role: 'Sinh viên CNTT • ĐH Bách Khoa', gradient: 'from-pink-400 to-rose-500', stars: 5, text: '"Tìm được công việc gia sư hoàn hảo phù hợp lịch học. Nộp đơn thứ Hai, được nhận việc thứ Tư!"' },
          { initials: 'ML', name: 'Lê Văn Minh', role: 'Marketing • ĐH Kinh tế Quốc dân', gradient: 'from-sky-400 to-blue-600', stars: 5, text: '"Chất lượng nhà tuyển dụng ở đây tốt hơn nhiều so với các nền tảng khác. Tôi đã làm ở một quán cà phê tuyệt vời 3 tháng — tìm được ở đây."' },
          { initials: 'TH', name: 'Phạm Thanh Hà', role: 'Thiết kế • RMIT', gradient: 'from-emerald-400 to-teal-500', stars: 4, text: '"Yêu thích tính năng ứng tuyển nhanh! Ứng tuyển 5 vị trí trong một buổi tối và có 3 buổi phỏng vấn vào cuối tuần."' },
        ].map((t, i) => (
          <div key={i} className="quote-card relative card-lift bg-white rounded-2xl border border-[#e5e1d8]/50 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-sm`}>{t.initials}</div>
              <div>
                <div className="font-bold text-sm">{t.name}</div>
                <div className="text-xs text-slate-400">{t.role}</div>
              </div>
            </div>
            <div className="flex gap-0.5 mb-3">
              {[...Array(5)].map((_, s) => (
                <span key={s} className={`material-symbols-outlined ${s < t.stars ? 'filled' : ''} !text-[16px] text-amber-400`}>star</span>
              ))}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{t.text}</p>
          </div>
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
    <section className="w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-20">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-10 md:p-16">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/15 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-lg text-center md:text-left">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight">Sẵn sàng tìm cơ hội tiếp theo?</h2>
            <p className="text-slate-300 mt-3 text-sm sm:text-base leading-relaxed">Tham gia cùng hàng nghìn sinh viên đang vừa học vừa làm. Tạo tài khoản miễn phí và bắt đầu ứng tuyển ngay hôm nay.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={getStartedHref} className="inline-flex items-center justify-center h-12 px-8 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-sky-400 hover:shadow-xl hover:shadow-primary/30 transition-all anim-pulse-glow">
              Bắt đầu miễn phí <span className="material-symbols-outlined !text-xl ml-2">arrow_forward</span>
            </a>
            <a href="/jobs" className="inline-flex items-center justify-center h-12 px-8 rounded-xl text-sm font-semibold text-slate-200 border border-slate-600 hover:border-slate-400 hover:text-white transition-colors">
              Tìm việc
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
