import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import HeaderActions from './HeaderActions';

const statusLabel = (status) => {
    if (status === 'Resolved') return 'Đã giải quyết';
    if (status === 'Ignored') return 'Đã bỏ qua';
    return 'Chờ xử lý';
};

const statusClass = (status) => {
    if (status === 'Resolved') return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
    if (status === 'Ignored') return 'bg-slate-100 text-slate-700 ring-slate-200';
    return 'bg-amber-50 text-amber-700 ring-amber-100';
};

const AdminReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const token = localStorage.getItem('token');

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/reports', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReports(Array.isArray(res.data) ? res.data : []);
        } catch {
            toast.error('Không thể tải danh sách báo cáo vi phạm');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const summary = useMemo(() => ({
        total: reports.length,
        pending: reports.filter((report) => report.status === 'Pending').length,
        resolved: reports.filter((report) => report.status === 'Resolved').length,
        ignored: reports.filter((report) => report.status === 'Ignored').length
    }), [reports]);

    const filteredReports = useMemo(() => {
        const keyword = query.trim().toLowerCase();

        return reports.filter((report) => {
            const matchesStatus = statusFilter === 'All' || report.status === statusFilter;
            const matchesQuery = !keyword || [
                report.reporterName,
                report.entityTitle,
                report.entityType,
                report.reason,
                report.description,
                report.status
            ].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword));

            return matchesStatus && matchesQuery;
        });
    }, [reports, query, statusFilter]);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await api.patch(`/admin/reports/${id}/status`, { newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(newStatus === 'Resolved' ? 'Đã đánh dấu báo cáo là đã giải quyết' : 'Đã bỏ qua báo cáo');
            fetchReports();
        } catch {
            toast.error('Không thể cập nhật trạng thái báo cáo');
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-[24px] border border-white/80 bg-white/80 shadow-sm" />
                ))}
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
                            placeholder="Tìm báo cáo, người gửi, lý do"
                        />
                    </label>

                    <div className="hidden sm:inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                        {[
                            ['All', 'Tất cả'],
                            ['Pending', 'Chờ'],
                            ['Resolved', 'Xong'],
                            ['Ignored', 'Bỏ qua']
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setStatusFilter(value)}
                                className={`h-8 rounded-lg px-3 text-xs font-black transition ${
                                    statusFilter === value
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

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    ['Tổng số', summary.total, 'report_problem', 'bg-slate-950 text-white'],
                    ['Chờ xử lý', summary.pending, 'pending_actions', 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'],
                    ['Đã giải quyết', summary.resolved, 'task_alt', 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'],
                    ['Đã bỏ qua', summary.ignored, 'remove_circle', 'bg-slate-100 text-slate-800 ring-1 ring-slate-200']
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
                {filteredReports.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <span className="material-symbols-outlined !text-[42px] text-slate-300">fact_check</span>
                        <p className="mt-3 text-sm font-black text-slate-700">Không có báo cáo phù hợp</p>
                        <p className="mt-1 text-xs font-semibold text-slate-800">Hàng đợi đang trống hoặc bộ lọc chưa có kết quả.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-700">Người báo cáo</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-700">Đối tượng</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-700">Lý do</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-700">Trạng thái</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-black text-slate-700">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredReports.map((report) => (
                                    <tr key={report.reportId} className="transition-colors hover:bg-slate-50/70">
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-black text-slate-800">{report.reporterName}</p>
                                            <p className="mt-1 text-xs font-semibold text-slate-800">
                                                {report.createdAt ? new Date(report.createdAt).toLocaleDateString('vi-VN') : 'Chưa rõ ngày'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-start gap-2">
                                                <span className="material-symbols-outlined mt-0.5 !text-[18px] text-primary">
                                                    {report.entityType === 'Job' ? 'work' : 'person'}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-black text-slate-900">{report.entityTitle}</p>
                                                    <p className="mt-1 text-xs font-semibold text-slate-800">
                                                        {report.entityType === 'Job' ? 'Công việc' : 'Người dùng'} ID: {report.reportedEntityId}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="rounded-xl bg-orange-50 px-3 py-1 text-[11px] font-black text-orange-700 ring-1 ring-orange-100">
                                                {report.reason}
                                            </span>
                                            {report.description && (
                                                <p className="mt-2 max-w-sm line-clamp-2 text-xs font-medium leading-relaxed text-slate-700">
                                                    {report.description}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${statusClass(report.status)}`}>
                                                {statusLabel(report.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            {report.status === 'Pending' ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateStatus(report.reportId, 'Resolved')}
                                                        className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-emerald-50 px-3 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-600 hover:text-white"
                                                    >
                                                        <span className="material-symbols-outlined !text-[16px]">check</span>
                                                        Xong
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateStatus(report.reportId, 'Ignored')}
                                                        className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-800 hover:text-white"
                                                    >
                                                        <span className="material-symbols-outlined !text-[16px]">close</span>
                                                        Bỏ qua
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-300">Không cần thao tác</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReports;
