import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ReportModal from '../shared/ReportModal';
import ReviewModal from '../shared/ReviewModal';
import EContractModal from '../shared/EContractModal';

const EmployerApplicantReview = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedForReview, setSelectedForReview] = useState(null);
    const [showContractModal, setShowContractModal] = useState(false);
    const [statusModal, setStatusModal] = useState({ isOpen: false, status: '', note: '' });
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const response = await api.get('/application/employer', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApplications(response.data);
        } catch (error) {
            console.error('Error fetching applications:', error);
            toast.error('Could not load applicant list.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = (newStatus) => {
        setStatusModal({ isOpen: true, status: newStatus, note: '' });
    };

    const submitStatusUpdate = async () => {
        try {
            await api.patch(`/application/${selectedApp.applicationId}/status`, 
                JSON.stringify({ status: statusModal.status, note: statusModal.note }), 
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            toast.success(`Application marked as ${statusModal.status}`);
            
            // Update local selectedApp temporarily to reflect new status & history
            setSelectedApp(prev => ({ 
                ...prev, 
                status: statusModal.status,
                histories: [...(prev.histories || []), { status: statusModal.status, note: statusModal.note, createdAt: new Date().toISOString() }]
            }));
            
            setStatusModal({ isOpen: false, status: '', note: '' });
            fetchApplications();
        } catch (error) {
            console.error('Error updating application status:', error);
            toast.error('Failed to update status.');
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
            case 'Under Review': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Accepted': return 'bg-green-50 text-green-600 border-green-100';
            case 'Rejected': return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="text-slate-500 mt-4 font-medium">Loading applications...</p>
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden anim-fadeUp">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Applicant Review</h2>
                        <p className="text-slate-500 text-sm mt-1">Review profiles and evaluate candidates for your jobs.</p>
                    </div>
                </div>

                {applications.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-slate-300">group_off</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">No applicants yet</h3>
                        <p className="text-slate-500 mt-1">When students apply, they will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">Student Info</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Job Title</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Status</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {applications.map((app) => (
                                    <tr 
                                        key={app.applicationId} 
                                        className={`hover:bg-slate-50/30 transition-colors cursor-pointer ${selectedApp?.applicationId === app.applicationId ? 'bg-primary/5' : ''}`}
                                        onClick={() => setSelectedApp(app)}
                                    >
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-slate-800 whitespace-nowrap">{app.applicantName}</div>
                                            <div className="text-xs text-slate-400 mt-1 whitespace-nowrap">{app.applicantMajor}</div>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-semibold text-slate-600 whitespace-nowrap">
                                            {app.jobTitle}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(app.status)}`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all flex items-center justify-center ml-auto">
                                                <span className="material-symbols-outlined !text-[18px]">visibility</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Application Detail View */}
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-8 anim-fadeUp-d1 lg:sticky lg:top-24">
                {selectedApp ? (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-black mx-auto mb-4 shadow-lg shadow-primary/20">
                                {selectedApp.applicantName.charAt(0)}
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">{selectedApp.applicantName}</h3>
                            <p className="text-slate-400 text-sm font-medium">{selectedApp.applicantEmail}</p>
                        </div>

                        <div className="h-px bg-slate-100"></div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Education</label>
                                <p className="text-sm font-bold text-slate-700">{selectedApp.applicantMajor}</p>
                                <p className="text-xs text-slate-400 font-medium">Class: {selectedApp.studyYear}</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Cover Message</label>
                                <div className="p-4 rounded-2xl bg-slate-50 text-sm text-slate-600 leading-relaxed italic border border-slate-100">
                                    "{selectedApp.coverMessage || "No cover message provided."}"
                                </div>
                            </div>
                            {selectedApp.cvUrl && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Curriculum Vitae (CV)</label>
                                    <a 
                                        href={`http://localhost:5029${selectedApp.cvUrl}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined !text-2xl">picture_as_pdf</span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-700">Applicant_CV.pdf</div>
                                            <div className="text-[10px] font-bold text-primary flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-xs">visibility</span>
                                                Click to view Resume
                                            </div>
                                        </div>
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 pt-4">
                            {/* Application History Timeline */}
                            <div className="mt-6 mb-4">
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-4">Application History</label>
                                <div className="pl-3 border-l-2 border-slate-100 space-y-4">
                                    {selectedApp.histories?.map((history, idx) => (
                                        <div key={idx} className="relative">
                                            <div className={`absolute -left-[17px] top-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(history.status).split(' ')[0]}`}></div>
                                            <div className="flex flex-col">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-bold text-slate-700">{history.status}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold">{new Date(history.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                {history.note && <div className="text-xs text-slate-500 mt-1 p-2 bg-slate-50 rounded-lg">"{history.note}"</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 border-t border-slate-100 pt-4">
                                <button 
                                    onClick={() => handleUpdateStatus('Accepted')}
                                    className="flex-1 h-11 rounded-xl bg-green-500 text-white font-bold text-sm shadow-md shadow-green-200 hover:shadow-lg transition-all"
                                >
                                    Accept
                                </button>
                                <button 
                                    onClick={() => handleUpdateStatus('Rejected')}
                                    className="flex-1 h-11 rounded-xl bg-red-50 text-red-500 font-bold text-sm border border-red-100 hover:bg-red-100 transition-all"
                                >
                                    Reject
                                </button>
                            </div>
                            <button 
                                onClick={() => handleUpdateStatus('Interview Scheduled')}
                                className="w-full h-11 rounded-xl bg-blue-50 text-blue-600 font-bold text-sm border border-blue-100 hover:bg-blue-100 transition-all"
                            >
                                Schedule Interview
                            </button>
                            <button 
                                onClick={() => handleUpdateStatus('Under Review')}
                                className="w-full h-11 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all"
                            >
                                Mark as Under Review
                            </button>

                            {selectedApp.status === 'Accepted' && (
                                <button 
                                    onClick={() => setShowContractModal(true)}
                                    className="w-full h-11 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined !text-[20px]">contract</span>
                                    View E-Contract
                                </button>
                            )}

                            {/* Message Button */}
                            {(selectedApp.status === 'Accepted' || selectedApp.status === 'Under Review') && (
                                <button 
                                    onClick={() => navigate('/messages', { 
                                        state: { 
                                            contactId: selectedApp.applicantId, 
                                            contactName: selectedApp.applicantName 
                                        } 
                                    })}
                                    className="w-full h-11 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined !text-[20px]">forum</span>
                                    Message Applicant
                                </button>
                            )}
                            
                            {selectedApp.status === 'Accepted' && (
                                <button 
                                    onClick={() => handleOpenReview(selectedApp)}
                                    className="w-full h-11 rounded-xl bg-amber-50 text-amber-600 font-bold text-sm border border-amber-100 hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined filled">star</span>
                                    Rate Student
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

                        <EContractModal
                            isOpen={showContractModal}
                            onClose={() => setShowContractModal(false)}
                            applicationId={selectedApp.applicationId}
                        />

                        {/* Status Update Modal */}
                        {statusModal.isOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                                <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Update Status to {statusModal.status}</h3>
                                    <p className="text-slate-500 text-sm mb-4">Add a note for the applicant (optional but recommended for interviews/rejections).</p>
                                    
                                    <textarea
                                        value={statusModal.note}
                                        onChange={(e) => setStatusModal({ ...statusModal, note: e.target.value })}
                                        placeholder={statusModal.status === 'Interview Scheduled' ? "E.g., 2:00 PM tomorrow at Highlands Coffee..." : "Add a note..."}
                                        className="w-full p-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none resize-none h-32 mb-4"
                                    ></textarea>
                                    
                                    <div className="flex gap-3 justify-end">
                                        <button 
                                            onClick={() => setStatusModal({ isOpen: false, status: '', note: '' })}
                                            className="px-6 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={submitStatusUpdate}
                                            className="px-6 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-dk shadow-md shadow-primary/20"
                                        >
                                            Confirm Update
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-96 flex flex-col items-center justify-center text-center opacity-40">
                         <span className="material-symbols-outlined !text-6xl text-slate-300 mb-4 font-thin">contact_page</span>
                         <p className="font-bold text-slate-400">Select an applicant to<br/>view full profile details</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployerApplicantReview;
