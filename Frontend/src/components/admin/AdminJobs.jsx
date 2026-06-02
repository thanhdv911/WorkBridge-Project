import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { translateCategory, translateJobType } from '../../utils/translate';

const formatVND = (value) => {
    if (value === undefined || value === null || value === '') return 'Thỏa thuận';
    return parseInt(value, 10).toLocaleString('vi-VN') + ' ₫';
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
    const [modalLoading, setModalLoading] = useState(false);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            // Fetch jobs with status 'Pending' by default for moderation
            const res = await api.get('/admin/jobs?status=Pending', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJobs(res.data);
        } catch {
            toast.error('Không thể tải danh sách công việc chờ duyệt');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (jobId, newStatus) => {
        try {
            await api.patch(`/admin/jobs/${jobId}/status`, { newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(newStatus === 'Published' ? 'Phê duyệt công việc thành công' : 'Đã từ chối công việc');
            fetchJobs();
        } catch {
            toast.error('Không thể cập nhật trạng thái công việc');
        }
    };

    const handleViewJob = async (jobId) => {
        setModalLoading(true);
        try {
            const res = await api.get(`/jobs/${jobId}`);
            setSelectedJob(res.data);
        } catch {
            toast.error('Không thể tải chi tiết công việc');
        } finally {
            setModalLoading(false);
        }
    };

    if (loading) return <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl w-full"></div>)}
    </div>;

    return (
        <div className="space-y-6 animate-fadeInUp">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Kiểm duyệt công việc</h2>
                <div className="text-xs font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 uppercase tracking-widest">
                    Chờ kiểm duyệt: {jobs.length}
                </div>
            </div>

            {jobs.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-20 text-center">
                    <span className="material-symbols-outlined !text-4xl text-slate-300 mb-4">check_circle</span>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Đã hoàn thành duyệt!</h3>
                    <p className="text-slate-400 text-xs mt-1">Hiện tại không có tin tuyển dụng nào đang chờ duyệt.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {jobs.map((job) => (
                        <div key={job.jobPostId} className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 flex items-center justify-between hover:border-primary/20 transition-all group">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined !text-3xl">work</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 group-hover:text-primary transition-colors">{job.title}</h3>
                                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-medium">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined !text-[14px]">business</span>
                                            {job.companyName}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined !text-[14px]">category</span>
                                            {translateCategory(job.categoryName)}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                        <span>Đăng ngày {new Date(job.createdAt).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleUpdateStatus(job.jobPostId, 'Published')}
                                    className="h-10 px-5 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined !text-[18px]">verified</span>
                                    Phê duyệt
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus(job.jobPostId, 'Rejected')}
                                    className="h-10 px-5 rounded-xl bg-rose-50 text-rose-500 font-bold text-xs border border-rose-100 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined !text-[18px]">block</span>
                                    Từ chối
                                </button>
                                <button
                                    onClick={() => handleViewJob(job.jobPostId)}
                                    disabled={modalLoading}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined !text-[20px]">visibility</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* Modal preview */}
            {selectedJob && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-[32px] max-w-2xl w-full border border-slate-200/50 shadow-2xl overflow-hidden anim-scaleUp max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">{selectedJob.title}</h3>
                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-semibold">
                                    <span className="material-symbols-outlined !text-sm">business</span>
                                    {selectedJob.companyName}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-400 hover:text-slate-600"
                            >
                                <span className="material-symbols-outlined !text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-200">
                            {/* Key specifications (Position & Vacancies) */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined !text-[20px]">person_pin</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Vị trí cần tuyển</p>
                                        <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedJob.position || 'Chưa cập nhật'}</p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100/50 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined !text-[20px]">group</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Số lượng tuyển</p>
                                        <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedJob.vacancies ? `${selectedJob.vacancies} người` : 'Chưa cập nhật'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Job info grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                                <div className="flex items-start gap-2.5">
                                    <span className="material-symbols-outlined text-primary !text-[18px]">payments</span>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Mức lương</p>
                                        <p className="text-sm font-bold text-slate-800 mt-0.5">
                                            {formatVND(selectedJob.payRate)} / {translatePayUnitLocal(selectedJob.payUnit)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5">
                                    <span className="material-symbols-outlined text-primary !text-[18px]">work</span>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Hình thức làm việc</p>
                                        <p className="text-sm font-bold text-slate-800 mt-0.5">
                                            {translateJobType(selectedJob.jobType)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5 sm:col-span-2 pt-2 border-t border-slate-200/50">
                                    <span className="material-symbols-outlined text-primary !text-[18px]">location_on</span>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Địa điểm làm việc</p>
                                        <p className="text-sm font-bold text-slate-800 mt-0.5">
                                            {selectedJob.branchName && (
                                                <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-md mr-2 font-semibold">
                                                    <span className="material-symbols-outlined !text-[14px]">store</span>
                                                    {selectedJob.branchName}
                                                </span>
                                            )}
                                            {selectedJob.address}, {selectedJob.district}, {selectedJob.city}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Shifts */}
                            {selectedJob.shifts && selectedJob.shifts.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="material-symbols-outlined !text-[16px] text-slate-400">calendar_month</span>
                                        Ca làm việc dự kiến
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedJob.shifts.map(shift => (
                                            <div key={shift.shiftId} className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-sm">
                                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                                {shift.shiftName} {shift.startTime && `(${shift.startTime} - ${shift.endTime})`}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description, Requirements, Benefits */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mô tả công việc</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/30 p-4 rounded-2xl border border-slate-100 whitespace-pre-line">{selectedJob.description}</p>
                                </div>

                                {selectedJob.requirements && (
                                    <div className="space-y-1.5">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Yêu cầu tuyển dụng</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/30 p-4 rounded-2xl border border-slate-100 whitespace-pre-line">{selectedJob.requirements}</p>
                                    </div>
                                )}

                                {selectedJob.benefits && (
                                    <div className="space-y-1.5">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Quyền lợi được hưởng</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/30 p-4 rounded-2xl border border-slate-100 whitespace-pre-line">{selectedJob.benefits}</p>
                                    </div>
                                )}
                            </div>

                            {/* Deadline */}
                            {selectedJob.applicationDeadline && (
                                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 text-xs font-semibold">
                                    <span className="material-symbols-outlined !text-[18px]">event</span>
                                    <span>Hạn chót ứng tuyển: {new Date(selectedJob.applicationDeadline).toLocaleDateString('vi-VN')}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="h-11 px-5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 transition-all flex items-center gap-1.5"
                            >
                                Đóng
                            </button>
                            <button
                                onClick={() => {
                                    handleUpdateStatus(selectedJob.jobPostId, 'Rejected');
                                    setSelectedJob(null);
                                }}
                                className="h-11 px-5 rounded-xl bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-500 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined !text-[16px]">block</span>
                                Từ chối
                            </button>
                            <button
                                onClick={() => {
                                    handleUpdateStatus(selectedJob.jobPostId, 'Published');
                                    setSelectedJob(null);
                                }}
                                className="h-11 px-5 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined !text-[16px]">verified</span>
                                Phê duyệt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminJobs;
