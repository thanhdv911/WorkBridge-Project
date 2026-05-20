import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../../services/signalrService';
import ReportModal from '../shared/ReportModal';
import ReviewModal from '../shared/ReviewModal';

const decisionStatuses = ['Applied', 'Pending', 'Under Review'];

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
    const [schedulingInterview, setSchedulingInterview] = useState(false);
    const [offerForm, setOfferForm] = useState({
        branchId: '',
        position: '',
        hourlyRate: 20000,
        startDate: '',
        paydayOfMonth: 5
    });
    const [interviewForm, setInterviewForm] = useState({
        scheduledAt: '',
        location: '',
        note: ''
    });
    const [selectedForReview, setSelectedForReview] = useState(null);
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    useEffect(() => {
        fetchApplications();
        fetchBranches();

        const handleApplicationChanged = () => fetchApplications();
        signalRService.on('ApplicationChanged', handleApplicationChanged);
        return () => signalRService.off('ApplicationChanged', handleApplicationChanged);
    }, []);

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
            toast.error('Could not load applicant list.');
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

            toast.success(`Application marked as ${updatedStatus}`);

            if (options.openChat && response.data?.conversationContactId) {
                handleOpenChat({
                    ...nextSelected,
                    applicantId: response.data.conversationContactId,
                    applicantName: response.data.conversationContactName || nextSelected?.applicantName
                });
            }
        } catch (error) {
            console.error('Error updating application status:', error);
            toast.error(error.response?.data?.message || 'Failed to update status.');
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
        if (branches.length === 0) {
            toast.error('Create a branch before sending an offer.');
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
        const defaultTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        defaultTime.setMinutes(0, 0, 0);
        setInterviewForm(prev => ({
            ...prev,
            scheduledAt: prev.scheduledAt || defaultTime.toISOString().slice(0, 16),
            location: prev.location || ''
        }));
        setShowInterviewModal(true);
    };

    const scheduleInterview = async (e) => {
        e.preventDefault();
        if (!selectedApp) return;
        setSchedulingInterview(true);
        try {
            await api.post('/interviews/chat-invite', {
                contactId: selectedApp.applicantId,
                applicationId: selectedApp.applicationId,
                scheduledAt: interviewForm.scheduledAt,
                location: interviewForm.location,
                note: interviewForm.note
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Interview invitation sent in chat.');
            setShowInterviewModal(false);
            setSelectedApp(prev => ({ ...prev, status: 'Interview Scheduled', canMessage: true }));
            setApplications(prev => prev.map(app => app.applicationId === selectedApp.applicationId ? { ...app, status: 'Interview Scheduled', canMessage: true } : app));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not schedule interview.');
        } finally {
            setSchedulingInterview(false);
        }
    };

    const sendOffer = async (e) => {
        e.preventDefault();
        if (!selectedApp) return;
        setSendingOffer(true);
        try {
            await api.post('/offers', {
                applicationId: selectedApp.applicationId,
                branchId: Number(offerForm.branchId),
                position: offerForm.position,
                hourlyRate: Number(offerForm.hourlyRate),
                startDate: offerForm.startDate,
                paydayOfMonth: Number(offerForm.paydayOfMonth)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Offer sent. Applicant must accept it to become an employee.');
            setShowOfferModal(false);
            setSelectedApp(prev => ({ ...prev, status: 'Offered', canMessage: true }));
            setApplications(prev => prev.map(app => app.applicationId === selectedApp.applicationId ? { ...app, status: 'Offered', canMessage: true } : app));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not send offer.');
        } finally {
            setSendingOffer(false);
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
                return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const isDecisionOpen = (status) => decisionStatuses.includes(status);
    const isAccepted = selectedApp?.status === 'Accepted';
    const canScheduleInterview = selectedApp?.status === 'Accepted' || selectedApp?.status === 'Under Review' || selectedApp?.status === 'Interview Scheduled' || selectedApp?.status === 'Interview Passed';
    const isOffered = selectedApp?.status === 'Offered';
    const isHired = selectedApp?.status === 'Hired';
    const skills = selectedApp?.skills || [];
    const experiences = selectedApp?.experiences || [];
    const recentReviews = selectedApp?.recentReviews || [];

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="text-slate-500 mt-4 font-medium">Loading applications...</p>
            </div>
        );
    }

    return (
        <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-6 items-start min-w-0">
            <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden anim-fadeUp min-w-0">
                <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Applicant Review</h2>
                    <p className="text-slate-500 text-sm mt-1">Review applicant profiles, accept candidates, and open chat.</p>
                </div>

                {applications.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-slate-300">group_off</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">No applicants yet</h3>
                        <p className="text-slate-500 mt-1">When students apply, they will appear here.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
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
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black shrink-0">
                                                {app.applicantName?.charAt(0) || 'A'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-800 truncate">{app.applicantName}</p>
                                                <p className="text-xs text-slate-400 truncate">{app.applicantEmail}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{app.jobTitle}</p>
                                        <p className="text-xs text-slate-400 truncate">{app.applicantMajor || app.university || 'Profile not completed'}</p>
                                    </div>

                                    <div className="flex md:justify-end">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(app.status)}`}>
                                            {app.status}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </section>

            <aside className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6 anim-fadeUp-d1 xl:sticky xl:top-24 min-w-0">
                {selectedApp ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-black mx-auto mb-4 shadow-lg shadow-primary/20">
                                {selectedApp.applicantName?.charAt(0) || 'A'}
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight break-words">{selectedApp.applicantName}</h3>
                            <p className="text-slate-400 text-sm font-medium break-all">{selectedApp.applicantEmail}</p>
                            <div className="mt-3 flex items-center justify-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(selectedApp.status)}`}>
                                    {selectedApp.status}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {Number(selectedApp.averageRating || 0).toFixed(1)} stars / {selectedApp.totalReviews || 0} reviews
                                </span>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100"></div>

                        <div className="space-y-5">
                            <section>
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-2">Applicant Profile</label>
                                <div className="grid gap-2 text-sm">
                                    <p className="text-slate-700"><span className="font-bold">Major:</span> {selectedApp.applicantMajor || 'Not updated'}</p>
                                    <p className="text-slate-700"><span className="font-bold">University:</span> {selectedApp.university || 'Not updated'}</p>
                                    <p className="text-slate-700"><span className="font-bold">Class:</span> {selectedApp.studyYear || 'Not updated'}</p>
                                    <p className="text-slate-700"><span className="font-bold">Phone:</span> {selectedApp.phone || 'Not updated'}</p>
                                    <p className="text-slate-700"><span className="font-bold">Availability:</span> {selectedApp.availability || 'Not updated'}</p>
                                </div>
                            </section>

                            <section>
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-2">About</label>
                                <div className="p-4 rounded-2xl bg-slate-50 text-sm text-slate-600 leading-relaxed border border-slate-100">
                                    {selectedApp.aboutMe || 'This applicant has not added an introduction yet.'}
                                </div>
                            </section>

                            <section>
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-2">Cover Message</label>
                                <div className="p-4 rounded-2xl bg-slate-50 text-sm text-slate-600 leading-relaxed italic border border-slate-100 break-words">
                                    "{selectedApp.coverMessage || 'No cover message provided.'}"
                                </div>
                            </section>

                            <section>
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-2">Skills</label>
                                {skills.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {skills.map(skill => (
                                            <span key={skill} className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400">No skills added yet.</p>
                                )}
                            </section>

                            <section>
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-2">Experience</label>
                                {experiences.length > 0 ? (
                                    <div className="space-y-3">
                                        {experiences.map((exp, index) => (
                                            <div key={`${exp.title}-${index}`} className="p-3 rounded-2xl border border-slate-100 bg-white">
                                                <p className="text-sm font-bold text-slate-800">{exp.title}</p>
                                                <p className="text-xs text-slate-500">{exp.companyName} {exp.duration ? `- ${exp.duration}` : ''}</p>
                                                {exp.description && <p className="text-xs text-slate-500 mt-2 leading-relaxed">{exp.description}</p>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400">No experience added yet.</p>
                                )}
                            </section>

                            <section>
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-2">Reviews</label>
                                {recentReviews.length > 0 ? (
                                    <div className="space-y-3">
                                        {recentReviews.map((review, index) => (
                                            <div key={`${review.reviewerName}-${index}`} className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{review.reviewerName}</p>
                                                    <span className="text-xs font-black text-amber-600">{review.rating}/5</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{review.jobTitle}</p>
                                                {review.comment && <p className="text-xs text-slate-600 mt-2 leading-relaxed">{review.comment}</p>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400">No reviews yet.</p>
                                )}
                            </section>

                            {selectedApp.cvUrl && (
                                <section>
                                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-2">CV</label>
                                    <a
                                        href={`http://localhost:5029${selectedApp.cvUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm group-hover:scale-105 transition-transform">
                                            <span className="material-symbols-outlined !text-2xl">picture_as_pdf</span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-slate-700 truncate">Applicant CV</div>
                                            <div className="text-[10px] font-bold text-primary flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-xs">visibility</span>
                                                Open resume
                                            </div>
                                        </div>
                                    </a>
                                </section>
                            )}
                        </div>

                        <div className="space-y-3 pt-2">
                            {isDecisionOpen(selectedApp.status) && (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handleUpdateStatus(selectedApp.applicationId, 'Accepted', { openChat: true })}
                                            className="h-11 rounded-xl bg-green-500 text-white font-bold text-sm shadow-md shadow-green-200 hover:shadow-lg transition-all"
                                        >
                                            Accept & Chat
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(selectedApp.applicationId, 'Rejected')}
                                            className="h-11 rounded-xl bg-red-50 text-red-500 font-bold text-sm border border-red-100 hover:bg-red-100 transition-all"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                    {selectedApp.status !== 'Under Review' && (
                                        <button
                                            onClick={() => handleUpdateStatus(selectedApp.applicationId, 'Under Review')}
                                            className="w-full h-11 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all"
                                        >
                                            Mark as Under Review
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
                                    Open Chat
                                </button>
                            )}

                            {isAccepted && (
                                <button
                                    onClick={openInterviewModal}
                                    className="w-full h-11 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm border border-blue-100 hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined !text-[20px]">event</span>
                                    Schedule Interview
                                </button>
                            )}

                            {canScheduleInterview && !isOffered && !isHired && (
                                <button
                                    onClick={openOfferModal}
                                    className="w-full h-11 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-200 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined !text-[20px]">contract</span>
                                    Send Official Offer
                                </button>
                            )}

                            {isOffered && (
                                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-700 font-semibold">
                                    Offer sent. The applicant must accept it from their Offers page before they become an employee.
                                </div>
                            )}

                            {isHired && (
                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700 font-semibold">
                                    This applicant accepted the offer and is now a real employee record.
                                </div>
                            )}

                            {(isAccepted || isHired) && (
                                <button
                                    onClick={() => handleOpenReview(selectedApp)}
                                    className="w-full h-11 rounded-xl bg-amber-50 text-amber-600 font-bold text-sm border border-amber-100 hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined filled">star</span>
                                    Rate Applicant
                                </button>
                            )}

                            <button
                                onClick={() => setShowReportModal(true)}
                                className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-slate-300 hover:text-rose-500 transition-colors uppercase tracking-[0.2em] pt-4"
                            >
                                <span className="material-symbols-outlined !text-sm">flag</span>
                                Report Applicant
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
                                            <h3 className="text-xl font-bold text-slate-800">Schedule Offline Interview</h3>
                                            <p className="text-sm text-slate-500">Applicant can accept or reject from chat.</p>
                                        </div>
                                        <button type="button" onClick={() => setShowInterviewModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <input type="datetime-local" value={interviewForm.scheduledAt} onChange={(e) => setInterviewForm(prev => ({ ...prev, scheduledAt: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                                        <input value={interviewForm.location} onChange={(e) => setInterviewForm(prev => ({ ...prev, location: e.target.value }))} placeholder="Offline location" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                                        <textarea value={interviewForm.note} onChange={(e) => setInterviewForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Note" className="w-full min-h-24 px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none" />
                                        <button disabled={schedulingInterview} className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-60">
                                            {schedulingInterview ? 'Sending...' : 'Send Interview Invitation'}
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
                                            <h3 className="text-xl font-bold text-slate-800">Send Official Offer</h3>
                                            <p className="text-sm text-slate-500">Creates employment only after applicant accepts.</p>
                                        </div>
                                        <button type="button" onClick={() => setShowOfferModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <select value={offerForm.branchId} onChange={(e) => setOfferForm(prev => ({ ...prev, branchId: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm">
                                            {branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
                                        </select>
                                        <input value={offerForm.position} onChange={(e) => setOfferForm(prev => ({ ...prev, position: e.target.value }))} placeholder="Position" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                                        <input type="number" value={offerForm.hourlyRate} onChange={(e) => setOfferForm(prev => ({ ...prev, hourlyRate: e.target.value }))} placeholder="Hourly rate" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                                        <input type="date" value={offerForm.startDate} onChange={(e) => setOfferForm(prev => ({ ...prev, startDate: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                                        <input type="number" min="1" max="28" value={offerForm.paydayOfMonth} onChange={(e) => setOfferForm(prev => ({ ...prev, paydayOfMonth: e.target.value }))} placeholder="Payday of month" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" />
                                        <button disabled={sendingOffer} className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-60">
                                            {sendingOffer ? 'Sending...' : 'Send Offer'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-96 flex flex-col items-center justify-center text-center opacity-50">
                        <span className="material-symbols-outlined !text-6xl text-slate-300 mb-4 font-thin">contact_page</span>
                        <p className="font-bold text-slate-400">Select an applicant to view profile details</p>
                    </div>
                )}
            </aside>
        </div>
    );
};

export default EmployerApplicantReview;
