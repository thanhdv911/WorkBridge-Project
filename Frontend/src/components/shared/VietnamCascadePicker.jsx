import React, { useEffect, useRef, useState } from 'react';

const API = 'https://provinces.open-api.vn/api';

/**
 * VietnamCascadePicker
 * Props:
 *   value   : { province, district, ward }
 *   onChange: ({ province, district, ward }) => void
 *   className: string
 */
export default function VietnamCascadePicker({ value = {}, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0); // 0=province, 1=district, 2=ward
  const [query, setQuery] = useState('');

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  const [selProvince, setSelProvince] = useState(null); // { code, name }
  const [selDistrict, setSelDistrict] = useState(null);

  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load provinces once
  useEffect(() => {
    if (provinces.length > 0) return;
    fetch(`${API}/?depth=1`)
      .then((r) => r.json())
      .then((data) => setProvinces(data || []))
      .catch(() => {});
  }, [provinces.length]);

  const openPicker = () => {
    setStep(0);
    setQuery('');
    setOpen(true);
  };

  const handleSelectProvince = async (p) => {
    setSelProvince(p);
    setQuery('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/p/${p.code}?depth=2`);
      const data = await res.json();
      setDistricts(data.districts || []);
    } catch {
      setDistricts([]);
    } finally {
      setLoading(false);
    }
    setStep(1);
  };

  const handleSelectDistrict = async (d) => {
    setSelDistrict(d);
    setQuery('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/d/${d.code}?depth=2`);
      const data = await res.json();
      setWards(data.wards || []);
    } catch {
      setWards([]);
    } finally {
      setLoading(false);
    }
    setStep(2);
  };

  const handleSelectWard = (w) => {
    onChange?.({
      province: selProvince?.name || '',
      district: selDistrict?.name || '',
      ward: w.name || ''
    });
    setOpen(false);
    setQuery('');
  };

  const handleBack = () => {
    setQuery('');
    setStep((s) => Math.max(0, s - 1));
  };

  const filterList = (list) => {
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((item) => item.name?.toLowerCase().includes(q));
  };

  const stepLabels = ['Chọn Tỉnh / Thành phố', 'Chọn Quận / Huyện', 'Chọn Phường / Xã'];
  const stepLists = [provinces, districts, wards];
  const stepHandlers = [handleSelectProvince, handleSelectDistrict, handleSelectWard];

  const displayText = [value.province, value.district, value.ward]
    .filter(Boolean)
    .join(' › ') || 'Chọn tỉnh / quận / phường';

  const filtered = filterList(stepLists[step]);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={openPicker}
        className="w-full flex items-center justify-between gap-2 h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-left transition-all hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none"
      >
        <span className={value.province ? 'text-slate-700 font-semibold' : 'text-slate-800'}>
          {displayText}
        </span>
        <span className="material-symbols-outlined !text-lg text-slate-800 flex-shrink-0">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-slate-100">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined !text-lg">arrow_back</span>
              </button>
            )}
            <div className="relative flex-1">
              <span className="material-symbols-outlined !text-base text-slate-800 absolute left-2.5 top-1/2 -translate-y-1/2">
                search
              </span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={stepLabels[step]}
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>

          {/* Breadcrumb */}
          {step > 0 && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-sky-50/60 border-b border-sky-100 text-[11px] font-bold text-primary">
              {selProvince?.name}
              {step > 1 && (
                <>
                  <span className="material-symbols-outlined !text-[11px]">chevron_right</span>
                  {selDistrict?.name}
                </>
              )}
            </div>
          )}

          {/* List */}
          <ul className="max-h-60 overflow-y-auto scrollbar-none divide-y divide-slate-50">
            {loading ? (
              <li className="py-8 flex justify-center">
                <span className="material-symbols-outlined !text-2xl text-primary animate-spin">
                  progress_activity
                </span>
              </li>
            ) : filtered.length === 0 ? (
              <li className="py-6 text-center text-sm text-slate-800">
                Không tìm thấy kết quả
              </li>
            ) : (
              filtered.map((item) => {
                const isSelected =
                  (step === 0 && item.name === value.province) ||
                  (step === 1 && item.name === value.district) ||
                  (step === 2 && item.name === value.ward);

                return (
                  <li key={item.code}>
                    <button
                      type="button"
                      onClick={() => stepHandlers[step](item)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors hover:bg-primary/5 ${
                        isSelected ? 'bg-sky-50 text-primary font-bold' : 'text-slate-700 font-medium'
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className="material-symbols-outlined !text-base flex-shrink-0">
                        {isSelected ? 'check_circle' : step < 2 ? 'chevron_right' : ''}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
