import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  composeGoongAddress,
  searchGoongPlaces
} from '../../services/goongAddressService';

const emptyAddress = {
  address: '',
  detailAddress: '',
  ward: '',
  district: '',
  city: ''
};

const normalizeValue = (value = {}) => ({
  ...emptyAddress,
  ...value,
  address: value.address ?? value.detailAddress ?? '',
  detailAddress: value.detailAddress ?? value.address ?? '',
  city: value.city ?? value.province ?? ''
});

export default function GoongAddressPicker({
  value,
  onChange,
  label = 'Địa chỉ',
  detailLabel = 'Địa chỉ cụ thể',
  placeholder = 'Nhập số nhà, tên đường hoặc địa điểm...',
  required = false,
  className = '',
  showAdminFields = true,
  showMapLink = true,
  compact = false,
  inputName = 'goong-address',
  onSelect
}) {
  const current = useMemo(() => normalizeValue(value), [value]);
  const currentAddress = current.address;
  const currentCity = current.city;
  const currentDistrict = current.district;
  const currentWard = current.ward;
  const searchContext = useMemo(() => ({
    address: currentAddress,
    city: currentCity,
    district: currentDistrict,
    ward: currentWard
  }), [currentAddress, currentCity, currentDistrict, currentWard]);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const [adminField, setAdminField] = useState(null);
  const [adminSuggestions, setAdminSuggestions] = useState([]);
  const [adminSearching, setAdminSearching] = useState(false);
  const wrapperRef = useRef(null);
  const searchSeqRef = useRef(0);
  const adminSearchSeqRef = useRef(0);

  const fullAddress = composeGoongAddress({
    detailAddress: currentAddress,
    ward: currentWard,
    district: currentDistrict,
    province: currentCity
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setFocused(false);
        setSuggestions([]);
        setAdminField(null);
        setAdminSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const query = currentAddress.trim();
    if (!focused || query.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return undefined;
    }

    const seq = searchSeqRef.current + 1;
    searchSeqRef.current = seq;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await searchGoongPlaces(query, searchContext);
        if (searchSeqRef.current === seq) {
          setSuggestions(result);
        }
      } catch (error) {
        console.error('Goong address search error:', error);
        if (searchSeqRef.current === seq) setSuggestions([]);
      } finally {
        if (searchSeqRef.current === seq) setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [currentAddress, focused, searchContext]);

  useEffect(() => {
    if (!adminField) {
      setAdminSuggestions([]);
      setAdminSearching(false);
      return undefined;
    }

    const adminValue = {
      city: currentCity,
      district: currentDistrict,
      ward: currentWard
    }[adminField] || '';
    const query = String(adminValue).trim();
    if (query.length < 2) {
      setAdminSuggestions([]);
      setAdminSearching(false);
      return undefined;
    }

    const seq = adminSearchSeqRef.current + 1;
    adminSearchSeqRef.current = seq;
    const timer = setTimeout(async () => {
      setAdminSearching(true);
      try {
        const result = await searchGoongPlaces(query, {
          city: adminField === 'city' ? '' : currentCity,
          district: adminField === 'ward' ? currentDistrict : '',
          ward: ''
        });
        if (adminSearchSeqRef.current === seq) {
          setAdminSuggestions(result);
        }
      } catch (error) {
        console.error('Goong admin search error:', error);
        if (adminSearchSeqRef.current === seq) setAdminSuggestions([]);
      } finally {
        if (adminSearchSeqRef.current === seq) setAdminSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [adminField, currentCity, currentDistrict, currentWard]);

  const emitChange = (next) => {
    const normalized = normalizeValue(next);
    const nextFullAddress = composeGoongAddress({
      detailAddress: normalized.address,
      ward: normalized.ward,
      district: normalized.district,
      province: normalized.city
    });
    onChange?.(normalized, { fullAddress: nextFullAddress });
  };

  const handleSelectSuggestion = (suggestion) => {
    const next = {
      address: suggestion.address || suggestion.detailAddress || current.address || '',
      detailAddress: suggestion.address || suggestion.detailAddress || current.address || '',
      ward: suggestion.ward || current.ward || '',
      district: suggestion.district || current.district || '',
      city: suggestion.city || suggestion.province || current.city || ''
    };
    emitChange(next);
    onSelect?.(next, suggestion);
    setFocused(false);
    setSuggestions([]);
  };

  const pickAdminValue = (suggestion, key) => {
    if (key === 'city') {
      return suggestion.city || suggestion.province || suggestion.mainText || suggestion.address || suggestion.description || '';
    }
    if (key === 'district') {
      return suggestion.district || suggestion.mainText || suggestion.address || suggestion.description || '';
    }
    return suggestion.ward || suggestion.mainText || suggestion.address || suggestion.description || '';
  };

  const handleAdminChange = (key, rawValue) => {
    const next = { ...current, [key]: rawValue };
    if (key === 'city') {
      next.district = '';
      next.ward = '';
    }
    if (key === 'district') {
      next.ward = '';
    }

    emitChange(next);
    setAdminField(key);
  };

  const handleSelectAdminSuggestion = (suggestion) => {
    if (!adminField) return;

    const next = {
      ...current,
      city: current.city,
      district: current.district,
      ward: current.ward
    };

    if (adminField === 'city') {
      next.city = pickAdminValue(suggestion, 'city');
      next.district = '';
      next.ward = '';
    } else if (adminField === 'district') {
      next.city = current.city || suggestion.city || suggestion.province || '';
      next.district = pickAdminValue(suggestion, 'district');
      next.ward = '';
    } else if (adminField === 'ward') {
      next.city = current.city || suggestion.city || suggestion.province || '';
      next.district = current.district || suggestion.district || '';
      next.ward = pickAdminValue(suggestion, 'ward');
    }

    emitChange(next);
    setAdminField(null);
    setAdminSuggestions([]);
  };

  const handleAddressChange = (event) => {
    const nextAddress = event.target.value;
    emitChange({
      ...current,
      address: nextAddress,
      detailAddress: nextAddress
    });
    setFocused(true);
  };

  const adminFields = [
    { key: 'city', label: 'Tỉnh / TP', value: current.city, placeholder: 'Nhập tỉnh/thành phố' },
    { key: 'district', label: 'Quận / Huyện', value: current.district, placeholder: 'Nhập quận/huyện' },
    { key: 'ward', label: 'Phường / Xã', value: current.ward, placeholder: 'Nhập phường/xã' }
  ];

  return (
    <div className={`space-y-2 ${className}`} ref={wrapperRef}>
      {label && (
        <label className="text-sm font-semibold text-slate-700">
          {label}{required ? ' *' : ''}
        </label>
      )}

      {showAdminFields && (
        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'sm:grid-cols-3'}`}>
          {adminFields.map((field) => (
            <div key={field.key} className="relative space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{field.label}</span>
              <input
                value={field.value || ''}
                placeholder={field.placeholder}
                onFocus={() => setAdminField(field.key)}
                onChange={(event) => handleAdminChange(field.key, event.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10"
              />
              {adminField === field.key && adminSearching && (
                <span className="material-symbols-outlined !text-base text-primary animate-spin absolute right-3 top-7">progress_activity</span>
              )}
              {adminField === field.key && adminSuggestions.length > 0 && (
                <ul className="scrollbar-none absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto z-50 divide-y divide-slate-100">
                  {adminSuggestions.map((suggestion, index) => (
                    <li
                      key={`${field.key}-${suggestion.placeId || suggestion.description || index}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelectAdminSuggestion(suggestion)}
                      className="px-3 py-2 hover:bg-primary/5 cursor-pointer transition-colors text-left"
                    >
                      <p className="text-xs font-bold text-slate-700 whitespace-normal break-words">
                        {pickAdminValue(suggestion, field.key)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 whitespace-normal break-words">
                        {suggestion.description}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        {detailLabel && (
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {detailLabel}
          </label>
        )}
        <input
          type="text"
          name={inputName}
          value={current.address}
          onFocus={() => setFocused(true)}
          onChange={handleAddressChange}
          required={required}
          autoComplete="off"
          className="w-full h-11 px-4 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all mt-1"
          placeholder={placeholder}
        />
        {searching && (
          <div className="absolute right-3 top-[34px]">
            <span className="material-symbols-outlined !text-lg text-primary animate-spin">progress_activity</span>
          </div>
        )}

        {focused && suggestions.length > 0 && (
          <ul className="scrollbar-none absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50 divide-y divide-slate-100">
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.placeId || suggestion.description || index}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelectSuggestion(suggestion)}
                className="px-4 py-3 hover:bg-primary/5 cursor-pointer transition-colors flex items-start gap-3 group"
              >
                <span className="material-symbols-outlined !text-lg text-slate-400 group-hover:text-primary mt-0.5 flex-shrink-0">location_on</span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-primary whitespace-normal break-words">
                    {suggestion.mainText || suggestion.address || suggestion.description}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 whitespace-normal break-words">
                    {suggestion.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {focused && !searching && current.address.trim().length >= 2 && suggestions.length === 0 && (
          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-4 text-center">
            <span className="material-symbols-outlined !text-3xl text-slate-300 mb-1 block">search_off</span>
            <p className="text-xs text-slate-400">Không tìm thấy trên Goong. Thử gõ số nhà, tên đường hoặc tên địa điểm gần đó.</p>
          </div>
        )}
      </div>

      {showAdminFields && (
        <p className="text-[11px] text-slate-400">
          Nhập tỉnh/thành, quận/huyện, phường/xã trước rồi nhập địa chỉ cụ thể để gợi ý chính xác hơn.
        </p>
      )}

      {showMapLink && fullAddress.trim() && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-blue-50/50 px-3 text-xs font-bold text-blue-600 hover:bg-blue-100 transition-colors"
          title="Xác nhận trên bản đồ"
        >
          <span className="material-symbols-outlined !text-base">map</span>
          Xem bản đồ
        </a>
      )}
    </div>
  );
}
