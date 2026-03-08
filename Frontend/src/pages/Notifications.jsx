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

    return (
        <div className="bg-bg-light min-h-screen pb-20 font-display">
            <div className="bg-white border-b border-slate-200/60 pb-10 pt-8">
                <div className="max-w-[800px] mx-auto px-6">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Notifications</h1>
                    <p className="text-slate-500 mt-2">Stay updated with your latest activities.</p>
                </div>
            </div>

            <main className="max-w-[800px] mx-auto px-6 mt-10">
                {notifications.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-20 text-center">
                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-slate-300 !text-4xl">notifications_off</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-700">No notifications</h2>
                        <p className="text-slate-500 mt-2">You're all caught up!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.map((n) => (
                            <div 
                                key={n.notificationId} 
                                onClick={() => !n.isRead && markAsRead(n.notificationId)}
                                className={`bg-white rounded-2xl border transition-all p-6 cursor-pointer ${
                                    n.isRead 
                                    ? 'border-slate-100 opacity-75' 
                                    : 'border-primary/20 shadow-md shadow-primary/5 bg-primary/[0.02]'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary'
                                    }`}>
                                        <span className="material-symbols-outlined !text-[20px]">
                                            {n.title.includes('Success') || n.title.includes('Accepted') ? 'check_circle' : 
                                             n.title.includes('Rejected') ? 'cancel' : 'info'}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className={`font-bold ${n.isRead ? 'text-slate-600' : 'text-slate-800'}`}>
                                                {n.title}
                                            </h3>
                                            <span className="text-[11px] font-medium text-slate-400 capitalize">
                                                {new Date(n.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className={`text-sm ${n.isRead ? 'text-slate-500' : 'text-slate-600'}`}>
                                            {n.message}
                                        </p>
                                    </div>
                                    {!n.isRead && (
                                        <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Notifications;
