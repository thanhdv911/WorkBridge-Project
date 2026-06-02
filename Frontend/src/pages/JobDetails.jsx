import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { translatePayUnit } from '../utils/translate';

import ReportModal from '../components/shared/ReportModal';

const REAPPLY_STATUSES = ['Rejected', 'Cancelled', 'Canceled', 'Interview Failed'];

const JobDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [isSaved, setIsSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [coverMessage, setCoverMessage] = useState('');
    const [applying, setApplying] = useState(false);
    const [applicationStatus, setApplicationStatus] = useState(null);
    const [canReapply, setCanReapply] = useState(false);

    const userRole = localStorage.getItem('role');
    const token = localStorage.getItem('token');
    const isApplicant = userRole?.toLowerCase() === 'applicant';

    useEffect(() => {
        fetchJobDetails();
        if (isApplicant && token) {
            checkIfSaved();
            checkApplicationStatus();
        }
    }, [id, token, isApplicant]);

    const fetchJobDetails = async () => {
        try {
            const response = await api.get(`/jobs/${id}`);
            setJob(response.data);
        } catch (error) {
            console.error('Error fetching job details:', error);
            toast.error('Không thể tải chi tiết công việc.');
        } finally {
            setLoading(false);
        }
    };

    const checkIfSaved = async () => {
        try {
            const res = await api.get('/savedjobs/ids', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsSaved(res.data.includes(parseInt(id)));
        } catch (err) {
            console.error('Error checking save status:', err);
        }
    };

    const checkApplicationStatus = async () => {
        try {
            const res = await api.get('/application/my', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const existingApplication = res.data.find(app => app.jobPostId === parseInt(id));
            setApplicationStatus(existingApplication?.status || null);
            setCanReapply(existingApplication?.canReapply ?? (existingApplication ? REAPPLY_STATUSES.includes(existingApplication.status) : false));
        } catch (err) {
            console.error('Error checking application status:', err);
        }
    };

    const handleApplyClick = () => {
        console.log('Current User Token:', token);
        console.log('Current User Role in Storage:', userRole);

        if (!token) {
            toast.error('Vui lòng đăng nhập để ứng tuyển công việc này.');
            navigate('/login');
            return;
        }

        if (userRole?.toLowerCase() !== 'applicant') {
            toast.error(`Chỉ người tìm việc mới có thể ứng tuyển. (Vai trò hiện tại: ${userRole})`);
            return;
        }
        if (applicationStatus && !canReapply) {
            toast.error(`Bạn đã ứng tuyển công việc này rồi. Trạng thái hiện tại: ${applicationStatus}`);
            return;
        }
        setShowApplyModal(true);
    };

    const submitApplication = async (e) => {
        e.preventDefault();
        setApplying(true);
        try {
            await api.post('/application', {
                jobPostId: parseInt(id),
                coverMessage: coverMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Nộp đơn ứng tuyển thành công!');
            setShowApplyModal(false);
            setCoverMessage('');
            setApplicationStatus('Applied');
            setCanReapply(false);
        } catch (error) {
            const msg = error.response?.data || 'Nộp đơn ứng tuyển thất bại.';
            toast.error(typeof msg === 'string' ? msg : 'Có lỗi xảy ra.');
        } finally {
            setApplying(false);
        }
    };

    const handleToggleSave = async () => {
        if (!token) {
            toast.error('Vui lòng đăng nhập để lưu công việc.');
            return;
        }

        try {
            if (isSaved) {
                await api.delete(`/savedjobs/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsSaved(false);
                toast.success('Đã xóa công việc khỏi danh sách lưu.');
            } else {
                await api.post(`/savedjobs/${id}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsSaved(true);
                toast.success('Đã lưu công việc thành công.');
            }
        } catch (err) {
            console.error('Error toggling save status:', err);
            toast.error('Cập nhật trạng thái lưu thất bại.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
                <h2 className="text-2xl font-bold text-slate-800">Không tìm thấy công việc</h2>
                <Link to="/jobs" className="text-primary hover:underline">Quay lại tìm việc</Link>
            </div>
        );
    }

    return (
        <div className="bg-bg-light font-display text-slate-900 min-h-screen antialiased pb-20">
            {/* Breadcrumb */}
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <nav className="flex items-center gap-2 text-sm text-slate-400">
                    <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
                    <span className="material-symbols-outlined !text-[16px]">chevron_right</span>
                    <Link to="/jobs" className="hover:text-primary transition-colors">Tìm việc</Link>
                    <span className="material-symbols-outlined !text-[16px]">chevron_right</span>
                    <span className="text-slate-700 font-medium">{job.title}</span>
                </nav>
            </div>

            <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid lg:grid-cols-[1fr_360px] gap-8">
                {/* LEFT: JOB DETAILS */}
                <div className="space-y-6">
                    {/* Header card */}
                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8 animate-fadeInUp">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                                {job.companyLogoUrl ? (
                                    <img src={job.companyLogoUrl} alt={job.companyName} className="w-full h-full object-cover rounded-2xl" />
                                ) : (
                                    <span className="material-symbols-outlined text-white !text-3xl">work</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 flex-wrap">
                                    {job.title}
                                    {job.isFeatured && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-black uppercase tracking-wider">
                                            🔥 VIP
                                        </span>
                                    )}
                                </h1>
                                <p className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                                    <span className="material-symbols-outlined !text-[16px]">apartment</span>{job.companyName}
                                    {job.branchName && (
                                        <>
                                            <span className="mx-1.5 text-slate-300">·</span>
                                            <span className="material-symbols-outlined !text-[16px] text-primary">store</span>
                                            <span className="text-primary font-bold">{job.branchName}</span>
                                        </>
                                    )}
                                    <span className="mx-1.5 text-slate-300">·</span>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([job.address, job.district, job.city].filter(Boolean).join(', '))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-0.5 text-primary hover:text-primary-dk hover:underline font-semibold"
                                        title="Xem vị trí trên Google Maps"
                                    >
                                        <span className="material-symbols-outlined !text-[16px]">location_on</span>{job.location}
                                    </a>
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-600 border border-green-100">{job.jobType}</span>
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">Đã xác thực</span>
                                    {job.position && (
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">Vị trí: {job.position}</span>
                                    )}
                                    {job.vacancies && (
                                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100">Tuyển dụng: {job.vacancies} người</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Quick stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                            <div className="text-center">
                                <p className="text-xs text-slate-400 mb-1">Mức lương</p>
                                <p className="text-lg font-bold text-primary">
                                    {job.payRate?.toLocaleString()}₫
                                    <span className="text-xs font-normal text-slate-400">/{(() => { const u = translatePayUnit(job.payUnit); return u.startsWith('đ/') ? u.slice(2) : u; })()}</span>
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-400 mb-1">Đăng tuyển</p>
                                <p className="text-sm font-semibold text-slate-700">{new Date(job.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-400 mb-1">Hạn chót</p>
                                <p className="text-sm font-semibold text-slate-700">{job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'Không giới hạn'}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-400 mb-1">Lượt xem</p>
                                <p className="text-sm font-semibold text-slate-700">Gần đây</p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8 animate-fadeInUp delay-100">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary !text-xl">description</span>
                            Mô tả công việc
                        </h2>
                        <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                            {job.description}
                        </div>
                    </div>

                    {/* Detailed address card */}
                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8 animate-fadeInUp delay-100">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary !text-xl">location_on</span>
                            Địa điểm làm việc cụ thể
                        </h2>
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([job.address, job.district, job.city].filter(Boolean).join(', '))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 hover:bg-blue-50/40 border border-slate-150 hover:border-blue-200 transition-all group cursor-pointer"
                            title="Xem bản đồ & chỉ đường trên Google Maps"
                        >
                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-primary flex-shrink-0 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                                <span className="material-symbols-outlined !text-xl">
                                    location_on
                                </span>
                            </div>
                            <div className="min-w-0 flex-1">
                                {job.branchName && (
                                    <p className="text-sm font-bold text-slate-800 mb-1 group-hover:text-primary transition-colors">
                                        Chi nhánh: {job.branchName}
                                    </p>
                                )}
                                <p className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                                    {job.address ? `${job.address}, ` : ''}{job.district ? `${job.district}, ` : ''}{job.city}
                                </p>
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary group-hover:text-blue-600 mt-2 uppercase tracking-wider transition-colors">
                                    <span className="material-symbols-outlined !text-sm">directions</span> Chỉ đường trên Google Maps
                                </span>
                            </div>
                        </a>
                    </div>

                    {/* Shifts */}
                    {job.shifts && job.shifts.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8 animate-fadeInUp delay-150">
                            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary !text-xl">schedule</span>
                                Ca làm việc
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {job.shifts.map(shift => (
                                    <div key={shift.shiftId} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-primary">
                                            <span className="material-symbols-outlined !text-xl">timer</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{shift.shiftName}</p>
                                            {shift.startTime && (
                                                <p className="text-xs text-slate-500">{shift.startTime} - {shift.endTime}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Requirements */}
                    {job.requirements && (
                        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8 animate-fadeInUp delay-200">
                            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary !text-xl">checklist</span>
                                Yêu cầu công việc
                            </h2>
                            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                                {job.requirements}
                            </div>
                        </div>
                    )}

                    {/* Benefits */}
                    {job.benefits && (
                        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8 animate-fadeInUp delay-300">
                            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary !text-xl">redeem</span>
                                Quyền lợi
                            </h2>
                            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                                {job.benefits}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT SIDEBAR */}
                <aside className="space-y-5">
                    {/* Apply card */}
                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 sticky top-24 animate-fadeInUp">
                        <div className="text-center mb-5">
                            <p className="text-xs text-slate-400 mb-1">Mức lương</p>
                            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                                {job.payRate?.toLocaleString()}₫
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{translatePayUnit(job.payUnit)}</p>
                        </div>
                        <button
                            onClick={handleApplyClick}
                            disabled={isApplicant && !!applicationStatus && !canReapply}
                            className={`w-full h-12 rounded-xl text-sm font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 mb-3 ${
                                isApplicant && applicationStatus && !canReapply
                                    ? 'bg-slate-300 shadow-none cursor-not-allowed'
                                    : 'bg-gradient-to-r from-primary to-primary-dk shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5'
                            }`}
                        >
                            <span className="material-symbols-outlined !text-xl">send</span>
                            {isApplicant && applicationStatus
                                ? (canReapply ? 'Ứng tuyển lại ngay' : `Đã ứng tuyển: ${applicationStatus}`)
                                : 'Ứng tuyển ngay'}
                        </button>
                        {isApplicant && (
                            <button
                                onClick={handleToggleSave}
                                className={`w-full h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isSaved
                                        ? 'bg-rose-50 text-rose-500 border border-rose-100 shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                <span className={`material-symbols-outlined !text-xl ${isSaved ? 'filled' : ''}`}>
                                    {isSaved ? 'favorite' : 'bookmark_border'}
                                </span>
                                {isSaved ? 'Đã lưu việc' : 'Lưu việc'}
                            </button>
                        )}
                        <button
                            onClick={() => setShowReportModal(true)}
                            className="w-full mt-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest"
                        >
                            <span className="material-symbols-outlined !text-sm">flag</span>
                            Báo cáo việc làm này
                        </button>
                    </div>

                    {/* Employer Reputation & Trust Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 animate-fadeInUp delay-75">
                        <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined !text-[18px] text-primary">verified_user</span>
                            Độ uy tín tuyển dụng
                        </h3>
                        <div className="space-y-4">
                            {/* Reputation score display */}
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">Điểm uy tín</p>
                                    <p className="text-sm font-bold text-slate-700">Doanh nghiệp</p>
                                </div>
                                <div className="flex items-baseline gap-0.5">
                                    <span className={`text-3xl font-black ${
                                        (job.employerReputationScore ?? 100) >= 90
                                            ? 'text-emerald-500'
                                            : (job.employerReputationScore ?? 100) >= 80
                                            ? 'text-amber-500'
                                            : 'text-rose-500'
                                    }`}>
                                        {job.employerReputationScore ?? 100}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium">/100</span>
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div className="flex items-center justify-between text-xs pt-1">
                                <span className="text-slate-400 font-medium">Trạng thái:</span>
                                {job.employerStatus === 'Suspended' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-100 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                        Tạm dừng hoạt động
                                    </span>
                                ) : (job.employerReputationScore ?? 100) < 90 ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        Đang bị cảnh báo
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Hoạt động tích cực
                                    </span>
                                )}
                            </div>

                            {/* Report count warning */}
                            {(job.employerReportCount ?? 0) > 0 && (
                                <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-100/50 flex items-start gap-2.5 mt-2">
                                    <span className="material-symbols-outlined text-rose-500 !text-[18px] mt-0.5 animate-bounce">warning</span>
                                    <div className="text-xs">
                                        <p className="font-bold text-rose-700">Đã bị báo cáo {job.employerReportCount} lần</p>
                                        <p className="text-slate-500 mt-1 leading-relaxed">
                                            Doanh nghiệp này đã nhận các khiếu nại từ người lao động. Vui lòng xem xét cẩn thận trước khi hợp tác.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </main>

            {/* Models */}
            <ReportModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                entityId={parseInt(id)}
                entityType="Job"
                entityTitle={job.title}
            />

            {/* Apply Modal */}
            {showApplyModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scaleIn">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-800">Nộp đơn ứng tuyển</h3>
                            <button onClick={() => setShowApplyModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={submitApplication} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Thư giới thiệu (Không bắt buộc)</label>
                                <textarea
                                    className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-sm"
                                    placeholder="Hãy giới thiệu lý do bạn là ứng viên phù hợp cho công việc này..."
                                    value={coverMessage}
                                    onChange={(e) => setCoverMessage(e.target.value)}
                                ></textarea>
                            </div>
                            <div className="pt-2">
                                <button
                                    disabled={applying}
                                    type="submit"
                                    className="w-full h-12 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-primary-dk transition-all disabled:opacity-50"
                                >
                                    {applying ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined !text-xl">send</span>
                                            Gửi đơn ứng tuyển
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-center text-slate-400 mt-4 px-4 uppercase tracking-widest font-bold">
                                    Nhà tuyển dụng sẽ nhận được thông tin hồ sơ của bạn
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobDetails;
