import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (token) {
            fetchNotifications();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notification', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(response.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Could not load notifications.');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.patch(`/notification/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => 
                n.notificationId === id ? { ...n, isRead: true } : n
            ));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const getStatusStyles = (title) => {
        const t = title.toLowerCase();
        if (t.includes('success') || t.includes('accepted') || t.includes('hired')) {
            return {
                bg: 'bg-emerald-50/40 border-emerald-100/50',
                icon: 'check_circle',
                color: 'text-emerald-500',
                iconBg: 'bg-emerald-100/50'
            };
        }
        if (t.includes('rejected') || t.includes('cancelled') || t.includes('failed')) {
            return {
                bg: 'bg-rose-50/40 border-rose-100/50',
                icon: 'cancel',
                color: 'text-rose-500',
                iconBg: 'bg-rose-100/50'
            };
        }
        if (t.includes('welcome') || t.includes('profile') || t.includes('info')) {
            return {
                bg: 'bg-blue-50/40 border-blue-100/50',
                icon: 'info',
                color: 'text-blue-500',
                iconBg: 'bg-blue-100/50'
            };
        }
        return {
            bg: 'bg-indigo-50/40 border-indigo-100/50',
            icon: 'notifications',
            color: 'text-indigo-500',
            iconBg: 'bg-indigo-100/50'
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-light">
                <div className="relative flex h-16 w-16">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-20"></span>
                    <div className="relative inline-flex rounded-full h-16 w-16 bg-gradient-to-br from-primary to-primary-dk items-center justify-center shadow-lg shadow-primary/30">
                        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#FBFCFF] min-h-screen pb-20 font-display relative overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(99,102,241,0.08),transparent_70%)] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(236,72,153,0.06),transparent_70%)] translate-y-1/4 -translate-x-1/4 pointer-events-none"></div>

            {/* Premium Header */}
            <div className="relative z-10 pt-16 pb-24">
                <div className="max-w-[800px] mx-auto px-6 text-center">
                    <div className="anim-fadeUp inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-indigo-100/50">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Updates Center
                    </div>
                    <h1 className="anim-fadeUp-d1 text-5xl font-black text-slate-800 tracking-tight leading-none mb-4">
                        Notifications
                    </h1>
                    <p className="anim-fadeUp-d2 text-slate-500 text-lg font-medium max-w-lg mx-auto leading-relaxed">
                        Stay informed about your applications, messages, and account activity in real-time.
                    </p>
                </div>
            </div>

            <main className="max-w-[800px] mx-auto px-6 relative z-10">
                {notifications.length === 0 ? (
                    <div className="anim-fadeUp-d3 bg-white/40 backdrop-blur-xl rounded-[3rem] border border-white p-20 text-center shadow-2xl shadow-slate-200/40">
                        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center mx-auto mb-8 shadow-inner border border-white">
                            <span className="material-symbols-outlined text-slate-300 !text-5xl">notifications_off</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800">No updates yet</h2>
                        <p className="text-slate-500 mt-3 font-medium text-lg">You're all caught up! New notifications will appear here.</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="mt-10 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-primary transition-all active:scale-95 shadow-xl shadow-black/10"
                        >
                            Refresh Feed
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.map((n, i) => {
                            const styles = getStatusStyles(n.title);
                            return (
                                <div 
                                    key={n.notificationId} 
                                    onClick={() => !n.isRead && markAsRead(n.notificationId)}
                                    className={`anim-fadeUp group relative p-1 rounded-[2.5rem] border transition-all duration-500 cursor-pointer ${
                                        n.isRead 
                                        ? 'bg-white/40 border-white/50 opacity-80' 
                                        : `${styles.bg} shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1`
                                    }`}
                                    style={{ animationDelay: `${i * 0.05}s` }}
                                >
                                    <div className="bg-white/60 backdrop-blur-md rounded-[2.3rem] p-6 lg:p-8 flex items-start gap-5 lg:gap-8">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500 shadow-sm ${
                                            n.isRead ? 'bg-slate-100 text-slate-400' : `${styles.iconBg} ${styles.color} group-hover:scale-110`
                                        }`}>
                                            <span className="material-symbols-outlined !text-3xl">
                                                {styles.icon}
                                            </span>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                                                <h3 className={`text-lg font-black tracking-tight truncate ${n.isRead ? 'text-slate-500' : 'text-slate-800'}`}>
                                                    {n.title}
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 bg-white/50 px-3 py-1 rounded-full border border-white/50">
                                                        {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                    {!n.isRead && (
                                                        <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-lg shadow-primary/40 animate-pulse"></div>
                                                    )}
                                                </div>
                                            </div>
                                            <p className={`text-base leading-relaxed font-medium ${n.isRead ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {n.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Notifications;
