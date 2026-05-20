import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const tomorrowDate = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const statusClass = (status) => {
    switch (status) {
        case 'Confirmed':
            return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        case 'Declined':
        case 'Cancelled':
            return 'bg-red-50 text-red-700 border-red-100';
        case 'Completed':
            return 'bg-slate-100 text-slate-700 border-slate-200';
        default:
            return 'bg-blue-50 text-blue-700 border-blue-100';
    }
};

const EmployerInterviews = () => {
    const [interviews, setInterviews] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHireModal, setShowHireModal] = useState(false);
    const [selectedInterview, setSelectedInterview] = useState(null);
    const [submittingResult, setSubmittingResult] = useState(false);
    const [hireForm, setHireForm] = useState({
        branchId: '',
        position: '',
        hourlyRate: 20000,
        startDate: tomorrowDate(),
        paydayOfMonth: 5
    });

    useEffect(() => {
        fetchInterviews();
        fetchBranches();
    }, []);

    const fetchInterviews = async () => {
        try {
            const response = await api.get('/interviews/employer');
            setInterviews(response.data || []);
        } catch (error) {
            toast.error('Could not load interviews.');
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const response = await api.get('/branches');
            setBranches(response.data || []);
            if (response.data?.[0]) {
                setHireForm(prev => ({ ...prev, branchId: prev.branchId || String(response.data[0].branchId) }));
            }
        } catch (error) {
            console.error('Could not load branches.', error);
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

    const openHireModal = (interview) => {
        if (branches.length === 0) {
            toast.error('Create a branch before passing an applicant.');
            return;
        }

        setSelectedInterview(interview);
        setHireForm(prev => ({
            ...prev,
            branchId: prev.branchId || String(branches[0].branchId),
            position: prev.position || interview.jobTitle || '',
            startDate: prev.startDate || tomorrowDate()
        }));
        setShowHireModal(true);
    };

    const updateResult = async (interview, result) => {
        if (!interview || submittingResult) return;

        setSubmittingResult(true);
        try {
            const payload = result === 'Passed'
                ? {
                    result,
                    branchId: Number(hireForm.branchId),
                    position: hireForm.position,
                    hourlyRate: Number(hireForm.hourlyRate),
                    startDate: hireForm.startDate,
                    paydayOfMonth: Number(hireForm.paydayOfMonth)
                }
                : { result };

            await api.patch(`/interviews/${interview.interviewId}/result`, payload);
            toast.success(result === 'Passed' ? 'Applicant hired.' : 'Applicant marked not passed.');
            setShowHireModal(false);
            setSelectedInterview(null);
            fetchInterviews();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not update result.');
        } finally {
            setSubmittingResult(false);
        }
    };

    return (
        <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-w-0">
            <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Interview Calendar</h2>
                <p className="text-sm text-slate-500 mt-1">Track offline interviews and hire only after accepted schedules have passed.</p>
            </div>

            {loading ? (
                <div className="p-10 text-center text-slate-400">Loading interviews...</div>
            ) : interviews.length === 0 ? (
                <div className="p-10 text-center text-slate-400">No interviews scheduled.</div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {interviews.map(interview => (
                        <div key={interview.interviewId} className="px-5 sm:px-6 py-5 grid xl:grid-cols-[minmax(0,1fr)_auto] gap-4 xl:items-center">
                            <div className="min-w-0">
                                <div className="flex flex-wrap gap-2 mb-2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusClass(interview.status)}`}>
                                        {interview.status}
                                    </span>
                                    {interview.result && (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-slate-50 text-slate-600 border-slate-100">
                                            {interview.result}
                                        </span>
                                    )}
                                </div>
                                <p className="font-black text-slate-800 truncate">{interview.applicantName}</p>
                                <p className="text-sm text-slate-500 truncate">{interview.jobTitle}</p>
                                <p className="text-sm text-slate-600 mt-1">
                                    {new Date(interview.scheduledAt).toLocaleString()} at {interview.location}
                                </p>
                                {interview.note && <p className="text-xs text-slate-500 mt-2 break-words">{interview.note}</p>}
                                {interview.status === 'Confirmed' && !interview.canEmployerMarkResult && !interview.result && (
                                    <p className="text-xs font-semibold text-slate-400 mt-2">Applicant accepted. Result is available after the scheduled time.</p>
                                )}
                                {interview.status === 'Scheduled' && !interview.result && (
                                    <p className="text-xs font-semibold text-slate-400 mt-2">Waiting for applicant response.</p>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 xl:justify-end">
                                {interview.status !== 'Cancelled' && interview.status !== 'Completed' && (
                                    <button onClick={() => updateStatus(interview.interviewId, 'Cancelled')} className="h-10 px-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-bold">
                                        Cancel
                                    </button>
                                )}
                                {interview.canEmployerMarkResult && (
                                    <>
                                        <button onClick={() => openHireModal(interview)} className="h-10 px-4 rounded-xl bg-emerald-500 text-white text-sm font-bold">
                                            Pass
                                        </button>
                                        <button onClick={() => updateResult(interview, 'Failed')} className="h-10 px-4 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold">
                                            Not Pass
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showHireModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <form onSubmit={(e) => { e.preventDefault(); updateResult(selectedInterview, 'Passed'); }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <h3 className="text-xl font-bold text-slate-800">Pass And Hire</h3>
                                <p className="text-sm text-slate-500">Creates employment and hourly rate records.</p>
                            </div>
                            <button type="button" onClick={() => setShowHireModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <select value={hireForm.branchId} onChange={(e) => setHireForm(prev => ({ ...prev, branchId: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" required>
                                {branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
                            </select>
                            <input value={hireForm.position} onChange={(e) => setHireForm(prev => ({ ...prev, position: e.target.value }))} placeholder="Position" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" required />
                            <input type="number" min="1" value={hireForm.hourlyRate} onChange={(e) => setHireForm(prev => ({ ...prev, hourlyRate: e.target.value }))} placeholder="Hourly rate" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" required />
                            <input type="date" value={hireForm.startDate} onChange={(e) => setHireForm(prev => ({ ...prev, startDate: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" required />
                            <input type="number" min="1" max="28" value={hireForm.paydayOfMonth} onChange={(e) => setHireForm(prev => ({ ...prev, paydayOfMonth: e.target.value }))} placeholder="Payday of month" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" required />
                            <button disabled={submittingResult} className="w-full h-11 rounded-xl bg-emerald-500 text-white font-bold text-sm disabled:opacity-60">
                                {submittingResult ? 'Hiring...' : 'Pass And Create Employee'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
};

export default EmployerInterviews;
