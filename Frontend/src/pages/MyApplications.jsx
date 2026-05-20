import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import ReviewModal from '../components/shared/ReviewModal';

const MyApplications = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedForReview, setSelectedForReview] = useState(null);
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            setLoading(false);
            navigate('/login');
            return;
        }
        fetchApplications();
    }, [token, navigate]);

    const fetchApplications = async () => {
        try {
            const response = await api.get('/application/my', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setApplications(response.data);
        } catch (error) {
            console.error('Error fetching applications:', error);
            toast.error('Could not load your applications.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReview = (app) => {
        setSelectedForReview({
            revieweeId: app.employerId,
            revieweeName: app.companyName,
            jobPostId: app.jobPostId,
            jobTitle: app.jobTitle
        });
        setShowReviewModal(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
            case 'Applied': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
            case 'Under Review': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Interview Scheduled': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'Accepted': return 'bg-green-50 text-green-600 border-green-100';
            case 'Offered': return 'bg-violet-50 text-violet-600 border-violet-100';
            case 'Hired': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'Rejected': return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-bg-light min-h-screen pb-20 font-display">
            {/* Header section */}
            <div className="bg-white border-b border-slate-200/60 pb-10 pt-8">
                <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">My Applications</h1>
                    <p className="text-slate-500 mt-2">Track the progress of your job applications in one place.</p>
                </div>
            </div>

            <main className="max-w-[1320px] mx-auto px-6 lg:px-10 mt-10">
                {applications.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-20 text-center animate-fadeInUp">
                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-slate-300 !text-4xl">folder_open</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-700">No applications yet</h2>
                        <p className="text-slate-500 mt-2 mb-8">You haven't applied for any jobs yet. Start your journey today!</p>
                        <Link 
                            to="/jobs" 
                            className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
                        >
                            Find Jobs
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 animate-fadeInUp">
                        {/* Table Header (Hidden on mobile) */}
                        <div className="hidden md:grid grid-cols-[1fr_200px_160px_120px_100px] px-8 py-4 bg-slate-100/50 rounded-2xl text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            <div>Job Info</div>
                            <div>Company</div>
                            <div>Applied Date</div>
                            <div className="text-center">Status</div>
                            <div className="text-right">Actions</div>
                        </div>

                        {/* Application Cards */}
                        {applications.map((app) => (
                                <div key={app.applicationId} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow p-6 md:p-8 flex flex-col md:grid md:grid-cols-[1fr_200px_160px_120px_100px] items-center gap-4">
                                    <div className="w-full">
                                        <Link to={`/jobs/${app.jobPostId}`} className="text-lg font-bold text-slate-800 hover:text-primary transition-colors block leading-tight">
                                            {app.jobTitle}
                                        </Link>
                                        <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                                            <span className="material-symbols-outlined !text-[16px]">location_on</span>
                                            {app.location}
                                        </div>
                                    </div>
                                    <div className="w-full text-slate-600 font-semibold md:text-sm text-center md:text-left flex items-center gap-2">
                                        <span className="md:hidden text-xs text-slate-400 font-bold uppercase tracking-widest">Company:</span>
                                        {app.companyName}
                                    </div>
                                    <div className="w-full text-slate-500 md:text-sm text-center md:text-left flex items-center gap-2">
                                       <span className="md:hidden text-xs text-slate-400 font-bold uppercase tracking-widest">Date:</span>
                                        {new Date(app.appliedAt).toLocaleDateString()}
                                    </div>
                                    <div className="w-full flex justify-center">
                                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(app.status)}`}>
                                            {app.status}
                                        </span>
                                    </div>
                                    <div className="w-full flex justify-end gap-2">
                                        {(app.status === 'Accepted' || app.status === 'Hired' || app.canMessage) ? (
                                            <button 
                                                onClick={() => navigate('/messages', { 
                                                    state: { 
                                                        contactId: app.employerId, 
                                                        contactName: app.companyName 
                                                    } 
                                                })}
                                                className="w-10 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center"
                                                title="Chat with Recruiter"
                                            >
                                                <span className="material-symbols-outlined">forum</span>
                                            </button>
                                        ) : (
                                            <button disabled className="w-10 h-10 rounded-xl bg-slate-50 text-slate-200 flex items-center justify-center cursor-not-allowed">
                                                <span className="material-symbols-outlined">forum</span>
                                            </button>
                                        )}
                                        {(app.status === 'Accepted' || app.status === 'Hired') && (
                                            <button 
                                                onClick={() => handleOpenReview(app)}
                                                className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 hover:bg-amber-100 transition-all flex items-center justify-center"
                                                title="Rate Employer"
                                            >
                                                <span className="material-symbols-outlined filled">star</span>
                                            </button>
                                        )}
                                        {app.status === 'Offered' && (
                                            <button
                                                onClick={() => navigate('/offers')}
                                                className="h-10 px-4 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-100 transition-all flex items-center justify-center text-xs font-bold"
                                                title="View Offer"
                                            >
                                                Offer
                                            </button>
                                        )}
                                        {app.status === 'Hired' && (
                                            <button
                                                onClick={() => navigate('/my-work')}
                                                className="h-10 px-4 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all flex items-center justify-center text-xs font-bold"
                                                title="View Work"
                                            >
                                                Work
                                            </button>
                                        )}
                                    </div>
                                </div>
                        ))}
                    </div>
                )}
            </main>

            <ReviewModal 
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                {...selectedForReview}
            />
        </div>
    );
};

export default MyApplications;
