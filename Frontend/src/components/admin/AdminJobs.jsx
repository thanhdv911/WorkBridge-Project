import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { translateCategory, translateJobType } from '../../utils/translate';

const formatVND = (value) => {
    if (value === undefined || value === null || value === '') return 'Thỏa thuận';
    return `${parseInt(value, 10).toLocaleString('vi-VN')} đ`;
};

const translatePayUnitLocal = (unit) => {
    if (!unit) return '';
    const lower = unit.toLowerCase().trim();
    if (lower === 'hourly') return 'giờ';
    if (lower === 'daily') return 'ngày';
    if (lower === 'monthly') return 'tháng';
    if (lower === 'fixed') return 'trọn gói';
    return unit;
};

const AdminJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);
    const [previewingJobId, setPreviewingJobId] = useState(null);
    const [query, setQuery] = useState('');
    const token = localStorage.getItem('token');

    const fetchJobs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/jobs?status=Pending', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJobs(Array.isArray(res.data) ? res.data : []);
        } catch {
            toast.error('Không thể tải danh sách công việc chờ duyệt');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const filteredJobs = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) return jobs;

        return jobs.filter((job) => [
            job.title,
            job.companyName,
            job.categoryName,
            job.position,
            job.city,
            job.district
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword)));
    }, [jobs, query]);

    const handleUpdateStatus = async (jobId, newStatus) => {
        try {
            await api.patch(`/admin/jobs/${jobId}/status`, { newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(newStatus === 'Published' ? 'Đã phê duyệt công việc' : 'Đã từ chối công việc');
            fetchJobs();
        } catch {
            toast.error('Không thể cập nhật trạng thái công việc');
        }
    };

    const handleViewJob = async (jobId) => {
        setPreviewingJobId(jobId);
        try {
            const res = await api.get(`/jobs/${jobId}`);
            setSelectedJob(res.data);
        } catch {
            toast.error('Không thể tải chi tiết công việc');
        } finally {
            setPreviewingJobId(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                    <div key={item} className="h-28 w-full animate-pulse rounded-[24px] border border-white/80 bg-white/80 shadow-sm" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-5 anim-fadeUp">
            <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-slate-950">Kiểm duyệt việc làm</h2>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                            Đọc nhanh nội dung tin, duyệt hoặc từ chối trước khi xuất bản.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <label className="relative block min-w-0 sm:w-[300px]">
                            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 !text-[19px] -translate-y-1/2 text-slate-800">search</span>
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-800 transition focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
                                placeholder="Tìm theo tin, công ty, địa điểm"
                            />
                        </label>
                        <div className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 text-xs font-black text-primary ring-1 ring-primary/15">
                            <span className="material-symbols-outlined !text-[18px]">pending_actions</span>
                            Chờ duyệt: {jobs.length}
                        </div>
                    </div>
                </div>
            </section>

            {jobs.length === 0 ? (
                <div className="rounded-[28px] border border-white/80 bg-white px-6 py-16 text-center shadow-sm">
                    <span className="material-symbols-outlined !text-[46px] text-emerald-500">check_circle</span>
                    <h3 className="mt-4 text-base font-black text-slate-800">Không còn tin nào chờ duyệt</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-slate-700">
                        Hàng đợi kiểm duyệt đang sạch. Tin tuyển dụng mới sẽ xuất hiện tại đây.
                    </p>
                </div>
            ) : filteredJobs.length === 0 ? (
                <div className="rounded-[28px] border border-white/80 bg-white px-6 py-14 text-center shadow-sm">
                    <span className="material-symbols-outlined !text-[42px] text-slate-300">search_off</span>
                    <h3 className="mt-3 text-sm font-black text-slate-700">Không tìm thấy tin phù hợp</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-800">Thử đổi từ khóa hoặc xóa bộ lọc tìm kiếm.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredJobs.map((job) => (
                        <article key={job.jobPostId} className="group rounded-[24px] border border-white/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-5">
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                                <div className="flex min-w-0 gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-800 ring-1 ring-slate-100 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                                        <span className="material-symbols-outlined !text-[29px]">work</span>
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="truncate text-base font-black text-slate-900 transition-colors group-hover:text-primary">
                                                {job.title}
                                            </h3>
                                            <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 ring-1 ring-amber-100">
                                                Chờ duyệt
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-800">
                                            <span className="inline-flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-[14px]">business</span>
                                                {job.companyName}
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-[14px]">category</span>
                                                {translateCategory(job.categoryName)}
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-[14px]">schedule</span>
                                                {job.createdAt ? new Date(job.createdAt).toLocaleDateString('vi-VN') : 'Chưa rõ ngày'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => handleViewJob(job.jobPostId)}
                                        disabled={previewingJobId === job.jobPostId}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-800 transition-all hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <span className="material-symbols-outlined !text-[18px]">
                                            {previewingJobId === job.jobPostId ? 'progress_activity' : 'visibility'}
                                        </span>
                                        Xem
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(job.jobPostId, 'Rejected')}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 text-xs font-black text-rose-600 ring-1 ring-rose-100 transition-all hover:bg-rose-600 hover:text-white"
                                    >
                                        <span className="material-symbols-outlined !text-[18px]">block</span>
                                        Từ chối
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(job.jobPostId, 'Published')}
                                        className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0 sm:col-span-1"
                                    >
                                        <span className="material-symbols-outlined !text-[18px]">verified</span>
                                        Phê duyệt
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {selectedJob && createPortal(
                <div 
                    onClick={() => setSelectedJob(null)}
                    className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-2xl anim-scaleUp"
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-5 sm:px-6">
                            <div className="min-w-0">
                                <p className="text-xs font-black text-primary">Chi tiết tin tuyển dụng</p>
                                <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">{selectedJob.title}</h3>
                                <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-700">
                                    <span className="material-symbols-outlined !text-[15px]">business</span>
                                    {selectedJob.companyName}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedJob(null)}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-800"
                                aria-label="Đóng chi tiết tin tuyển dụng"
                            >
                                <span className="material-symbols-outlined !text-[21px]">close</span>
                            </button>
                        </div>

                        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
                                    <p className="text-[11px] font-black text-sky-600">Vị trí cần tuyển</p>
                                    <p className="mt-1 text-sm font-black text-slate-900">{selectedJob.position || 'Chưa cập nhật'}</p>
                                </div>
                                <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                                    <p className="text-[11px] font-black text-emerald-600">Số lượng tuyển</p>
                                    <p className="mt-1 text-sm font-black text-slate-900">
                                        {selectedJob.vacancies ? `${selectedJob.vacancies} người` : 'Chưa cập nhật'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:grid-cols-2">
                                <InfoItem icon="payments" label="Mức lương" value={`${formatVND(selectedJob.payRate)} / ${translatePayUnitLocal(selectedJob.payUnit)}`} />
                                <InfoItem icon="work" label="Hình thức làm việc" value={translateJobType(selectedJob.jobType)} />
                                <InfoItem
                                    icon="location_on"
                                    label="Địa điểm làm việc"
                                    value={`${selectedJob.branchName ? `${selectedJob.branchName}, ` : ''}${selectedJob.address || ''}${selectedJob.district ? `, ${selectedJob.district}` : ''}${selectedJob.city ? `, ${selectedJob.city}` : ''}`}
                                    wide
                                />
                            </div>

                            {selectedJob.shifts && selectedJob.shifts.length > 0 && (
                                <section className="space-y-3">
                                    <h4 className="text-xs font-black text-slate-700">Ca làm việc dự kiến</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedJob.shifts.map((shift) => (
                                            <span key={shift.shiftId} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                                                <span className="h-2 w-2 rounded-full bg-primary" />
                                                {shift.shiftName} {shift.startTime && `(${shift.startTime} - ${shift.endTime})`}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <TextBlock title="Mô tả công việc" content={selectedJob.description} />
                            {selectedJob.requirements && <TextBlock title="Yêu cầu tuyển dụng" content={selectedJob.requirements} />}
                            {selectedJob.benefits && <TextBlock title="Quyền lợi được hưởng" content={selectedJob.benefits} />}

                            {selectedJob.applicationDeadline && (
                                <div className="flex items-center gap-2 rounded-2xl bg-amber-50 p-4 text-xs font-black text-amber-800 ring-1 ring-amber-100">
                                    <span className="material-symbols-outlined !text-[18px]">event</span>
                                    Hạn chót ứng tuyển: {new Date(selectedJob.applicationDeadline).toLocaleDateString('vi-VN')}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex sm:justify-end sm:px-6">
                            <button
                                type="button"
                                onClick={() => setSelectedJob(null)}
                                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-800 transition hover:bg-slate-100"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleUpdateStatus(selectedJob.jobPostId, 'Rejected');
                                    setSelectedJob(null);
                                }}
                                className="h-11 rounded-xl bg-rose-50 px-5 text-xs font-black text-rose-600 ring-1 ring-rose-100 transition hover:bg-rose-600 hover:text-white"
                            >
                                Từ chối
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleUpdateStatus(selectedJob.jobPostId, 'Published');
                                    setSelectedJob(null);
                                }}
                                className="h-11 rounded-xl bg-emerald-600 px-5 text-xs font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700"
                            >
                                Phê duyệt
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

function InfoItem({ icon, label, value, wide = false }) {
    return (
        <div className={`flex items-start gap-3 ${wide ? 'sm:col-span-2' : ''}`}>
            <span className="material-symbols-outlined !text-[20px] text-primary">{icon}</span>
            <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-800">{label}</p>
                <p className="mt-0.5 text-sm font-bold leading-relaxed text-slate-800">{value || 'Chưa cập nhật'}</p>
            </div>
        </div>
    );
}

function TextBlock({ title, content }) {
    return (
        <section className="space-y-2">
            <h4 className="text-xs font-black text-slate-700">{title}</h4>
            <p className="whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-800 ring-1 ring-slate-100">
                {content || 'Chưa cập nhật'}
            </p>
        </section>
    );
}

export default AdminJobs;
