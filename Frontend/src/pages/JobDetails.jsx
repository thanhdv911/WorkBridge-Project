import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

import ReportModal from '../components/shared/ReportModal';

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

    const userRole = localStorage.getItem('role');
    const token = localStorage.getItem('token');
    const isApplicant = userRole?.toLowerCase() === 'applicant';

    useEffect(() => {
        fetchJobDetails();
        if (isApplicant && token) {
            checkIfSaved();
        }
    }, [id, token, isApplicant]);

    const fetchJobDetails = async () => {
        try {
            const response = await api.get(`/jobs/${id}`);
            setJob(response.data);
        } catch (error) {
            console.error('Error fetching job details:', error);
            toast.error('Could not load job details.');
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

    const handleApplyClick = () => {
        console.log('Current User Token:', token);
        console.log('Current User Role in Storage:', userRole);

        if (!token) {
            toast.error('Please login to apply for this job.');
            navigate('/auth');
            return;
        }

        if (userRole?.toLowerCase() !== 'applicant') {
            toast.error(`Only Applicants can apply for jobs. (Current role: ${userRole})`);
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
            toast.success('Application submitted successfully!');
            setShowApplyModal(false);
            setCoverMessage('');
        } catch (error) {
            const msg = error.response?.data || 'Failed to submit application.';
            toast.error(typeof msg === 'string' ? msg : 'An error occurred.');
        } finally {
            setApplying(false);
        }
    };

    const handleToggleSave = async () => {
        if (!token) {
            toast.error('Please login to save jobs.');
            return;
        }

        try {
            if (isSaved) {
                await api.delete(`/savedjobs/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsSaved(false);
                toast.success('Job removed from saved list.');
            } else {
                await api.post(`/savedjobs/${id}`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsSaved(true);
                toast.success('Job saved successfully.');
            }
        } catch (err) {
            console.error('Error toggling save status:', err);
            toast.error('Failed to update saved jobs.');
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
                <h2 className="text-2xl font-bold text-slate-800">Job not found</h2>
                <Link to="/jobs" className="text-primary hover:underline">Back to Job Search</Link>
            </div>
        );
    }

    return (
        <div className="bg-bg-light font-display text-slate-900 min-h-screen antialiased pb-20">
            {/* Breadcrumb */}
            <div className="max-w-[1320px] mx-auto px-6 lg:px-10 pt-6">
                <nav className="flex items-center gap-2 text-sm text-slate-400">
                    <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                    <span className="material-symbols-outlined !text-[16px]">chevron_right</span>
                    <Link to="/jobs" className="hover:text-primary transition-colors">Find Jobs</Link>
                    <span className="material-symbols-outlined !text-[16px]">chevron_right</span>
                    <span className="text-slate-700 font-medium">{job.title}</span>
                </nav>
            </div>

            <main className="max-w-[1320px] mx-auto px-6 lg:px-10 py-8 grid lg:grid-cols-[1fr_360px] gap-8">
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
                                <h1 className="text-2xl font-black tracking-tight">{job.title}</h1>
                                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined !text-[16px]">apartment</span>{job.companyName}
                                    <span className="mx-1.5 text-slate-300">·</span>
                                    <span className="material-symbols-outlined !text-[16px]">location_on</span>{job.location}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-600 border border-green-100">{job.jobType}</span>
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">Verified</span>
                                </div>
                            </div>
                        </div>
                        {/* Quick stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                            <div className="text-center">
                                <p className="text-xs text-slate-400 mb-1">Salary</p>
                                <p className="text-lg font-bold text-primary">
                                    {job.payRate?.toLocaleString()}₫
                                    <span className="text-xs font-normal text-slate-400">/{job.payUnit === 'PerHour' ? 'hr' : 'mo'}</span>
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-400 mb-1">Posted</p>
                                <p className="text-sm font-semibold text-slate-700">{new Date(job.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-400 mb-1">Deadline</p>
                                <p className="text-sm font-semibold text-slate-700">{job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'No Limit'}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-400 mb-1">Views</p>
                                <p className="text-sm font-semibold text-slate-700">Recent</p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8 animate-fadeInUp delay-100">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary !text-xl">description</span>
                            Description
                        </h2>
                        <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                            {job.description}
                        </div>
                    </div>

                    {/* Shifts */}
                    {job.shifts && job.shifts.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-8 animate-fadeInUp delay-150">
                            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                                <span className="material-symbols-outlined text-primary !text-xl">schedule</span>
                                Working Shifts
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
                                Requirements
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
                                Benefits
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
                            <p className="text-xs text-slate-400 mb-1">Pay Rate</p>
                            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                                {job.payRate?.toLocaleString()}₫
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Flexible Scheduling</p>
                        </div>
                        <button
                            onClick={handleApplyClick}
                            className="w-full h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dk shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mb-3"
                        >
                            <span className="material-symbols-outlined !text-xl">send</span>
                            Apply Now
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
                                {isSaved ? 'Job Saved' : 'Save Job'}
                            </button>
                        )}
                        <button
                            onClick={() => setShowReportModal(true)}
                            className="w-full mt-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest"
                        >
                            <span className="material-symbols-outlined !text-sm">flag</span>
                            Report this Job
                        </button>
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
                            <h3 className="text-xl font-bold text-slate-800">Submit Application</h3>
                            <button onClick={() => setShowApplyModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={submitApplication} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Cover Message (Optional)</label>
                                <textarea
                                    className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-sm"
                                    placeholder="Tell the employer why you're a good fit..."
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
                                            Send Application
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-center text-slate-400 mt-4 px-4 uppercase tracking-widest font-bold">
                                    The employer will receive your profile info
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
