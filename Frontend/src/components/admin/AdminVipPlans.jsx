import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Pagination from '../shared/Pagination';

const TRANSACTIONS_PER_PAGE = 10;

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

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const transactionStatusLabel = (status) => {
  if (status === 'Active') return 'Thành công';
  if (status === 'Pending') return 'Đang chờ';
  if (status === 'Cancelled' || status === 'Expired') return 'Đã hủy';
  return status || '--';
};

const transactionStatusClass = (status) => {
  if (status === 'Active') return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (status === 'Pending') return 'bg-amber-50 text-amber-700 ring-amber-100';
  if (status === 'Cancelled' || status === 'Expired') return 'bg-rose-50 text-rose-700 ring-rose-100';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
};

const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN');
const durationLabel = (days) => Number(days) === 7 ? '7 ngày' : Number(days) === 30 ? '1 tháng' : '1 năm';
const audienceLabel = (audience) => audience === 'Applicant' ? 'Cá nhân' : 'Doanh nghiệp';

export default function AdminVipPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audienceFilter, setAudienceFilter] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [transactionData, setTransactionData] = useState({ summary: null, transactions: [], totalItems: 0, page: 1, totalPages: 1 });
  const [transactionLoading, setTransactionLoading] = useState(true);
  const [transactionAudience, setTransactionAudience] = useState('All');
  const [transactionStatus, setTransactionStatus] = useState('All');
  const [transactionPage, setTransactionPage] = useState(1);

  const visiblePlans = useMemo(() => (
    audienceFilter === 'All' ? plans : plans.filter((plan) => plan.audience === audienceFilter)
  ), [plans, audienceFilter]);

  const summary = useMemo(() => ({
    total: plans.length,
    active: plans.filter((plan) => plan.isActive).length,
    applicant: plans.filter((plan) => plan.audience === 'Applicant').length,
    employer: plans.filter((plan) => plan.audience === 'Employer').length
  }), [plans]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await api.get('/subscriptions/admin/plans');
      setPlans(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching VIP plans:', error);
      toast.error('Không thể tải danh sách gói VIP');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = useCallback(async () => {
    setTransactionLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(transactionPage),
        pageSize: String(TRANSACTIONS_PER_PAGE)
      });
      if (transactionAudience !== 'All') params.set('audience', transactionAudience);
      if (transactionStatus !== 'All') params.set('status', transactionStatus);

      const response = await api.get(`/subscriptions/admin/transactions?${params.toString()}`);
      setTransactionData({
        summary: response.data?.summary || null,
        transactions: Array.isArray(response.data?.transactions) ? response.data.transactions : [],
        totalItems: response.data?.totalItems || 0,
        page: response.data?.page || transactionPage,
        totalPages: response.data?.totalPages || 1
      });
    } catch (error) {
      console.error('Error fetching VIP transactions:', error);
      toast.error('Không thể tải lịch sử giao dịch VIP');
    } finally {
      setTransactionLoading(false);
    }
  }, [transactionAudience, transactionPage, transactionStatus]);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    setTransactionPage(1);
  }, [transactionAudience, transactionStatus]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

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
        toast.success('Đã cập nhật gói VIP');
      } else {
        await api.post('/subscriptions/admin/plans', payload);
        toast.success('Đã tạo gói VIP mới');
      }

      startCreate();
      await fetchPlans();
      await fetchTransactions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể lưu gói VIP');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 anim-fadeUp">
      <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950">Quản lý gói VIP</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Tạo và chỉnh giá gói cá nhân/doanh nghiệp. Hệ thống hỗ trợ 7 ngày, 1 tháng và 1 năm.
            </p>
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary-dk active:translate-y-0"
          >
            <span className="material-symbols-outlined !text-[20px]">add</span>
            Tạo gói mới
          </button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Tổng gói', summary.total, 'workspace_premium', 'bg-slate-950 text-white'],
          ['Đang bán', summary.active, 'toggle_on', 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'],
          ['Cá nhân', summary.applicant, 'person', 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'],
          ['Doanh nghiệp', summary.employer, 'business', 'bg-amber-50 text-amber-700 ring-1 ring-amber-100']
        ].map(([label, value, icon, tone]) => (
          <div key={label} className="flex items-center justify-between rounded-[22px] border border-white/80 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs font-black text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">{value}</p>
            </div>
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
              <span className="material-symbols-outlined !text-[22px]">{icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Danh sách gói</h3>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">Chọn một gói để chỉnh nội dung và giá.</p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {['All', 'Applicant', 'Employer'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAudienceFilter(item)}
                  className={`h-9 rounded-lg px-3 text-xs font-black transition ${
                    audienceFilter === item ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item === 'All' ? 'Tất cả' : audienceLabel(item)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : visiblePlans.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="material-symbols-outlined !text-[42px] text-slate-300">workspace_premium</span>
              <p className="mt-3 text-sm font-black text-slate-700">Chưa có gói phù hợp</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Tạo gói mới hoặc đổi bộ lọc.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visiblePlans.map((plan) => (
                <article key={plan.subscriptionPlanId} className="grid gap-4 p-5 transition-colors hover:bg-slate-50/70 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black ring-1 ${
                        plan.audience === 'Applicant'
                          ? 'bg-sky-50 text-sky-700 ring-sky-100'
                          : 'bg-amber-50 text-amber-700 ring-amber-100'
                      }`}>
                        {audienceLabel(plan.audience)}
                      </span>
                      <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                        {durationLabel(plan.durationDays)}
                      </span>
                      <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black ring-1 ${
                        plan.isActive
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                          : 'bg-rose-50 text-rose-700 ring-rose-100'
                      }`}>
                        {plan.isActive ? 'Đang bán' : 'Tạm tắt'}
                      </span>
                    </div>
                    <h4 className="mt-3 truncate text-base font-black text-slate-950">{plan.name}</h4>
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500">
                      {plan.description || 'Không có mô tả'}
                    </p>
                    <p className="mt-2 text-[11px] font-bold text-slate-400">Mã gói: {plan.code}</p>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <div className="text-right">
                      <p className="text-xl font-black tabular-nums text-slate-950">{formatCurrency(plan.price)}</p>
                      <p className="text-[11px] font-bold text-slate-400">{plan.currency || 'VND'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(plan)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:border-primary/30 hover:text-primary"
                    >
                      <span className="material-symbols-outlined !text-[17px]">edit</span>
                      Sửa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="rounded-[28px] border border-white/80 bg-white p-5 shadow-sm xl:sticky xl:top-6 xl:self-start">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-primary">{editingId ? 'Đang chỉnh sửa' : 'Tạo mới'}</p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">
                {editingId ? 'Chỉnh gói VIP' : 'Tạo gói VIP'}
              </h3>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={startCreate}
                className="h-9 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-600 transition hover:bg-slate-200"
              >
                Hủy sửa
              </button>
            )}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-black text-slate-500">Loại tài khoản</span>
              <select
                value={form.audience}
                onChange={(event) => handleChange('audience', event.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
              >
                <option value="Applicant">Cá nhân</option>
                <option value="Employer">Doanh nghiệp</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black text-slate-500">Thời hạn</span>
              <select
                value={form.durationDays}
                onChange={(event) => handleChange('durationDays', Number(event.target.value))}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
              >
                <option value={7}>7 ngày</option>
                <option value={30}>1 tháng</option>
                <option value={365}>1 năm</option>
              </select>
            </label>

            {[
              ['name', 'Tên gói', 'VIP cá nhân 1 tháng'],
              ['code', 'Mã gói', 'applicant_30d'],
              ['price', 'Giá', '49000'],
              ['sortOrder', 'Thứ tự hiển thị', '10']
            ].map(([field, label, placeholder]) => (
              <label key={field} className="block">
                <span className="text-xs font-black text-slate-500">{label}</span>
                <input
                  type={field === 'price' || field === 'sortOrder' ? 'number' : 'text'}
                  min={field === 'price' ? '1000' : undefined}
                  step={field === 'price' ? '1000' : undefined}
                  value={form[field]}
                  onChange={(event) => handleChange(field, event.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                  placeholder={placeholder}
                  required={field === 'name' || field === 'code' || field === 'price'}
                />
              </label>
            ))}

            <label className="block">
              <span className="text-xs font-black text-slate-500">Mô tả</span>
              <textarea
                value={form.description}
                onChange={(event) => handleChange('description', event.target.value)}
                rows={4}
                className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100">
              <span>Đang bán</span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => handleChange('isActive', event.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-black text-white shadow-lg shadow-primary/20 transition hover:bg-primary-dk disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo gói'}
          </button>
        </form>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Giao dịch VIP</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">Tổng hợp thanh toán và cấp VIP</h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">Theo dõi PayOS, giao dịch đã hủy, đang chờ và các lượt admin cấp VIP.</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {['All', 'Applicant', 'Employer'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTransactionAudience(item)}
                  className={`h-9 rounded-lg px-3 text-xs font-black transition ${
                    transactionAudience === item ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item === 'All' ? 'Tất cả' : audienceLabel(item)}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {[
                ['All', 'Tất cả'],
                ['Active', 'Thành công'],
                ['Pending', 'Chờ'],
                ['Cancelled', 'Hủy']
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTransactionStatus(value)}
                  className={`h-9 rounded-lg px-3 text-xs font-black transition ${
                    transactionStatus === value ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['Doanh thu', `${formatCurrency(transactionData.summary?.totalRevenue)} VND`, 'payments', 'bg-slate-950 text-white'],
            ['Thành công', transactionData.summary?.paidTransactions ?? 0, 'task_alt', 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'],
            ['Đang chờ', transactionData.summary?.pendingTransactions ?? 0, 'pending_actions', 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'],
            ['Đã hủy', transactionData.summary?.cancelledTransactions ?? 0, 'cancel', 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'],
            ['Admin cấp', transactionData.summary?.adminGrantedTransactions ?? 0, 'workspace_premium', 'bg-blue-50 text-blue-700 ring-1 ring-blue-100']
          ].map(([label, value, icon, tone]) => (
            <div key={label} className="flex items-center justify-between rounded-[22px] border border-slate-100 bg-slate-50/60 p-4">
              <div>
                <p className="text-xs font-black text-slate-400">{label}</p>
                <p className="mt-1 text-lg font-black tabular-nums text-slate-950">{value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
                <span className="material-symbols-outlined !text-[21px]">{icon}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500">Người dùng</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500">Gói</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500">Nguồn</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500">Số tiền</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500">Trạng thái</th>
                <th className="px-6 py-4 text-right text-[11px] font-black text-slate-500">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactionLoading ? (
                [1, 2, 3].map((item) => (
                  <tr key={item}>
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : transactionData.transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined !text-[40px] text-slate-300">receipt_long</span>
                    <p className="mt-2 text-sm font-black text-slate-700">Chưa có giao dịch phù hợp</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Thử đổi bộ lọc hoặc chờ giao dịch mới.</p>
                  </td>
                </tr>
              ) : transactionData.transactions.map((transaction) => (
                <tr key={transaction.subscriptionId} className="transition-colors hover:bg-slate-50/70">
                  <td className="px-6 py-5">
                    <p className="truncate text-sm font-black text-slate-900">{transaction.accountName}</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">{transaction.accountEmail || `User ID ${transaction.userId}`}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-black text-slate-900">{transaction.planName}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-400">
                      {audienceLabel(transaction.audience)} • {durationLabel(transaction.durationDays)}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">
                      {transaction.isAdminGrant ? 'Admin cấp' : 'PayOS'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-black text-slate-800">
                    {formatCurrency(transaction.price)} {transaction.currency || 'VND'}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${transactionStatusClass(transaction.status)}`}>
                      {transactionStatusLabel(transaction.status)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right text-xs font-bold text-slate-500">
                    {formatDateTime(transaction.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={transactionPage}
          totalItems={transactionData.totalItems}
          itemsPerPage={TRANSACTIONS_PER_PAGE}
          onPageChange={setTransactionPage}
          label="giao dịch"
          className="rounded-b-[28px]"
        />
      </section>
    </div>
  );
}
