import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../services/signalrService';

const getCurrentUserId = () => {
    const userId = localStorage.getItem('userId');
    if (userId) return Number(userId);

    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return Number(user.userId || user.id || 0);
    } catch {
        return 0;
    }
};

const formatDateTime = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatMinutes = (minutes = 0) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours <= 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
};

const attendanceMeta = (status) => {
    switch (status) {
        case 'CheckedIn':
            return { label: 'Checked in', className: 'bg-blue-50 text-blue-700 border-blue-100' };
        case 'CheckedOut':
            return { label: 'Waiting approval', className: 'bg-amber-50 text-amber-700 border-amber-100' };
        case 'Approved':
            return { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
        case 'Rejected':
            return { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-100' };
        default:
            return { label: 'Not started', className: 'bg-slate-50 text-slate-600 border-slate-100' };
    }
};

const MyWork = () => {
    const navigate = useNavigate();
    const [employments, setEmployments] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [passModal, setPassModal] = useState({ open: false, assignment: null, shift: null, candidates: [], reason: '', toEmployeeUserId: '' });
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const token = localStorage.getItem('token');
    const currentUserId = getCurrentUserId();

    useEffect(() => {
        if (!token) {
            setLoading(false);
            navigate('/login');
            return;
        }

        fetchWorkData();

        const handleWorkforceChanged = () => fetchWorkData();
        signalRService.on('WorkforceChanged', handleWorkforceChanged);
        return () => signalRService.off('WorkforceChanged', handleWorkforceChanged);
    }, [token, navigate]);

    const fetchWorkData = async () => {
        try {
            const [employmentRes, shiftRes, incomingRes, outgoingRes] = await Promise.all([
                api.get('/workforce/my-employments'),
                api.get('/workforce/my-shifts'),
                api.get('/workforce/shift-pass/incoming'),
                api.get('/workforce/shift-pass/outgoing')
            ]);
            setEmployments(employmentRes.data || []);
            setShifts(shiftRes.data || []);
            setIncomingRequests(incomingRes.data || []);
            setOutgoingRequests(outgoingRes.data || []);
        } catch (error) {
            console.error('Error loading work data:', error);
            toast.error('Could not load your work schedule.');
        } finally {
            setLoading(false);
        }
    };

    const getMyAssignment = (shift) => {
        const assignments = shift.assignments || [];
        if (!currentUserId) return assignments[0];
        return assignments.find(assignment => assignment.employeeUserId === currentUserId);
    };

    const checkIn = async (assignmentId) => {
        setProcessingId(assignmentId);
        try {
            await api.post(`/workforce/attendance/${assignmentId}/check-in`);
            toast.success('Checked in.');
            await fetchWorkData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not check in.');
        } finally {
            setProcessingId(null);
        }
    };

    const checkOut = async (assignmentId) => {
        setProcessingId(assignmentId);
        try {
            await api.post(`/workforce/attendance/${assignmentId}/check-out`);
            toast.success('Checked out. Waiting for employer approval.');
            await fetchWorkData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not check out.');
        } finally {
            setProcessingId(null);
        }
    };

    const canPassShift = (shift, assignment) => {
        if (!assignment || assignment.status !== 'Assigned') return false;
        if (assignment.attendanceStatus) return false;
        return new Date(shift.startTime).getTime() - Date.now() > 2 * 60 * 60 * 1000;
    };

    const openPassModal = async (shift, assignment) => {
        try {
            const response = await api.get(`/workforce/shift-pass/${assignment.shiftAssignmentId}/candidates`);
            const candidates = response.data || [];
            if (candidates.length === 0) {
                toast.error('No eligible coworker in this branch for this shift.');
                return;
            }
            setPassModal({
                open: true,
                assignment,
                shift,
                candidates,
                reason: '',
                toEmployeeUserId: String(candidates[0].employeeUserId)
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not load pass candidates.');
        }
    };

    const submitPassRequest = async (e) => {
        e.preventDefault();
        try {
            await api.post('/workforce/shift-pass', {
                shiftAssignmentId: passModal.assignment.shiftAssignmentId,
                toEmployeeUserId: Number(passModal.toEmployeeUserId),
                reason: passModal.reason
            });
            toast.success('Shift pass request sent.');
            setPassModal({ open: false, assignment: null, shift: null, candidates: [], reason: '', toEmployeeUserId: '' });
            fetchWorkData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not send pass request.');
        }
    };

    const respondPassRequest = async (requestId, action) => {
        try {
            await api.patch(`/workforce/shift-pass/${requestId}/${action}`);
            toast.success(`Shift pass ${action}ed.`);
            fetchWorkData();
        } catch (error) {
            toast.error(error.response?.data?.message || `Could not ${action} request.`);
        }
    };

    const renderAction = (assignment) => {
        const status = assignment?.attendanceStatus || 'NotStarted';
        const disabled = processingId === assignment?.shiftAssignmentId;

        if (!assignment) return null;

        if (status === 'CheckedIn') {
            return (
                <button
                    disabled={disabled}
                    onClick={() => checkOut(assignment.shiftAssignmentId)}
                    className="h-10 px-4 rounded-xl bg-amber-500 text-white text-sm font-bold disabled:opacity-60"
                >
                    Check Out
                </button>
            );
        }

        if (status === 'CheckedOut') {
            return (
                <span className="h-10 px-4 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 text-sm font-bold inline-flex items-center">
                    Waiting approval
                </span>
            );
        }

        if (status === 'Approved') {
            return (
                <span className="h-10 px-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-sm font-bold inline-flex items-center">
                    Approved
                </span>
            );
        }

        return (
            <button
                disabled={disabled}
                onClick={() => checkIn(assignment.shiftAssignmentId)}
                className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-60"
            >
                Check In
            </button>
        );
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
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">My Work</h1>
                    <p className="text-slate-500 mt-2">Manage your official employments, shifts, attendance and payroll-ready work time.</p>
                </div>
            </div>

            <main className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 mt-8 grid xl:grid-cols-[340px_minmax(0,1fr)] gap-6 min-w-0">
                <aside className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6 h-fit min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-5">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Employments</h2>
                            <p className="text-sm text-slate-500 mt-1">Official employee records.</p>
                        </div>
                        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined">badge</span>
                        </span>
                    </div>

                    {employments.length === 0 ? (
                        <div className="rounded-2xl bg-slate-50 p-5 text-center">
                            <p className="text-sm font-bold text-slate-700">No employment yet</p>
                            <p className="text-xs text-slate-500 mt-1">Accept an official offer first.</p>
                            <Link to="/offers" className="mt-4 inline-flex h-10 px-4 rounded-xl bg-primary text-white text-sm font-bold items-center">
                                View Offers
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {employments.map(employment => (
                                <div key={employment.employmentId} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                    <p className="font-bold text-slate-800">{employment.position}</p>
                                    <p className="text-sm text-slate-500 mt-1">{employment.branchName}</p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                            {employment.status}
                                        </span>
                                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary">
                                            {Number(employment.currentHourlyRate).toLocaleString()} VND/h
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </aside>

                <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-w-0">
                    <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">My Shifts</h2>
                            <p className="text-sm text-slate-500 mt-1">Check in, check out, then wait for employer approval.</p>
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{shifts.length} shifts</span>
                    </div>

                    {shifts.length === 0 ? (
                        <div className="p-10 sm:p-14 text-center">
                            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-slate-300">event_busy</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">No assigned shifts</h3>
                            <p className="text-sm text-slate-500 mt-1">When your employer assigns a shift, it will appear here.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {shifts.map(shift => {
                                const assignment = getMyAssignment(shift);
                                const meta = attendanceMeta(assignment?.attendanceStatus);

                                return (
                                    <div key={shift.workShiftId} className="px-5 sm:px-6 py-5 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-4 lg:items-center">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${meta.className}`}>
                                                    {meta.label}
                                                </span>
                                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-100">
                                                    {shift.status}
                                                </span>
                                            </div>
                                            <h3 className="font-black text-slate-800 truncate">{shift.title}</h3>
                                            <p className="text-sm text-slate-500 truncate">{shift.branchName}</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {formatDateTime(shift.startTime)} - {formatDateTime(shift.endTime)}
                                            </p>
                                            <div className="mt-3 grid sm:grid-cols-3 gap-2 text-xs text-slate-500">
                                                <span className="rounded-xl bg-slate-50 px-3 py-2">
                                                    Check-in: <b className="text-slate-700">{formatDateTime(assignment?.checkInAt)}</b>
                                                </span>
                                                <span className="rounded-xl bg-slate-50 px-3 py-2">
                                                    Check-out: <b className="text-slate-700">{formatDateTime(assignment?.checkOutAt)}</b>
                                                </span>
                                                <span className="rounded-xl bg-slate-50 px-3 py-2">
                                                    Worked: <b className="text-slate-700">{formatMinutes(assignment?.workedMinutes || 0)}</b>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex lg:justify-end">
                                            <div className="flex flex-wrap gap-2 lg:justify-end">
                                                {canPassShift(shift, assignment) && (
                                                    <button
                                                        onClick={() => openPassModal(shift, assignment)}
                                                        className="h-10 px-4 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold"
                                                    >
                                                        Pass Shift
                                                    </button>
                                                )}
                                                {renderAction(assignment)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="xl:col-start-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-w-0">
                    <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800">Shift Pass Requests</h2>
                        <p className="text-sm text-slate-500 mt-1">Requests expire at 2 hours before shift start.</p>
                    </div>
                    <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                        <div className="p-5 sm:p-6">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Incoming</h3>
                            {incomingRequests.length === 0 ? (
                                <p className="text-sm text-slate-400">No incoming requests.</p>
                            ) : incomingRequests.map(request => (
                                <div key={request.shiftPassRequestId} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 mb-3">
                                    <p className="font-bold text-slate-800">{request.shiftTitle}</p>
                                    <p className="text-xs text-slate-500">{request.fromEmployeeName} wants to pass this shift to you.</p>
                                    <p className="text-xs text-slate-400 mt-1">{formatDateTime(request.shiftStartTime)} - expires {formatDateTime(request.expiresAt)}</p>
                                    <span className="inline-flex mt-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white border border-slate-100 text-slate-600">{request.status}</span>
                                    {request.status === 'Pending' && (
                                        <div className="mt-3 flex gap-2">
                                            <button onClick={() => respondPassRequest(request.shiftPassRequestId, 'accept')} className="h-9 px-4 rounded-xl bg-emerald-500 text-white text-xs font-bold">Accept</button>
                                            <button onClick={() => respondPassRequest(request.shiftPassRequestId, 'reject')} className="h-9 px-4 rounded-xl bg-red-50 text-red-600 border border-red-100 text-xs font-bold">Reject</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-5 sm:p-6">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Outgoing</h3>
                            {outgoingRequests.length === 0 ? (
                                <p className="text-sm text-slate-400">No outgoing requests.</p>
                            ) : outgoingRequests.map(request => (
                                <div key={request.shiftPassRequestId} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 mb-3">
                                    <p className="font-bold text-slate-800">{request.shiftTitle}</p>
                                    <p className="text-xs text-slate-500">Sent to {request.toEmployeeName}</p>
                                    <p className="text-xs text-slate-400 mt-1">{formatDateTime(request.shiftStartTime)} - expires {formatDateTime(request.expiresAt)}</p>
                                    <span className="inline-flex mt-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white border border-slate-100 text-slate-600">{request.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {passModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <form onSubmit={submitPassRequest} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Pass Shift</h3>
                                <p className="text-sm text-slate-500">If coworker declines or expires, the shift stays yours.</p>
                            </div>
                            <button type="button" onClick={() => setPassModal({ open: false, assignment: null, shift: null, candidates: [], reason: '', toEmployeeUserId: '' })} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <select value={passModal.toEmployeeUserId} onChange={(e) => setPassModal(prev => ({ ...prev, toEmployeeUserId: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm">
                                {passModal.candidates.map(candidate => (
                                    <option key={candidate.employeeUserId} value={candidate.employeeUserId}>{candidate.employeeName} - {candidate.position}</option>
                                ))}
                            </select>
                            <textarea value={passModal.reason} onChange={(e) => setPassModal(prev => ({ ...prev, reason: e.target.value }))} placeholder="Reason" className="w-full min-h-24 px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none" />
                            <button className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm">
                                Send Request
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default MyWork;
