import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Pagination from '../shared/Pagination';
import HeaderActions from './HeaderActions';

const USERS_PER_PAGE = 8;

const roleLabel = (roleName) => {
    if (roleName === 'Admin') return 'Quản trị viên';
    if (roleName === 'Employer') return 'Doanh nghiệp';
    return 'Cá nhân';
};

const getRoleClass = (roleName) => {
    if (roleName === 'Admin') return 'bg-violet-50 text-violet-700 ring-violet-100';
    if (roleName === 'Employer') return 'bg-sky-50 text-sky-700 ring-sky-100';
    return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
};

const getReputationTone = (score = 0) => {
    if (score >= 85) return { text: 'text-emerald-700', bg: 'bg-emerald-500', soft: 'bg-emerald-50 ring-emerald-100' };
    if (score >= 60) return { text: 'text-amber-700', bg: 'bg-amber-500', soft: 'bg-amber-50 ring-amber-100' };
    return { text: 'text-rose-700', bg: 'bg-rose-500', soft: 'bg-rose-50 ring-rose-100' };
};

const canGrantVipForRole = (roleName) => roleName === 'Applicant' || roleName === 'Employer';

const formatVipDate = (value) => {
    if (!value) return '--';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
};

const formatPlanOption = (plan) => {
    const duration = plan.durationDays >= 365
        ? '1 năm'
        : plan.durationDays === 30
            ? '1 tháng'
            : `${plan.durationDays} ngày`;
    return `${plan.name} • ${duration}`;
};

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [vipPlans, setVipPlans] = useState([]);
    const [vipPlanDrafts, setVipPlanDrafts] = useState({});
    const [scoreDrafts, setScoreDrafts] = useState({});
    const [loading, setLoading] = useState(true);
    const [savingScoreId, setSavingScoreId] = useState(null);
    const [grantingVipId, setGrantingVipId] = useState(null);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);
    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/users');
            const nextUsers = Array.isArray(res.data) ? res.data : [];
            const nextDrafts = {};

            nextUsers.forEach((user) => {
                if (user.reputationScore !== null && user.reputationScore !== undefined) {
                    nextDrafts[user.userId] = String(user.reputationScore);
                }
            });

            setUsers(nextUsers);
            setScoreDrafts(nextDrafts);
        } catch {
            toast.error('Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    const fetchVipPlans = async () => {
        try {
            const res = await api.get('/subscriptions/admin/plans');
            const nextPlans = Array.isArray(res.data) ? res.data.filter((plan) => plan.isActive) : [];
            setVipPlans(nextPlans);
        } catch {
            toast.error('Không thể tải danh sách gói VIP');
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchVipPlans();
    }, []);

    const vipPlansByAudience = useMemo(() => ({
        Applicant: vipPlans.filter((plan) => plan.audience === 'Applicant').sort((a, b) => a.sortOrder - b.sortOrder || a.price - b.price),
        Employer: vipPlans.filter((plan) => plan.audience === 'Employer').sort((a, b) => a.sortOrder - b.sortOrder || a.price - b.price)
    }), [vipPlans]);

    const summary = useMemo(() => ({
        total: users.length,
        employers: users.filter((user) => user.roleName === 'Employer').length,
        applicants: users.filter((user) => user.roleName !== 'Employer' && user.roleName !== 'Admin').length,
        vip: users.filter((user) => user.isVip).length,
        locked: users.filter((user) => user.status !== 'Active').length
    }), [users]);

    const filteredUsers = useMemo(() => {
        const keyword = query.trim().toLowerCase();

        return users.filter((user) => {
            const matchesRole = roleFilter === 'All' || user.roleName === roleFilter;
            const matchesQuery = !keyword || [
                user.fullName,
                user.email,
                user.roleName,
                user.status
            ].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword));

            return matchesRole && matchesQuery;
        });
    }, [users, query, roleFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [query, roleFilter]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, filteredUsers.length]);

    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * USERS_PER_PAGE;
        return filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    const handleUpdateStatus = async (userId, currentStatus) => {
        setUpdatingStatusId(userId);
        try {
            const newStatus = currentStatus === 'Active' ? 'Locked' : 'Active';
            await api.patch(`/admin/users/${userId}/status`, { newStatus });
            toast.success(newStatus === 'Active' ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
            fetchUsers();
        } catch {
            toast.error('Không thể cập nhật trạng thái người dùng');
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleScoreChange = (userId, value) => {
        setScoreDrafts((prev) => ({ ...prev, [userId]: value }));
    };

    const handleUpdateReputation = async (userId) => {
        const rawScore = Number(scoreDrafts[userId]);
        if (!Number.isFinite(rawScore)) {
            toast.error('Điểm uy tín phải là số từ 0 đến 100');
            return;
        }

        const reputationScore = Math.max(0, Math.min(100, Math.round(rawScore)));
        setSavingScoreId(userId);
        try {
            await api.patch(`/admin/users/${userId}/reputation`, { reputationScore });
            toast.success('Đã cập nhật điểm uy tín');
            setUsers((prev) => prev.map((user) => (
                user.userId === userId ? { ...user, reputationScore } : user
            )));
            setScoreDrafts((prev) => ({ ...prev, [userId]: String(reputationScore) }));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể cập nhật điểm uy tín');
        } finally {
            setSavingScoreId(null);
        }
    };

    const getSelectedVipPlanId = (user) => {
        const plans = vipPlansByAudience[user.roleName] || [];
        return vipPlanDrafts[user.userId] || plans[0]?.subscriptionPlanId || '';
    };

    const handleVipPlanChange = (userId, planId) => {
        setVipPlanDrafts((prev) => ({ ...prev, [userId]: planId }));
    };

    const handleGrantVip = async (user) => {
        if (!canGrantVipForRole(user.roleName)) return;

        const planId = Number(getSelectedVipPlanId(user));
        if (!Number.isFinite(planId) || planId <= 0) {
            toast.error('Chưa có gói VIP phù hợp cho loại tài khoản này');
            return;
        }

        setGrantingVipId(user.userId);
        try {
            await api.post(`/admin/users/${user.userId}/vip`, { planId });
            toast.success(user.isVip ? 'Đã gia hạn VIP cho người dùng' : 'Đã nâng VIP cho người dùng');
            await fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể nâng VIP cho người dùng');
        } finally {
            setGrantingVipId(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => <div key={item} className="h-24 animate-pulse rounded-[22px] bg-white/80 shadow-sm" />)}
                </div>
                {[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-[22px] bg-white/80 shadow-sm" />)}
            </div>
        );
    }

    return (
        <div className="space-y-5 anim-fadeUp">
            <HeaderActions>
                <div className="flex items-center gap-3">
                    <label className="relative block">
                        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 !text-[19px] -translate-y-1/2 text-slate-800">search</span>
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            className="h-10 w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-800 transition focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
                            placeholder="Tìm tên, email, trạng thái"
                        />
                    </label>

                    <div className="hidden sm:inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                        {[
                            ['All', 'Tất cả'],
                            ['Applicant', 'Cá nhân'],
                            ['Employer', 'Doanh nghiệp'],
                            ['Admin', 'Admin']
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setRoleFilter(value)}
                                className={`h-8 rounded-lg px-3 text-xs font-black transition ${
                                    roleFilter === value
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-slate-700 hover:text-slate-900'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </HeaderActions>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                    ['Tổng số', summary.total, 'groups', 'bg-slate-950 text-white'],
                    ['Doanh nghiệp', summary.employers, 'business', 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'],
                    ['Cá nhân', summary.applicants, 'person', 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'],
                    ['Đang VIP', summary.vip, 'workspace_premium', 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'],
                    ['Đang khóa', summary.locked, 'lock', 'bg-rose-50 text-rose-700 ring-1 ring-rose-100']
                ].map(([label, value, icon, tone]) => (
                    <div key={label} className="flex items-center justify-between rounded-[22px] border border-white/80 bg-white p-4 shadow-sm">
                        <div>
                            <p className="text-xs font-black text-slate-800">{label}</p>
                            <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">{value}</p>
                        </div>
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
                            <span className="material-symbols-outlined !text-[22px]">{icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-sm">
                {filteredUsers.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <span className="material-symbols-outlined !text-[42px] text-slate-300">person_search</span>
                        <p className="mt-3 text-sm font-black text-slate-700">Không tìm thấy người dùng phù hợp</p>
                        <p className="mt-1 text-xs font-semibold text-slate-800">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        <div className="hidden bg-slate-50/80 px-5 py-3 lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.62fr)_minmax(0,0.95fr)_minmax(0,1.28fr)_minmax(0,0.82fr)] lg:gap-3">
                            {['Người dùng', 'Vai trò', 'Điểm uy tín', 'Quyền VIP', 'Trạng thái'].map((label, index) => (
                                <div
                                    key={label}
                                    className={`text-[11px] font-black text-slate-700 ${index === 4 ? 'text-right' : ''}`}
                                >
                                    {label}
                                </div>
                            ))}
                        </div>

                        {paginatedUsers.map((user) => {
                            const canEditReputation = user.roleName !== 'Admin' && user.reputationScore !== null && user.reputationScore !== undefined;
                            const canGrantVip = canGrantVipForRole(user.roleName);
                            const userVipPlans = vipPlansByAudience[user.roleName] || [];
                            const selectedVipPlanId = getSelectedVipPlanId(user);
                            const score = Number(user.reputationScore ?? 0);
                            const tone = getReputationTone(score);
                            const statusLabel = user.status === 'Active' ? 'Đang hoạt động' : 'Đã khóa';

                            return (
                                <article
                                    key={user.userId}
                                    className="grid gap-4 p-4 transition-colors hover:bg-slate-50/70 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.62fr)_minmax(0,0.95fr)_minmax(0,1.28fr)_minmax(0,0.82fr)] lg:items-center lg:gap-3"
                                >
                                    <section className="min-w-0">
                                        <span className="mb-2 block text-[10px] font-black text-slate-800 lg:hidden">Người dùng</span>
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                                                <img
                                                    src={user.avatarUrl || "/default-avatar.png"}
                                                    alt={user.fullName || 'Avatar'}
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate font-black text-slate-900" title={user.fullName || 'Chưa cập nhật tên'}>
                                                    {user.fullName || 'Chưa cập nhật tên'}
                                                </div>
                                                <div className="mt-0.5 truncate text-xs font-semibold text-slate-800" title={user.email}>
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="min-w-0">
                                        <span className="mb-2 block text-[10px] font-black text-slate-800 lg:hidden">Vai trò</span>
                                        <span className={`inline-flex max-w-full rounded-xl px-2.5 py-1 text-[11px] font-black ring-1 ${getRoleClass(user.roleName)}`}>
                                            <span className="truncate">{roleLabel(user.roleName)}</span>
                                        </span>
                                    </section>

                                    <section className="min-w-0">
                                        <span className="mb-2 block text-[10px] font-black text-slate-800 lg:hidden">Điểm uy tín</span>
                                        {canEditReputation ? (
                                            <div className={`w-full rounded-2xl p-2.5 ring-1 ${tone.soft}`}>
                                                <div className="flex min-w-0 items-center gap-1.5">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={scoreDrafts[user.userId] ?? ''}
                                                        onChange={(event) => handleScoreChange(user.userId, event.target.value)}
                                                        onKeyDown={(event) => {
                                                            if (event.key === 'Enter') handleUpdateReputation(user.userId);
                                                        }}
                                                        className="h-8 w-[4.25rem] shrink-0 rounded-xl border border-white bg-white px-2 text-sm font-black text-slate-800 outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                                                    />
                                                    <span className={`shrink-0 text-xs font-black ${tone.text}`}>/100</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateReputation(user.userId)}
                                                        disabled={savingScoreId === user.userId}
                                                        title="Lưu điểm uy tín"
                                                        aria-label="Lưu điểm uy tín"
                                                        className="ml-auto inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl bg-slate-950 px-2 text-[11px] font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <span className="material-symbols-outlined !text-[15px]">{savingScoreId === user.userId ? 'progress_activity' : 'save'}</span>
                                                        <span className="hidden xl:inline">Lưu</span>
                                                    </button>
                                                </div>
                                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
                                                    <div className={`h-full rounded-full ${tone.bg}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
                                                </div>
                                                <div className="mt-2 text-[10px] font-bold text-slate-800">
                                                    Báo cáo: {user.reportCount ?? 0}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold text-slate-300">Không áp dụng</span>
                                        )}
                                    </section>

                                    <section className="min-w-0">
                                        <span className="mb-2 block text-[10px] font-black text-slate-800 lg:hidden">Quyền VIP</span>
                                        {canGrantVip ? (
                                            <div className="min-w-0 rounded-2xl bg-slate-50/70 p-2.5 ring-1 ring-slate-100">
                                                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                                    <span className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${
                                                        user.isVip
                                                            ? 'bg-amber-50 text-amber-700 ring-amber-100'
                                                            : 'bg-white text-slate-700 ring-slate-100'
                                                    }`}>
                                                        <span className="material-symbols-outlined !text-[14px]">workspace_premium</span>
                                                        <span className="truncate">{user.isVip ? 'Đang VIP' : 'Chưa VIP'}</span>
                                                    </span>
                                                    {user.isVip && (
                                                        <span className="text-[11px] font-bold text-slate-800">
                                                            Còn {Math.max(0, user.vipDaysRemaining ?? 0)} ngày
                                                        </span>
                                                    )}
                                                </div>

                                                {user.isVip && (
                                                    <p className="mt-1 truncate text-[11px] font-semibold text-slate-700" title={`${user.vipPlanName || 'Gói VIP'} đến ${formatVipDate(user.vipEndDate)}`}>
                                                        {user.vipPlanName || 'Gói VIP'} đến {formatVipDate(user.vipEndDate)}
                                                    </p>
                                                )}

                                                <div className="mt-2 flex min-w-0 items-center gap-2">
                                                    <select
                                                        value={selectedVipPlanId}
                                                        onChange={(event) => handleVipPlanChange(user.userId, event.target.value)}
                                                        disabled={grantingVipId === user.userId || userVipPlans.length === 0}
                                                        className="h-8 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-800"
                                                    >
                                                        {userVipPlans.length === 0 ? (
                                                            <option value="">Chưa có gói</option>
                                                        ) : userVipPlans.map((plan) => (
                                                            <option key={plan.subscriptionPlanId} value={plan.subscriptionPlanId}>
                                                                {formatPlanOption(plan)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleGrantVip(user)}
                                                        disabled={grantingVipId === user.userId || userVipPlans.length === 0 || user.status !== 'Active'}
                                                        className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl bg-amber-500 px-2.5 text-[11px] font-black text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <span className="material-symbols-outlined !text-[15px]">
                                                            {grantingVipId === user.userId ? 'progress_activity' : 'workspace_premium'}
                                                        </span>
                                                        <span>{user.isVip ? 'Gia hạn' : 'Nâng'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold text-slate-300">Không áp dụng</span>
                                        )}
                                    </section>

                                    <section className="min-w-0">
                                        <span className="mb-2 block text-[10px] font-black text-slate-800 lg:hidden">Trạng thái</span>
                                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                            <span className={`inline-flex max-w-full items-center rounded-full px-3 py-1 text-[11px] font-black ring-1 ${
                                                user.status === 'Active'
                                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                                                    : 'bg-rose-50 text-rose-700 ring-rose-100'
                                            }`}>
                                                <span className="truncate">{statusLabel}</span>
                                            </span>
                                            {user.roleName !== 'Admin' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateStatus(user.userId, user.status)}
                                                    disabled={updatingStatusId === user.userId}
                                                    className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[11px] font-black transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                                                        user.status === 'Active'
                                                            ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-100 hover:bg-rose-600 hover:text-white'
                                                            : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 hover:bg-emerald-600 hover:text-white'
                                                    }`}
                                                >
                                                    <span className="material-symbols-outlined !text-[15px]">
                                                        {updatingStatusId === user.userId
                                                            ? 'progress_activity'
                                                            : user.status === 'Active'
                                                                ? 'lock'
                                                                : 'lock_open'}
                                                    </span>
                                                    {updatingStatusId === user.userId
                                                        ? 'Lưu'
                                                        : user.status === 'Active'
                                                            ? 'Khóa'
                                                            : 'Mở'}
                                                </button>
                                            )}
                                        </div>
                                    </section>
                                </article>
                            );
                        })}
                    </div>
                )}
                <Pagination
                    currentPage={currentPage}
                    totalItems={filteredUsers.length}
                    itemsPerPage={USERS_PER_PAGE}
                    onPageChange={setCurrentPage}
                    label="người dùng"
                    className="rounded-b-[28px]"
                />
            </div>
        </div>
    );
};

export default AdminUsers;
