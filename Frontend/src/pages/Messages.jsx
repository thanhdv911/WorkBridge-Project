import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import ReportModal from '../components/shared/ReportModal';

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
    const messagesEndRef = useRef(null);
    const token = localStorage.getItem('token');
    const userObj = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = parseInt(localStorage.getItem('userId') || userObj.userId || '0');

    // Parse initial contact from navigation state (if navigating from "Message" button)
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
            const interval = setInterval(fetchConversations, 10000); // Poll conversations every 10s
            return () => clearInterval(interval);
        }
    }, [token]);

    useEffect(() => {
        if (selectedContact) {
            fetchChatHistory(selectedContact.contactId);
            const interval = setInterval(() => fetchChatHistory(selectedContact.contactId), 3000); // Poll chat every 3s
            return () => clearInterval(interval);
        }
    }, [selectedContact]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchConversations = async () => {
        try {
            const res = await api.get('/messages/conversations', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching conversations:', err);
        }
    };

    const fetchChatHistory = async (contactId) => {
        try {
            const res = await api.get(`/messages/${contactId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data);
        } catch (err) {
            console.error('Error fetching chat history:', err);
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
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(prev => [...prev, res.data]);
            setNewMessage('');
            fetchConversations(); // Refresh last message in sidebar
        } catch (err) {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    if (loading && !selectedContact) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-bg-light h-[calc(100vh-64px)] font-display flex overflow-hidden">
            {/* Conversations Sidebar */}
            <aside className="w-full md:w-[360px] bg-white border-r border-slate-200/60 flex flex-col h-full overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">Messages</h1>
                    <div className="flex gap-2">
                        <span className="material-symbols-outlined text-slate-400">search</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversations.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-sm text-slate-400">No active conversations.</p>
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.contactId}
                                onClick={() => setSelectedContact(conv)}
                                className={`p-4 flex items-center gap-4 cursor-pointer transition-all border-b border-slate-50 hover:bg-slate-50 ${selectedContact?.contactId === conv.contactId ? 'bg-primary/[0.03] border-l-4 border-l-primary' : ''
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
                            </div>
                        ))
                    )}
                </div>
            </aside>

            {/* Chat Content */}
            <main className="flex-1 bg-[#F8FAFC] flex flex-col h-full relative">
                {selectedContact ? (
                    <>
                        {/* Chat Header */}
                        <div className="bg-white px-6 py-4 flex items-center gap-4 border-b border-slate-200/60 shadow-sm z-10">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {selectedContact.contactName.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800 leading-tight">
                                    {selectedContact.contactName}
                                </h2>
                                <p className="text-[11px] text-green-500 font-bold uppercase tracking-wider">Online</p>
                            </div>
                            <button
                                onClick={() => setShowReportModal(true)}
                                className="ml-auto w-10 h-10 rounded-xl bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center group"
                                title="Report User"
                            >
                                <span className="material-symbols-outlined !text-xl">flag</span>
                            </button>
                        </div>

                        <ReportModal
                            isOpen={showReportModal}
                            onClose={() => setShowReportModal(false)}
                            entityId={selectedContact.contactId}
                            entityType="User"
                            entityTitle={selectedContact.contactName}
                        />

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {messages.map((m) => (
                                <div
                                    key={m.messageId}
                                    className={`flex ${m.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[70%] lg:max-w-[60%] px-4 py-3 rounded-2xl text-sm shadow-sm ${m.senderId === currentUserId
                                            ? 'bg-primary text-white rounded-tr-none'
                                            : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                                        }`}>
                                        <p className="leading-relaxed">{m.content}</p>
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
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-slate-200/60">
                            <form
                                onSubmit={handleSendMessage}
                                className="max-w-[900px] mx-auto flex items-center gap-3 bg-slate-50 rounded-2xl p-2 px-4 border border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all"
                            >
                                <button type="button" className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined">add_circle</span>
                                </button>
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || sending}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${newMessage.trim() && !sending
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
                            Select a contact from the sidebar to start chatting with Recruiters or Applicants.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Messages;
