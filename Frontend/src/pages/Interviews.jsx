import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const statusClass = (status) => {
    switch (status) {
        case 'Confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        case 'ChangeRequested': return 'bg-amber-50 text-amber-700 border-amber-100';
        case 'Declined': return 'bg-red-50 text-red-700 border-red-100';
        case 'Completed': return 'bg-slate-100 text-slate-700 border-slate-200';
        default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
};

const Interviews = () => {
    const navigate = useNavigate();
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchInterviews();
    }, [token, navigate]);

    const fetchInterviews = async () => {
        try {
            const response = await api.get('/interviews/my');
            setInterviews(response.data || []);
        } catch (error) {
            toast.error('Could not load interviews.');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (interviewId, status) => {
        try {
            await api.patch(`/interviews/${interviewId}/status`, { status });
            toast.success(`Interview ${status}.`);
            fetchInterviews();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not update interview.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-bg-light">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-bg-light min-h-screen pb-20 font-display overflow-x-hidden">
            <div className="bg-white border-b border-slate-200/60 pb-10 pt-8">
                <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Interviews</h1>
                    <p className="text-slate-500 mt-2">Accept or reject offline interview invitations from employers.</p>
                </div>
            </div>

            <main className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 mt-8">
                {interviews.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-12 text-center text-slate-500">
                        No interviews yet.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {interviews.map(interview => (
                            <div key={interview.interviewId} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-4 lg:items-center">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusClass(interview.status)}`}>
                                            {interview.status}
                                        </span>
                                        {interview.result && (
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-slate-50 text-slate-600 border-slate-100">
                                                {interview.result}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="font-black text-slate-800 truncate">{interview.jobTitle}</h2>
                                    <p className="text-sm text-slate-500 truncate">{interview.companyName}</p>
                                    <p className="text-sm text-slate-600 mt-2">
                                        {new Date(interview.scheduledAt).toLocaleString()} at {interview.location}
                                    </p>
                                    {interview.note && <p className="text-sm text-slate-500 mt-2 break-words">{interview.note}</p>}
                                </div>

                                {interview.status === 'Scheduled' && (
                                    <div className="flex flex-wrap gap-2 lg:justify-end">
                                        <button onClick={() => updateStatus(interview.interviewId, 'Confirmed')} className="h-10 px-4 rounded-xl bg-emerald-500 text-white text-sm font-bold">
                                            Accept
                                        </button>
                                        <button onClick={() => updateStatus(interview.interviewId, 'Declined')} className="h-10 px-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-bold">
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Interviews;
