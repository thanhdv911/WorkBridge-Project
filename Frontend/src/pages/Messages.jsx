import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import ReportModal from '../components/shared/ReportModal';

const defaultInterviewTime = () => {
    const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
    value.setMinutes(0, 0, 0);
    return value.toISOString().slice(0, 16);
};

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

const Messages = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [chatApplications, setChatApplications] = useState([]);
    const [branches, setBranches] = useState([]);
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [showHireModal, setShowHireModal] = useState(false);
    const [selectedInterview, setSelectedInterview] = useState(null);
    const [schedulingInterview, setSchedulingInterview] = useState(false);
    const [submittingResult, setSubmittingResult] = useState(false);
    const [interviewForm, setInterviewForm] = useState({
        applicationId: '',
        scheduledAt: defaultInterviewTime(),
        location: '',
        note: ''
    });
    const [hireForm, setHireForm] = useState({
        branchId: '',
        position: '',
        hourlyRate: 20000,
        startDate: tomorrowDate(),
        paydayOfMonth: 5
    });
    const messagesContainerRef = useRef(null);
    const lastMessageCountRef = useRef(0);
    const token = localStorage.getItem('token');
    const currentUserId = parseInt(localStorage.getItem('userId') || '0');
    const userRole = localStorage.getItem('role');
    const isEmployer = userRole === 'Employer';
    const isApplicant = userRole === 'Applicant';

    useEffect(() => {
        if (location.state?.contactId) {
            setSelectedContact({
                contactId: location.state.contactId,
                contactName: location.state.contactName
            });
        }
    }, [location.state]);

    useEffect(() => {
        if (token) {
            fetchConversations();
            if (isEmployer) fetchBranches();
            const interval = setInterval(fetchConversations, 10000);
            return () => clearInterval(interval);
        }

        setLoading(false);
        navigate('/login');
    }, [token, navigate, isEmployer]);

    useEffect(() => {
        if (!selectedContact) return;

        lastMessageCountRef.current = 0;
        fetchChatHistory(selectedContact.contactId);
        if (isEmployer) fetchChatContext(selectedContact.contactId);

        const interval = setInterval(() => fetchChatHistory(selectedContact.contactId), 3000);
        return () => clearInterval(interval);
    }, [selectedContact, isEmployer]);

    useEffect(() => {
        if (messages.length > lastMessageCountRef.current) {
            scrollToBottom(messages.length === 1 ? 'auto' : 'smooth');
        }
        lastMessageCountRef.current = messages.length;
    }, [messages.length]);

    const scrollToBottom = (behavior = 'smooth') => {
        const container = messagesContainerRef.current;
        if (!container) return;
        container.scrollTo({
            top: container.scrollHeight,
            behavior
        });
    };

    const fetchConversations = async () => {
        try {
            const res = await api.get('/messages/conversations');
            setConversations(res.data);
        } catch (err) {
            console.error('Error fetching conversations:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchChatHistory = async (contactId) => {
        try {
            const res = await api.get(`/messages/${contactId}`);
            setMessages(res.data);
        } catch (err) {
            console.error('Error fetching chat history:', err);
        }
    };

    const fetchChatContext = async (contactId) => {
        try {
            const res = await api.get(`/interviews/chat-context/${contactId}`);
            const applications = res.data || [];
            setChatApplications(applications);
            setInterviewForm(prev => ({
                ...prev,
                applicationId: applications[0] ? String(applications[0].applicationId) : ''
            }));
        } catch (err) {
            setChatApplications([]);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await api.get('/branches');
            setBranches(res.data || []);
            if (res.data?.[0]) {
                setHireForm(prev => ({ ...prev, branchId: prev.branchId || String(res.data[0].branchId) }));
            }
        } catch (err) {
            console.error('Error fetching branches:', err);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact || sending) return;

        setSending(true);
        try {
            const res = await api.post('/messages', {
                receiverId: selectedContact.contactId,
                content: newMessage
            });
            setMessages(prev => [...prev, res.data]);
            setNewMessage('');
            fetchConversations();
        } catch (err) {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const openInterviewModal = () => {
        if (chatApplications.length === 0) {
            toast.error('No eligible application found for this applicant.');
            return;
        }

        setInterviewForm(prev => ({
            ...prev,
            applicationId: prev.applicationId || String(chatApplications[0].applicationId),
            scheduledAt: prev.scheduledAt || defaultInterviewTime()
        }));
        setShowInterviewModal(true);
    };

    const scheduleInterview = async (e) => {
        e.preventDefault();
        if (!selectedContact || schedulingInterview) return;

        setSchedulingInterview(true);
        try {
            await api.post('/interviews/chat-invite', {
                contactId: selectedContact.contactId,
                applicationId: Number(interviewForm.applicationId),
                scheduledAt: interviewForm.scheduledAt,
                location: interviewForm.location,
                note: interviewForm.note
            });
            toast.success('Interview invitation sent.');
            setShowInterviewModal(false);
            setInterviewForm(prev => ({ ...prev, note: '', location: '' }));
            await fetchChatHistory(selectedContact.contactId);
            fetchConversations();
            fetchChatContext(selectedContact.contactId);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not schedule interview.');
        } finally {
            setSchedulingInterview(false);
        }
    };

    const updateInterviewStatus = async (interviewId, status) => {
        try {
            await api.patch(`/interviews/${interviewId}/status`, { status });
            toast.success(status === 'Confirmed' ? 'Interview accepted.' : 'Interview rejected.');
            if (selectedContact) {
                fetchChatHistory(selectedContact.contactId);
                fetchConversations();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not update interview.');
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

    const submitInterviewResult = async (result, interview = selectedInterview) => {
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
            if (selectedContact) {
                fetchChatHistory(selectedContact.contactId);
                fetchConversations();
                fetchChatContext(selectedContact.contactId);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not update result.');
        } finally {
            setSubmittingResult(false);
        }
    };

    const renderInterviewCard = (message) => {
        const interview = message.interview;
        if (!interview) return null;

        const canApplicantRespond = isApplicant &&
            interview.applicantId === currentUserId &&
            interview.status === 'Scheduled' &&
            !interview.result;
        const canEmployerResult = isEmployer &&
            interview.employerId === currentUserId &&
            interview.canEmployerMarkResult;
        const isOwn = message.senderId === currentUserId;

        return (
            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className="w-full max-w-[460px] rounded-2xl border border-blue-100 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">Offline Interview</p>
                            <h3 className="text-sm font-black text-slate-800 truncate">{interview.jobTitle}</h3>
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase ${statusClass(interview.status)}`}>
                            {interview.result || interview.status}
                        </span>
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="grid gap-2 text-sm text-slate-600">
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined !text-[18px] text-slate-400">schedule</span>
                                <span>{new Date(interview.scheduledAt).toLocaleString()}</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined !text-[18px] text-slate-400">location_on</span>
                                <span className="break-words">{interview.location}</span>
                            </div>
                            {interview.note && (
                                <div className="flex items-start gap-2">
                                    <span className="material-symbols-outlined !text-[18px] text-slate-400">notes</span>
                                    <span className="break-words">{interview.note}</span>
                                </div>
                            )}
                        </div>

                        {canApplicantRespond && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button type="button" onClick={() => updateInterviewStatus(interview.interviewId, 'Confirmed')} className="h-10 rounded-xl bg-emerald-500 text-white text-sm font-bold">
                                    Accept
                                </button>
                                <button type="button" onClick={() => updateInterviewStatus(interview.interviewId, 'Declined')} className="h-10 rounded-xl bg-red-50 text-red-600 border border-red-100 text-sm font-bold">
                                    Reject
                                </button>
                            </div>
                        )}

                        {canEmployerResult && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button type="button" onClick={() => openHireModal(interview)} className="h-10 rounded-xl bg-emerald-500 text-white text-sm font-bold">
                                    Pass
                                </button>
                                <button type="button" onClick={() => submitInterviewResult('Failed', interview)} className="h-10 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold">
                                    Not Pass
                                </button>
                            </div>
                        )}

                        {isEmployer && interview.status === 'Confirmed' && !interview.canEmployerMarkResult && !interview.result && (
                            <p className="text-xs font-semibold text-slate-400">Applicant accepted. Result is available after the scheduled time.</p>
                        )}
                        {isEmployer && interview.status === 'Scheduled' && !interview.result && (
                            <p className="text-xs font-semibold text-slate-400">Waiting for applicant response.</p>
                        )}

                        <div className={`text-[10px] text-slate-400 ${isOwn ? 'text-right' : 'text-left'}`}>
                            {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading && !selectedContact) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-bg-light h-[calc(100dvh-64px)] font-display flex overflow-hidden">
            <aside className={`${selectedContact ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] bg-white border-r border-slate-200/60 flex-col h-full overflow-hidden shrink-0`}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">Messages</h1>
                    <span className="material-symbols-outlined text-slate-400">search</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversations.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-sm text-slate-400">No active conversations.</p>
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <button
                                type="button"
                                key={conv.contactId}
                                onClick={() => setSelectedContact(conv)}
                                className={`w-full p-4 flex items-center gap-4 text-left transition-all border-b border-slate-50 hover:bg-slate-50 ${
                                    selectedContact?.contactId === conv.contactId ? 'bg-primary/[0.03] border-l-4 border-l-primary' : ''
                                }`}
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                                    {conv.contactName.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h3 className="font-bold text-slate-800 truncate text-sm">
                                            {conv.contactName}
                                        </h3>
                                        {conv.lastMessageAt && (
                                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                                                {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                                            {conv.lastMessage}
                                        </p>
                                        {conv.unreadCount > 0 && (
                                            <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </aside>

            <main className={`${selectedContact ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 bg-[#F8FAFC] flex-col h-full relative overflow-hidden`}>
                {selectedContact ? (
                    <>
                        <div className="bg-white px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4 border-b border-slate-200/60 shadow-sm z-10">
                            <button
                                type="button"
                                onClick={() => setSelectedContact(null)}
                                className="md:hidden w-9 h-9 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all flex items-center justify-center"
                                title="Back to conversations"
                            >
                                <span className="material-symbols-outlined !text-xl">arrow_back</span>
                            </button>
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {selectedContact.contactName.substring(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <h2 className="font-bold text-slate-800 leading-tight truncate">
                                    {selectedContact.contactName}
                                </h2>
                                <p className="text-[11px] text-green-500 font-bold uppercase tracking-wider">Online</p>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                {isEmployer && chatApplications.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={openInterviewModal}
                                        className="h-10 px-3 sm:px-4 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 transition-all flex items-center gap-2 text-xs sm:text-sm font-bold"
                                        title="Schedule Interview"
                                    >
                                        <span className="material-symbols-outlined !text-xl">event</span>
                                        <span className="hidden sm:inline">Schedule</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowReportModal(true)}
                                    className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center"
                                    title="Report User"
                                >
                                    <span className="material-symbols-outlined !text-xl">flag</span>
                                </button>
                            </div>
                        </div>

                        <ReportModal
                            isOpen={showReportModal}
                            onClose={() => setShowReportModal(false)}
                            entityId={selectedContact.contactId}
                            entityType="User"
                            entityTitle={selectedContact.contactName}
                        />

                        <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar overscroll-contain">
                            {messages.map((m) => {
                                if (m.messageType === 'InterviewInvite') {
                                    return <React.Fragment key={m.messageId}>{renderInterviewCard(m)}</React.Fragment>;
                                }

                                return (
                                    <div
                                        key={m.messageId}
                                        className={`flex ${m.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[78%] sm:max-w-[70%] lg:max-w-[60%] px-4 py-3 rounded-2xl text-sm shadow-sm break-words ${
                                            m.senderId === currentUserId
                                                ? 'bg-primary text-white rounded-tr-none'
                                                : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                                        }`}>
                                            <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                                            <div className={`text-[10px] mt-1.5 opacity-60 ${m.senderId === currentUserId ? 'text-right' : 'text-left'}`}>
                                                {new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {m.senderId === currentUserId && (
                                                    <span className="ml-1.5 material-symbols-outlined !text-[12px] align-middle">
                                                        {m.isRead ? 'done_all' : 'done'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-3 sm:p-4 bg-white border-t border-slate-200/60 shrink-0">
                            <form
                                onSubmit={handleSendMessage}
                                className="max-w-[900px] mx-auto flex items-center gap-3 bg-slate-50 rounded-2xl p-2 px-4 border border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all"
                            >
                                <button type="button" onClick={isEmployer ? openInterviewModal : undefined} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-primary transition-colors" title={isEmployer ? 'Schedule Interview' : 'Add'}>
                                    <span className="material-symbols-outlined">add_circle</span>
                                </button>
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 text-sm py-2"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || sending}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                        newMessage.trim() && !sending
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'
                                            : 'bg-slate-200 text-slate-400'
                                    }`}
                                >
                                    <span className="material-symbols-outlined !text-[20px] transform rotate-[-45deg] relative left-[1px]">send</span>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 animate-fadeIn">
                        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-slate-300 !text-5xl">forum</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Your Conversations</h2>
                        <p className="text-slate-500 mt-2 max-w-sm">
                            Select a contact from the sidebar to start chatting.
                        </p>
                    </div>
                )}
            </main>

            {showInterviewModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <form onSubmit={scheduleInterview} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <h3 className="text-xl font-bold text-slate-800">Schedule Offline Interview</h3>
                                <p className="text-sm text-slate-500">Applicant will accept or reject from chat.</p>
                            </div>
                            <button type="button" onClick={() => setShowInterviewModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <select value={interviewForm.applicationId} onChange={(e) => setInterviewForm(prev => ({ ...prev, applicationId: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm">
                                {chatApplications.map(app => (
                                    <option key={app.applicationId} value={app.applicationId}>
                                        {app.jobTitle} - {app.status}
                                    </option>
                                ))}
                            </select>
                            <input type="datetime-local" value={interviewForm.scheduledAt} onChange={(e) => setInterviewForm(prev => ({ ...prev, scheduledAt: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" required />
                            <input value={interviewForm.location} onChange={(e) => setInterviewForm(prev => ({ ...prev, location: e.target.value }))} placeholder="Offline location" className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm" required />
                            <textarea value={interviewForm.note} onChange={(e) => setInterviewForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Note" className="w-full min-h-24 px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none" />
                            <button disabled={schedulingInterview} className="w-full h-11 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-60">
                                {schedulingInterview ? 'Sending...' : 'Send Interview Invitation'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showHireModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <form onSubmit={(e) => { e.preventDefault(); submitInterviewResult('Passed'); }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <h3 className="text-xl font-bold text-slate-800">Pass And Hire</h3>
                                <p className="text-sm text-slate-500">This creates a real employment record.</p>
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
        </div>
    );
};

export default Messages;
