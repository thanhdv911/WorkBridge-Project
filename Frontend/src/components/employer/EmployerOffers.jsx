import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { signalRService } from '../../services/signalrService';
import toast from 'react-hot-toast';
import Pagination from '../shared/Pagination';

const ITEMS_PER_PAGE = 5;

const getStatusText = (status) => {
    switch (status) {
        case 'Accepted': return 'Đã chấp nhận';
        case 'Declined': return 'Đã từ chối';
        case 'Sent': return 'Đã gửi';
        case 'Cancelled': return 'Đã hủy';
        default: return status;
    }
};

const EmployerOffers = () => {
    const [offers, setOffers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchOffers();

        const handleOfferChanged = () => fetchOffers();
        signalRService.on('OfferStatusChanged', handleOfferChanged);
        return () => signalRService.off('OfferStatusChanged', handleOfferChanged);
    }, []);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(offers.length / ITEMS_PER_PAGE));
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [offers.length, currentPage]);

    const fetchOffers = async () => {
        try {
            const response = await api.get('/offers/employer', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOffers(response.data);
        } catch (error) {
            console.error('Error loading offers:', error);
            toast.error('Không thể tải danh sách lời mời nhận việc.');
        } finally {
            setLoading(false);
        }
    };

    const statusClass = (status) => {
        switch (status) {
            case 'Accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'Declined': return 'bg-red-50 text-red-700 border-red-100';
            case 'Sent': return 'bg-blue-50 text-blue-700 border-blue-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const paginatedOffers = offers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <section className="profile-panel min-w-0 overflow-hidden rounded-2xl">
            <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Lời mời nhận việc</h2>
                <p className="text-slate-500 text-sm mt-1">Theo dõi trạng thái các lời mời nhận việc chính thức đã gửi cho ứng viên.</p>
            </div>

            {loading ? (
                <div className="p-10 text-center text-slate-400">Đang tải danh sách lời mời...</div>
            ) : offers.length === 0 ? (
                <div className="p-10 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-primary">contract</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Chưa có lời mời nào được gửi</h3>
                    <p className="text-slate-500 mt-1">Phê duyệt ứng viên tại trang Đánh giá ứng viên, sau đó gửi lời mời nhận việc.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {paginatedOffers.map(offer => (
                        <div key={offer.offerId} className="px-5 sm:px-6 py-5 grid lg:grid-cols-[minmax(0,1fr)_minmax(160px,220px)_auto] gap-4 lg:items-center">
                            <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate">{offer.applicantName}</p>
                                <p className="text-sm text-slate-500 truncate">{offer.jobTitle}</p>
                                <p className="text-xs text-slate-400 truncate">{offer.position} tại {offer.branchName}</p>
                                {offer.hiringPlanNote && (
                                    <p className={`text-[11px] font-bold mt-2 rounded-lg px-2.5 py-1.5 border w-fit ${
                                        offer.isOverHiringPlan
                                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                                            : 'bg-slate-50 text-slate-500 border-slate-100'
                                    }`}>
                                        {offer.hiringPlanNote}
                                    </p>
                                )}
                            </div>
                            <div className="text-sm text-slate-600">
                                <p className="font-bold">{Number(offer.hourlyRate).toLocaleString('vi-VN')} đ/giờ</p>
                                <p className="text-xs text-slate-400">Bắt đầu: {new Date(offer.startDate).toLocaleDateString('vi-VN')}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusClass(offer.status)} self-start lg:self-center`}>
                                {getStatusText(offer.status)}
                            </span>
                        </div>
                    ))}
                    <Pagination
                        currentPage={currentPage}
                        totalItems={offers.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                        label="lời mời"
                    />
                </div>
            )}
        </section>
    );
};

export default EmployerOffers;
