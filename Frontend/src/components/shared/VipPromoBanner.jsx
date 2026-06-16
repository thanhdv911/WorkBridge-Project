import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const DISMISS_MS = 24 * 60 * 60 * 1000;

const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN');

const formatDuration = (days) => {
  const value = Number(days);
  if (value === 7) return '7 ngày';
  if (value === 30) return '1 tháng';
  if (value === 365) return '1 năm';
  return `${value} ngày`;
};

const getPlanStyle = (days) => {
  const value = Number(days);
  if (value === 365) {
    return {
      border: 'border-fuchsia-300',
      text: 'text-fuchsia-600',
      iconBg: 'bg-fuchsia-600',
      price: 'bg-fuchsia-50 border-fuchsia-200',
      button: 'bg-fuchsia-600 hover:bg-fuchsia-700 shadow-fuchsia-500/20',
      icon: 'diamond'
    };
  }
  if (value === 30) {
    return {
      border: 'border-teal-300',
      text: 'text-teal-600',
      iconBg: 'bg-teal-500',
      price: 'bg-teal-50 border-teal-200',
      button: 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/20',
      icon: 'workspace_premium'
    };
  }
  return {
    border: 'border-sky-300',
    text: 'text-sky-600',
    iconBg: 'bg-sky-500',
    price: 'bg-sky-50 border-sky-200',
    button: 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/20',
    icon: 'school'
  };
};

const getPlanTag = (days) => {
  const value = Number(days);
  if (value === 365) return 'Tiết kiệm nhất';
  if (value === 30) return 'Được chọn nhiều';
  return 'Dùng thử nhanh';
};

const getPlanPerks = (days, audience) => {
  const value = Number(days);
  const applicant = {
    7: ['Mở WorkBridge AI', 'Gợi ý sửa CV nhanh', 'Thử trợ lý tìm việc'],
    30: ['AI đồng hành 1 tháng', 'Gợi ý job theo hồ sơ', 'Luyện phỏng vấn gọn'],
    365: ['Dùng AI cả năm', 'Tối ưu CV nhiều lần', 'Theo sát hành trình tìm việc']
  };
  const employer = {
    7: ['Mở công cụ VIP', 'Tin có nhãn nổi bật', 'Thử AI tuyển dụng'],
    30: ['Ưu tiên hiển thị', 'AI hỗ trợ xếp ca', 'Quản lý tuyển dụng gọn'],
    365: ['Tin tự xuất bản', 'Không cần admin duyệt', 'AI vận hành dài hạn']
  };

  const source = audience === 'Employer' ? employer : applicant;
  return source[value] || ['Mở quyền VIP', 'Ưu tiên trải nghiệm', 'Kích hoạt nhanh'];
};

const getAudienceHighlights = (audience) => (
  audience === 'Employer'
    ? ['Tăng hiển thị tin tuyển dụng', 'AI tối ưu bài đăng', 'Gói năm tự xuất bản tin']
    : ['AI gợi ý việc phù hợp', 'Sửa CV thông minh', 'Luyện phỏng vấn tự tin']
);

export default function VipPromoBanner({ disabled = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [plans, setPlans] = useState([]);
  const [audience, setAudience] = useState(null);
  const [hideFor24h, setHideFor24h] = useState(false);

  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  const upgradePath = audience === 'Employer' ? '/employer-dashboard?tab=vip' : '/profile?tab=vip';
  const dismissKey = useMemo(() => (
    audience ? `workbridge:vip-promo-dismissed-until:${audience}` : null
  ), [audience]);

  useEffect(() => {
    if (disabled || !token || !['Employer', 'Applicant'].includes(role)) return;

    const currentAudience = role === 'Employer' ? 'Employer' : 'Applicant';
    const isVipPage =
      (location.pathname === '/profile' || location.pathname === '/employer-dashboard') &&
      new URLSearchParams(location.search).get('tab') === 'vip';

    if (isVipPage) return;

    const key = `workbridge:vip-promo-dismissed-until:${currentAudience}`;
    const dismissedUntil = Number(localStorage.getItem(key) || 0);
    if (dismissedUntil > Date.now()) return;

    let cancelled = false;
    const timerId = window.setTimeout(async () => {
      try {
        const [statusRes, plansRes] = await Promise.all([
          api.get('/subscriptions/status'),
          api.get(`/subscriptions/plans?audience=${currentAudience}`)
        ]);

        if (cancelled || statusRes.data?.isVip) return;

        const nextPlans = Array.isArray(plansRes.data)
          ? plansRes.data.slice().sort((a, b) => Number(a.durationDays) - Number(b.durationDays)).slice(0, 3)
          : [];

        if (nextPlans.length === 0) return;
        setAudience(currentAudience);
        setPlans(nextPlans);
        setHideFor24h(false);
        setVisible(true);
      } catch {
        // Promo is non-critical; keep page loading quiet if subscriptions are unavailable.
      }
    }, 850);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [disabled, token, role, location.pathname, location.search]);

  const dismissFor24h = () => {
    if (dismissKey) {
      localStorage.setItem(dismissKey, String(Date.now() + DISMISS_MS));
    }
    setVisible(false);
  };

  const closeBanner = () => {
    if (hideFor24h) {
      dismissFor24h();
      return;
    }
    setVisible(false);
  };

  const goUpgrade = () => {
    setVisible(false);
    navigate(upgradePath);
  };

  if (!visible || !audience || plans.length === 0) return null;

  return (
    <div className="fixed inset-x-0 top-[86px] z-[80] flex justify-center px-4 pointer-events-none">
      <div className="vip-promo-panel pointer-events-auto max-h-[calc(100vh-112px)] w-full max-w-[1120px] overflow-y-auto rounded-2xl border border-sky-200/80 bg-gradient-to-b from-[#eaf7ff] via-[#f3fbff] to-[#eef8ff] shadow-2xl shadow-sky-950/18">
        <div className="relative overflow-hidden border-b border-sky-200/70 bg-[linear-gradient(135deg,#dff3ff_0%,#f5fbff_48%,#e9f8f4_100%)] px-5 py-4 sm:px-6">
          <div className="vip-promo-soft-grid absolute inset-0 opacity-80" />
          <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-[#0f75c2] px-3 text-[10px] font-black uppercase tracking-wide text-white shadow-sm shadow-sky-500/20">
                <span className="material-symbols-outlined !text-[14px]">auto_awesome</span>
                WorkBridge VIP
              </span>
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-800">
                {audience === 'Employer' ? 'Dành cho doanh nghiệp' : 'Dành cho cá nhân'}
              </span>
            </div>
            <h3 className="mt-2 text-lg font-black text-slate-950">
              {audience === 'Employer'
                ? 'Tăng tốc tuyển dụng với bộ quyền VIP'
                : 'Mở trợ lý AI để tìm việc, sửa CV và luyện phỏng vấn'}
            </h3>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-relaxed text-slate-700">
              {audience === 'Employer'
                ? 'Chọn gói phù hợp để tin tuyển dụng nổi bật hơn, quy trình gọn hơn và AI hỗ trợ vận hành hằng ngày.'
                : 'Một lời nhắc nhỏ để bạn thử các công cụ giúp hồ sơ sáng hơn và tìm việc chủ động hơn.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {getAudienceHighlights(audience).map(item => (
                <span key={item} className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-[11px] font-black text-slate-800 shadow-sm">
                  <span className="material-symbols-outlined !text-[14px] text-[#1687d9]">check_circle</span>
                  {item}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={closeBanner}
            title="Đóng banner"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 transition hover:border-slate-300 hover:text-slate-700"
          >
            <span className="material-symbols-outlined !text-[20px]">close</span>
          </button>
          </div>
        </div>

        <div className="grid gap-3 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(232,246,255,0.38))] p-4 sm:p-5 md:grid-cols-3">
          {plans.map(plan => {
            const style = getPlanStyle(plan.durationDays);
            const perks = getPlanPerks(plan.durationDays, audience);
            return (
              <button
                type="button"
                key={plan.subscriptionPlanId}
                onClick={goUpgrade}
                className={`group vip-card-grid relative min-h-[265px] overflow-hidden rounded-2xl border bg-white p-4 text-left transition hover:-translate-y-1 hover:shadow-xl ${style.border}`}
              >
                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg ${style.iconBg}`}>
                      <span className="material-symbols-outlined !text-[22px]">{style.icon}</span>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${style.price} ${style.text} border`}>
                      {getPlanTag(plan.durationDays)}
                    </span>
                  </div>

                  <h4 className="mt-4 line-clamp-1 text-sm font-black uppercase tracking-wide text-slate-950">
                    {plan.name}
                  </h4>
                  <div className={`mt-3 rounded-xl border px-3 py-2 ${style.price}`}>
                    <span className={`text-2xl font-black ${style.text}`}>{formatCurrency(plan.price)}</span>
                    <span className={`ml-1 text-[10px] font-black uppercase ${style.text}`}>{plan.currency || 'VND'}</span>
                    <p className={`mt-0.5 text-[10px] font-black uppercase ${style.text}`}>cho {formatDuration(plan.durationDays)}</p>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-700">
                    {plan.description || 'Mở quyền VIP WorkBridge theo loại tài khoản.'}
                  </p>

                  <div className="mt-3 grid gap-1.5">
                    {perks.map(perk => (
                      <div key={perk} className="flex items-center gap-2 text-[11px] font-bold text-slate-800">
                        <span className={`material-symbols-outlined !text-[14px] ${style.text}`}>check_circle</span>
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>

                  <div className={`mt-auto flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-black text-white shadow-lg ${style.button}`}>
                    <span className="material-symbols-outlined !text-[16px]">auto_fix_high</span>
                    Xem gói
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-200/70 bg-sky-50/75 px-5 py-3 sm:px-6">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={hideFor24h}
              onChange={(event) => setHideFor24h(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#1687d9] focus:ring-[#1687d9]"
            />
            Tạm ẩn lời mời VIP này trong 24 giờ
          </label>
          <button
            type="button"
            onClick={closeBanner}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-slate-800"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
