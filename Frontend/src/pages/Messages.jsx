import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage } from '../services/api';
import toast from 'react-hot-toast';
import ReportModal from '../components/shared/ReportModal';
import { signalRService } from '../services/signalrService';
import GoongAddressPicker from '../components/shared/GoongAddressPicker';
import { composeGoongAddress, parseStoredGoongAddress } from '../services/goongAddressService';

const defaultInterviewTime = () => {
    const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
    value.setMinutes(0, 0, 0);
    return value.toISOString().slice(0, 16);
};

const tomorrowDate = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const formatVND = (value) => {
    if (value === undefined || value === null || value === '') return '';
    const clean = String(value).replace(/\D/g, '');
    if (!clean) return '';
    return parseInt(clean, 10).toLocaleString('de-DE');
};

const parseVND = (value) => {
    if (!value) return 0;
    return Number(String(value).replace(/\D/g, ''));
};

const FILTERS = [
    { id: 'all', label: 'Tất cả', icon: 'inbox' },
    { id: 'unread', label: 'Chưa đọc', icon: 'mark_email_unread' },
    { id: 'pinned', label: 'Đã ghim', icon: 'keep' }
];

const EMPLOYER_QUICK_REPLIES = [
    'Chào bạn, cảm ơn bạn đã quan tâm vị trí này. Bạn có thể cho mình biết thời gian rảnh trong tuần không?',
    'Hồ sơ của bạn phù hợp. Mình muốn hẹn phỏng vấn offline, bạn có tiện ngày mai không?',
    'Bạn vui lòng xác nhận lại chi nhánh và ca có thể làm giúp mình nhé.'
];

const APPLICANT_QUICK_REPLIES = [
    'Em chào anh/chị, em cảm ơn vì đã phản hồi hồ sơ của em.',
    'Em có thể tham gia phỏng vấn theo lịch anh/chị đề xuất. Anh/chị cho em xin thêm thông tin địa điểm nhé.',
    'Em có thể làm các ca linh hoạt trong tuần. Em sẽ gửi lịch rảnh cụ thể ngay ạ.'
];

const statusClass = (status) => {
    switch (status) {
        case 'Confirmed':
        case 'Passed':
        case 'Accepted':
            return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        case 'Declined':
        case 'Cancelled':
        case 'Failed':
            return 'bg-red-50 text-red-700 border-red-100';
        case 'Completed':
            return 'bg-slate-100 text-slate-700 border-slate-200';
        default:
            return 'bg-blue-50 text-blue-700 border-blue-100';
    }
};

const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'WB';
    return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase();
};

const normalizeText = (value = '') => value.toString().trim().toLowerCase();

const formatClock = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatConversationTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    return isToday ? formatClock(value) : formatDate(value);
};

const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const formatLastSeen = (contact) => {
    if (contact?.isOnline) return 'Đang hoạt động';
    if (contact?.lastSeenAt) return `Hoạt động ${formatClock(contact.lastSeenAt)}`;
    return 'Chưa rõ trạng thái';
};

const messageBelongsToContact = (message, contactId, currentUserId) => {
    const senderId = Number(getValue(message, 'senderId'));
    const receiverId = Number(getValue(message, 'receiverId'));
    const peerId = Number(contactId);
    const me = Number(currentUserId);

    return (senderId === me && receiverId === peerId) || (senderId === peerId && receiverId === me);
};

const getValue = (source, camelKey, pascalKey = null) => {
    if (!source) return undefined;
    return source[camelKey] ?? source[pascalKey || `${camelKey[0].toUpperCase()}${camelKey.slice(1)}`];
};

const getMessageType = (message) => getValue(message, 'messageType') || 'Text';
const getMessageSenderId = (message) => Number(getValue(message, 'senderId'));
const getMessageSentAt = (message) => getValue(message, 'sentAt');

const getMessageOffer = (message) => {
    const offer = getValue(message, 'offer');
    if (!offer) return null;

    return {
        offerId: getValue(offer, 'offerId'),
        jobTitle: getValue(offer, 'jobTitle') || 'Lời mời nhận việc',
        branchName: getValue(offer, 'branchName') || 'Chi nhánh chưa rõ',
        position: getValue(offer, 'position') || 'Vị trí chưa rõ',
        hourlyRate: getValue(offer, 'hourlyRate') || 0,
        startDate: getValue(offer, 'startDate'),
        status: getValue(offer, 'status') || 'Sent'
    };
};

const getMessageInterview = (message) => getValue(message, 'interview');

const buildConversationPreview = (message) => {
    if (!message) return 'Chưa có tin nhắn';
    const messageType = getMessageType(message);
    if (messageType === 'InterviewInvite') return 'Lịch phỏng vấn đã được gửi';
    if (messageType === 'OfferInvite') return 'Lời mời nhận việc đang chờ phản hồi';
    return getValue(message, 'content') || 'Tin nhắn mới';
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
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [showHireModal, setShowHireModal] = useState(false);
    const [selectedInterview, setSelectedInterview] = useState(null);
    const [schedulingInterview, setSchedulingInterview] = useState(false);
    const [sendingOffer, setSendingOffer] = useState(false);
    const [submittingResult, setSubmittingResult] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [aiOpen, setAiOpen] = useState(false);
    const [aiDraft, setAiDraft] = useState('');
    const [aiMode, setAiMode] = useState('reply');
    const [aiLoading, setAiLoading] = useState(false);
    const [interviewForm, setInterviewForm] = useState({
        applicationId: '',
        scheduledAt: defaultInterviewTime(),
        location: '',
        note: ''
    });
    const [interviewLocation, setInterviewLocation] = useState({
        address: '',
        ward: '',
        district: '',
        city: ''
    });
    const [offerForm, setOfferForm] = useState({
        applicationId: '',
        branchId: '',
        position: '',
        hourlyRate: 20000,
        startDate: tomorrowDate(),
        paydayOfMonth: 5,
        expectedShifts: ''
    });
    const [hireForm, setHireForm] = useState({
        branchId: '',
        position: '',
        hourlyRate: 20000,
        startDate: tomorrowDate(),
        paydayOfMonth: 5
    });

    const token = localStorage.getItem('token');
    const currentUserId = parseInt(localStorage.getItem('userId') || '0');
    const userRole = localStorage.getItem('role');
    const isEmployer = userRole === 'Employer';
    const isApplicant = userRole === 'Applicant';
    const pinnedStorageKey = `workbridge:pinned-chat:${currentUserId}`;
    const [pinnedIds, setPinnedIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(pinnedStorageKey) || '[]');
        } catch {
            return [];
        }
    });

    const messagesContainerRef = useRef(null);
    const lastMessageCountRef = useRef(0);
    const typingTimeoutRef = useRef(null);
    const lastTypingSentRef = useRef(0);
    const selectedContactRef = useRef(null);
    const peerTypingTimeoutRef = useRef(null);
    const fetchConversationsRef = useRef(null);
    const fetchChatHistoryRef = useRef(null);
    const fetchChatContextRef = useRef(null);
    const fetchBranchesRef = useRef(null);
    const [peerIsTyping, setPeerIsTyping] = useState(false);

    const quickReplies = isEmployer ? EMPLOYER_QUICK_REPLIES : APPLICANT_QUICK_REPLIES;
    const selectedApplication = chatApplications[0] || null;
    const selectedOfferApplication = useMemo(() => (
        chatApplications.find(app => String(app.applicationId) === String(offerForm.applicationId)) || chatApplications[0] || null
    ), [chatApplications, offerForm.applicationId]);

    const sortedConversations = useMemo(() => {
        return [...conversations].sort((a, b) => {
            const aPinned = pinnedIds.includes(Number(a.contactId)) ? 1 : 0;
            const bPinned = pinnedIds.includes(Number(b.contactId)) ? 1 : 0;
            if (aPinned !== bPinned) return bPinned - aPinned;
            return new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0);
        });
    }, [conversations, pinnedIds]);

    const filteredConversations = useMemo(() => {
        const query = normalizeText(searchTerm);

        return sortedConversations.filter(conv => {
            const matchesQuery = !query ||
                normalizeText(conv.contactName).includes(query) ||
                normalizeText(conv.lastMessage).includes(query);

            if (!matchesQuery) return false;
            if (activeFilter === 'unread') return Number(conv.unreadCount || 0) > 0;
            if (activeFilter === 'pinned') return pinnedIds.includes(Number(conv.contactId));
            return true;
        });
    }, [activeFilter, pinnedIds, searchTerm, sortedConversations]);

    const filterCounts = useMemo(() => ({
        all: conversations.length,
        unread: conversations.filter(conv => Number(conv.unreadCount || 0) > 0).length,
        pinned: conversations.filter(conv => pinnedIds.includes(Number(conv.contactId))).length
    }), [conversations, pinnedIds]);

    const latestOffer = useMemo(() => {
        return [...messages]
            .reverse()
            .map(message => getMessageType(message) === 'OfferInvite' ? getMessageOffer(message) : null)
            .find(Boolean) || null;
    }, [messages]);

    const latestInterview = useMemo(() => {
        return [...messages]
            .reverse()
            .map(message => getMessageType(message) === 'InterviewInvite' ? getMessageInterview(message) : null)
            .find(Boolean) || null;
    }, [messages]);

    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(pinnedStorageKey, JSON.stringify(pinnedIds));
    }, [pinnedIds, pinnedStorageKey]);

    useEffect(() => {
        if (location.state?.contactId) {
            setSelectedContact({
                contactId: Number(location.state.contactId),
                contactName: location.state.contactName || 'Liên hệ'
            });
        }
    }, [location.state]);

    useEffect(() => {
        const activeContact = selectedContactRef.current;
        if (activeContact && conversations.length > 0) {
            const fresh = conversations.find(conv => Number(conv.contactId) === Number(activeContact.contactId));
            if (fresh) {
                setSelectedContact(prev => prev ? { ...prev, ...fresh } : fresh);
            }
        }
    }, [conversations]);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            navigate('/login');
            return;
        }

        signalRService.start();
        fetchConversationsRef.current?.();
        if (isEmployer) fetchBranchesRef.current?.();

        const onConvUpdated = () => {
            fetchConversationsRef.current?.();
            const activeContact = selectedContactRef.current;
            if (activeContact?.contactId) {
                fetchChatHistoryRef.current?.(activeContact.contactId);
            }
        };

        const onUserOnlineStatusChanged = (userId, isOnline, lastSeenAt) => {
            setConversations(prev => prev.map(conv =>
                Number(conv.contactId) === Number(userId)
                    ? { ...conv, isOnline, lastSeenAt }
                    : conv
            ));

            setSelectedContact(prev =>
                prev && Number(prev.contactId) === Number(userId)
                    ? { ...prev, isOnline, lastSeenAt }
                    : prev
            );
        };

        signalRService.on('ConversationUpdated', onConvUpdated);
        signalRService.on('UserOnlineStatusChanged', onUserOnlineStatusChanged);

        return () => {
            signalRService.off('ConversationUpdated', onConvUpdated);
            signalRService.off('UserOnlineStatusChanged', onUserOnlineStatusChanged);
        };
    }, [token, navigate, isEmployer]);

    useEffect(() => {
        const contactId = selectedContactRef.current?.contactId;
        if (!contactId) return;

        lastMessageCountRef.current = 0;
        setAiDraft('');
        setAiOpen(false);
        setShowOfferModal(false);
        setOfferForm(prev => ({
            ...prev,
            applicationId: '',
            position: '',
            expectedShifts: ''
        }));
        fetchChatHistoryRef.current?.(contactId);
        if (isEmployer) fetchChatContextRef.current?.(contactId);

        const joinRoom = async () => {
            await signalRService.invoke('JoinConversation', contactId);
        };

        joinRoom();

        const onReceiveMessage = (message) => {
            const activeContact = selectedContactRef.current;
            if (!activeContact || !messageBelongsToContact(message, activeContact.contactId, currentUserId)) {
                fetchConversationsRef.current?.();
                return;
            }

            setMessages(prev => {
                const nextMessageId = getValue(message, 'messageId');
                if (nextMessageId && prev.some(item => getValue(item, 'messageId') === nextMessageId)) {
                    return prev.map(item => getValue(item, 'messageId') === nextMessageId ? { ...item, ...message } : item);
                }
                return [...prev, message];
            });

            if (getMessageSenderId(message) === Number(activeContact.contactId)) {
                api.post(`/messages/${activeContact.contactId}/read`).catch(() => {});
            }

            fetchConversationsRef.current?.();
        };

        const onInterviewChanged = () => {
            const activeContact = selectedContactRef.current;
            if (!activeContact) return;
            fetchChatHistoryRef.current?.(activeContact.contactId);
            if (isEmployer) fetchChatContextRef.current?.(activeContact.contactId);
        };

        const onOfferChanged = () => {
            const activeContact = selectedContactRef.current;
            if (!activeContact) return;
            fetchChatHistoryRef.current?.(activeContact.contactId);
            fetchConversationsRef.current?.();
            if (isEmployer) fetchChatContextRef.current?.(activeContact.contactId);
        };

        const onTyping = (senderId, isTyping) => {
            const activeContact = selectedContactRef.current;
            if (Number(senderId) !== Number(activeContact?.contactId)) return;

            clearTimeout(peerTypingTimeoutRef.current);
            if (isTyping) {
                setPeerIsTyping(true);
                peerTypingTimeoutRef.current = setTimeout(() => setPeerIsTyping(false), 6000);
            } else {
                peerTypingTimeoutRef.current = setTimeout(() => setPeerIsTyping(false), 800);
            }
        };

        const handleReconnected = () => {
            joinRoom();
            fetchConversationsRef.current?.();
            fetchChatHistoryRef.current?.(contactId);
            if (isEmployer) fetchChatContextRef.current?.(contactId);
        };

        signalRService.on('ReceiveMessage', onReceiveMessage);
        signalRService.on('InterviewStatusChanged', onInterviewChanged);
        signalRService.on('OfferStatusChanged', onOfferChanged);
        signalRService.on('TypingIndicator', onTyping);
        signalRService.onReconnected(handleReconnected);

        return () => {
            signalRService.offReconnected(handleReconnected);
            signalRService.invoke('LeaveConversation', contactId);
            signalRService.off('ReceiveMessage', onReceiveMessage);
            signalRService.off('InterviewStatusChanged', onInterviewChanged);
            signalRService.off('OfferStatusChanged', onOfferChanged);
            signalRService.off('TypingIndicator', onTyping);
            clearTimeout(peerTypingTimeoutRef.current);
            setPeerIsTyping(false);
        };
    }, [selectedContact?.contactId, isEmployer, currentUserId]);

    useEffect(() => {
        if (messages.length > lastMessageCountRef.current) {
            scrollToBottom(messages.length === 1 ? 'auto' : 'smooth');
        }
        lastMessageCountRef.current = messages.length;
    }, [messages.length]);

    const scrollToBottom = (behavior = 'smooth') => {
        const container = messagesContainerRef.current;
        if (!container) return;
        container.scrollTo({ top: container.scrollHeight, behavior });
    };

    const fetchConversations = async () => {
        try {
            const res = await api.get('/messages/conversations');
            setConversations(res.data || []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChatHistory = async (contactId) => {
        try {
            const res = await api.get(`/messages/${contactId}`);
            setMessages(res.data || []);
            fetchConversations();
        } catch (error) {
            console.error('Error fetching chat history:', error);
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
            setOfferForm(prev => ({
                ...prev,
                applicationId: applications[0] ? String(applications[0].applicationId) : '',
                position: applications[0]?.jobTitle || prev.position || ''
            }));
        } catch {
            setChatApplications([]);
            setOfferForm(prev => ({ ...prev, applicationId: '', position: '' }));
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await api.get('/branches');
            setBranches(res.data || []);
            if (res.data?.[0]) {
                setHireForm(prev => ({ ...prev, branchId: prev.branchId || String(res.data[0].branchId) }));
                setOfferForm(prev => ({ ...prev, branchId: prev.branchId || String(res.data[0].branchId) }));
            }
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    fetchConversationsRef.current = fetchConversations;
    fetchChatHistoryRef.current = fetchChatHistory;
    fetchChatContextRef.current = fetchChatContext;
    fetchBranchesRef.current = fetchBranches;

    const markActiveThreadRead = async (contactId) => {
        try {
            await api.post(`/messages/${contactId}/read`);
            fetchConversations();
        } catch {
            // Read receipts should not interrupt the chat flow.
        }
    };

    const handleSelectContact = (conversation) => {
        setSelectedContact(conversation);
        setNewMessage('');
        if (Number(conversation.unreadCount || 0) > 0) {
            markActiveThreadRead(conversation.contactId);
        }
    };

    const togglePinned = (contactId) => {
        const numericId = Number(contactId);
        setPinnedIds(prev =>
            prev.includes(numericId)
                ? prev.filter(id => id !== numericId)
                : [numericId, ...prev]
        );
    };

    const handleInputChange = (event) => {
        const value = event.target.value;
        setNewMessage(value);

        if (!selectedContact) return;

        const now = Date.now();
        if (now - lastTypingSentRef.current > 3000) {
            signalRService.invoke('SendTypingIndicator', selectedContact.contactId, true);
            lastTypingSentRef.current = now;
        }

        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            signalRService.invoke('SendTypingIndicator', selectedContact.contactId, false);
            lastTypingSentRef.current = 0;
        }, 4000);
    };

    const handleSendMessage = async (event) => {
        event.preventDefault();
        const text = newMessage.trim();
        if (!text || !selectedContact || sending) return;

        clearTimeout(typingTimeoutRef.current);
        signalRService.invoke('SendTypingIndicator', selectedContact.contactId, false);
        lastTypingSentRef.current = 0;

        setSending(true);
        try {
            const res = await api.post('/messages', {
                receiverId: selectedContact.contactId,
                content: text
            });

            setMessages(prev => {
                const nextMessageId = getValue(res.data, 'messageId');
                if (nextMessageId && prev.some(item => getValue(item, 'messageId') === nextMessageId)) return prev;
                return [...prev, res.data];
            });
            setNewMessage('');
            setAiDraft('');
            fetchConversations();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể gửi tin nhắn.');
        } finally {
            setSending(false);
        }
    };

    const openOfferModal = () => {
        if (!isEmployer) return;
        if (chatApplications.length === 0) {
            toast.error('Chưa có hồ sơ đủ điều kiện để gửi lời mời nhận việc.');
            return;
        }
        if (branches.length === 0) {
            toast.error('Vui lòng tạo ít nhất một chi nhánh trước khi gửi lời mời nhận việc.');
            return;
        }

        const application =
            chatApplications.find(app => !app.isEmployee && !app.hasAcceptedOffer && app.status !== 'Rejected') ||
            chatApplications[0];

        if (!application || application.isEmployee || application.hasAcceptedOffer) {
            toast.error('Ứng viên này đã nhận việc cho hồ sơ đang chọn.');
            return;
        }

        setOfferForm(prev => ({
            ...prev,
            applicationId: String(application.applicationId),
            branchId: prev.branchId || String(branches[0]?.branchId || ''),
            position: application.jobTitle || prev.position || '',
            hourlyRate: prev.hourlyRate || 20000,
            startDate: prev.startDate || tomorrowDate(),
            paydayOfMonth: prev.paydayOfMonth || 5
        }));
        setShowOfferModal(true);
    };

    const sendOffer = async (event) => {
        event.preventDefault();
        if (!selectedContact || sendingOffer) return;

        const application = chatApplications.find(app => String(app.applicationId) === String(offerForm.applicationId));
        const hourlyRate = parseVND(offerForm.hourlyRate);
        const payday = Number(offerForm.paydayOfMonth);

        if (!application) {
            toast.error('Vui lòng chọn hồ sơ cần gửi lời mời.');
            return;
        }
        if (application.isEmployee || application.hasAcceptedOffer) {
            toast.error('Ứng viên này đã nhận việc cho hồ sơ đang chọn.');
            return;
        }
        if (!offerForm.branchId) {
            toast.error('Vui lòng chọn chi nhánh làm việc.');
            return;
        }
        if (!offerForm.position.trim()) {
            toast.error('Vui lòng nhập vị trí làm việc.');
            return;
        }
        if (hourlyRate <= 0) {
            toast.error('Mức lương theo giờ phải lớn hơn 0.');
            return;
        }
        if (!offerForm.startDate) {
            toast.error('Vui lòng chọn ngày bắt đầu làm việc.');
            return;
        }
        if (payday < 1 || payday > 28) {
            toast.error('Ngày trả lương phải nằm trong khoảng 1 - 28.');
            return;
        }

        setSendingOffer(true);
        try {
            await api.post('/offers', {
                applicationId: Number(offerForm.applicationId),
                branchId: Number(offerForm.branchId),
                position: offerForm.position.trim(),
                hourlyRate,
                startDate: offerForm.startDate,
                paydayOfMonth: payday,
                expectedShifts: offerForm.expectedShifts.trim() || null
            });
            toast.success('Đã gửi lời mời nhận việc trong đoạn chat.');
            setShowOfferModal(false);
            setOfferForm(prev => ({ ...prev, expectedShifts: '' }));
            await fetchChatHistory(selectedContact.contactId);
            fetchChatContext(selectedContact.contactId);
            fetchConversations();
        } catch (error) {
            console.error('Send offer failed:', error.response?.status, error.response?.data || error.message);
            toast.error(getApiErrorMessage(error, 'Không thể gửi lời mời nhận việc.'));
        } finally {
            setSendingOffer(false);
        }
    };

    const openInterviewModal = () => {
        if (chatApplications.length === 0) {
            toast.error('Chưa có hồ sơ đủ điều kiện để hẹn phỏng vấn.');
            return;
        }

        const parsedLocation = parseStoredGoongAddress(interviewForm.location || '');
        setInterviewLocation({
            address: parsedLocation.address || '',
            ward: parsedLocation.ward || '',
            district: parsedLocation.district || '',
            city: parsedLocation.city || parsedLocation.province || ''
        });
        setInterviewForm(prev => ({
            ...prev,
            applicationId: prev.applicationId || String(chatApplications[0].applicationId),
            scheduledAt: prev.scheduledAt || defaultInterviewTime()
        }));
        setShowInterviewModal(true);
    };

    const scheduleInterview = async (event) => {
        event.preventDefault();
        if (!selectedContact || schedulingInterview) return;

        const fullLocation = composeGoongAddress({
            detailAddress: interviewLocation.address,
            ward: interviewLocation.ward,
            district: interviewLocation.district,
            province: interviewLocation.city
        });

        if (!interviewLocation.city.trim() || !interviewLocation.district.trim() || !interviewLocation.ward.trim() || !interviewLocation.address.trim()) {
            toast.error('Vui lòng nhập đủ tỉnh/thành, quận/huyện, phường/xã và địa chỉ phỏng vấn.');
            return;
        }

        setSchedulingInterview(true);
        try {
            await api.post('/interviews/chat-invite', {
                contactId: selectedContact.contactId,
                applicationId: Number(interviewForm.applicationId),
                scheduledAt: interviewForm.scheduledAt,
                location: fullLocation,
                note: interviewForm.note
            });
            toast.success('Đã gửi lịch phỏng vấn.');
            setShowInterviewModal(false);
            setInterviewForm(prev => ({ ...prev, note: '', location: '' }));
            setInterviewLocation({ address: '', ward: '', district: '', city: '' });
            await fetchChatHistory(selectedContact.contactId);
            fetchChatContext(selectedContact.contactId);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể gửi lịch phỏng vấn.');
        } finally {
            setSchedulingInterview(false);
        }
    };

    const updateInterviewStatus = async (interviewId, status) => {
        try {
            await api.patch(`/interviews/${interviewId}/status`, { status });
            toast.success(status === 'Confirmed' ? 'Đã xác nhận lịch phỏng vấn.' : 'Đã từ chối lịch phỏng vấn.');
            if (selectedContact) {
                fetchChatHistory(selectedContact.contactId);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể cập nhật lịch phỏng vấn.');
        }
    };

    const openHireModal = (interview) => {
        if (branches.length === 0) {
            toast.error('Vui lòng tạo chi nhánh trước khi nhận ứng viên.');
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
            toast.success(result === 'Passed' ? 'Đã nhận ứng viên vào làm.' : 'Đã đánh dấu không đạt.');
            setShowHireModal(false);
            setSelectedInterview(null);
            if (selectedContact) {
                fetchChatHistory(selectedContact.contactId);
                fetchChatContext(selectedContact.contactId);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể cập nhật kết quả phỏng vấn.');
        } finally {
            setSubmittingResult(false);
        }
    };

    const buildAiPrompt = (mode) => {
        const recentLines = messages.slice(-8).map(message => {
            const who = getMessageSenderId(message) === currentUserId ? 'Tôi' : selectedContact?.contactName || 'Đối phương';
            return `${who}: ${buildConversationPreview(message)}`;
        }).join('\n');

        const applicationLine = selectedApplication
            ? `Hồ sơ đang trao đổi: ${selectedApplication.jobTitle}, trạng thái ${selectedApplication.status}.`
            : 'Chưa có hồ sơ cụ thể trong khung chat.';

        const modeInstruction = {
            reply: 'Viết 2 phương án trả lời ngắn gọn, tự nhiên, lịch sự. Chỉ đưa phần tin nhắn có thể gửi, không giải thích dài.',
            summarize: 'Tóm tắt hội thoại thành các ý chính, việc cần làm tiếp theo, và rủi ro cần chú ý.',
            interview: isEmployer
                ? 'Soạn một tin nhắn mời phỏng vấn offline chuyên nghiệp, có thể chỉnh sửa trước khi gửi.'
                : 'Soạn một tin nhắn xác nhận hoặc hỏi thêm thông tin lịch phỏng vấn thật lịch sự.'
        }[mode] || 'Viết gợi ý trả lời phù hợp.';

        return `
Bạn đang hỗ trợ soạn nội dung trong khung chat WorkBridge giữa ${isEmployer ? 'nhà tuyển dụng' : 'ứng viên'} và ${selectedContact?.contactName || 'đối phương'}.
${applicationLine}

Tin nhắn gần đây:
${recentLines || 'Chưa có tin nhắn gần đây.'}

Yêu cầu:
${modeInstruction}
Giữ giọng văn đời thường, rõ ý, không dùng từ quá máy móc.`;
    };

    const handleAiAssist = async (mode = 'reply') => {
        if (!selectedContact || aiLoading) return;
        setAiMode(mode);
        setAiOpen(true);
        setAiLoading(true);
        setAiDraft('');

        try {
            const response = await api.post('/gemini/chat', { message: buildAiPrompt(mode) });
            setAiDraft(response.data?.response || 'AI chưa tạo được gợi ý phù hợp.');
        } catch (error) {
            const message = error.response?.data?.message || 'Không thể kết nối trợ lý AI.';
            setAiDraft(message);
            toast.error(message);
        } finally {
            setAiLoading(false);
        }
    };

    const applyAiDraft = () => {
        if (!aiDraft.trim()) return;
        setNewMessage(aiDraft.trim());
        setAiOpen(false);
    };

    const renderInterviewCard = (message) => {
        const interview = getMessageInterview(message);
        if (!interview) return null;

        const canApplicantRespond = isApplicant &&
            interview.applicantId === currentUserId &&
            interview.status === 'Scheduled' &&
            !interview.result;
        const canEmployerResult = isEmployer &&
            interview.employerId === currentUserId &&
            interview.canEmployerMarkResult;
        const isOwn = getMessageSenderId(message) === currentUserId;

        return (
            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className="w-full max-w-[460px] overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/70 px-4 py-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wide text-blue-500">Phỏng vấn offline</p>
                            <h3 className="truncate text-sm font-black text-slate-800">{interview.jobTitle}</h3>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(interview.result || interview.status)}`}>
                            {interview.result || interview.status}
                        </span>
                    </div>
                    <div className="space-y-3 p-4">
                        <div className="grid gap-2 text-sm text-slate-800">
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined !text-[18px] text-slate-800">schedule</span>
                                <span>{formatDateTime(interview.scheduledAt)}</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined !text-[18px] text-slate-800">location_on</span>
                                <span className="break-words">{interview.location}</span>
                            </div>
                            {interview.note && (
                                <div className="flex items-start gap-2">
                                    <span className="material-symbols-outlined !text-[18px] text-slate-800">notes</span>
                                    <span className="break-words">{interview.note}</span>
                                </div>
                            )}
                        </div>

                        {canApplicantRespond && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button type="button" onClick={() => updateInterviewStatus(interview.interviewId, 'Confirmed')} className="h-10 rounded-lg bg-emerald-500 text-sm font-bold text-white">
                                    Xác nhận
                                </button>
                                <button type="button" onClick={() => updateInterviewStatus(interview.interviewId, 'Declined')} className="h-10 rounded-lg border border-red-100 bg-red-50 text-sm font-bold text-red-600">
                                    Từ chối
                                </button>
                            </div>
                        )}

                        {canEmployerResult && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button type="button" onClick={() => openHireModal(interview)} className="h-10 rounded-lg bg-emerald-500 text-sm font-bold text-white">
                                    Đạt
                                </button>
                                <button type="button" onClick={() => submitInterviewResult('Failed', interview)} className="h-10 rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                                    Không đạt
                                </button>
                            </div>
                        )}

                        {isEmployer && interview.status === 'Confirmed' && !interview.canEmployerMarkResult && !interview.result && (
                            <p className="text-xs font-semibold text-slate-800">Ứng viên đã xác nhận. Có thể nhập kết quả sau giờ phỏng vấn.</p>
                        )}
                        {isEmployer && interview.status === 'Scheduled' && !interview.result && (
                            <p className="text-xs font-semibold text-slate-800">Đang chờ ứng viên phản hồi.</p>
                        )}

                        <div className={`text-[10px] text-slate-800 ${isOwn ? 'text-right' : 'text-left'}`}>
                            {formatClock(getMessageSentAt(message))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderOfferCard = (message) => {
        const offer = getMessageOffer(message);
        const isOwn = getMessageSenderId(message) === currentUserId;

        if (!offer) {
            return (
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className="w-full max-w-[460px] rounded-lg border border-blue-100 bg-white p-4 text-sm text-slate-800 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined !text-[20px] text-[#1687d9]">contract</span>
                            <div>
                                <p className="font-black text-slate-800">Lời mời nhận việc</p>
                                <p className="text-xs text-slate-700">Nhà tuyển dụng đã gửi lời mời. Mở mục Lời mời để xem chi tiết.</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => navigate('/offers')} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                            Xem lời mời
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className="w-full max-w-[460px] overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wide text-[#1687d9]">Lời mời nhận việc</p>
                            <h3 className="truncate text-sm font-black text-slate-800">{offer.jobTitle}</h3>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(offer.status)}`}>
                            {offer.status}
                        </span>
                    </div>
                    <div className="space-y-3 p-4 text-sm text-slate-800">
                        <div className="grid gap-2">
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined !text-[18px] text-slate-800">work</span>
                                <span>{offer.position} tại {offer.branchName}</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined !text-[18px] text-slate-800">payments</span>
                                <span>{Number(offer.hourlyRate || 0).toLocaleString('vi-VN')} VND/giờ</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined !text-[18px] text-slate-800">event_available</span>
                                <span>Bắt đầu {formatDate(offer.startDate)}</span>
                            </div>
                        </div>
                        <button type="button" onClick={() => navigate('/offers')} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                            Xem lời mời
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderMessageBubble = (message) => {
        const messageType = getMessageType(message);
        if (messageType === 'InterviewInvite') return renderInterviewCard(message);
        if (messageType === 'OfferInvite') return renderOfferCard(message);

        const isOwn = getMessageSenderId(message) === currentUserId;
        const content = getValue(message, 'content');
        return (
            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] break-words rounded-lg px-4 py-2.5 text-sm shadow-sm sm:max-w-[72%] lg:max-w-[62%] ${
                    isOwn
                        ? 'rounded-br-sm bg-[#1687d9] text-white'
                        : 'rounded-bl-sm border border-slate-100 bg-white text-slate-700'
                }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
                    <div className={`mt-1 flex items-center gap-1 text-[10px] ${isOwn ? 'justify-end text-white/75' : 'justify-start text-slate-800'}`}>
                        <span>{formatClock(getMessageSentAt(message))}</span>
                        {isOwn && (
                            <span className="material-symbols-outlined !text-[13px]">
                                {message.isRead ? 'done_all' : 'done'}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading && !selectedContact) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="workbridge-chat-shell flex h-[calc(100dvh-64px)] overflow-hidden bg-[#f4f8fc] font-display text-slate-800">
            <aside className={`${selectedContact ? 'hidden md:flex' : 'flex'} h-full w-full shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white md:w-[360px] xl:w-[390px]`}>
                <div className="border-b border-slate-100 px-4 py-4">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-black tracking-tight text-slate-900">Tin nhắn</h1>
                            <p className="text-xs font-medium text-slate-800">Trao đổi tuyển dụng và vận hành</p>
                        </div>
                        <button type="button" title="Đồng bộ" onClick={fetchConversations} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-800 hover:bg-slate-50 hover:text-primary">
                            <span className="material-symbols-outlined !text-xl">sync</span>
                        </button>
                    </div>

                    <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-[#1687d9] focus-within:bg-white">
                        <span className="material-symbols-outlined !text-[19px] text-slate-800">search</span>
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-800"
                            placeholder="Tìm theo tên hoặc nội dung"
                        />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                        {FILTERS.map(filter => (
                            <button
                                type="button"
                                key={filter.id}
                                onClick={() => setActiveFilter(filter.id)}
                                className={`flex h-9 items-center justify-center gap-1.5 rounded-md text-xs font-bold transition ${
                                    activeFilter === filter.id
                                        ? 'bg-white text-[#1687d9] shadow-sm'
                                        : 'text-slate-700 hover:text-slate-800'
                                }`}
                            >
                                <span className="material-symbols-outlined !text-[16px]">{filter.icon}</span>
                                <span>{filter.label}</span>
                                {filterCounts[filter.id] > 0 && (
                                    <span className="text-[10px] text-slate-800">{filterCounts[filter.id]}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto">
                    {filteredConversations.length === 0 ? (
                        <div className="px-8 py-16 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                                <span className="material-symbols-outlined text-slate-300">forum</span>
                            </div>
                            <p className="text-sm font-bold text-slate-700">Không có hội thoại phù hợp</p>
                            <p className="mt-1 text-xs text-slate-800">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                        </div>
                    ) : (
                        filteredConversations.map((conv) => {
                            const isActive = Number(selectedContact?.contactId) === Number(conv.contactId);
                            const isPinned = pinnedIds.includes(Number(conv.contactId));
                            return (
                                <button
                                    type="button"
                                    key={conv.contactId}
                                    onClick={() => handleSelectContact(conv)}
                                    className={`group w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-blue-50/60 ${
                                        isActive ? 'bg-blue-50' : 'bg-white'
                                    }`}
                                >
                                    <div className="flex gap-3">
                                        <div className="relative shrink-0">
                                            <div className="h-11 w-11 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                                                <img
                                                    src={conv.avatarUrl || "/default-avatar.png"}
                                                    alt={conv.contactName}
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
                                                />
                                            </div>
                                            <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${conv.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-0.5 flex items-start justify-between gap-2">
                                                <div className="flex min-w-0 items-center gap-1.5">
                                                    <h3 className="truncate text-sm font-black text-slate-800">{conv.contactName}</h3>
                                                    {isPinned && <span className="material-symbols-outlined !text-[14px] text-[#1687d9]">keep</span>}
                                                </div>
                                                <span className="shrink-0 text-[10px] font-medium text-slate-800">{formatConversationTime(conv.lastMessageAt)}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`truncate text-xs ${conv.unreadCount > 0 ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                                                    {conv.lastMessage || 'Mở hội thoại'}
                                                </p>
                                                {conv.unreadCount > 0 && (
                                                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#1687d9] px-1 text-[10px] font-black text-white">
                                                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </aside>

            <main className={`${selectedContact ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col bg-[#f4f8fc]`}>
                {selectedContact ? (
                    <>
                        <div className="flex h-[64px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
                            <button type="button" onClick={() => setSelectedContact(null)} title="Quay lại" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-50 md:hidden">
                                <span className="material-symbols-outlined !text-xl">arrow_back</span>
                            </button>
                            <div className="relative shrink-0">
                                <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                                    <img
                                        src={selectedContact.avatarUrl || "/default-avatar.png"}
                                        alt={selectedContact.contactName}
                                        className="h-full w-full object-cover"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
                                    />
                                </div>
                                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${selectedContact.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="truncate text-sm font-black text-slate-900">{selectedContact.contactName}</h2>
                                <p className={`text-[11px] font-bold ${selectedContact.isOnline ? 'text-emerald-600' : 'text-slate-800'}`}>
                                    {formatLastSeen(selectedContact)}
                                </p>
                            </div>
                            <div className="ml-auto flex items-center gap-1.5">
                                <button type="button" onClick={() => togglePinned(selectedContact.contactId)} title="Ghim hội thoại" className={`flex h-9 w-9 items-center justify-center rounded-lg ${pinnedIds.includes(Number(selectedContact.contactId)) ? 'bg-blue-50 text-[#1687d9]' : 'text-slate-800 hover:bg-slate-50'}`}>
                                    <span className="material-symbols-outlined !text-xl">keep</span>
                                </button>
                                {isEmployer && chatApplications.length > 0 && (
                                    <>
                                        <button type="button" onClick={openOfferModal} title="Gửi lời mời nhận việc" className="flex h-9 items-center gap-1.5 rounded-lg bg-[#1687d9] px-3 text-xs font-black text-white hover:bg-[#0f75c2]">
                                            <span className="material-symbols-outlined !text-[18px]">assignment_turned_in</span>
                                            <span className="hidden sm:inline">Lời mời</span>
                                        </button>
                                        <button type="button" onClick={openInterviewModal} title="Hẹn phỏng vấn" className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-black text-[#1687d9] hover:bg-blue-100">
                                            <span className="material-symbols-outlined !text-[18px]">event</span>
                                            <span className="hidden sm:inline">Phỏng vấn</span>
                                        </button>
                                    </>
                                )}
                                <button type="button" onClick={() => setShowReportModal(true)} title="Báo cáo" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-800 hover:bg-rose-50 hover:text-rose-500">
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

                        <div className="flex min-h-0 flex-1">
                            <section className="flex min-w-0 flex-1 flex-col">
                                <div ref={messagesContainerRef} className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                                    {messages.length === 0 ? (
                                        <div className="flex h-full flex-col items-center justify-center text-center">
                                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm">
                                                <span className="material-symbols-outlined !text-3xl">chat</span>
                                            </div>
                                            <h3 className="text-sm font-black text-slate-800">Bắt đầu hội thoại</h3>
                                            <p className="mt-1 max-w-sm text-xs text-slate-800">Tin nhắn sẽ được đồng bộ realtime khi hai bên đang online.</p>
                                        </div>
                                    ) : (
                                        <div className="mx-auto flex w-full max-w-[860px] flex-col gap-3">
                                            {messages.map((message, index) => (
                                                <React.Fragment key={getValue(message, 'messageId') || `${getMessageType(message)}-${index}`}>
                                                    {renderMessageBubble(message)}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {peerIsTyping && (
                                    <div className="bg-[#f4f8fc] px-4 pb-2 sm:px-6">
                                        <div className="mx-auto flex max-w-[860px] items-center gap-2 text-xs font-medium text-slate-800">
                                            <div className="flex items-center gap-1">
                                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                                            </div>
                                            <span>{selectedContact.contactName} đang nhập</span>
                                        </div>
                                    </div>
                                )}

                                <div className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
                                    <div className="mx-auto max-w-[900px]">
                                        {aiOpen && (
                                            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                                <div className="mb-2 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined !text-[18px] text-[#1687d9]">auto_awesome</span>
                                                        <p className="text-xs font-black uppercase tracking-wide text-slate-700">
                                                            {aiMode === 'summarize' ? 'AI tóm tắt' : aiMode === 'interview' ? 'AI phỏng vấn' : 'AI gợi ý trả lời'}
                                                        </p>
                                                    </div>
                                                    <button type="button" onClick={() => setAiOpen(false)} title="Đóng" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-800 hover:bg-white">
                                                        <span className="material-symbols-outlined !text-[17px]">close</span>
                                                    </button>
                                                </div>
                                                {aiLoading ? (
                                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                                        <span className="h-2 w-2 animate-pulse rounded-full bg-[#1687d9]" />
                                                        Đang soạn gợi ý...
                                                    </div>
                                                ) : (
                                                    <>
                                                        <textarea
                                                            value={aiDraft}
                                                            onChange={(event) => setAiDraft(event.target.value)}
                                                            className="min-h-28 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700"
                                                        />
                                                        <div className="mt-2 flex justify-end gap-2">
                                                            <button type="button" onClick={() => handleAiAssist(aiMode)} className="h-8 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-800 hover:bg-white">
                                                                Tạo lại
                                                            </button>
                                                            <button type="button" onClick={applyAiDraft} className="h-8 rounded-lg bg-[#1687d9] px-3 text-xs font-bold text-white hover:bg-[#0f75c2]">
                                                                Đưa vào ô nhập
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        <div className="mb-2 flex flex-wrap gap-2">
                                            {quickReplies.map(reply => (
                                                <button
                                                    type="button"
                                                    key={reply}
                                                    onClick={() => setNewMessage(reply)}
                                                    className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-blue-200 hover:bg-blue-50 hover:text-[#1687d9]"
                                                >
                                                    {reply.length > 44 ? `${reply.slice(0, 44)}...` : reply}
                                                </button>
                                            ))}
                                        </div>

                                        <form onSubmit={handleSendMessage} className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 focus-within:border-[#1687d9] focus-within:bg-white">
                                            <button type="button" onClick={isEmployer ? openInterviewModal : undefined} title={isEmployer ? 'Hẹn phỏng vấn' : 'Tùy chọn'} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-800 hover:bg-white hover:text-[#1687d9]">
                                                <span className="material-symbols-outlined">add_circle</span>
                                            </button>
                                            <textarea
                                                rows={1}
                                                value={newMessage}
                                                onChange={handleInputChange}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' && !event.shiftKey) {
                                                        event.preventDefault();
                                                        handleSendMessage(event);
                                                    }
                                                }}
                                                placeholder="Nhập tin nhắn..."
                                                className="max-h-28 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm leading-relaxed text-slate-700 placeholder:text-slate-800"
                                            />
                                            <div className="flex shrink-0 items-center gap-1">
                                                <button type="button" onClick={() => handleAiAssist('reply')} title="AI gợi ý trả lời" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-800 hover:bg-blue-50 hover:text-[#1687d9]">
                                                    <span className="material-symbols-outlined">auto_awesome</span>
                                                </button>
                                                <button type="submit" disabled={!newMessage.trim() || sending} title="Gửi" className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                                                    newMessage.trim() && !sending
                                                        ? 'bg-[#1687d9] text-white hover:bg-[#0f75c2]'
                                                        : 'bg-slate-200 text-slate-800'
                                                }`}>
                                                    <span className="material-symbols-outlined !text-[20px]">send</span>
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </section>

                            <aside className="scrollbar-none hidden w-[320px] shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white xl:flex">
                                <div className="border-b border-slate-100 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                                            <img
                                                src={selectedContact.avatarUrl || "/default-avatar.png"}
                                                alt={selectedContact.contactName}
                                                className="h-full w-full object-cover"
                                                onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="truncate text-sm font-black text-slate-900">{selectedContact.contactName}</h3>
                                            <p className="text-xs font-medium text-slate-800">{formatLastSeen(selectedContact)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5 p-4">
                                    <section>
                                        <div className="mb-2 flex items-center justify-between">
                                            <h4 className="text-xs font-black uppercase tracking-wide text-slate-800">Hồ sơ liên quan</h4>
                                            {isEmployer && chatApplications.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={openOfferModal} className="text-xs font-bold text-[#1687d9]">Gửi lời mời</button>
                                                    <button type="button" onClick={openInterviewModal} className="text-xs font-bold text-[#1687d9]">Hẹn lịch</button>
                                                </div>
                                            )}
                                        </div>
                                        {isEmployer && chatApplications.length > 0 ? (
                                            <div className="space-y-2">
                                                {chatApplications.map(app => (
                                                    <div key={app.applicationId} className="rounded-lg border border-slate-200 p-3">
                                                        <p className="line-clamp-2 text-sm font-black text-slate-800">{app.jobTitle}</p>
                                                        <div className="mt-2 flex items-center justify-between text-xs text-slate-700">
                                                            <span>{app.status}</span>
                                                            <span>{formatDate(app.appliedAt)}</span>
                                                        </div>
                                                        {app.offerStatus && (
                                                            <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusClass(app.offerStatus)}`}>
                                                                Offer {app.offerStatus}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                                                {isEmployer ? 'Chưa có hồ sơ đang mở cho hội thoại này.' : 'Nhà tuyển dụng sẽ gửi lịch phỏng vấn hoặc offer trực tiếp trong khung chat.'}
                                            </p>
                                        )}
                                    </section>

                                    <section>
                                        <h4 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-800">Trạng thái gần nhất</h4>
                                        <div className="space-y-2 rounded-lg border border-slate-200 p-3 text-xs text-slate-800">
                                            <div className="flex items-center justify-between gap-3">
                                                <span>Phỏng vấn</span>
                                                <span className="font-bold text-slate-800">{latestInterview ? latestInterview.result || latestInterview.status : 'Chưa có'}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <span>Offer</span>
                                                <span className="font-bold text-slate-800">{latestOffer ? latestOffer.status : 'Chưa có'}</span>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h4 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-800">Công cụ nhanh</h4>
                                        <div className="grid gap-2">
                                            {isEmployer && chatApplications.length > 0 && (
                                                <button type="button" onClick={openOfferModal} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-[#1687d9]">
                                                    <span className="material-symbols-outlined !text-[18px] text-[#1687d9]">assignment_turned_in</span>
                                                    Gửi lời mời nhận việc
                                                </button>
                                            )}
                                            <button type="button" onClick={() => handleAiAssist('summarize')} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">
                                                <span className="material-symbols-outlined !text-[18px] text-[#1687d9]">summarize</span>
                                                Tóm tắt hội thoại bằng AI
                                            </button>
                                            <button type="button" onClick={() => handleAiAssist('interview')} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">
                                                <span className="material-symbols-outlined !text-[18px] text-[#1687d9]">event_note</span>
                                                Gợi ý tin phỏng vấn
                                            </button>
                                            <button type="button" onClick={() => setShowReportModal(true)} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-left text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600">
                                                <span className="material-symbols-outlined !text-[18px]">flag</span>
                                                Báo cáo người dùng
                                            </button>
                                        </div>
                                    </section>
                                </div>
                            </aside>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
                        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm">
                            <span className="material-symbols-outlined !text-5xl text-slate-300">forum</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-800">Chọn một hội thoại</h2>
                        <p className="mt-2 max-w-sm text-sm text-slate-700">Danh sách bên trái giống một inbox vận hành: lọc nhanh, ghim người quan trọng và xử lý hồ sơ ngay trong chat.</p>
                    </div>
                )}
            </main>

            {showOfferModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
                    <form onSubmit={sendOffer} className="scrollbar-none max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-6">
                            <div className="min-w-0">
                                <h3 className="text-xl font-bold text-slate-800">Gửi lời mời nhận việc</h3>
                                <p className="text-sm text-slate-700">Ứng viên sẽ nhận offer trực tiếp trong đoạn chat.</p>
                            </div>
                            <button type="button" onClick={() => setShowOfferModal(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-slate-100">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4 p-6">
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
                                Đây là lời mời nhận việc, chưa phải hợp đồng chính thức. Khi ứng viên đồng ý, hệ thống sẽ chuyển hồ sơ sang nhân sự.
                            </div>

                            <label className="block">
                                <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-800">Hồ sơ</span>
                                <select
                                    value={offerForm.applicationId}
                                    onChange={(event) => {
                                        const application = chatApplications.find(app => String(app.applicationId) === String(event.target.value));
                                        setOfferForm(prev => ({
                                            ...prev,
                                            applicationId: event.target.value,
                                            position: application?.jobTitle || prev.position
                                        }));
                                    }}
                                    className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm"
                                    required
                                >
                                    {chatApplications.map(app => (
                                        <option key={app.applicationId} value={app.applicationId} disabled={app.isEmployee || app.hasAcceptedOffer}>
                                            {app.jobTitle} - {app.offerStatus ? `Offer ${app.offerStatus}` : app.status}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {selectedOfferApplication?.hasSentOffer && (
                                <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                                    Hồ sơ này đã có lời mời đang chờ phản hồi. Gửi lại sẽ cập nhật nội dung lời mời cũ trong chat.
                                </p>
                            )}

                            <label className="block">
                                <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-800">Chi nhánh</span>
                                <select value={offerForm.branchId} onChange={(event) => setOfferForm(prev => ({ ...prev, branchId: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm" required>
                                    {branches.map(branch => (
                                        <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
                                    ))}
                                </select>
                            </label>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-800">Vị trí</span>
                                    <input value={offerForm.position} onChange={(event) => setOfferForm(prev => ({ ...prev, position: event.target.value }))} placeholder="Vị trí làm việc" className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm" required />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-800">Lương theo giờ</span>
                                    <input type="text" inputMode="numeric" value={formatVND(offerForm.hourlyRate)} onChange={(event) => setOfferForm(prev => ({ ...prev, hourlyRate: formatVND(event.target.value) }))} placeholder="VD: 25.000" className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm" required />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-800">Ngày bắt đầu</span>
                                    <input type="date" value={offerForm.startDate} onChange={(event) => setOfferForm(prev => ({ ...prev, startDate: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm" required />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-800">Ngày trả lương</span>
                                    <input type="number" min="1" max="28" value={offerForm.paydayOfMonth} onChange={(event) => setOfferForm(prev => ({ ...prev, paydayOfMonth: event.target.value }))} placeholder="1 - 28" className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm" required />
                                </label>
                            </div>

                            <label className="block">
                                <span className="mb-1 block text-[11px] font-black uppercase tracking-wide text-slate-800">Ca làm dự kiến</span>
                                <textarea value={offerForm.expectedShifts} onChange={(event) => setOfferForm(prev => ({ ...prev, expectedShifts: event.target.value }))} placeholder="VD: Ca tối 18:00 - 22:00, 4 buổi/tuần" className="min-h-20 w-full resize-none rounded-lg border border-slate-200 px-4 py-3 text-sm" />
                            </label>

                            <button type="submit" disabled={sendingOffer} className="h-11 w-full rounded-lg bg-[#1687d9] text-sm font-bold text-white hover:bg-[#0f75c2] disabled:opacity-60">
                                {sendingOffer ? 'Đang gửi...' : 'Gửi lời mời vào chat'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showInterviewModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
                    <form onSubmit={scheduleInterview} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-6">
                            <div className="min-w-0">
                                <h3 className="text-xl font-bold text-slate-800">Hẹn phỏng vấn offline</h3>
                                <p className="text-sm text-slate-700">Ứng viên sẽ phản hồi trực tiếp trong khung chat.</p>
                            </div>
                            <button type="button" onClick={() => setShowInterviewModal(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="space-y-4 p-6">
                            <select value={interviewForm.applicationId} onChange={(event) => setInterviewForm(prev => ({ ...prev, applicationId: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm">
                                {chatApplications.map(app => (
                                    <option key={app.applicationId} value={app.applicationId}>
                                        {app.jobTitle} - {app.status}
                                    </option>
                                ))}
                            </select>
                            <input type="datetime-local" value={interviewForm.scheduledAt} onChange={(event) => setInterviewForm(prev => ({ ...prev, scheduledAt: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm" required />
                            <GoongAddressPicker
                                value={interviewLocation}
                                onChange={(next, meta) => {
                                    setInterviewLocation(next);
                                    setInterviewForm(prev => ({ ...prev, location: meta.fullAddress || next.address }));
                                }}
                                label="Địa điểm phỏng vấn"
                                detailLabel="Địa chỉ cụ thể"
                                placeholder="Nhập số nhà, tên đường hoặc địa điểm..."
                                showMapLink={false}
                                compact
                                required
                            />
                            <textarea value={interviewForm.note} onChange={(event) => setInterviewForm(prev => ({ ...prev, note: event.target.value }))} placeholder="Ghi chú" className="min-h-24 w-full resize-none rounded-lg border border-slate-200 px-4 py-3 text-sm" />
                            <button disabled={schedulingInterview} className="h-11 w-full rounded-lg bg-[#1687d9] text-sm font-bold text-white hover:bg-[#0f75c2] disabled:opacity-60">
                                {schedulingInterview ? 'Đang gửi...' : 'Gửi lịch phỏng vấn'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showHireModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
                    <form onSubmit={(event) => { event.preventDefault(); submitInterviewResult('Passed'); }} className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-6">
                            <div className="min-w-0">
                                <h3 className="text-xl font-bold text-slate-800">Nhận vào làm</h3>
                                <p className="text-sm text-slate-700">Thao tác này tạo hồ sơ nhân sự chính thức.</p>
                            </div>
                            <button type="button" onClick={() => setShowHireModal(false)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="space-y-4 p-6">
                            <select value={hireForm.branchId} onChange={(event) => setHireForm(prev => ({ ...prev, branchId: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm" required>
                                {branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
                            </select>
                            <input value={hireForm.position} onChange={(event) => setHireForm(prev => ({ ...prev, position: event.target.value }))} placeholder="Vị trí" className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm" required />
                            <input type="number" min="1" value={hireForm.hourlyRate} onChange={(event) => setHireForm(prev => ({ ...prev, hourlyRate: event.target.value }))} placeholder="Lương theo giờ" className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm" required />
                            <input type="date" value={hireForm.startDate} onChange={(event) => setHireForm(prev => ({ ...prev, startDate: event.target.value }))} className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm" required />
                            <input type="number" min="1" max="28" value={hireForm.paydayOfMonth} onChange={(event) => setHireForm(prev => ({ ...prev, paydayOfMonth: event.target.value }))} placeholder="Ngày trả lương trong tháng" className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm" required />
                            <button disabled={submittingResult} className="h-11 w-full rounded-lg bg-emerald-500 text-sm font-bold text-white disabled:opacity-60">
                                {submittingResult ? 'Đang tạo...' : 'Đạt và tạo nhân sự'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Messages;
