import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

const EMPTY_STATS = {
    totalUsers: 0,
    newUsersThisMonth: 0,
    totalJobs: 0,
    newJobsThisMonth: 0,
    totalApplications: 0,
    applicationSuccessRate: 0,
    totalApplicants: 0,
    totalEmployers: 0,
    jobGrowth: []
};

const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');

const metricTones = {
    sky: {
        icon: 'bg-sky-50 text-sky-600 ring-sky-100',
        value: 'text-slate-950',
        chip: 'bg-sky-50 text-sky-700 ring-sky-100',
        bar: 'from-sky-500 to-cyan-400'
    },
    emerald: {
        icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
        value: 'text-slate-950',
        chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        bar: 'from-emerald-500 to-teal-400'
    },
    amber: {
        icon: 'bg-amber-50 text-amber-600 ring-amber-100',
        value: 'text-slate-950',
        chip: 'bg-amber-50 text-amber-700 ring-amber-100',
        bar: 'from-amber-500 to-orange-400'
    },
    rose: {
        icon: 'bg-rose-50 text-rose-600 ring-rose-100',
        value: 'text-slate-950',
        chip: 'bg-rose-50 text-rose-700 ring-rose-100',
        bar: 'from-rose-500 to-pink-400'
    }
};

const AdminOverview = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const token = localStorage.getItem('token');

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setHasError(false);

        try {
            const res = await api.get('/admin/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats({ ...EMPTY_STATS, ...(res.data || {}) });
        } catch {
            setHasError(true);
            setStats(EMPTY_STATS);
            toast.error('Không thể tải số liệu thống kê');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const safeStats = stats || EMPTY_STATS;
    const totalRoleUsers = Number(safeStats.totalApplicants || 0) + Number(safeStats.totalEmployers || 0);

    const summaryCards = useMemo(() => ([
        {
            label: 'Tổng người dùng',
            value: formatNumber(safeStats.totalUsers),
            note: `+${formatNumber(safeStats.newUsersThisMonth)} trong tháng này`,
            icon: 'groups',
            tone: metricTones.sky
        },
        {
            label: 'Việc đang tuyển',
            value: formatNumber(safeStats.totalJobs),
            note: `+${formatNumber(safeStats.newJobsThisMonth)} tin mới`,
            icon: 'work',
            tone: metricTones.emerald
        },
        {
            label: 'Đơn ứng tuyển',
            value: formatNumber(safeStats.totalApplications),
            note: 'Tính trên toàn bộ tin tuyển dụng',
            icon: 'description',
            tone: metricTones.amber
        },
        {
            label: 'Tỷ lệ thành công',
            value: `${Number(safeStats.applicationSuccessRate || 0)}%`,
            note: 'Tốc độ nhận việc',
            icon: 'verified',
            tone: metricTones.rose
        }
    ]), [safeStats]);

    const roleData = [
        { name: 'Người tìm việc', value: Number(safeStats.totalApplicants || 0), color: '#1392ec' },
        { name: 'Nhà tuyển dụng', value: Number(safeStats.totalEmployers || 0), color: '#10b981' }
    ];

    const jobGrowth = Array.isArray(safeStats.jobGrowth) ? safeStats.jobGrowth : [];

    if (loading) {
        return (
            <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="h-36 animate-pulse rounded-[24px] border border-white/80 bg-white/80 shadow-sm" />
                    ))}
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="h-80 animate-pulse rounded-[28px] border border-white/80 bg-white/80 shadow-sm lg:col-span-2" />
                    <div className="h-80 animate-pulse rounded-[28px] border border-white/80 bg-white/80 shadow-sm" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 anim-fadeUp">
            {hasError && (
                <div className="flex flex-col gap-3 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined mt-0.5 !text-[22px] text-amber-600">warning</span>
                        <div>
                            <p className="text-sm font-black">Chưa lấy được dữ liệu mới nhất</p>
                            <p className="mt-0.5 text-xs font-semibold text-amber-700">
                                Kiểm tra kết nối API hoặc thử tải lại số liệu.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={fetchStats}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-xs font-black text-white transition hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-300"
                    >
                        <span className="material-symbols-outlined !text-[17px]">refresh</span>
                        Tải lại
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                    <article key={card.label} className="group overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
                        <div className={`h-1.5 bg-gradient-to-r ${card.tone.bar}`} />
                        <div className="p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${card.tone.icon}`}>
                                    <span className="material-symbols-outlined !text-[24px]">{card.icon}</span>
                                </div>
                                <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black ring-1 ${card.tone.chip}`}>
                                    Live
                                </span>
                            </div>
                            <p className={`mt-5 text-3xl font-black tracking-tight tabular-nums ${card.tone.value}`}>
                                {card.value}
                            </p>
                            <h3 className="mt-1 text-sm font-black text-slate-700">{card.label}</h3>
                            <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-800">{card.note}</p>
                        </div>
                    </article>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-sm lg:col-span-2">
                    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h3 className="text-lg font-black tracking-tight text-slate-950">Xu hướng hoạt động</h3>
                            <p className="mt-1 text-sm font-medium text-slate-700">
                                Số lượng tin tuyển dụng mới theo thời gian.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-100">
                            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                            Tin tuyển dụng
                        </div>
                    </div>

                    <div className="h-72 px-2 py-5 sm:px-5">
                        {jobGrowth.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={jobGrowth} margin={{ top: 10, right: 18, left: -18, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="adminJobGrowth" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1392ec" stopOpacity={0.24} />
                                            <stop offset="95%" stopColor="#1392ec" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eef5" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.12)',
                                            padding: '12px'
                                        }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#1392ec" strokeWidth={3} fillOpacity={1} fill="url(#adminJobGrowth)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center rounded-2xl bg-slate-50 text-center">
                                <span className="material-symbols-outlined !text-[34px] text-slate-300">monitoring</span>
                                <p className="mt-2 text-sm font-black text-slate-700">Chưa có dữ liệu biểu đồ</p>
                                <p className="mt-1 text-xs font-semibold text-slate-800">Dữ liệu sẽ xuất hiện khi API trả về lịch sử tin tuyển dụng.</p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-[28px] border border-white/80 bg-white p-5 shadow-sm">
                    <div>
                        <h3 className="text-lg font-black tracking-tight text-slate-950">Cơ cấu người dùng</h3>
                        <p className="mt-1 text-sm font-medium text-slate-700">Tỷ trọng cá nhân và doanh nghiệp.</p>
                    </div>

                    <div className="relative mt-6 flex h-52 items-center justify-center">
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black tabular-nums text-slate-950">{formatNumber(totalRoleUsers)}</span>
                            <span className="mt-1 text-xs font-black text-slate-800">Người dùng</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={roleData} innerRadius={68} outerRadius={90} paddingAngle={5} dataKey="value">
                                    {roleData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-6 space-y-3">
                        {roleData.map((item) => {
                            const percent = totalRoleUsers > 0 ? Math.round((item.value / totalRoleUsers) * 100) : 0;

                            return (
                                <div key={item.name} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="h-3 w-3 rounded-lg" style={{ backgroundColor: item.color }} />
                                            <span className="text-sm font-black text-slate-700">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-black tabular-nums text-slate-950">{percent}%</span>
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                                        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: item.color }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminOverview;
