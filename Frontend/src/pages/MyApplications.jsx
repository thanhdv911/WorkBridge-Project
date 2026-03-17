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
        fetchApplications();
    }, []);

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
            case 'Under Review': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'Accepted': return 'bg-green-50 text-green-600 border-green-100';
            case 'Rejected': return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };
    const getStatusCardBg = (status) => {
        switch (status) {
            case 'Pending': return 'bg-amber-50/40 border-amber-100/50';
            case 'Under Review': return 'bg-blue-50/40 border-blue-100/50';
            case 'Accepted': return 'bg-emerald-50/40 border-emerald-100/50';
            case 'Rejected': return 'bg-rose-50/40 border-rose-100/50';
            default: return 'bg-slate-50/40 border-slate-100/50';
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
        <div className="bg-[#FDFDFF] min-h-screen pb-20 font-display relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            <div className="absolute bottom-1/4 -left-20 w-[400px] h-[400px] bg-accent/[0.03] rounded-full blur-[100px] pointer-events-none"></div>
            
            {/* Header section with Glass Effect */}
            <div className="relative z-10 bg-white/60 backdrop-blur-xl border-b border-slate-200/50 pb-12 pt-10">
                <div className="max-w-[1320px] mx-auto px-6 lg:px-10">
                    <div className="anim-fadeUp inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider mb-4">
                        <span className="material-symbols-outlined !text-sm">analytics</span>
                        Your Journey
                    </div>
                    <h1 className="anim-fadeUp-d1 text-4xl font-black text-slate-900 tracking-tight leading-none">
                        My <span className="grad-text">Applications</span>
                    </h1>
                    <p className="anim-fadeUp-d2 text-slate-500 mt-4 text-lg max-w-xl font-medium">
                        Track your progress, manage interviews, and land your next flexible role with ease.
                    </p>
                </div>
            </div>

            <main className="relative z-10 max-w-[1320px] mx-auto px-6 lg:px-10 mt-12">
                {applications.length === 0 ? (
                    <div className="bg-white/80 backdrop-blur-md rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 p-20 text-center animate-fadeInUp">
                        <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <span className="material-symbols-outlined text-slate-300 !text-5xl">auto_stories</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Your story starts here</h2>
                        <p className="text-slate-500 mt-3 mb-10 max-w-sm mx-auto font-medium leading-relaxed">You haven't applied for any jobs yet. Browse thousands of student-friendly roles today.</p>
                        <Link 
                            to="/jobs" 
                            className="inline-flex items-center gap-3 h-14 px-10 rounded-2xl bg-gradient-to-r from-primary to-primary-dk text-white font-black shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-1 active:scale-95"
                        >
                            Explore Opportunities <span className="material-symbols-outlined !text-xl">arrow_forward</span>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeInUp">
                        {/* Application Cards */}
                        {applications.map((app, i) => (
                            <div 
                                key={app.applicationId} 
                                className={`group relative ${getStatusCardBg(app.status)} rounded-[2.5rem] border shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2 p-1`}
                                style={{ animationDelay: `${i * 0.1}s` }}
                            >
                                <div className="bg-white/40 backdrop-blur-md rounded-[2.3rem] p-8 h-full flex flex-col">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary font-black text-xl shadow-sm group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                                                {app.companyName.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div>
                                                <Link to={`/jobs/${app.jobPostId}`} className="text-xl font-black text-slate-800 hover:text-primary transition-colors block leading-tight">
                                                    {app.jobTitle}
                                                </Link>
                                                <div className="text-slate-400 text-sm font-bold mt-1">
                                                    {app.companyName}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(app.status)} shadow-sm bg-white`}>
                                            {app.status}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/50 mb-8">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Location</span>
                                            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-sm">
                                                <span className="material-symbols-outlined !text-lg text-slate-400">location_on</span>
                                                {app.location}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 text-right">
                                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Applied Date</span>
                                            <div className="flex items-center justify-end gap-1.5 text-slate-700 font-bold text-sm">
                                                <span className="material-symbols-outlined !text-lg text-slate-400">calendar_today</span>
                                                {new Date(app.appliedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto flex items-center justify-between gap-4">
                                        <div className="flex items-center -space-x-2">
                                            {[1,2,3].map(user => (
                                                <div key={user} className="w-8 h-8 rounded-full border-2 border-white bg-white/80 flex items-center justify-center text-[10px] font-black text-slate-400 overflow-hidden">
                                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=app${app.applicationId + user}`} alt="User" />
                                                </div>
                                            ))}
                                            <div className="w-8 h-8 rounded-full border-2 border-white bg-white/50 flex items-center justify-center text-[10px] font-extrabold text-slate-400">+5</div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {(app.status === 'Accepted' || app.status === 'Under Review') ? (
                                                <button 
                                                    onClick={() => navigate('/messages', { 
                                                        state: { 
                                                            contactId: app.employerId, 
                                                            contactName: app.companyName 
                                                        } 
                                                    })}
                                                    className="w-12 h-12 rounded-2xl bg-slate-900 text-white hover:bg-primary transition-all flex items-center justify-center shadow-lg shadow-black/10 group-hover:scale-110 active:scale-95"
                                                    title="Chat with Recruiter"
                                                >
                                                    <span className="material-symbols-outlined !text-xl">forum</span>
                                                </button>
                                            ) : (
                                                <button disabled className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-200 flex items-center justify-center cursor-not-allowed border border-slate-100">
                                                    <span className="material-symbols-outlined !text-xl">forum</span>
                                                </button>
                                            )}
                                            {app.status === 'Accepted' && (
                                                <button 
                                                    onClick={() => handleOpenReview(app)}
                                                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white hover:shadow-lg hover:shadow-orange-200 transition-all flex items-center justify-center group-hover:scale-110 active:scale-95"
                                                    title="Rate Employer"
                                                >
                                                    <span className="material-symbols-outlined !text-xl filled">star</span>
                                                </button>
                                            )}
                                            <Link 
                                                to={`/jobs/${app.jobPostId}`}
                                                className="w-12 h-12 rounded-2xl border border-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-primary transition-all group-hover:scale-110"
                                            >
                                                <span className="material-symbols-outlined !text-xl">arrow_outward</span>
                                            </Link>
                                        </div>
                                    </div>
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
