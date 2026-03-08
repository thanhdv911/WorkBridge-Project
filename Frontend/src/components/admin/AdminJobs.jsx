import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AdminJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
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
        } catch (err) {
            toast.error('Failed to load pending jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (jobId, newStatus) => {
        try {
            await api.patch(`/admin/jobs/${jobId}/status`, { newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Job ${newStatus.toLowerCase()} successfully`);
            fetchJobs();
        } catch (err) {
            toast.error('Failed to update job status');
        }
    };

    if (loading) return <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl w-full"></div>)}
    </div>;

    return (
        <div className="space-y-6 animate-fadeInUp">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Job Moderation</h2>
                <div className="text-xs font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 uppercase tracking-widest">
                    Pending Review: {jobs.length}
                </div>
            </div>

            {jobs.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-20 text-center">
                    <span className="material-symbols-outlined !text-4xl text-slate-300 mb-4">check_circle</span>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">All Clear!</h3>
                    <p className="text-slate-400 text-xs mt-1">No pending job posts to review at the moment.</p>
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
                                            {job.categoryName}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                        <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleUpdateStatus(job.jobPostId, 'Published')}
                                    className="h-10 px-5 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined !text-[18px]">verified</span>
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus(job.jobPostId, 'Rejected')}
                                    className="h-10 px-5 rounded-xl bg-rose-50 text-rose-500 font-bold text-xs border border-rose-100 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined !text-[18px]">block</span>
                                    Reject
                                </button>
                                <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                                    <span className="material-symbols-outlined !text-[20px]">visibility</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminJobs;
