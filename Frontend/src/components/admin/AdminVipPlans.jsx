import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const emptyForm = {
  audience: 'Applicant',
  code: '',
  name: '',
  description: '',
  durationDays: 30,
  price: 49000,
  currency: 'VND',
  isActive: true,
  sortOrder: 10
};

const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN');
const durationLabel = (days) => Number(days) === 7 ? '7 ngày' : Number(days) === 30 ? '1 tháng' : '1 năm';

export default function AdminVipPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audienceFilter, setAudienceFilter] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const visiblePlans = useMemo(() => (
    audienceFilter === 'All' ? plans : plans.filter(plan => plan.audience === audienceFilter)
  ), [plans, audienceFilter]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await api.get('/subscriptions/admin/plans');
      setPlans(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching VIP plans:', error);
      toast.error('Không thể tải danh sách gói VIP.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (plan) => {
    setEditingId(plan.subscriptionPlanId);
    setForm({
      audience: plan.audience,
      code: plan.code,
      name: plan.name,
      description: plan.description || '',
      durationDays: plan.durationDays,
      price: plan.price,
      currency: plan.currency || 'VND',
      isActive: Boolean(plan.isActive),
      sortOrder: plan.sortOrder || 0
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        durationDays: Number(form.durationDays),
        price: Number(form.price),
        sortOrder: Number(form.sortOrder)
      };

      if (editingId) {
        await api.put(`/subscriptions/admin/plans/${editingId}`, payload);
        toast.success('Đã cập nhật gói VIP.');
      } else {
        await api.post('/subscriptions/admin/plans', payload);
        toast.success('Đã tạo gói VIP mới.');
      }

      startCreate();
      await fetchPlans();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể lưu gói VIP.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#1687d9]">VIP Pricing</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">Quản lý gói VIP</h2>
            <p className="mt-1 text-sm text-slate-500">Tạo và chỉnh giá gói cá nhân/doanh nghiệp. Hệ thống chỉ cho phép 7 ngày, 1 tháng và 1 năm.</p>
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1687d9] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#0f75c2]"
          >
            <span className="material-symbols-outlined !text-lg">add</span>
            Tạo gói mới
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-black text-slate-800">Danh sách gói</h3>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {['All', 'Applicant', 'Employer'].map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAudienceFilter(item)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                    audienceFilter === item ? 'bg-white text-[#1687d9] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {item === 'All' ? 'Tất cả' : item === 'Applicant' ? 'Cá nhân' : 'Doanh nghiệp'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm font-bold text-slate-400">Đang tải...</div>
          ) : visiblePlans.length === 0 ? (
            <div className="p-10 text-center text-sm font-bold text-slate-400">Chưa có gói nào.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visiblePlans.map(plan => (
                <div key={plan.subscriptionPlanId} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                        plan.audience === 'Applicant' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {plan.audience === 'Applicant' ? 'Cá nhân' : 'Doanh nghiệp'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500">{durationLabel(plan.durationDays)}</span>
                      {!plan.isActive && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase text-rose-600">Tắt</span>}
                    </div>
                    <h4 className="mt-2 truncate text-base font-black text-slate-900">{plan.name}</h4>
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500">{plan.description || 'Không có mô tả'}</p>
                    <p className="mt-2 text-[11px] font-bold text-slate-400">Code: {plan.code}</p>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900">{formatCurrency(plan.price)}</p>
                      <p className="text-[11px] font-bold text-slate-400">{plan.currency || 'VND'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(plan)}
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:text-[#1687d9]"
                    >
                      <span className="material-symbols-outlined !text-base">edit</span>
                      Sửa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-slate-900">{editingId ? 'Chỉnh gói VIP' : 'Tạo gói VIP'}</h3>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase text-slate-400">Loại tài khoản</span>
              <select value={form.audience} onChange={(event) => handleChange('audience', event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[#1687d9]">
                <option value="Applicant">Cá nhân</option>
                <option value="Employer">Doanh nghiệp</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase text-slate-400">Thời hạn</span>
              <select value={form.durationDays} onChange={(event) => handleChange('durationDays', Number(event.target.value))} className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[#1687d9]">
                <option value={7}>7 ngày</option>
                <option value={30}>1 tháng</option>
                <option value={365}>1 năm</option>
              </select>
            </label>

            {[
              ['name', 'Tên gói', 'VIP Cá nhân 1 tháng'],
              ['code', 'Mã gói', 'applicant_30d'],
              ['price', 'Giá', '49000'],
              ['sortOrder', 'Thứ tự', '10']
            ].map(([field, label, placeholder]) => (
              <label key={field} className="block">
                <span className="text-xs font-black uppercase text-slate-400">{label}</span>
                <input
                  type={field === 'price' || field === 'sortOrder' ? 'number' : 'text'}
                  min={field === 'price' ? '1000' : undefined}
                  step={field === 'price' ? '1000' : undefined}
                  value={form[field]}
                  onChange={(event) => handleChange(field, event.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 outline-none focus:border-[#1687d9]"
                  placeholder={placeholder}
                />
              </label>
            ))}

            <label className="block">
              <span className="text-xs font-black uppercase text-slate-400">Mô tả</span>
              <textarea value={form.description} onChange={(event) => handleChange('description', event.target.value)} rows={3} className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#1687d9]" />
            </label>

            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(event) => handleChange('isActive', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#1687d9]" />
              Đang bán
            </label>
          </div>

          <button type="submit" disabled={saving} className="mt-5 flex h-11 w-full items-center justify-center rounded-xl bg-[#1687d9] text-sm font-black text-white shadow-sm transition hover:bg-[#0f75c2] disabled:opacity-60">
            {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo gói'}
          </button>
        </form>
      </div>
    </div>
  );
}
