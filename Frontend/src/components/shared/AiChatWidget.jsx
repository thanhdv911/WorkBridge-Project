import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { signalRService } from '../../services/signalrService';

const getValue = (source, camelKey, pascalKey = null) => {
  if (!source) return undefined;
  return source[camelKey] ?? source[pascalKey || `${camelKey[0].toUpperCase()}${camelKey.slice(1)}`];
};

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'WB';
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase();
};

const formatClock = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const formatConversationTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? formatClock(value)
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const formatJobPay = (job) => {
  const payRate = Number(job?.payRate || 0);
  if (!payRate) return 'Thỏa thuận';

  const unitMap = {
    Hour: 'giờ',
    Hourly: 'giờ',
    Day: 'ngày',
    Daily: 'ngày',
    Month: 'tháng',
    Monthly: 'tháng'
  };
  const unit = unitMap[job.payUnit] || job.payUnit || 'giờ';
  return `${payRate.toLocaleString('vi-VN')}đ/${unit}`;
};

const buildConversationPreview = (message) => {
  if (!message) return 'Chưa có tin nhắn';
  const messageType = getValue(message, 'messageType') || 'Text';
  if (messageType === 'InterviewInvite') return 'Lịch phỏng vấn đã được gửi';
  if (messageType === 'OfferInvite') return 'Lời mời nhận việc đang chờ phản hồi';
  return getValue(message, 'content') || 'Tin nhắn mới';
};

const messageBelongsToContact = (message, contactId, currentUserId) => {
  const senderId = Number(getValue(message, 'senderId'));
  const receiverId = Number(getValue(message, 'receiverId'));
  const peerId = Number(contactId);
  const me = Number(currentUserId);

  return (senderId === me && receiverId === peerId) || (senderId === peerId && receiverId === me);
};

const formatLastSeen = (contact) => {
  if (contact?.isOnline) return 'Đang hoạt động';
  if (contact?.lastSeenAt) return `Hoạt động ${formatClock(contact.lastSeenAt)}`;
  return 'Chưa rõ trạng thái';
};

const renderInlineText = (line) => {
  return line.split(/(\*\*.*?\*\*)/g).map((part, index) => {
    const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
    if (boldMatch) {
      return <strong key={index} className="font-black text-slate-900">{boldMatch[1]}</strong>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

const renderFormattedText = (text = '') => {
  const lines = text.replace(/\r/g, '').split('\n');

  return (
    <div className="space-y-1.5">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return <div key={index} className="h-1" />;

        const heading = line.match(/^#{1,6}\s+(.+)/);
        if (heading) {
          return (
            <p key={index} className="pt-1 text-[13px] font-black text-[#1687d9]">
              {renderInlineText(heading[1])}
            </p>
          );
        }

        const bullet = line.match(/^[-*]\s+(.+)/);
        if (bullet) {
          return (
            <div key={index} className="flex gap-2 leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1687d9]" />
              <p className="min-w-0">{renderInlineText(bullet[1])}</p>
            </div>
          );
        }

        const numbered = line.match(/^(\d+)\.\s+(.+)/);
        if (numbered) {
          return (
            <div key={index} className="flex gap-2 leading-relaxed">
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 px-1 text-[11px] font-black text-[#1687d9]">
                {numbered[1]}
              </span>
              <p className="min-w-0 font-semibold text-slate-800">{renderInlineText(numbered[2])}</p>
            </div>
          );
        }

        return (
          <p key={index} className="leading-relaxed">
            {renderInlineText(line)}
          </p>
        );
      })}
    </div>
  );
};

const AiChatWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');

  // Floating Action Toolbar States
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showFeedbackChoiceModal, setShowFeedbackChoiceModal] = useState(false);
  const [showSupportPanel, setShowSupportPanel] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef(null);

  const [role, setRole] = useState(null);
  const [isVip, setIsVip] = useState(false);
  const [checkingVip, setCheckingVip] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);

  const selectedConversationRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fetchConversationsRef = useRef(null);
  const fetchThreadRef = useRef(null);
  const closeTimerRef = useRef(null);

  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  const currentUserId = Number(localStorage.getItem('userId') || '0');

  const unreadTotal = useMemo(() => (
    conversations.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0)
  ), [conversations]);

  const isAiVipRole = role === 'Employer' || role === 'Applicant';
  const isAiLocked = isAiVipRole && !isVip;
  const showAiGate = isAiVipRole && (checkingVip || !isVip);
  const aiLockMessage = role === 'Employer'
    ? 'AI tuyển dụng, xếp ca và tính lương chỉ mở cho Doanh nghiệp VIP.'
    : 'WorkBridge AI tìm việc, gợi ý việc làm và đánh giá CV chỉ mở cho Cá nhân VIP.';
  const aiLockTitle = role === 'Employer'
    ? 'Mở khóa AI vận hành tuyển dụng'
    : 'Mở khóa WorkBridge AI cá nhân';
  const aiLockPerks = role === 'Employer'
    ? [
        ['auto_awesome', 'Tối ưu tin tuyển dụng'],
        ['calendar_month', 'Gợi ý xếp ca thông minh'],
        ['payments', 'Hỗ trợ lương và vận hành']
      ]
    : [
        ['work', 'Gợi ý việc phù hợp'],
        ['description', 'Sửa CV bằng AI'],
        ['record_voice_over', 'Luyện phỏng vấn nhanh']
      ];
  const aiUpgradePath = role === 'Employer' ? '/employer-dashboard?tab=vip' : '/profile?tab=vip';

  const openWidget = () => {
    window.clearTimeout(closeTimerRef.current);
    setIsPanelMounted(true);
    setActiveTab('messages');
    window.requestAnimationFrame(() => setIsOpen(true));
  };

  const closeWidget = () => {
    setIsOpen(false);
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setIsPanelMounted(false);
    }, 260);
  };

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    return () => window.clearTimeout(closeTimerRef.current);
  }, []);

  // Fetch saved jobs count when user, token, or page route path changes
  useEffect(() => {
    if (!token) {
      setSavedJobsCount(0);
      return;
    }
    let active = true;
    const fetchSavedCount = async () => {
      try {
        const res = await api.get('/savedjobs');
        if (active) {
          setSavedJobsCount(res.data?.length || 0);
        }
      } catch {
        if (active) setSavedJobsCount(0);
      }
    };
    fetchSavedCount();

    // Re-fetch immediately when user saves/unsaves a job anywhere in the app
    window.addEventListener('savedJobsChanged', fetchSavedCount);
    return () => {
      active = false;
      window.removeEventListener('savedJobsChanged', fetchSavedCount);
    };
  }, [token, location.pathname]);

  useEffect(() => {
    if (!token) return;
    setRole(userRole);

    const greeting = userRole === 'Employer'
      ? 'Xin chào, tôi là WorkBridge AI. Tôi có thể hỗ trợ bạn về tuyển dụng, xếp ca, chấm công, lương và vận hành nhân sự.'
      : 'Xin chào, tôi là WorkBridge AI. Tôi có thể hỗ trợ bạn tìm việc, chỉnh CV, chuẩn bị phỏng vấn và dùng hồ sơ WorkBridge.';

    setAiMessages([{ id: 'welcome', sender: 'ai', text: greeting, time: new Date() }]);

    if (userRole === 'Employer' || userRole === 'Applicant') {
      setCheckingVip(true);
      api.get('/subscriptions/status')
        .then(res => setIsVip(res.data?.isVip || false))
        .catch(() => setIsVip(false))
        .finally(() => setCheckingVip(false));
    }
  }, [token, userRole]);

  const fetchConversations = async () => {
    if (!token) return;
    setConversationsLoading(true);
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data || []);
    } catch (error) {
      console.error('Error fetching popup conversations:', error);
    } finally {
      setConversationsLoading(false);
    }
  };

  const fetchThread = async (contactId) => {
    if (!contactId) return;
    setThreadLoading(true);
    try {
      const res = await api.get(`/messages/${contactId}`);
      setThreadMessages(res.data || []);
      fetchConversationsRef.current?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể tải hội thoại.');
    } finally {
      setThreadLoading(false);
    }
  };

  fetchConversationsRef.current = fetchConversations;
  fetchThreadRef.current = fetchThread;

  useEffect(() => {
    if (!token) return;

    signalRService.start();
    fetchConversationsRef.current?.();

    const onConversationUpdated = () => {
      fetchConversationsRef.current?.();
      const activeContact = selectedConversationRef.current;
      if (activeContact?.contactId) {
        fetchThreadRef.current?.(activeContact.contactId);
      }
    };

    const onReceiveMessage = (message) => {
      const activeContact = selectedConversationRef.current;
      if (!activeContact || !messageBelongsToContact(message, activeContact.contactId, currentUserId)) {
        fetchConversationsRef.current?.();
        return;
      }

      setThreadMessages(prev => {
        const nextMessageId = getValue(message, 'messageId');
        if (nextMessageId && prev.some(item => getValue(item, 'messageId') === nextMessageId)) {
          return prev.map(item => getValue(item, 'messageId') === nextMessageId ? { ...item, ...message } : item);
        }
        return [...prev, message];
      });

      if (Number(getValue(message, 'senderId')) === Number(activeContact.contactId)) {
        api.post(`/messages/${activeContact.contactId}/read`).catch(() => {});
      }
      fetchConversationsRef.current?.();
    };

    const onUserOnlineStatusChanged = (userId, isOnline, lastSeenAt) => {
      setConversations(prev => prev.map(conv =>
        Number(conv.contactId) === Number(userId)
          ? { ...conv, isOnline, lastSeenAt }
          : conv
      ));

      setSelectedConversation(prev =>
        prev && Number(prev.contactId) === Number(userId)
          ? { ...prev, isOnline, lastSeenAt }
          : prev
      );
    };

    const handleReconnected = () => {
      const activeContact = selectedConversationRef.current;
      if (activeContact?.contactId) {
        signalRService.invoke('JoinConversation', activeContact.contactId);
        fetchThreadRef.current?.(activeContact.contactId);
      }
      fetchConversationsRef.current?.();
    };

    signalRService.on('ConversationUpdated', onConversationUpdated);
    signalRService.on('ReceiveMessage', onReceiveMessage);
    signalRService.on('UserOnlineStatusChanged', onUserOnlineStatusChanged);
    signalRService.onReconnected(handleReconnected);

    return () => {
      signalRService.off('ConversationUpdated', onConversationUpdated);
      signalRService.off('ReceiveMessage', onReceiveMessage);
      signalRService.off('UserOnlineStatusChanged', onUserOnlineStatusChanged);
      signalRService.offReconnected(handleReconnected);
    };
  }, [token, currentUserId]);

  useEffect(() => {
    const contactId = selectedConversation?.contactId;
    if (!contactId) return undefined;

    fetchThreadRef.current?.(contactId);
    signalRService.invoke('JoinConversation', contactId);

    return () => {
      signalRService.invoke('LeaveConversation', contactId);
    };
  }, [selectedConversation?.contactId]);

  useEffect(() => {
    if (isOpen && activeTab === 'messages') {
      fetchConversationsRef.current?.();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages.length, threadLoading]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages.length, aiLoading]);

  if (!token) return null;

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setThreadMessages([]);
    setChatInput('');
    setActiveTab('messages');
    if (Number(conversation.unreadCount || 0) > 0) {
      api.post(`/messages/${conversation.contactId}/read`).catch(() => {});
    }
  };

  const handleSendUserMessage = async (event) => {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || !selectedConversation || chatSending) return;

    setChatSending(true);
    try {
      const res = await api.post('/messages', {
        receiverId: selectedConversation.contactId,
        content: text
      });

      setThreadMessages(prev => {
        const nextMessageId = getValue(res.data, 'messageId');
        if (nextMessageId && prev.some(item => getValue(item, 'messageId') === nextMessageId)) return prev;
        return [...prev, res.data];
      });
      setChatInput('');
      fetchConversationsRef.current?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể gửi tin nhắn.');
    } finally {
      setChatSending(false);
    }
  };

  const handleAiSend = async (textToSend) => {
    const text = (textToSend || aiInput).trim();
    if (!text) return;
    if (isAiLocked) {
      toast.error(role === 'Employer'
        ? 'Trợ lý AI chỉ dành cho Doanh nghiệp VIP.'
        : 'Trợ lý AI chỉ dành cho Cá nhân VIP.');
      return;
    }

    if (!textToSend) setAiInput('');
    setAiMessages(prev => [...prev, { id: `${Date.now()}-user`, sender: 'user', text, time: new Date() }]);
    setAiLoading(true);

    try {
      const response = await api.post('/gemini/chat', { message: text });
      setAiMessages(prev => [...prev, {
        id: `${Date.now()}-ai`,
        sender: 'ai',
        text: response.data?.response || 'Tôi chưa tạo được câu trả lời phù hợp.',
        jobRecommendations: response.data?.jobRecommendations || [],
        time: new Date()
      }]);
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Không kết nối được trợ lý AI. Vui lòng thử lại sau.';
      setAiMessages(prev => [...prev, { id: `${Date.now()}-error`, sender: 'ai', text: errMsg, time: new Date() }]);
    } finally {
      setAiLoading(false);
    }
  };

  const aiChips = role === 'Employer'
    ? [
        { label: 'Mở/chốt lịch', text: 'AI tự mở đăng ký ca tuần sau và tự chốt ca vào thời điểm nào trong WorkBridge?' },
        { label: 'Xếp ca', text: 'Làm thế nào để dùng AI tự động xếp lịch hiệu quả?' },
        { label: 'VIP', text: 'Gói VIP Doanh nghiệp có những tính năng gì nổi bật?' }
      ]
    : [
        { label: 'Cải thiện CV', text: 'Cho tôi lời khuyên tổng quát để cải thiện CV thu hút nhà tuyển dụng?' },
        { label: 'Việc đang tuyển', text: 'Gợi ý việc làm đang đăng tuyển trên WorkBridge phù hợp cho tôi.' },
        { label: 'Phỏng vấn', text: 'Gợi ý một số câu hỏi và cách trả lời phỏng vấn cho công việc bán hàng?' }
      ];

  const renderJobRecommendationCards = (jobs = []) => {
    if (!jobs.length) return null;

    return (
      <div className="mt-3 grid gap-2">
        {jobs.map(job => (
          <button
            type="button"
            key={job.jobPostId}
            onClick={() => navigate(job.detailUrl || `/jobs/${job.jobPostId}`)}
            className="group w-full rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-left transition hover:-translate-y-0.5 hover:border-[#1687d9] hover:bg-white hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  {job.isFeatured && (
                    <span className="rounded-full bg-[#1687d9] px-2 py-0.5 text-[10px] font-black uppercase text-white">
                      VIP
                    </span>
                  )}
                  {job.jobType && (
                    <span className="rounded-full border border-blue-100 bg-white px-2 py-0.5 text-[10px] font-bold text-[#1687d9]">
                      {job.jobType}
                    </span>
                  )}
                </div>
                <h4 className="line-clamp-2 text-sm font-black text-slate-900 group-hover:text-[#1687d9]">
                  {job.title}
                </h4>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                  {job.companyName}{job.branchName ? ` - ${job.branchName}` : ''}
                </p>
              </div>
              <span className="material-symbols-outlined shrink-0 text-[#1687d9] transition group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined !text-[15px] text-slate-400">payments</span>
                <span className="font-bold text-[#1687d9]">{formatJobPay(job)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined !text-[15px] text-slate-400">location_on</span>
                <span className="truncate">{job.location || job.address || 'Chưa rõ địa điểm'}</span>
              </div>
              {(job.position || job.vacancies) && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined !text-[15px] text-slate-400">badge</span>
                  <span className="truncate">
                    {job.position || 'Nhân viên'}{job.vacancies ? ` - tuyển ${job.vacancies} người` : ''}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 flex h-8 items-center justify-center rounded-lg bg-[#1687d9] text-xs font-black text-white transition group-hover:bg-[#0f75c2]">
              Xem chi tiết
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderThreadBubble = (message) => {
    const isOwn = Number(getValue(message, 'senderId')) === currentUserId;
    const content = buildConversationPreview(message);

    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
            isOwn
              ? 'rounded-br-md bg-[#1687d9] text-white'
              : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'
          }`}
        >
          <div className="whitespace-pre-wrap break-words leading-relaxed">{content}</div>
          <div className={`mt-1 text-right text-[10px] ${isOwn ? 'text-white/75' : 'text-slate-400'}`}>
            {formatClock(getValue(message, 'sentAt'))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] font-sans pointer-events-none">
      {!isPanelMounted && (
        <div className="relative flex flex-col items-end gap-3 pointer-events-auto">
          {/* Support Panel (Image 1 style) */}
          {showSupportPanel && (
            <div className="absolute bottom-[68px] right-[56px] w-[370px] bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-slate-100 flex flex-col overflow-hidden anim-fadeLeft pointer-events-auto">
              {/* Header */}
              <div className="bg-[#1392ec] p-4 text-white relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-white">headset_mic</span>
                    <span className="font-black text-sm">
                      {role === 'Employer' ? 'Trung tâm hỗ trợ doanh nghiệp' : 'Trung tâm hỗ trợ ứng viên'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSupportPanel(false)}
                    className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-0.5 flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined !text-lg">close</span>
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-3 relative z-10">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 bg-white/10 flex-shrink-0">
                    <img
                      src="/support-avatar.jpg"
                      alt="Support Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Mr. Thành Đinh</h4>
                    <p className="text-xs text-white/80 mt-0.5 whitespace-nowrap">WorkBridge thường phản hồi trong vòng 24h</p>
                  </div>
                </div>
              </div>

              {/* Options list */}
              <div className="flex flex-col divide-y divide-slate-100 text-sm">



                <a
                  href="https://zalo.me/0969701460"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowSupportPanel(false)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-slate-700 hover:bg-slate-50 transition-colors font-bold group"
                >
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-[#1392ec] !text-lg">chat</span>
                  <span className="flex-1">Hỗ trợ qua Zalo</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setShowSupportPanel(false);
                    navigate('/contact');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-slate-700 hover:bg-slate-50 transition-colors font-bold group"
                >
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-[#1392ec] !text-lg">call</span>
                  <span className="flex-1">Liên hệ WorkBridge</span>
                </button>
              </div>
            </div>
          )}

          {/* Floating Action Buttons Stack */}
          <div className="flex flex-col items-center gap-3 animate-fadeInUp">
            {/* 1. Saved Jobs Button */}
            <button
              type="button"
              onClick={() => navigate('/saved-jobs')}
              className="relative w-11 h-11 rounded-full bg-white text-[#1392ec] shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-slate-100/60 flex items-center justify-center hover:scale-105 active:scale-95 transition-all group hover:bg-[#1392ec]/5"
              title="Việc đã lưu"
            >
              <span className="material-symbols-outlined !text-xl">bookmark_border</span>
              {savedJobsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-[10px] text-white font-black flex items-center justify-center border border-white shadow-sm shadow-emerald-500/20">
                  {savedJobsCount}
                </span>
              )}
            </button>

            {/* 2. Góp ý & Hỗ trợ Combined Capsule */}
            <div className="w-11 bg-white rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-slate-100/60 flex flex-col overflow-hidden">
              {/* Góp ý Button */}
              <button
                type="button"
                onClick={() => setShowFeedbackChoiceModal(true)}
                className="flex flex-col items-center justify-center py-2 text-[#1392ec] hover:bg-sky-50/50 transition-colors border-b border-slate-100"
                title="Góp ý"
              >
                <span className="material-symbols-outlined !text-[18px]">comment</span>
                <span className="text-[9px] font-bold leading-none mt-1">Góp ý</span>
              </button>

              {/* Hỗ trợ Button */}
              <button
                type="button"
                onClick={() => setShowSupportPanel(prev => !prev)}
                className={`flex flex-col items-center justify-center py-2 transition-colors ${
                  showSupportPanel
                    ? 'bg-sky-50/80 text-[#1392ec]'
                    : 'text-[#1392ec] hover:bg-sky-50/50'
                }`}
                title="Hỗ trợ"
              >
                <span className="material-symbols-outlined !text-[18px]">headset_mic</span>
                <span className="text-[9px] font-bold leading-none mt-1">Hỗ trợ</span>
              </button>
            </div>

            {/* 3. Chat Button */}
            <button
              type="button"
              onClick={openWidget}
              className="relative w-12 h-12 rounded-full bg-[#1392ec] text-white shadow-[0_4px_16px_rgba(19,146,236,0.3)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all hover:bg-[#0b6fbb]"
              title="WorkBridge Chat"
            >
              {unreadTotal > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-red-500 text-[10px] text-white font-black flex items-center justify-center border-2 border-white shadow-sm">
                  {unreadTotal > 9 ? '9+' : unreadTotal}
                </span>
              )}
              <span className="material-symbols-outlined !text-[24px]">chat</span>
            </button>
          </div>
        </div>
      )}

      {isPanelMounted && (
        <div
          className={`absolute bottom-0 right-0 flex h-[600px] max-h-[calc(100vh-48px)] w-[720px] max-w-[calc(100vw-24px)] origin-bottom-right transform-gpu flex-col overflow-hidden rounded-xl border border-blue-100 bg-white shadow-2xl transition-all duration-300 ease-out pointer-events-auto ${
            isOpen
              ? 'translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none translate-y-8 scale-90 opacity-0'
          }`}
        >
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#1687d9]">
                <span className="material-symbols-outlined !text-[20px]">forum</span>
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-black text-slate-900">WorkBridge Chat</h3>
                <p className="text-[11px] font-medium text-slate-400">Tin nhắn và AI trong một popup</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigate('/messages')}
                title="Mở trang tin nhắn"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-[#1687d9]"
              >
                <span className="material-symbols-outlined !text-[19px]">open_in_full</span>
              </button>
              <button
                type="button"
                onClick={closeWidget}
                title="Thu nhỏ"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <span className="material-symbols-outlined !text-[20px]">close</span>
              </button>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 border-b border-slate-100 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-black transition ${
                activeTab === 'messages'
                  ? 'bg-white text-[#1687d9] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined !text-[18px]">chat_bubble</span>
              Tin nhắn
              {unreadTotal > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1687d9] px-1 text-[10px] text-white">
                  {unreadTotal > 9 ? '9+' : unreadTotal}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-black transition ${
                activeTab === 'ai'
                  ? 'bg-white text-[#1687d9] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className={`material-symbols-outlined !text-[18px] ${showAiGate ? 'animate-pulse' : ''}`}>
                {showAiGate ? 'lock' : 'auto_awesome'}
              </span>
              WorkBridge AI
              {showAiGate && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700">
                  VIP
                </span>
              )}
            </button>
          </div>

          {activeTab === 'messages' ? (
            <div className="flex min-h-0 flex-1 bg-[#f4f8fc]">
              <aside className={`${selectedConversation ? 'hidden sm:flex' : 'flex'} min-h-0 w-full flex-col border-r border-slate-100 bg-white sm:w-[270px]`}>
                <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-100 px-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Hội thoại</p>
                  <button
                    type="button"
                    onClick={fetchConversations}
                    title="Làm mới"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-[#1687d9]"
                  >
                    <span className="material-symbols-outlined !text-[17px]">sync</span>
                  </button>
                </div>
                <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto">
                  {conversationsLoading && conversations.length === 0 ? (
                    <div className="p-5 text-center text-xs font-semibold text-slate-400">Đang tải hội thoại...</div>
                  ) : conversations.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#1687d9]">
                        <span className="material-symbols-outlined">forum</span>
                      </div>
                      <p className="text-sm font-bold text-slate-700">Chưa có hội thoại</p>
                      <p className="mt-1 text-xs text-slate-400">Khi có trao đổi tuyển dụng, hội thoại sẽ hiện ở đây.</p>
                    </div>
                  ) : conversations.map(conversation => {
                    const isActive = Number(selectedConversation?.contactId) === Number(conversation.contactId);
                    return (
                      <button
                        type="button"
                        key={conversation.contactId}
                        onClick={() => handleSelectConversation(conversation)}
                        className={`w-full border-b border-slate-100 px-3 py-3 text-left transition hover:bg-blue-50/70 ${
                          isActive ? 'bg-blue-50' : 'bg-white'
                        }`}
                      >
                        <div className="flex gap-2.5">
                          <div className="relative shrink-0">
                            <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                              <img
                                src={conversation.avatarUrl || "/default-avatar.png"}
                                alt={conversation.contactName}
                                className="h-full w-full object-cover"
                                onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
                              />
                            </div>
                            <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${conversation.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="truncate text-sm font-black text-slate-800">{conversation.contactName}</h4>
                              <span className="shrink-0 text-[10px] font-medium text-slate-400">{formatConversationTime(conversation.lastMessageAt)}</span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2">
                              <p className={`truncate text-xs ${conversation.unreadCount > 0 ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                                {conversation.lastMessage || 'Mở hội thoại'}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#1687d9] px-1 text-[9px] font-black text-white">
                                  {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className={`${selectedConversation ? 'flex' : 'hidden sm:flex'} min-w-0 flex-1 flex-col`}>
                {selectedConversation ? (
                  <>
                    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-100 bg-white px-3">
                      <button
                        type="button"
                        onClick={() => setSelectedConversation(null)}
                        title="Quay lại danh sách"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 sm:hidden"
                      >
                        <span className="material-symbols-outlined !text-[20px]">arrow_back</span>
                      </button>
                      <div className="relative shrink-0">
                        <div className="h-9 w-9 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                          <img
                            src={selectedConversation.avatarUrl || "/default-avatar.png"}
                            alt={selectedConversation.contactName}
                            className="h-full w-full object-cover"
                            onError={(e) => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
                          />
                        </div>
                        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${selectedConversation.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-black text-slate-900">{selectedConversation.contactName}</h4>
                        <p className={`text-[11px] font-bold ${selectedConversation.isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {formatLastSeen(selectedConversation)}
                        </p>
                      </div>
                    </div>

                    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 py-4">
                      {threadLoading ? (
                        <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">Đang tải tin nhắn...</div>
                      ) : threadMessages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#1687d9] shadow-sm">
                            <span className="material-symbols-outlined">chat</span>
                          </div>
                          <p className="text-sm font-black text-slate-800">Bắt đầu hội thoại</p>
                          <p className="mt-1 max-w-[260px] text-xs text-slate-400">Bạn có thể nhắn trực tiếp tại popup, không cần mở trang riêng.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {threadMessages.map((message, index) => (
                            <React.Fragment key={getValue(message, 'messageId') || index}>
                              {renderThreadBubble(message)}
                            </React.Fragment>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSendUserMessage} className="shrink-0 border-t border-slate-100 bg-white p-3">
                      <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 focus-within:border-[#1687d9] focus-within:bg-white">
                        <textarea
                          rows={1}
                          value={chatInput}
                          onChange={(event) => setChatInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              handleSendUserMessage(event);
                            }
                          }}
                          placeholder="Nhập tin nhắn..."
                          className="max-h-20 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim() || chatSending}
                          title="Gửi"
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                            chatInput.trim() && !chatSending
                              ? 'bg-[#1687d9] text-white hover:bg-[#0f75c2]'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          <span className="material-symbols-outlined !text-[19px]">send</span>
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#1687d9] shadow-sm">
                      <span className="material-symbols-outlined !text-[32px]">mark_unread_chat_alt</span>
                    </div>
                    <p className="text-sm font-black text-slate-800">Chọn một hội thoại</p>
                    <p className="mt-1 max-w-[260px] text-xs text-slate-400">Popup này dùng cùng dữ liệu realtime với trang Tin nhắn.</p>
                  </div>
                )}
              </section>
            </div>
          ) : showAiGate ? (
            <div className="relative flex min-h-0 flex-1 overflow-hidden bg-[#071827] text-white">
              <div className="vip-scanline absolute inset-0 opacity-70" />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(19,146,236,0.24),transparent_42%,rgba(245,158,11,0.16))]" />
              <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-8 text-center">
                <div className="relative mb-5 flex h-28 w-28 items-center justify-center">
                  <div className="vip-lock-pulse absolute inset-0 rounded-[30px] border border-white/20 bg-white/10" />
                  <div className="absolute inset-3 rounded-[24px] border border-cyan-200/30 bg-white/5" />
                  <span className="vip-lock-swing material-symbols-outlined filled !text-[58px] text-white drop-shadow-[0_18px_30px_rgba(19,146,236,0.5)]">
                    lock
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-100">
                  <span className="material-symbols-outlined !text-sm">workspace_premium</span>
                  Quyền VIP đang khóa
                </span>
                <h3 className="mt-3 max-w-[460px] text-2xl font-black leading-tight tracking-tight">
                  {checkingVip ? 'Đang kiểm tra quyền VIP...' : aiLockTitle}
                </h3>
                <p className="mt-2 max-w-[480px] text-sm font-semibold leading-relaxed text-blue-50/85">
                  {checkingVip ? 'WorkBridge đang xác nhận trạng thái tài khoản trước khi mở AI.' : aiLockMessage}
                </p>

                <div className="mt-5 grid w-full max-w-[560px] gap-2 sm:grid-cols-3">
                  {aiLockPerks.map(([icon, label], index) => (
                    <div
                      key={label}
                      className="anim-fadeUp rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-left shadow-lg shadow-black/10 backdrop-blur"
                      style={{ animationDelay: `${index * 90}ms` }}
                    >
                      <span className="material-symbols-outlined !text-[22px] text-cyan-200">{icon}</span>
                      <p className="mt-1 text-xs font-black leading-snug text-white">{label}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={checkingVip}
                  onClick={() => navigate(aiUpgradePath)}
                  className="vip-sheen mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#0b6fbb] shadow-xl shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-70"
                >
                  <span className="material-symbols-outlined !text-[18px]">{checkingVip ? 'sync' : 'lock_open'}</span>
                  {checkingVip ? 'Đang kiểm tra VIP' : 'Nâng cấp VIP ngay'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col bg-[#f4f8fc]">
              <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-4">
                <div className="mx-auto flex max-w-[560px] flex-col gap-3">
                  {aiMessages.map(message => {
                    const isOwn = message.sender === 'user';
                    return (
                      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[84%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                          isOwn
                            ? 'rounded-br-md bg-[#1687d9] text-white'
                            : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'
                        }`}>
                          <div className="break-words leading-relaxed">
                            {isOwn ? message.text : renderFormattedText(message.text)}
                          </div>
                          {!isOwn && renderJobRecommendationCards(message.jobRecommendations)}
                          <div className={`mt-1 text-right text-[10px] ${isOwn ? 'text-white/75' : 'text-slate-400'}`}>
                            {formatClock(message.time)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-slate-100 bg-white px-4 py-3 shadow-sm">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#1687d9]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#1687d9] [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#1687d9] [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}
                  <div ref={aiEndRef} />
                </div>
              </div>

              {aiMessages.length === 1 && !aiLoading && (
                <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-100 bg-white px-3 py-2">
                  {aiChips.map(chip => (
                    <button
                      type="button"
                      key={chip.label}
                      onClick={() => handleAiSend(chip.text)}
                      className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#1687d9] transition hover:border-blue-200 hover:bg-blue-100"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleAiSend();
                }}
                className="shrink-0 border-t border-slate-100 bg-white p-3"
              >
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 focus-within:border-[#1687d9] focus-within:bg-white">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(event) => setAiInput(event.target.value)}
                    placeholder="Hỏi WorkBridge AI..."
                    disabled={aiLoading}
                    className="min-w-0 flex-1 bg-transparent px-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading || !aiInput.trim()}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                      aiInput.trim() && !aiLoading
                        ? 'bg-[#1687d9] text-white hover:bg-[#0f75c2]'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="material-symbols-outlined !text-[19px]">send</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
      {/* ── Feedback Choice Modal ("Bạn muốn?") ── */}
      {showFeedbackChoiceModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm pointer-events-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-100/80 anim-fadeUp relative">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900">Bạn muốn?</h3>
              <button
                type="button"
                onClick={() => setShowFeedbackChoiceModal(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Feedback Card */}
              <button
                type="button"
                onClick={() => {
                  setShowFeedbackChoiceModal(false);
                  setShowFeedbackModal(true);
                }}
                className="flex flex-col items-center text-center p-6 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/5 transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm transition-transform group-hover:scale-105">
                  <span className="material-symbols-outlined !text-4xl">mail</span>
                </div>
                <h4 className="text-base font-black text-slate-800 mt-4 group-hover:text-emerald-600 transition-colors">
                  Góp ý sản phẩm
                </h4>
                <p className="text-xs text-slate-500 mt-2 font-semibold leading-relaxed">
                  Chia sẻ ý kiến, đề xuất và nhận xét về sản phẩm
                </p>
              </button>

              {/* Zalo Support Card */}
              <a
                href="https://zalo.me/0969701460"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowFeedbackChoiceModal(false)}
                className="flex flex-col items-center text-center p-6 rounded-2xl border-2 border-slate-100 hover:border-[#0084FF] hover:bg-[#0084FF]/5 transition-all group"
              >
                <div className="w-16 h-16 rounded-full bg-[#0084FF] flex items-center justify-center text-white font-black text-lg shadow-md border border-white transition-transform group-hover:scale-105">
                  Zalo
                </div>
                <h4 className="text-base font-black text-slate-800 mt-4 group-hover:text-[#0084FF] transition-colors">
                  Chat Zalo để được hỗ trợ
                </h4>
                <p className="text-xs text-slate-500 mt-2 font-semibold leading-relaxed">
                  Yêu cầu hỗ trợ liên quan đến sản phẩm hoặc dịch vụ
                </p>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback Modal ── */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm pointer-events-auto">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100/80 anim-fadeUp">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Gửi góp ý của bạn</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">Chúng tôi luôn trân trọng ý kiến góp ý của bạn để cải thiện WorkBridge.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Rating stars */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Đánh giá độ hài lòng</label>
                <div className="flex items-center gap-1.5 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className="transition-transform active:scale-95 hover:scale-110"
                    >
                      <span className={`material-symbols-outlined !text-2xl ${
                        star <= feedbackRating ? 'text-amber-400 filled' : 'text-slate-200'
                      }`}>
                        star
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Comment */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Ý kiến đóng góp</label>
                <textarea
                  rows={4}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Hãy chia sẻ trải nghiệm của bạn hoặc những tính năng bạn muốn cải thiện..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 mt-1.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#1392ec] focus:bg-white focus:ring-2 focus:ring-[#1392ec]/15 resize-none transition-all"
                  required
                />
              </div>

              {/* Submit buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!feedbackComment.trim()) {
                      toast.error('Vui lòng nhập nội dung góp ý.');
                      return;
                    }
                    setSubmittingFeedback(true);
                    setTimeout(() => {
                      toast.success('Cảm ơn ý kiến góp ý quý giá của bạn!');
                      setFeedbackComment('');
                      setFeedbackRating(5);
                      setSubmittingFeedback(false);
                      setShowFeedbackModal(false);
                    }, 800);
                  }}
                  disabled={submittingFeedback}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#1392ec] to-[#0b6fbb] text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all disabled:opacity-50"
                >
                  {submittingFeedback ? 'Đang gửi...' : 'Gửi góp ý'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiChatWidget;
