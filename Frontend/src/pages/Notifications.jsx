import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { signalRService } from '../services/signalrService';
import Pagination from '../components/shared/Pagination';

const ITEMS_PER_PAGE = 8;

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    useEffect(() => {
        if (token) {
            fetchNotifications();
        } else {
            setLoading(false);
        }

        // Real-time: new notification pushed by server
        const onReceiveNotif = (notif) => {
            setNotifications(prev => {
                if (prev.some(n => n.notificationId === notif.notificationId)) return prev;
                return [notif, ...prev];
            });
        };

        signalRService.on('ReceiveNotification', onReceiveNotif);
        return () => signalRService.off('ReceiveNotification', onReceiveNotif);
    }, [token]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(notifications.length / ITEMS_PER_PAGE));
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [notifications.length, currentPage]);

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notification', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(response.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Không thể tải thông báo.');
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

    const deleteNotification = async (id, e) => {
        e.stopPropagation();
        try {
            await api.delete(`/notification/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.filter(n => n.notificationId !== id));
            toast.success('Đã xóa thông báo.');
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error('Không thể xóa thông báo.');
        }
    };

    const clearReadNotifications = async () => {
        try {
            await api.delete('/notification/delete-read', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.filter(n => !n.isRead));
            toast.success('Đã xóa tất cả thông báo đã đọc.');
        } catch (error) {
            console.error('Error deleting read notifications:', error);
            toast.error('Không thể xóa thông báo đã đọc.');
        }
    };

    const handleNotificationClick = async (n) => {
        if (!n.isRead) {
            await markAsRead(n.notificationId);
        }

        const role = localStorage.getItem('role');
        const titleLower = n.title.toLowerCase();
        const msgLower = n.message.toLowerCase();

        if (role === 'Employer') {
            if (titleLower.includes('application') || msgLower.includes('application')) {
                navigate('/employer-dashboard?tab=review-applicants');
            } else if (titleLower.includes('offer') || msgLower.includes('offer')) {
                navigate('/employer-dashboard?tab=offers');
            } else if (titleLower.includes('interview') || msgLower.includes('interview')) {
                navigate('/employer-dashboard?tab=interviews');
            } else if (titleLower.includes('rate') || titleLower.includes('position') || titleLower.includes('employment') || titleLower.includes('workforce')) {
                navigate('/employer-dashboard?tab=employees');
            } else if (titleLower.includes('shift') || msgLower.includes('shift')) {
                navigate('/employer-dashboard?tab=shifts');
            } else if (titleLower.includes('payroll') || msgLower.includes('payroll')) {
                navigate('/employer-dashboard?tab=payroll');
            } else {
                navigate('/employer-dashboard');
            }
        } else {
            // Applicant / General
            if (titleLower.includes('application') || msgLower.includes('application')) {
                navigate('/my-applications');
            } else if (titleLower.includes('offer') || msgLower.includes('offer')) {
                navigate('/offers');
            } else if (titleLower.includes('interview') || msgLower.includes('interview')) {
                navigate('/interviews');
            } else if (titleLower.includes('rate') || titleLower.includes('position') || titleLower.includes('employment') || titleLower.includes('workforce') || titleLower.includes('shift') || msgLower.includes('shift')) {
                navigate('/my-work');
            } else if (titleLower.includes('payroll') || titleLower.includes('payslip') || msgLower.includes('payslip')) {
                navigate('/payslips');
            } else {
                navigate('/profile');
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    const hasReadNotifications = notifications.some(n => n.isRead);
    const paginatedNotifications = notifications.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="bg-bg-light min-h-screen pb-20 font-display">
            <div className="bg-white border-b border-slate-200/60 pb-8 pt-8">
                <div className="max-w-[800px] mx-auto px-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Thông báo</h1>
                        <p className="text-slate-500 mt-2">Cập nhật hoạt động mới nhất của bạn.</p>
                    </div>
                    {hasReadNotifications && (
                        <button
                            onClick={clearReadNotifications}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 hover:text-red-500 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-100 rounded-xl transition-all shadow-sm"
                        >
                            <span className="material-symbols-outlined !text-[16px]">clear_all</span>
                            Xóa đã đọc
                        </button>
                    )}
                </div>
            </div>

            <main className="max-w-[800px] mx-auto px-6 mt-10">
                {notifications.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-20 text-center">
                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-slate-300 !text-4xl">notifications_off</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-700">Không có thông báo</h2>
                        <p className="text-slate-500 mt-2">Bạn đã xem hết rồi!</p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm">
                        <div className="space-y-4 p-4 sm:p-5">
                        {paginatedNotifications.map((n) => (
                            <div
                                key={n.notificationId}
                                onClick={() => handleNotificationClick(n)}
                                className={`group bg-white rounded-2xl border transition-all p-6 cursor-pointer relative hover:shadow-md ${
                                    n.isRead
                                    ? 'border-slate-100 opacity-75 hover:opacity-100'
                                    : 'border-primary/20 shadow-sm shadow-primary/5 bg-primary/[0.01] hover:bg-primary/[0.02]'
                                }`}
                            >
                                <div className="flex items-start gap-4 pr-8">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary'
                                    }`}>
                                        <span className="material-symbols-outlined !text-[20px]">
                                            {n.title.includes('Success') || n.title.includes('Accepted') || n.title.includes('Paid') ? 'check_circle' :
                                             n.title.includes('Rejected') || n.title.includes('Fired') || n.title.includes('Ended') ? 'cancel' : 'info'}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1 gap-4">
                                            <h3 className={`font-bold transition-colors ${n.isRead ? 'text-slate-600' : 'text-slate-800'} group-hover:text-primary`}>
                                                {n.title}
                                            </h3>
                                            <span className="text-[11px] font-medium text-slate-400 capitalize whitespace-nowrap">
                                                {new Date(n.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className={`text-sm ${n.isRead ? 'text-slate-500' : 'text-slate-600'}`}>
                                            {n.message}
                                        </p>
                                    </div>
                                    {!n.isRead && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-primary mt-3 flex-shrink-0"></div>
                                    )}
                                </div>

                                {/* Delete button on hover */}
                                <button
                                    onClick={(e) => deleteNotification(n.notificationId, e)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                                    title="Xóa thông báo"
                                >
                                    <span className="material-symbols-outlined !text-[18px]">delete</span>
                                </button>
                            </div>
                        ))}
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalItems={notifications.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPage}
                            label="thông báo"
                        />
                    </div>
                )}
            </main>
        </div>
    );
};

export default Notifications;
