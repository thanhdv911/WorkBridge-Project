import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API_BASE_URL, getApiErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../../services/signalrService';
import ReportModal from '../shared/ReportModal';
import ReviewModal from '../shared/ReviewModal';
import GoongAddressPicker from '../shared/GoongAddressPicker';
import { parseStoredGoongAddress } from '../../services/goongAddressService';

const getLocalDateTimeString = (date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const defaultInterviewTime = () => {
    const value = new Date(Date.now() + 2 * 60 * 60 * 1000 + 10 * 60 * 1000);
    value.setMinutes(0, 0, 0);
    return getLocalDateTimeString(value);
};

const formatVND = (value) => {
    if (value === undefined || value === null || value === '') return '';
    const clean = String(value).replace(/\D/g, '');
    if (!clean) return '';
    return parseInt(clean, 10).toLocaleString('de-DE');
};

const parseVND = (formattedValue) => {
    if (!formattedValue) return 0;
    return Number(String(formattedValue).replace(/\D/g, ''));
};

const decisionStatuses = ['Applied', 'Pending', 'Under Review'];

const getStatusText = (status) => {
    switch (status) {
        case 'Pending':
        case 'Applied':
            return 'Đang chờ duyệt';
        case 'Under Review':
            return 'Đang xem xét';
        case 'Interview Scheduled':
            return 'Đã hẹn phỏng vấn';
        case 'Interview Passed':
            return 'Đạt phỏng vấn';
        case 'Accepted':
            return 'Đã chấp nhận';
        case 'Offered':
            return 'Đã gửi lời mời';
        case 'Hired':
            return 'Đã tuyển dụng';
        case 'Rejected':
            return 'Đã từ chối';
        default:
            return status;
    }
};

const EmployerApplicantReview = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [branches, setBranches] = useState([]);
    const [sendingOffer, setSendingOffer] = useState(false);
    const [cancelingOffer, setCancelingOffer] = useState(false);
    const [schedulingInterview, setSchedulingInterview] = useState(false);
    const [shiftTemplates, setShiftTemplates] = useState([]);
    const [selectedShifts, setSelectedShifts] = useState([]);
    const [offerForm, setOfferForm] = useState({
        branchId: '',
        position: '',
        hourlyRate: 20000,
        startDate: '',
        paydayOfMonth: 5
    });
    const [interviewForm, setInterviewForm] = useState({
        scheduledAt: defaultInterviewTime(),
        location: '',
        note: ''
    });
    const parsedInterviewLocation = parseStoredGoongAddress(interviewForm.location || '');
    const [selectedForReview, setSelectedForReview] = useState(null);
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    useEffect(() => {
        fetchApplications();
        fetchBranches();
        fetchShiftTemplates();

        const handleApplicationChanged = () => fetchApplications();
        signalRService.on('ApplicationChanged', handleApplicationChanged);
        signalRService.on('OfferStatusChanged', handleApplicationChanged);
        signalRService.on('InterviewStatusChanged', handleApplicationChanged);
        return () => {
            signalRService.off('ApplicationChanged', handleApplicationChanged);
            signalRService.off('OfferStatusChanged', handleApplicationChanged);
            signalRService.off('InterviewStatusChanged', handleApplicationChanged);
        };
    }, []);

    const fetchShiftTemplates = async () => {
        try {
            const response = await api.get('/workforce/shift-timings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShiftTemplates(response.data);
        } catch (err) {
            console.error('Error fetching shift templates:', err);
            setShiftTemplates([
                { shiftName: 'Ca Sáng', startTime: '08:00', endTime: '12:00' },
                { shiftName: 'Ca Trưa', startTime: '12:00', endTime: '16:00' },
                { shiftName: 'Ca Chiều', startTime: '16:00', endTime: '20:00' },
                { shiftName: 'Ca Tối', startTime: '20:00', endTime: '00:00' }
            ]);
        }
    };

    const fetchApplications = async () => {
        try {
            const response = await api.get('/application/employer', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApplications(response.data);
            if (selectedApp) {
                const refreshed = response.data.find(app => app.applicationId === selectedApp.applicationId);
                if (refreshed) setSelectedApp(refreshed);
            }
        } catch (error) {
            console.error('Error fetching applications:', error);
            toast.error('Không thể tải danh sách ứng viên.');
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const response = await api.get('/branches', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(response.data);
            if (response.data[0]) {
                setOfferForm(prev => ({ ...prev, branchId: prev.branchId || response.data[0].branchId }));
            }
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const handleOpenChat = (app = selectedApp) => {
        if (!app) return;
        navigate('/messages', {
            state: {
                contactId: app.applicantId,
                contactName: app.applicantName
            }
        });
    };

    const handleUpdateStatus = async (appId, newStatus, options = {}) => {
        try {
            const response = await api.patch(`/application/${appId}/status`,
                { status: newStatus },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const updatedStatus = response.data?.status || newStatus;
            const nextSelected = selectedApp?.applicationId === appId
                ? { ...selectedApp, status: updatedStatus, canMessage: response.data?.conversationContactId || updatedStatus === 'Accepted' || updatedStatus === 'Hired' }
                : selectedApp;

            setApplications(prev => prev.map(app =>
                app.applicationId === appId
                    ? { ...app, status: updatedStatus, canMessage: nextSelected?.canMessage || app.canMessage }
                    : app
            ));
            setSelectedApp(nextSelected);

            toast.success(`Đã cập nhật trạng thái ứng tuyển thành: ${getStatusText(updatedStatus)}`);

            if (options.openChat && response.data?.conversationContactId) {
                handleOpenChat({
                    ...nextSelected,
                    applicantId: response.data.conversationContactId,
                    applicantName: response.data.conversationContactName || nextSelected?.applicantName
                });
            }
        } catch (error) {
            console.error('Error updating application status:', error);
            toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái hồ sơ ứng tuyển.');
        }
    };

    const handleOpenReview = (app) => {
        setSelectedForReview({
            revieweeId: app.applicantId,
            revieweeName: app.applicantName,
            jobPostId: app.jobPostId,
            jobTitle: app.jobTitle
        });
        setShowReviewModal(true);
    };

    const openOfferModal = () => {
        if (!selectedApp) return;
        if (selectedApp.isEmployee) {
            toast.error('Ứng viên này đã là nhân viên chính thức của bạn.');
            return;
        }
        if (branches.length === 0) {
            toast.error('Vui lòng tạo ít nhất một chi nhánh trước khi gửi lời mời nhận việc.');
            return;
        }
        setOfferForm(prev => ({
            ...prev,
            branchId: prev.branchId || branches[0]?.branchId || '',
            position: prev.position || selectedApp.jobTitle || '',
            startDate: prev.startDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        }));
        setShowOfferModal(true);
    };

    const openInterviewModal = () => {
        if (!selectedApp) return;
        setInterviewForm(prev => ({
            ...prev,
            scheduledAt: prev.scheduledAt || defaultInterviewTime(),
            location: prev.location || ''
        }));
        setShowInterviewModal(true);
    };

    const scheduleInterview = async (e) => {
        e.preventDefault();
        if (!selectedApp) return;

        const selectedTime = new Date(interviewForm.scheduledAt);
        const minTime = new Date(Date.now() + 2 * 60 * 60 * 1000 - 60000);
        if (selectedTime < minTime) {
            toast.error("Lịch phỏng vấn phải được hẹn trước ít nhất 2 giờ!");
            return;
        }

        setSchedulingInterview(true);
        try {
            await api.post('/interviews/chat-invite', {
                contactId: selectedApp.applicantId,
                applicationId: selectedApp.applicationId,
                scheduledAt: selectedTime.toISOString(),
                location: interviewForm.location,
                note: interviewForm.note
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Đã gửi lời mời phỏng vấn qua tin nhắn.');
            setShowInterviewModal(false);
            setSelectedApp(prev => ({ ...prev, status: 'Interview Scheduled', canMessage: true }));
            setApplications(prev => prev.map(app => app.applicationId === selectedApp.applicationId ? { ...app, status: 'Interview Scheduled', canMessage: true } : app));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể lên lịch phỏng vấn.');
        } finally {
            setSchedulingInterview(false);
        }
    };

    const sendOffer = async (e) => {
        e.preventDefault();
        if (!selectedApp) return;
        if (sendingOffer) return;
        if (selectedApp.isEmployee) {
            toast.error('Ứng viên này đã là nhân viên chính thức của bạn.');
            setShowOfferModal(false);
            return;
        }

        const hourlyRate = parseVND(offerForm.hourlyRate);
        const payday = Number(offerForm.paydayOfMonth);

        if (!offerForm.branchId) {
            toast.error('Vui lòng chọn chi nhánh làm việc.');
            return;
        }
        if (!offerForm.position.trim()) {
            toast.error('Vui lòng nhập vị trí làm việc.');
            return;
        }
        if (hourlyRate <= 0) {
            toast.error('Mức lương theo giờ phải lớn hơn 0.');
            return;
        }
        if (!offerForm.startDate) {
            toast.error('Vui lòng chọn ngày bắt đầu làm việc.');
            return;
        }
        if (payday < 1 || payday > 28) {
            toast.error('Ngày trả lương phải nằm trong khoảng 1 - 28.');
            return;
        }

        setSendingOffer(true);
        try {
            const response = await api.post('/offers', {
                applicationId: selectedApp.applicationId,
                branchId: Number(offerForm.branchId),
                position: offerForm.position.trim(),
                hourlyRate,
                startDate: offerForm.startDate,
                paydayOfMonth: payday,
                expectedShifts: selectedShifts.length > 0 ? selectedShifts.join(', ') : null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Đã gửi lời mời nhận việc. Ứng viên cần chấp nhận để trở thành nhân viên.');
            const newOfferId = response.data?.offerId || 0;
            setShowOfferModal(false);
            setSelectedApp(prev => ({ ...prev, status: 'Offered', offerId: newOfferId, offerStatus: 'Sent', hasOffer: true, hasSentOffer: true, hasAcceptedOffer: false, canMessage: true }));
            setApplications(prev => prev.map(app => app.applicationId === selectedApp.applicationId ? { ...app, status: 'Offered', offerId: newOfferId, offerStatus: 'Sent', hasOffer: true, hasSentOffer: true, hasAcceptedOffer: false, canMessage: true } : app));
        } catch (error) {
            console.error('Send offer failed:', error.response?.status, error.response?.data || error.message);
            toast.error(getApiErrorMessage(error, 'Không thể gửi lời mời nhận việc.'));
        } finally {
            setSendingOffer(false);
        }
    };

    const handleCancelOffer = async () => {
        if (!selectedApp) return;
        const offerId = selectedApp.offerId;
        if (!offerId) {
            toast.error('Không tìm thấy ID lời mời. Vui lòng tải lại trang.');
            return;
        }

        if (!window.confirm('Bạn có chắc chắn muốn rút lại/hủy lời mời nhận việc này?')) return;

        setCancelingOffer(true);
        try {
            await api.patch(`/offers/${offerId}/cancel`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Đã rút lại lời mời nhận việc thành công.');
            setSelectedApp(prev => ({ ...prev, status: 'Accepted', offerId: 0, offerStatus: 'Cancelled', hasOffer: false, hasSentOffer: false }));
            setApplications(prev => prev.map(app => app.applicationId === selectedApp.applicationId ? { ...app, status: 'Accepted', offerId: 0, offerStatus: 'Cancelled', hasOffer: false, hasSentOffer: false } : app));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể hủy lời mời nhận việc.');
        } finally {
            setCancelingOffer(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending':
            case 'Applied':
                return 'bg-yellow-50 text-yellow-700 border-yellow-100';
            case 'Under Review':
                return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'Interview Scheduled':
                return 'bg-indigo-50 text-indigo-700 border-indigo-100';
            case 'Interview Passed':
                return 'bg-teal-50 text-teal-700 border-teal-100';
            case 'Accepted':
                return 'bg-green-50 text-green-700 border-green-100';
            case 'Offered':
                return 'bg-violet-50 text-violet-700 border-violet-100';
            case 'Hired':
                return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'Rejected':
                return 'bg-red-50 text-red-700 border-red-100';
            default:
                return 'bg-slate-50 text-slate-800 border-slate-100';
        }
    };

    const isDecisionOpen = (status) => decisionStatuses.includes(status);
    const isAccepted = selectedApp?.status === 'Accepted';
    const canScheduleInterview = selectedApp?.status === 'Accepted' || selectedApp?.status === 'Under Review' || selectedApp?.status === 'Interview Scheduled' || selectedApp?.status === 'Interview Passed';
    const hasSentOffer = selectedApp?.hasSentOffer || selectedApp?.offerStatus === 'Sent' || selectedApp?.offerId > 0;
    const isOffered = selectedApp?.status === 'Offered' || hasSentOffer;
    const isHired = selectedApp?.isEmployee;
    const canSendOfficialOffer = canScheduleInterview && !isHired;
    const skills = selectedApp?.skills || [];
    const experiences = selectedApp?.experiences || [];
    const recentReviews = selectedApp?.recentReviews || [];

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="text-slate-700 mt-4 font-medium">Đang tải danh sách ứng viên...</p>
            </div>
        );
    }

    return (
        <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-6 items-start min-w-0 h-[calc(100vh-140px)]">
            {/* Left side: Applicant List */}
            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden anim-fadeUp flex flex-col h-full min-w-0">
                <div className="px-5 sm:px-6 py-5 border-b border-slate-100 shrink-0">
                    <h2 className="text-xl font-bold text-slate-800">Đánh giá ứng viên</h2>
                    <p className="text-slate-700 text-sm mt-1">Xem thông tin ứng viên, phê duyệt hồ sơ và trò chuyện.</p>
                </div>

                {applications.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-slate-300">group_off</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">Chưa có ứng viên nào</h3>
                        <p className="text-slate-700 mt-1">Khi sinh viên nộp hồ sơ, họ sẽ xuất hiện tại đây.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 overflow-y-auto flex-1 min-h-0">
                        {applications.map((app) => (
                            <button
                                key={app.applicationId}
                                type="button"
                                onClick={() => setSelectedApp(app)}
                                className={`w-full text-left px-5 sm:px-6 py-5 transition-colors hover:bg-slate-50 ${
                                    selectedApp?.applicationId === app.applicationId ? 'bg-primary/5' : 'bg-white'
                                }`}
                            >
                                <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] gap-4 md:items-center min-w-0">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {app.applicantAvatarUrl ? (
                                                <img 
                                                    src={app.applicantAvatarUrl.startsWith('http') ? app.applicantAvatarUrl : `${API_BASE_URL}${app.applicantAvatarUrl}`} 
                                                    alt={app.applicantName} 
                                                    className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-sm border border-slate-200" 
                                                    onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }} 
                                                />
                                            ) : (
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black shrink-0 shadow-sm">
                                                    {app.applicantName?.charAt(0) || 'A'}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-800 truncate">{app.applicantName}</p>
                                                <p className="text-xs text-slate-800 truncate">{app.applicantEmail}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{app.jobTitle}</p>
                                        <p className="text-xs text-slate-800 truncate">{app.applicantMajor || app.university || 'Hồ sơ chưa hoàn thiện'}</p>
                                    </div>

                                    <div className="flex md:justify-end">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(app.status)}`}>
                                            {getStatusText(app.status)}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </section>

            <aside className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6 anim-fadeUp-d1 flex flex-col h-full min-w-0 overflow-y-auto">
                {selectedApp ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            {selectedApp.applicantAvatarUrl ? (
                                <img 
                                    src={selectedApp.applicantAvatarUrl.startsWith('http') ? selectedApp.applicantAvatarUrl : `${API_BASE_URL}${selectedApp.applicantAvatarUrl}`} 
                                    alt={selectedApp.applicantName} 
                                    className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 shadow-lg shadow-slate-200/50 border border-slate-200" 
                                    onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }} 
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-black mx-auto mb-4 shadow-lg shadow-primary/20">
                                    {selectedApp.applicantName?.charAt(0) || 'A'}
                                </div>
                            )}
                            <h3 className="text-xl font-black text-slate-800 tracking-tight break-words">{selectedApp.applicantName}</h3>
                            <p className="text-slate-800 text-sm font-medium break-all">{selectedApp.applicantEmail}</p>
                            <div className="mt-3 flex flex-col items-center gap-1.5">
                                <div className="flex items-center gap-2 justify-center">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(selectedApp.status)}`}>
                                        {getStatusText(selectedApp.status)}
                                    </span>
                                    <span className="text-xs text-slate-800 font-semibold">
                                        {Number(selectedApp.averageRating || 0).toFixed(1)} sao / {selectedApp.totalReviews || 0} đánh giá
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                    <span className="material-symbols-outlined text-amber-500 !text-sm filled">verified_user</span>
                                    <span className="text-xs font-black text-slate-800">
                                        Uy tín: <span className={selectedApp.reputationScore >= 80 ? "text-emerald-600" : "text-rose-500"}>{selectedApp.reputationScore ?? 100} / 100</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100"></div>

                        <div className="space-y-4">
                            <section>
                                <label className="text-[10px] font-black text-primary uppercase tracking-widest block mb-2">Lời nhắn kèm theo</label>
                                <div className="p-4 rounded-2xl bg-slate-50 text-sm text-slate-800 leading-relaxed italic border border-slate-100/80 break-words">
                                    "{selectedApp.coverMessage || 'Không có lời nhắn kèm theo.'}"
                                </div>
                            </section>

                            {selectedApp.cvUrl && (
                                <section>
                                    <label className="text-[10px] font-black text-primary uppercase tracking-widest block mb-2">CV / Hồ sơ</label>
                                    <a
                                        href={`${API_BASE_URL}${selectedApp.cvUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3.5 rounded-2xl bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm group-hover:scale-105 transition-transform shrink-0">
                                            <span className="material-symbols-outlined !text-2xl">picture_as_pdf</span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-slate-700 truncate">CV Ứng viên</div>
                                            <div className="text-[10px] font-bold text-primary flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-xs">visibility</span>
                                                Xem CV
                                            </div>
                                        </div>
                                    </a>
                                </section>
                            )}

                            <section>
                                <label className="text-[10px] font-black text-primary uppercase tracking-widest block mb-2">Kỹ năng</label>
                                {skills.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {skills.slice(0, 8).map((skill, index) => (
                                            <span key={`${skill.skillName || skill}-${index}`} className="px-3 py-1 rounded-full bg-primary/5 text-primary border border-primary/10 text-xs font-bold">
                                                {skill.skillName || skill}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-800">Chưa bổ sung kỹ năng.</p>
                                )}
                            </section>

                            <section>
                                <label className="text-[10px] font-black text-primary uppercase tracking-widest block mb-2">Kinh nghiệm</label>
                                {experiences.length > 0 ? (
                                    <div className="space-y-2">
                                        {experiences.slice(0, 3).map((experience, index) => (
                                            <div key={experience.experienceId || index} className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                                                <p className="text-sm font-bold text-slate-700">{experience.title || 'Kinh nghiệm'}</p>
                                                <p className="text-xs text-slate-800">{experience.companyName || experience.company || 'Chưa ghi rõ công ty'}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-800">Chưa bổ sung kinh nghiệm.</p>
                                )}
                            </section>

                            <section>
                                <label className="text-[10px] font-black text-primary uppercase tracking-widest block mb-2">Đánh giá gần đây</label>
                                {recentReviews.length > 0 ? (
                                    <div className="space-y-2">
                                        {recentReviews.slice(0, 2).map((review, index) => (
                                            <div key={review.reviewId || index} className="rounded-2xl bg-amber-50/50 border border-amber-100 p-3">
                                                <p className="text-xs font-black text-amber-600">{review.rating || 0}/5 sao</p>
                                                <p className="text-xs text-slate-800 mt-1 break-words">{review.comment || 'Không có nhận xét.'}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-800">Chưa có đánh giá nào.</p>
                                )}
                            </section>
                        </div>

                        <div className="space-y-3 pt-2">
                            <button
                                onClick={() => navigate(`/profile/${selectedApp.applicantId}`)}
                                className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-2 border border-slate-200/50"
                            >
                                <span className="material-symbols-outlined !text-[20px]">person</span>
                                Xem hồ sơ chi tiết
                            </button>

                            {isDecisionOpen(selectedApp.status) && (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handleUpdateStatus(selectedApp.applicationId, 'Accepted', { openChat: true })}
                                            className="h-11 rounded-xl bg-green-500 text-white font-bold text-sm shadow-md shadow-green-200 hover:shadow-lg transition-all"
                                        >
                                            Nhận hồ sơ & Chat
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(selectedApp.applicationId, 'Rejected')}
                                            className="h-11 rounded-xl bg-red-50 text-red-500 font-bold text-sm border border-red-100 hover:bg-red-100 transition-all"
                                        >
                                            Từ chối
                                        </button>
                                    </div>
                                    {selectedApp.status !== 'Under Review' && (
                                        <button
                                            onClick={() => handleUpdateStatus(selectedApp.applicationId, 'Under Review')}
                                            className="w-full h-11 rounded-xl bg-slate-100 text-slate-800 font-bold text-sm hover:bg-slate-200 transition-all"
                                        >
                                            Đánh dấu đang xem xét
                                        </button>
                                    )}
                                </>
                            )}

                            {(selectedApp.canMessage || isAccepted || isHired) && (
                                <button
                                    onClick={() => handleOpenChat()}
                                    className="w-full h-11 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                               >
                                    <span className="material-symbols-outlined !text-[20px]">forum</span>
                                    Mở phòng chat
                                </button>
                            )}

                            {isAccepted && (
                                <button
                                    onClick={openInterviewModal}
                                    className="w-full h-11 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm border border-blue-100 hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined !text-[20px]">event</span>
                                    Hẹn lịch phỏng vấn
                                </button>
                            )}

                            {canSendOfficialOffer && (
                                <button
                                    onClick={openOfferModal}
                                    className="w-full h-11 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-200 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined !text-[20px]">contract</span>
                                    Gửi lời mời nhận việc
                                </button>
                            )}

                            {isOffered && (
                                <div className="space-y-3">
                                    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-700 font-semibold space-y-1">
                                        <p>Đã gửi lời mời nhận việc.</p>
                                        {selectedApp.expectedShifts && (
                                            <p className="text-xs text-violet-600 font-bold">
                                                Ca dự kiến: {selectedApp.expectedShifts}
                                            </p>
                                        )}
                                        <p className="text-[11px] opacity-80 pt-1">Ứng viên phải chấp nhận từ trang Lời mời của họ để trở thành nhân viên chính thức.</p>
                                    </div>
                                    <button
                                        onClick={handleCancelOffer}
                                        disabled={cancelingOffer}
                                        className="w-full h-11 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm border border-rose-100 hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined !text-[20px]">cancel</span>
                                        {cancelingOffer ? 'Đang hủy...' : 'Hủy / Rút lại lời mời'}
                                    </button>
                                </div>
                            )}

                            {isHired && (
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700 font-semibold">
                                    Ứng viên này đã chấp nhận lời mời và đã trở thành nhân viên chính thức.
                                </div>
                            )}

                            {(isAccepted || isHired) && (
                                <button
                                    onClick={() => handleOpenReview(selectedApp)}
                                    className="w-full h-11 rounded-xl bg-amber-50 text-amber-600 font-bold text-sm border border-amber-100 hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined filled">star</span>
                                    Đánh giá ứng viên
                                </button>
                            )}

                            <button
                                onClick={() => setShowReportModal(true)}
                                className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-slate-300 hover:text-rose-500 transition-colors uppercase tracking-[0.2em] pt-4"
                            >
                                <span className="material-symbols-outlined !text-sm">flag</span>
                                Báo cáo ứng viên
                            </button>
                        </div>

                        <ReportModal
                            isOpen={showReportModal}
                            onClose={() => setShowReportModal(false)}
                            entityId={selectedApp.applicantId}
                            entityType="User"
                            entityTitle={selectedApp.applicantName}
                        />

                        <ReviewModal
                            isOpen={showReviewModal}
                            onClose={() => setShowReviewModal(false)}
                            {...selectedForReview}
                        />

                        {showInterviewModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                                <form onSubmit={scheduleInterview} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800">Lên lịch phỏng vấn trực tiếp</h3>
                                            <p className="text-sm text-slate-700">Ứng viên có thể chấp nhận hoặc từ chối từ phòng chat.</p>
                                        </div>
                                        <button type="button" onClick={() => setShowInterviewModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <input type="datetime-local" value={interviewForm.scheduledAt} onChange={(e) => setInterviewForm(prev => ({ ...prev, scheduledAt: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                                        <GoongAddressPicker
                                            value={{
                                                address: parsedInterviewLocation.address,
                                                ward: parsedInterviewLocation.ward,
                                                district: parsedInterviewLocation.district,
                                                city: parsedInterviewLocation.city || parsedInterviewLocation.province
                                            }}
                                            onChange={(next, meta) => setInterviewForm(prev => ({ ...prev, location: meta.fullAddress || next.address }))}
                                            label="Địa điểm phỏng vấn"
                                            placeholder="Gõ địa điểm phỏng vấn và chọn từ Goong..."
                                            showMapLink={false}
                                            compact
                                        />
                                        <textarea value={interviewForm.note} onChange={(e) => setInterviewForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Ghi chú" className="w-full min-h-24 px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none" />
                                        <button disabled={schedulingInterview} className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-60">
                                            {schedulingInterview ? 'Đang gửi...' : 'Gửi lời mời phỏng vấn'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {showOfferModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                                <form onSubmit={sendOffer} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800">Gửi lời mời nhận việc chính thức</h3>
                                            <p className="text-sm text-slate-700">Hợp đồng lao động chỉ được tạo sau khi ứng viên chấp nhận.</p>
                                        </div>
                                        <button type="button" onClick={() => setShowOfferModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2 text-xs text-amber-800 leading-relaxed shadow-sm">
                                            <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-0.5">
                                                <span className="material-symbols-outlined !text-[18px]">info</span>
                                                Quy chế & Lưu ý quan trọng
                                            </div>
                                            <p>• <strong>Bản chất lời mời:</strong> Đây là lời mời nhận việc, không phải hợp đồng lao động chính thức. Hợp đồng giấy sẽ được ký trực tiếp bên ngoài nếu cần thiết (công việc part-time đa số không cần ký).</p>
                                            <p>• <strong>Quy định thôi việc:</strong> Theo quy định hệ thống, nhân viên muốn nghỉ việc <strong>phải báo trước ít nhất 15 ngày (nửa tháng)</strong> để quản lý có thời gian sắp xếp nhân sự.</p>
                                        </div>
                                        <select value={offerForm.branchId} onChange={(e) => setOfferForm(prev => ({ ...prev, branchId: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm">
                                            {branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
                                        </select>
                                        <input value={offerForm.position} onChange={(e) => setOfferForm(prev => ({ ...prev, position: e.target.value }))} placeholder="Chức vụ / Vị trí" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                                        <input type="text" value={formatVND(offerForm.hourlyRate)} onChange={(e) => setOfferForm(prev => ({ ...prev, hourlyRate: formatVND(e.target.value) }))} placeholder="Mức lương theo giờ (VNĐ)" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                                        <input type="date" value={offerForm.startDate} onChange={(e) => setOfferForm(prev => ({ ...prev, startDate: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                                        <input type="number" min="1" max="28" value={offerForm.paydayOfMonth} onChange={(e) => setOfferForm(prev => ({ ...prev, paydayOfMonth: e.target.value }))} placeholder="Ngày nhận lương trong tháng (1 - 28)" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-primary uppercase tracking-widest block">
                                                Ca làm việc dự kiến
                                            </label>
                                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100">
                                                {shiftTemplates.map((t, idx) => {
                                                    const val = `${t.shiftName} (${t.startTime}-${t.endTime})`;
                                                    const isChecked = selectedShifts.includes(val);
                                                    return (
                                                        <label
                                                            key={idx}
                                                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                                                                isChecked
                                                                    ? 'bg-primary/5 border-primary/20 text-primary'
                                                                    : 'bg-white border-slate-100 text-slate-800 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => {
                                                                    if (isChecked) {
                                                                        setSelectedShifts(prev => prev.filter(s => s !== val));
                                                                    } else {
                                                                        setSelectedShifts(prev => [...prev, val]);
                                                                    }
                                                                }}
                                                                className="rounded text-primary focus:ring-primary border-slate-300 w-3.5 h-3.5"
                                                            />
                                                            <span className="truncate">
                                                                {t.shiftName}
                                                                <span className="text-[10px] opacity-70 block font-normal">{t.startTime} - {t.endTime}</span>
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <button disabled={sendingOffer} className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-60">
                                            {sendingOffer ? 'Đang gửi...' : 'Gửi lời mời'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-96 flex flex-col items-center justify-center text-center opacity-50">
                        <span className="material-symbols-outlined !text-6xl text-slate-300 mb-4 font-thin">contact_page</span>
                        <p className="font-bold text-slate-800">Chọn một ứng viên để xem chi tiết hồ sơ</p>
                    </div>
                )}
            </aside>
        </div>
    );
};

export default EmployerApplicantReview;
