import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../../services/signalrService';

const EmployerManagePosts = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchMyJobs();

        const handleApplicationChanged = () => fetchMyJobs();
        signalRService.on('ApplicationChanged', handleApplicationChanged);
        return () => signalRService.off('ApplicationChanged', handleApplicationChanged);
    }, []);

    const fetchMyJobs = async () => {
        try {
            const response = await api.get('/employer/jobs', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJobs(response.data);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            toast.error('Could not load your job posts.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (jobId, newStatus) => {
        try {
            await api.patch(`/employer/jobs/${jobId}/status`, 
                JSON.stringify(newStatus), 
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            toast.success(`Job status updated to ${newStatus}`);
            // Refresh the list
            fetchMyJobs();
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update job status.');
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Published': return 'bg-green-50 text-green-600 border-green-100';
            case 'Draft': return 'bg-slate-50 text-slate-500 border-slate-100';
            case 'Closed': return 'bg-rose-50 text-rose-600 border-rose-100';
            default: return 'bg-slate-50 text-slate-500 border-slate-100';
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="text-slate-500 mt-4 font-medium">Loading your job posts...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden anim-fadeUp">
                <div className="px-8 py-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Manage Your Job Posts</h2>
                    <p className="text-slate-500 text-sm mt-1">View and update the status of your current job listings.</p>
                </div>

                {jobs.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-slate-300">work_off</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">No jobs posted yet</h3>
                        <p className="text-slate-500 mt-1">Start by creating your first job listing.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Job Details</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Date Posted</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Status</th>
                                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {jobs.map((job) => (
                                    <tr key={job.jobPostId} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-slate-800">{job.title}</div>
                                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                                <span className="material-symbols-outlined !text-[14px]">location_on</span>
                                                {job.location}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-slate-500 whitespace-nowrap">
                                            {new Date(job.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusStyle(job.status)}`}>
                                                {job.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {job.status === 'Published' ? (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(job.jobPostId, 'Closed')}
                                                        className="h-8 px-4 rounded-lg bg-rose-50 text-rose-600 text-[11px] font-bold hover:bg-rose-100 transition-colors flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined !text-[16px]">cancel</span>
                                                        Close Job
                                                    </button>
                                                ) : job.status === 'Closed' || job.status === 'Draft' ? (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(job.jobPostId, 'Published')}
                                                        className="h-8 px-4 rounded-lg bg-green-50 text-green-600 text-[11px] font-bold hover:bg-green-100 transition-colors flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined !text-[16px]">publish</span>
                                                        Publish
                                                    </button>
                                                ) : null}
                                                <button className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all flex items-center justify-center">
                                                    <span className="material-symbols-outlined !text-[18px]">edit</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployerManagePosts;
