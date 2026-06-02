import React, { useState, useEffect, useRef } from 'react';
import GoongAddressPicker from '../shared/GoongAddressPicker';
import { parseStoredGoongAddress } from '../../services/goongAddressService';

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

export default function HeroSearch({ onSearch, totalJobs, initialKeyword = '', initialLocation = '' }) {
  const [keyword, setKeyword] = React.useState(initialKeyword);
  const [showLocationCard, setShowLocationCard] = useState(false);
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [address, setAddress] = useState('');
  const [selectedLabel, setSelectedLabel] = useState(initialLocation);
  const locationRef = useRef(null);
  const displayLocationLabel = compactLocationLabel(selectedLabel);

  // Helper to parse location string into province, district, address
  const parseLocationString = (locStr) => {
    if (!locStr) return { province: '', district: '', ward: '', address: '', label: '' };
    const parsed = parseStoredGoongAddress(locStr);

    return {
      province: parsed.city || parsed.province || '',
      district: parsed.district || '',
      ward: parsed.ward || '',
      address: parsed.address || locStr,
      label: locStr
    };
  };

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

  // Sync initialKeyword and initialLocation when they change (e.g. on URL navigation)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKeyword(initialKeyword || '');
  }, [initialKeyword]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedLabel(initialLocation || '');
    if (initialLocation) {
      const parsed = parseLocationString(initialLocation);
      setProvince(parsed.province);
      setDistrict(parsed.district);
      setWard(parsed.ward);
      setAddress(parsed.address);
    } else {
      setProvince('');
      setDistrict('');
      setWard('');
      setAddress('');
    }
  }, [initialLocation]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setShowLocationCard(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchClick = () => {
    // Automatically apply whatever is currently in the popover states before calling search
    let parts = [];
    if (address.trim()) parts.push(address.trim());
    if (ward) parts.push(ward);
    if (district) parts.push(district);
    if (province) parts.push(province);

    const finalLocation = parts.join(', ');
    setSelectedLabel(finalLocation);
    setShowLocationCard(false);

    onSearch(keyword, finalLocation);
  };

  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-14">
      {/* Container for blobs to prevent overflow without clipping the search popover */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-inherit">
        <div className="hero-blob w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(19,146,236,.2),transparent_70%)] -top-20 -right-10 absolute blur-[60px] rounded-full"></div>
        <div className="hero-blob w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(124,58,237,.15),transparent_70%)] -bottom-16 -left-10 absolute blur-[60px] rounded-full"></div>
      </div>
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h1 className="anim-fadeUp text-3xl lg:text-4xl font-black tracking-tight">Khám Phá <span className="grad-text">{totalJobs || '...'} Việc Làm Bán Thời Gian</span></h1>
        <p className="anim-fadeUp-d1 mt-2 text-slate-400 text-sm max-w-lg">Khám phá cơ hội linh hoạt phù hợp với lịch trình của bạn. Lọc theo danh mục, lương và khu vực.</p>

        {/* Search bar */}
        <div className="anim-fadeUp-d2 mt-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 p-2 flex flex-col sm:flex-row gap-2 max-w-3xl relative">
          <div className="min-w-0 sm:basis-[230px] sm:flex-[1.05] flex items-center bg-white/10 rounded-xl px-3 border border-transparent focus-within:border-white/20 transition-all">
            <span className="material-symbols-outlined text-slate-300 !text-xl">search</span>
            <input
              className="min-w-0 w-full bg-transparent border-none focus:ring-0 placeholder-slate-400 text-white h-12 px-3 text-sm focus:outline-none"
              placeholder="Chức danh, từ khóa..."
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchClick()}
            />
          </div>

          {/* Structured Location Dropdown */}
          <div className="min-w-0 sm:flex-[1.35] relative" ref={locationRef}>
            <div
              onClick={() => setShowLocationCard(!showLocationCard)}
              className="w-full bg-white/10 hover:bg-white/15 rounded-xl px-3 border border-transparent transition-all h-12 flex items-center justify-between cursor-pointer select-none"
              title={selectedLabel}
            >
              <div className="min-w-0 flex items-center gap-2 overflow-hidden mr-2">
                <span className="material-symbols-outlined text-slate-300 !text-xl flex-shrink-0">location_on</span>
                <span className={`text-sm truncate ${selectedLabel ? 'text-white font-semibold' : 'text-slate-400'}`}>
                  {displayLocationLabel || "Chọn khu vực..."}
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-300 !text-xl transition-transform duration-200" style={{ transform: showLocationCard ? 'rotate(180deg)' : 'rotate(0)' }}>
                keyboard_arrow_down
              </span>
            </div>

            {showLocationCard && (
              <div className="absolute top-[calc(100%+8px)] left-0 sm:left-auto sm:right-0 z-50 w-full sm:w-[400px] bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-5 text-slate-800">
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

          <button
            onClick={handleSearchClick}
            className="shrink-0 h-12 px-7 bg-gradient-to-r from-primary to-primary-dk text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-primary/30 transition-all whitespace-nowrap flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined !text-xl">search</span>Tìm kiếm
          </button>
        </div>
      </div>
    </section>
  );
}
