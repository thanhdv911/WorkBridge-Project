import React, { useState, useEffect, useRef } from 'react';
import GoongAddressPicker from '../shared/GoongAddressPicker';
import { parseStoredGoongAddress } from '../../services/goongAddressService';

const compactLocationLabel = (label = '') => {
  const parts = String(label || '').split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 2) return label;

  const clean = (value) => value
    .replace(/^(Thành phố|Tỉnh|Quận|Huyện|Thị xã|Phường|Xã)\s+/i, '')
    .trim();

  const province = clean(parts[parts.length - 1] || '');
  const district = clean(parts[parts.length - 2] || '');
  return [district, province].filter(Boolean).join(', ') || label;
};

export default function HeroSearch({ onSearch, totalJobs, initialKeyword = '', initialLocation = '' }) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [showLocationCard, setShowLocationCard] = useState(false);
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [address, setAddress] = useState('');
  const [selectedLabel, setSelectedLabel] = useState(initialLocation);
  const locationRef = useRef(null);
  const displayLocationLabel = compactLocationLabel(selectedLabel);
  const totalJobsLabel = totalJobs ?? '...';

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
    const parts = [];
    if (address.trim()) parts.push(address.trim());
    if (ward) parts.push(ward);
    if (district) parts.push(district);
    if (province) parts.push(province);

    setSelectedLabel(parts.join(', '));
    setShowLocationCard(false);
  };

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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchClick = () => {
    const parts = [];
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
    <section className="jobs-hero">
      <div className="jobs-hero-field" aria-hidden="true" />

      <div className="jobs-hero-inner">
        <div className="jobs-hero-copy">
          <div className="jobs-hero-eyebrow">
            <span className="material-symbols-outlined !text-[17px]">travel_explore</span>
            Tìm việc theo ca, khu vực và lương
          </div>

          <h1 className="jobs-hero-title">
            Khám phá <span>{totalJobsLabel}</span>
            <br />
            việc làm <br className="jobs-hero-mobile-break" />bán thời gian
          </h1>

          <p className="jobs-hero-subtitle">
            Lọc nhanh các cơ hội linh hoạt, xem mức lương rõ ràng và ứng tuyển ngay khi thấy ca phù hợp.
          </p>
        </div>

        <div className="jobs-hero-stats" aria-label="Tóm tắt tìm việc">
          <span className="material-symbols-outlined">bolt</span>
          <div>
            <strong>Ứng tuyển nhanh</strong>
            <small>Hồ sơ, vị trí và khu vực nằm trong một luồng.</small>
          </div>
        </div>

        <div className="jobs-search-panel anim-fadeUp-d2">
          <div className="jobs-search-field">
            <span className="material-symbols-outlined">search</span>
            <input
              placeholder="Chức danh, từ khóa..."
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
            />
          </div>

          <div className="jobs-location-wrap" ref={locationRef}>
            <button
              type="button"
              onClick={() => setShowLocationCard((current) => !current)}
              className="jobs-location-trigger"
              title={selectedLabel}
            >
              <span className="material-symbols-outlined">location_on</span>
              <span className={selectedLabel ? 'is-selected' : ''}>
                {displayLocationLabel || 'Chọn khu vực...'}
              </span>
              <span
                className="material-symbols-outlined jobs-location-chevron"
                style={{ transform: showLocationCard ? 'rotate(180deg)' : 'rotate(0)' }}
              >
                keyboard_arrow_down
              </span>
            </button>

            {showLocationCard && (
              <div className="jobs-location-popover">
                <div className="jobs-location-title">
                  <span className="material-symbols-outlined">explore</span>
                  Khu vực tìm kiếm
                </div>

                <div className="jobs-location-body">
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

                  <div className="jobs-location-actions">
                    <button type="button" onClick={handleClearLocation}>
                      Xóa
                    </button>
                    <button type="button" onClick={handleApplyLocation}>
                      Áp dụng
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button type="button" onClick={handleSearchClick} className="jobs-search-button">
            <span className="material-symbols-outlined !text-xl">search</span>
            Tìm kiếm
          </button>
        </div>
      </div>
    </section>
  );
}
